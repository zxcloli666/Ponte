import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketGateway,
} from "@nestjs/websockets";
import type { Socket } from "socket.io";
import { WsGateway } from "../../shared/ws/ws.gateway.ts";
import { ContactsService, CONTACTS_UPDATED_EVENT, type ContactsUpdatedPayload } from "./contacts.service.ts";
import { contactSyncSchema } from "../../shared/types/index.ts";
import { z } from "zod";
import pino from "pino";

const logger = pino({ level: Deno.env.get("LOG_LEVEL") ?? "info" });

// ─── WebSocket payload schema ───────────────────────────────────────────────

const contactsSyncWsSchema = contactSyncSchema.extend({
  isFullSync: z.boolean().optional().default(false),
});

// ─── Gateway ────────────────────────────────────────────────────────────────

@WebSocketGateway({ namespace: "/ws" })
@Injectable()
export class ContactsGateway {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly wsGateway: WsGateway,
  ) {}

  /**
   * Handle 'contacts:sync' event from Android.
   * Syncs the contact batch and responds with 'contacts:ack'.
   */
  @SubscribeMessage("contacts:sync")
  async handleContactsSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    const deviceId = client.data.deviceId as string | undefined;
    const userId = client.data.userId as string | undefined;

    if (!deviceId || !userId) {
      logger.warn(
        { socketId: client.id },
        "contacts:sync rejected — missing device context",
      );
      client.emit("contacts:error", {
        message: "Device authentication required",
      });
      return;
    }

    const parsed = contactsSyncWsSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn(
        { socketId: client.id, errors: parsed.error.flatten() },
        "contacts:sync rejected — invalid payload",
      );
      client.emit("contacts:error", {
        message: "Invalid payload",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const { contacts, deletedIds, isFullSync } = parsed.data;

      const result = await this.contactsService.syncContacts(
        deviceId,
        userId,
        { contacts, deletedIds },
        isFullSync,
      );

      // Acknowledge to Android
      client.emit("contacts:ack", {
        success: true,
        ...result,
      });

      logger.info(
        { deviceId, ...result },
        "contacts:sync processed via WebSocket",
      );
    } catch (err) {
      logger.error(
        { socketId: client.id, error: (err as Error).message },
        "contacts:sync failed",
      );
      client.emit("contacts:error", {
        message: "Sync failed",
        error: (err as Error).message,
      });
    }
  }

  /**
   * Listen for internal contacts.updated events and notify iOS clients.
   * Emits 'contacts:updated' to the user's room so iOS can refresh its contact list.
   */
  @OnEvent(CONTACTS_UPDATED_EVENT)
  handleContactsUpdated(payload: ContactsUpdatedPayload): void {
    this.wsGateway.emitToUser(payload.userId, "contacts:updated", {
      deviceId: payload.deviceId,
      inserted: payload.inserted,
      updated: payload.updated,
      deleted: payload.deleted,
      timestamp: Date.now(),
    });

    logger.debug(
      payload,
      "contacts:updated emitted to iOS",
    );
  }
}
