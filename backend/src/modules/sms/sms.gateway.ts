import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { Queue } from "bullmq";
import pino from "pino";
import type { Socket } from "socket.io";
import { WsGateway } from "../../shared/ws/ws.gateway.ts";
import { AckService } from "../../shared/ws/ack.service.ts";
import { DELIVERY_QUEUE } from "../../shared/queue/queue.module.ts";
import { SmsService } from "./sms.service.ts";
import { smsPushSchema, smsSendSchema } from "../../shared/types/index.ts";

const logger = pino({ level: Deno.env.get("LOG_LEVEL") ?? "info" });

/**
 * SMS WebSocket event handler.
 *
 * Registers listeners on the main WsGateway's Socket.IO server
 * for all sms:* events. This avoids creating a separate gateway
 * (which would require a different namespace) and keeps everything
 * on the single /ws namespace.
 */
@Injectable()
export class SmsGateway implements OnModuleInit {
  constructor(
    private readonly wsGateway: WsGateway,
    private readonly ackService: AckService,
    private readonly smsService: SmsService,
    @Inject(DELIVERY_QUEUE) private readonly deliveryQueue: Queue,
  ) {}

  onModuleInit(): void {
    // Wait for the WebSocket server to be available, then register handlers
    // Socket.IO server is set after gateway is initialized, so we use a small delay
    const interval = setInterval(() => {
      if (this.wsGateway.server) {
        clearInterval(interval);
        this.registerHandlers();
      }
    }, 100);
  }

  private registerHandlers(): void {
    const server = this.wsGateway.server;

    server.on("connection", (socket: Socket) => {
      // ─── sms:push — Android pushes a batch of SMS messages ─────────────
      socket.on("sms:push", async (data: unknown) => {
        try {
          const deviceId = socket.data.deviceId;
          const deviceType = socket.data.deviceType;

          if (deviceType !== "android" || !deviceId) {
            logger.warn(
              { socketId: socket.id },
              "sms:push received from non-Android client",
            );
            return;
          }

          // Validate payload
          const parsed = smsPushSchema.safeParse(data);
          if (!parsed.success) {
            logger.warn(
              { socketId: socket.id, errors: parsed.error.flatten() },
              "sms:push invalid payload",
            );
            socket.emit("sms:ack", { ids: [], error: "Invalid payload" });
            return;
          }

          // Process the batch
          const { ackedIds, savedMessages } = await this.smsService.processBatch(
            deviceId,
            parsed.data.messages,
          );

          // Ack back to Android with the list of persisted androidMsgIds
          socket.emit("sms:ack", { ids: ackedIds });

          logger.info(
            { deviceId, count: ackedIds.length },
            "sms:push processed, ack sent",
          );

          // Emit each new message to the iOS room with guaranteed delivery
          const userId = socket.data.userId;
          for (const msg of savedMessages) {
            if (msg.direction === "incoming") {
              await this.emitToIosWithAck(userId, msg);
            }
          }
        } catch (err) {
          logger.error(
            { socketId: socket.id, error: (err as Error).message },
            "sms:push handler error",
          );
        }
      });

      // ─── sms:received — iOS acknowledges receipt of a message ──────────
      socket.on("sms:received", async (data: unknown) => {
        try {
          const payload = data as { id?: string; ackId?: string };

          if (payload.ackId) {
            this.ackService.acknowledge(payload.ackId);
          }

          if (payload.id) {
            await this.smsService.markDelivered(payload.id);
            logger.debug({ messageId: payload.id }, "SMS marked as delivered to iOS");
          }
        } catch (err) {
          logger.error(
            { socketId: socket.id, error: (err as Error).message },
            "sms:received handler error",
          );
        }
      });

      // ─── sms:send — iOS wants to send an SMS through Android ───────────
      socket.on("sms:send", async (data: unknown) => {
        try {
          const userId = socket.data.userId;
          const deviceType = socket.data.deviceType;

          if (deviceType !== "ios") {
            logger.warn(
              { socketId: socket.id },
              "sms:send received from non-iOS client",
            );
            return;
          }

          // Validate payload
          const parsed = smsSendSchema.safeParse(data);
          if (!parsed.success) {
            logger.warn(
              { socketId: socket.id, errors: parsed.error.flatten() },
              "sms:send invalid payload",
            );
            socket.emit("sms:send:ack", {
              tempId: (data as Record<string, unknown>)?.tempId,
              status: "error",
              error: "Invalid payload",
            });
            return;
          }

          // We need a deviceId — find the user's Android device.
          // For now, get it from any Android socket in the user's room.
          const deviceId = await this.resolveAndroidDeviceId(userId);

          if (!deviceId) {
            socket.emit("sms:send:ack", {
              tempId: parsed.data.tempId,
              status: "error",
              error: "No Android device connected",
            });
            return;
          }

          // Save as outgoing message
          const message = await this.smsService.createOutgoingSms(deviceId, parsed.data);

          // Push to Android device via WebSocket
          this.wsGateway.emitToDevice(deviceId, "sms:send", {
            id: message.id,
            address: parsed.data.to,
            body: parsed.data.body,
            simId: parsed.data.simId,
            extraNumberId: parsed.data.extraNumberId ?? null,
          });

          // Ack back to iOS
          socket.emit("sms:send:ack", {
            tempId: parsed.data.tempId,
            status: "queued",
            messageId: message.id,
          });

          logger.info(
            { userId, messageId: message.id, to: parsed.data.to },
            "Outgoing SMS routed to Android",
          );
        } catch (err) {
          logger.error(
            { socketId: socket.id, error: (err as Error).message },
            "sms:send handler error",
          );
          socket.emit("sms:send:ack", {
            tempId: (data as Record<string, unknown>)?.tempId,
            status: "error",
            error: "Internal server error",
          });
        }
      });
    });

    logger.info("SMS WebSocket handlers registered");
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Emit a new message to the iOS client with guaranteed delivery via AckService.
   * If iOS doesn't ack within 15 seconds, BullMQ retries with exponential backoff.
   */
  private async emitToIosWithAck(
    userId: string,
    message: Record<string, unknown>,
  ): Promise<void> {
    const targetRoom = `user:${userId}`;

    await this.ackService.emitWithAck(
      (event, data) => this.wsGateway.emitToUser(userId, event, data),
      "sms:new",
      { message },
      targetRoom,
      15000, // 15 second timeout before BullMQ retry
    );
  }

  /**
   * Resolve the Android device ID for a user by checking connected sockets.
   * Falls back to looking at the user's room for any Android-type socket.
   */
  private async resolveAndroidDeviceId(userId: string): Promise<string | null> {
    const server = this.wsGateway.server;
    const room = `user:${userId}`;

    try {
      const socketIds = await server.in(room).fetchSockets();

      for (const s of socketIds) {
        if (s.data.deviceType === "android" && s.data.deviceId) {
          return s.data.deviceId;
        }
      }
    } catch (err) {
      logger.error(
        { userId, error: (err as Error).message },
        "Failed to resolve Android device ID",
      );
    }

    return null;
  }
}
