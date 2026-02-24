import { Injectable, Inject } from "@nestjs/common";
import { Queue } from "bullmq";
import { DELIVERY_QUEUE } from "../queue/queue.module.ts";
import { v4 as uuidv4 } from "uuid";
import pino from "pino";

const logger = pino({ level: Deno.env.get("LOG_LEVEL") ?? "info" });

interface PendingAck {
  ackId: string;
  event: string;
  targetRoom: string;
  payload: unknown;
  createdAt: number;
}

@Injectable()
export class AckService {
  private pendingAcks = new Map<string, PendingAck>();

  constructor(
    @Inject(DELIVERY_QUEUE) private readonly deliveryQueue: Queue,
  ) {}

  async emitWithAck(
    emitFn: (event: string, data: unknown) => void,
    event: string,
    payload: unknown,
    targetRoom: string,
    timeoutMs: number = 15000,
  ): Promise<string> {
    const ackId = uuidv4();
    const ackPayload = { ...payload as Record<string, unknown>, ackId };

    this.pendingAcks.set(ackId, {
      ackId,
      event,
      targetRoom,
      payload: ackPayload,
      createdAt: Date.now(),
    });

    emitFn(event, ackPayload);

    await this.deliveryQueue.add(
      "ack-check",
      { ackId, event, targetRoom, payload: ackPayload },
      { delay: timeoutMs },
    );

    return ackId;
  }

  acknowledge(ackId: string): boolean {
    const pending = this.pendingAcks.get(ackId);
    if (!pending) {
      logger.debug({ ackId }, "Ack for unknown or already-acked event");
      return false;
    }

    this.pendingAcks.delete(ackId);
    logger.debug({ ackId, event: pending.event }, "Event acknowledged");
    return true;
  }

  isPending(ackId: string): boolean {
    return this.pendingAcks.has(ackId);
  }

  getPending(ackId: string): PendingAck | undefined {
    return this.pendingAcks.get(ackId);
  }

  removePending(ackId: string): void {
    this.pendingAcks.delete(ackId);
  }
}
