import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import pino from "pino";
import { CallsRepository, type UpsertCallInput, type CallRow } from "./calls.repository.ts";
import { WsGateway } from "../../shared/ws/ws.gateway.ts";
import type { PaginationDto, PaginatedResult, CallLogPushDto } from "../../shared/types/index.ts";

const logger = pino({ level: Deno.env.get("LOG_LEVEL") ?? "info" });

// ─── Types ──────────────────────────────────────────────────────────────────

export type CallStatus = "ringing" | "active" | "ended";

export interface ActiveCall {
  callId: string;
  userId: string;
  deviceId: string;
  androidSocketId: string | null;
  iosSocketId: string | null;
  status: CallStatus;
  address: string;
  simId: string;
  extraNumberId: string | null;
  startedAt: number;
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class CallsService {
  private readonly activeCalls = new Map<string, ActiveCall>();

  constructor(
    private readonly callsRepository: CallsRepository,
    private readonly wsGateway: WsGateway,
  ) {}

  // ─── Call Log Batch (Android -> Server) ─────────────────────────────────

  async processLogBatch(
    deviceId: string,
    batch: CallLogPushDto["calls"],
  ): Promise<string[]> {
    const inputs: UpsertCallInput[] = batch.map((call) => ({
      deviceId,
      simId: call.simId,
      extraNumberId: call.extraNumberId ?? null,
      direction: call.direction,
      address: call.address,
      contactId: call.contactId ?? null,
      duration: call.duration,
      startedAt: call.startedAt,
      endedAt: call.endedAt ?? null,
      androidCallId: call.androidCallId,
    }));

    const ackedIds = await this.callsRepository.upsertBatch(deviceId, inputs);
    logger.info({ deviceId, count: ackedIds.length }, "Call log batch processed");

    return ackedIds;
  }

  // ─── Incoming Call (Android -> Server -> iOS) ───────────────────────────

  async handleIncomingCall(
    userId: string,
    deviceId: string,
    androidSocketId: string,
    data: { callId: string; from: string; simId: string; extraNumberId?: string | null },
  ): Promise<void> {
    const { callId, from, simId, extraNumberId } = data;

    const sim = await this.callsRepository.findSimById(simId);
    if (!sim) {
      logger.warn({ simId, deviceId }, "Incoming call references unknown SIM");
      return;
    }

    let extraNumber: { displayName: string; displayNumber: string; color: string } | null = null;
    if (extraNumberId) {
      extraNumber = await this.callsRepository.findExtraNumberById(extraNumberId);
    }

    const contact = await this.callsRepository.findContactByAddress(deviceId, from);

    this.activeCalls.set(callId, {
      callId,
      userId,
      deviceId,
      androidSocketId,
      iosSocketId: null,
      status: "ringing",
      address: from,
      simId,
      extraNumberId: extraNumberId ?? null,
      startedAt: Date.now(),
    });

    const payload = {
      callId,
      from,
      simId,
      extraNumberId: extraNumberId ?? null,
      sim: {
        displayName: sim.displayName,
        displayNumber: sim.displayNumber,
        color: sim.color,
      },
      ...(extraNumber && {
        extraNumber: {
          displayName: extraNumber.displayName,
          displayNumber: extraNumber.displayNumber,
          color: extraNumber.color,
        },
      }),
      contact: contact
        ? { id: contact.id, name: contact.name, photoUrl: contact.photoUrl }
        : null,
    };

    this.wsGateway.emitToUser(userId, "call:incoming", payload);
    logger.info({ callId, deviceId, from }, "Incoming call forwarded to iOS");
  }

  // ─── Accept Call (iOS -> Server -> Android) ─────────────────────────────

  handleCallAccept(userId: string, iosSocketId: string, callId: string): void {
    const activeCall = this.getActiveCallForUser(callId, userId);
    if (!activeCall) return;

    activeCall.iosSocketId = iosSocketId;
    activeCall.status = "active";

    this.wsGateway.emitToDevice(activeCall.deviceId, "call:accept", { callId });
    this.wsGateway.emitToUser(userId, "call:status", {
      callId,
      status: "active",
      duration: 0,
    });

    logger.info({ callId, userId }, "Call accepted by iOS");
  }

  // ─── Reject Call (iOS -> Server -> Android) ─────────────────────────────

  handleCallReject(userId: string, callId: string): void {
    const activeCall = this.getActiveCallForUser(callId, userId);
    if (!activeCall) return;

    this.wsGateway.emitToDevice(activeCall.deviceId, "call:reject", { callId });
    this.activeCalls.delete(callId);

    logger.info({ callId, userId }, "Call rejected by iOS");
  }

  // ─── Initiate Call (iOS -> Server -> Android) ──────────────────────────

  async handleCallInitiate(
    userId: string,
    iosSocketId: string,
    data: { to: string; simId: string; extraNumberId?: string | null },
  ): Promise<void> {
    const { to, simId, extraNumberId } = data;

    const sim = await this.callsRepository.findSimById(simId);
    if (!sim) {
      logger.warn({ simId, userId }, "Initiate call references unknown SIM");
      return;
    }

    const callId = uuidv4();

    this.activeCalls.set(callId, {
      callId,
      userId,
      deviceId: sim.deviceId,
      androidSocketId: null,
      iosSocketId,
      status: "ringing",
      address: to,
      simId,
      extraNumberId: extraNumberId ?? null,
      startedAt: Date.now(),
    });

    this.wsGateway.emitToDevice(sim.deviceId, "call:initiate", {
      callId,
      to,
      simId,
      ...(extraNumberId && { extraNumberId }),
    });

    this.wsGateway.emitToUser(userId, "call:status", {
      callId,
      status: "ringing",
      duration: 0,
    });

    logger.info({ callId, userId, to, simId }, "Outgoing call initiated from iOS");
  }

  // ─── Call State Update (Android reports state change) ──────────────────

  handleCallStateUpdate(callId: string, status: "ringing" | "active"): void {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      logger.warn({ callId, status }, "State update for unknown call");
      return;
    }

    activeCall.status = status as CallStatus;

    this.wsGateway.emitToUser(activeCall.userId, "call:status", {
      callId,
      status,
      duration: 0,
    });

    logger.info({ callId, status }, "Call state updated by Android");
  }

