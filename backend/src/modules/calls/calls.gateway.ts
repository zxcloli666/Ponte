import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import type { Socket } from "socket.io";
import pino from "pino";
import { CallsService } from "./calls.service.ts";
import {
  callLogPushSchema,
  callInitiateSchema,
} from "../../shared/types/index.ts";
import { z } from "zod";

const logger = pino({ level: Deno.env.get("LOG_LEVEL") ?? "info" });

// ─── Payload schemas for WS events ─────────────────────────────────────────

const callIncomingSchema = z.object({
  callId: z.string().min(1),
  from: z.string().min(1),
  simId: z.string().uuid(),
  extraNumberId: z.string().uuid().nullable().optional(),
});

const callIdSchema = z.object({
  callId: z.string().min(1),
});

const callSignalSchema = z.object({
  callId: z.string().min(1),
  type: z.enum(["offer", "answer", "ice"]),
  sdp: z.string().optional(),
  candidate: z.unknown().optional(),
});

// ─── Gateway ────────────────────────────────────────────────────────────────

@WebSocketGateway({ namespace: "/ws" })
export class CallsGateway implements OnGatewayDisconnect {
  constructor(private readonly callsService: CallsService) {}

  handleDisconnect(client: Socket): void {
    this.callsService.cleanupSocketCalls(client.id);
  }

  @SubscribeMessage("call:log:push")
  async handleCallLogPush(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    const deviceId = client.data.deviceId as string | undefined;
    if (!deviceId || client.data.deviceType !== "android") {
      logger.warn({ socketId: client.id }, "call:log:push from non-Android client");
      return;
    }

    const parsed = callLogPushSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn({ socketId: client.id, errors: parsed.error.issues }, "Invalid call:log:push payload");
      return;
    }

    const ackedIds = await this.callsService.processLogBatch(deviceId, parsed.data.calls);
    client.emit("call:log:ack", { ids: ackedIds });
  }

  @SubscribeMessage("call:incoming")
  async handleCallIncoming(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    const deviceId = client.data.deviceId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!deviceId || !userId || client.data.deviceType !== "android") {
      logger.warn({ socketId: client.id }, "call:incoming from non-Android client");
      return;
    }

    const parsed = callIncomingSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn({ socketId: client.id, errors: parsed.error.issues }, "Invalid call:incoming payload");
      return;
    }

    await this.callsService.handleIncomingCall(userId, deviceId, client.id, parsed.data);
  }

  @SubscribeMessage("call:accept")
  handleCallAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): void {
    const userId = client.data.userId as string | undefined;
    if (!userId || client.data.deviceType !== "ios") {
      logger.warn({ socketId: client.id }, "call:accept from non-iOS client");
      return;
    }

    const parsed = callIdSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn({ socketId: client.id, errors: parsed.error.issues }, "Invalid call:accept payload");
      return;
    }

    this.callsService.handleCallAccept(userId, client.id, parsed.data.callId);
  }

  @SubscribeMessage("call:reject")
  handleCallReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): void {
    const userId = client.data.userId as string | undefined;
    if (!userId || client.data.deviceType !== "ios") {
      logger.warn({ socketId: client.id }, "call:reject from non-iOS client");
      return;
    }

    const parsed = callIdSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn({ socketId: client.id, errors: parsed.error.issues }, "Invalid call:reject payload");
      return;
    }

    this.callsService.handleCallReject(userId, parsed.data.callId);
  }

  @SubscribeMessage("call:initiate")
  async handleCallInitiate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    const userId = client.data.userId as string | undefined;
    if (!userId || client.data.deviceType !== "ios") {
      logger.warn({ socketId: client.id }, "call:initiate from non-iOS client");
      return;
    }

    const parsed = callInitiateSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn({ socketId: client.id, errors: parsed.error.issues }, "Invalid call:initiate payload");
      return;
    }

    await this.callsService.handleCallInitiate(userId, client.id, parsed.data);
  }

  @SubscribeMessage("call:signal")
  handleCallSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): void {
    const deviceType = client.data.deviceType as "android" | "ios" | undefined;
    if (!deviceType) {
      logger.warn({ socketId: client.id }, "call:signal from unauthenticated client");
      return;
    }

    const parsed = callSignalSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn({ socketId: client.id, errors: parsed.error.issues }, "Invalid call:signal payload");
      return;
    }

    const { callId, ...signal } = parsed.data;
    this.callsService.handleSignaling(client.id, deviceType, callId, signal);
  }

  /**
   * Android reports call state change (e.g. ringing → active).
   * Forwarded to iOS/web as call:status.
   */
  @SubscribeMessage("call:state")
  handleCallState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): void {
    if (client.data.deviceType !== "android") {
      return;
    }

    const parsed = z.object({
      callId: z.string().min(1),
      status: z.enum(["ringing", "active"]),
    }).safeParse(data);

    if (!parsed.success) {
      logger.warn({ socketId: client.id, errors: parsed.error.issues }, "Invalid call:state payload");
      return;
    }

    this.callsService.handleCallStateUpdate(parsed.data.callId, parsed.data.status);
  }

  @SubscribeMessage("call:end")
  handleCallEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): void {
    const deviceType = client.data.deviceType as "android" | "ios" | undefined;
    if (!deviceType) {
      logger.warn({ socketId: client.id }, "call:end from unauthenticated client");
      return;
    }

    const parsed = callIdSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn({ socketId: client.id, errors: parsed.error.issues }, "Invalid call:end payload");
      return;
    }

    this.callsService.handleCallEnd(parsed.data.callId, deviceType);
  }
}
