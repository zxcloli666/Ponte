import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Injectable } from "@nestjs/common";
import type { Socket } from "socket.io";
import pino from "pino";
import { NotificationsService } from "./notifications.service.ts";
import { WsGateway } from "../../shared/ws/ws.gateway.ts";
import { AckService } from "../../shared/ws/ack.service.ts";
import {
  notificationPushSchema,
  type NotificationPushDto,
} from "../../shared/types/index.ts";
import { z } from "zod";

const logger = pino({ level: Deno.env.get("LOG_LEVEL") ?? "info" });

// ─── Validation schemas for WS events ───────────────────────────────────────

const appsSyncSchema = z.object({
  apps: z.array(
    z.object({
      packageName: z.string().min(1),
      appName: z.string().min(1),
    }),
  ),
});

const notificationReceivedSchema = z.object({
  id: z.string().uuid(),
  ackId: z.string().uuid(),
});

// ─── Gateway ────────────────────────────────────────────────────────────────

@WebSocketGateway({ namespace: "/ws" })
@Injectable()
export class NotificationsGateway {
  constructor(
    private readonly service: NotificationsService,
    private readonly wsGateway: WsGateway,
    private readonly ackService: AckService,
  ) {}

  // ─── Android → Server: push notification batch ────────────────────────────

  @SubscribeMessage("notification:push")
  async handlePush(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    const deviceId = client.data.deviceId as string | undefined;
    const userId = client.data.userId as string | undefined;

    if (!deviceId || !userId) {
      logger.warn(
        { socketId: client.id },
        "notification:push from unauthenticated client",
      );
      return;
    }

    // Validate payload
    const parsed = notificationPushSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn(
        { socketId: client.id, errors: parsed.error.flatten() },
        "notification:push invalid payload",
      );
      client.emit("notification:ack", { ids: [], error: "Invalid payload" });
      return;
    }

    const { notifications } = parsed.data;

    if (notifications.length === 0) {
      client.emit("notification:ack", { ids: [] });
      return;
    }

    try {
      const { ackedIds, toForward } = await this.service.processBatch(
        deviceId,
        notifications,
      );

      // Ack back to Android — all saved notification IDs
      client.emit("notification:ack", { ids: ackedIds });

      logger.info(
        { deviceId, ackedCount: ackedIds.length, forwardCount: toForward.length },
        "notification:ack sent to Android",
      );

      // Forward each notification to iOS with guaranteed delivery
      for (const notification of toForward) {
        await this.forwardToIos(userId, notification);
      }
    } catch (err) {
      logger.error(
        { deviceId, error: (err as Error).message },
        "Failed to process notification batch",
      );
      client.emit("notification:ack", { ids: [], error: "Internal error" });
    }
  }

  // ─── iOS → Server: acknowledge notification received ──────────────────────

  @SubscribeMessage("notification:received")
  handleReceived(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): void {
    const parsed = notificationReceivedSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn(
        { socketId: client.id },
        "notification:received invalid payload",
      );
      return;
    }

    const { ackId } = parsed.data;
    const acknowledged = this.ackService.acknowledge(ackId);

    logger.debug(
      { socketId: client.id, ackId, acknowledged },
      "notification:received processed",
    );
  }

  // ─── Android → Server: sync installed apps ───────────────────────────────

  @SubscribeMessage("notification:apps:sync")
  async handleAppsSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    const deviceId = client.data.deviceId as string | undefined;

    if (!deviceId) {
      logger.warn(
        { socketId: client.id },
        "notification:apps:sync from unauthenticated client",
      );
      return;
    }

    const parsed = appsSyncSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn(
        { socketId: client.id, errors: parsed.error.flatten() },
        "notification:apps:sync invalid payload",
      );
      client.emit("notification:apps:ack", { success: false, error: "Invalid payload" });
      return;
    }

    try {
      const filters = await this.service.syncApps(deviceId, parsed.data.apps);

      client.emit("notification:apps:ack", {
        success: true,
        count: filters.length,
      });

      logger.info(
        { deviceId, appsCount: parsed.data.apps.length },
        "notification:apps:sync completed",
      );
    } catch (err) {
      logger.error(
        { deviceId, error: (err as Error).message },
        "Failed to sync apps",
      );
      client.emit("notification:apps:ack", { success: false, error: "Internal error" });
    }
  }

  // ─── Forward notification to iOS via guaranteed delivery ──────────────────

  private async forwardToIos(
    userId: string,
    notification: {
      id: string;
      packageName: string;
      appName: string;
      title: string;
      body: string;
      postedAt: Date;
    },
  ): Promise<void> {
    const payload = {
      id: notification.id,
      packageName: notification.packageName,
      appName: notification.appName,
      title: notification.title,
      body: notification.body,
      postedAt: notification.postedAt.toISOString(),
    };

    const targetRoom = `user:${userId}`;

    try {
      await this.ackService.emitWithAck(
        (event, data) => this.wsGateway.emitToRoom(targetRoom, event, data),
        "notification:new",
        payload,
        targetRoom,
        15_000,
      );

      logger.debug(
        { userId, notificationId: notification.id },
        "notification:new emitted with ack tracking",
      );
    } catch (err) {
      logger.error(
        { userId, notificationId: notification.id, error: (err as Error).message },
        "Failed to emit notification:new",
      );
    }
  }
}