  // ─── WebRTC Signaling Relay ─────────────────────────────────────────────

  handleSignaling(
    senderSocketId: string,
    senderDeviceType: "android" | "ios",
    callId: string,
    signal: { type: "offer" | "answer" | "ice"; sdp?: string; candidate?: unknown },
  ): void {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      logger.warn({ callId }, "Signaling for unknown call");
      return;
    }

    if (senderDeviceType === "android") {
      activeCall.androidSocketId = senderSocketId;
      this.wsGateway.emitToUser(activeCall.userId, "call:signal", { callId, ...signal });
    } else {
      activeCall.iosSocketId = senderSocketId;
      this.wsGateway.emitToDevice(activeCall.deviceId, "call:signal", { callId, ...signal });
    }
  }

  // ─── End Call ───────────────────────────────────────────────────────────

  handleCallEnd(callId: string, senderDeviceType: "android" | "ios"): void {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      logger.warn({ callId }, "End for unknown call");
      return;
    }

    const duration = Math.floor((Date.now() - activeCall.startedAt) / 1000);
    const endPayload = { callId, duration };

    // Notify the other side
    if (senderDeviceType === "ios") {
      this.wsGateway.emitToDevice(activeCall.deviceId, "call:end", endPayload);
    } else {
      this.wsGateway.emitToUser(activeCall.userId, "call:end", endPayload);
    }

    // Push final status to iOS
    this.wsGateway.emitToUser(activeCall.userId, "call:status", {
      callId,
      status: "ended",
      duration,
    });

    this.activeCalls.delete(callId);
    logger.info({ callId, duration, endedBy: senderDeviceType }, "Call ended");
  }

  // ─── Socket Disconnect Cleanup ──────────────────────────────────────────

  cleanupSocketCalls(socketId: string): void {
    for (const [callId, activeCall] of this.activeCalls) {
      if (activeCall.androidSocketId === socketId || activeCall.iosSocketId === socketId) {
        const endedBy = activeCall.androidSocketId === socketId ? "android" : "ios";
        this.handleCallEnd(callId, endedBy);
      }
    }
  }

  // ─── REST: Call History ─────────────────────────────────────────────────

  getCallHistory(
    userId: string,
    pagination: PaginationDto,
    filters: { direction?: string; simId?: string; extraNumberId?: string },
  ): Promise<PaginatedResult<CallRow>> {
    return this.callsRepository.findPaginated(userId, pagination, filters);
  }

  getCallById(callId: string, userId: string): Promise<CallRow | null> {
    return this.callsRepository.findById(callId, userId);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────

  private getActiveCallForUser(callId: string, userId: string): ActiveCall | null {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall || activeCall.userId !== userId) {
      logger.warn({ callId, userId }, "Action for unknown or unauthorized call");
      return null;
    }
    return activeCall;
  }
}
