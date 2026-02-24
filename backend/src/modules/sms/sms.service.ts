import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import pino from "pino";
import { SmsRepository, type MessageWithRelations, type ConversationSummary } from "./sms.repository.ts";
import { extractCode } from "./code-extractor.ts";
import type { SmsPushDto, SmsSendDto } from "../../shared/types/index.ts";

const logger = pino({ level: Deno.env.get("LOG_LEVEL") ?? "info" });

// ─── Interfaces ─────────────────────────────────────────────────────────────

/** Single SMS message as received from Android in a push batch */
type IncomingSmsMessage = SmsPushDto["messages"][number];

export interface ProcessBatchResult {
  /** androidMsgIds that were successfully persisted */
  ackedIds: string[];
  /** Full saved messages (with relations) for downstream emission */
  savedMessages: MessageWithRelations[];
}

export interface ListMessagesQuery {
  offset?: number;
  limit?: number;
  simId?: string;
  extraNumberId?: string;
  direction?: "incoming" | "outgoing";
}

export interface PaginatedMessages {
  items: MessageWithRelations[];
  total: number;
  offset: number;
  limit: number;
}

export interface PaginatedConversations {
  items: ConversationSummary[];
  total: number;
  offset: number;
  limit: number;
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class SmsService {
  constructor(
    private readonly smsRepository: SmsRepository,
  ) {}

  // ─── Process Incoming Batch (Android → Backend) ───────────────────────────

  /**
   * Processes a batch of SMS messages pushed by the Android device.
   * For each message: upserts by androidMsgId (idempotent), runs code extraction.
   * Returns the list of successfully acked androidMsgIds and saved messages.
   */
  async processBatch(
    deviceId: string,
    batch: IncomingSmsMessage[],
  ): Promise<ProcessBatchResult> {
    const ackedIds: string[] = [];
    const savedMessages: MessageWithRelations[] = [];

    for (const msg of batch) {
      try {
        const code = extractCode(msg.body);

        const upserted = await this.smsRepository.upsertMessage({
          deviceId,
          simId: msg.simId,
          extraNumberId: msg.extraNumberId ?? null,
          direction: msg.direction,
          address: msg.address,
          contactId: msg.contactId ?? null,
          body: msg.body,
          extractedCode: code,
          androidMsgId: msg.androidMsgId,
          status: "pending",
          createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
        });

        ackedIds.push(msg.androidMsgId);

        // Fetch with full relations for downstream emission
        const full = await this.smsRepository.findById(upserted.id);
        if (full) {
          savedMessages.push(full);
        }

        logger.debug(
          {
            androidMsgId: msg.androidMsgId,
            messageId: upserted.id,
            extractedCode: code,
          },
          "SMS upserted",
        );
      } catch (err) {
        logger.error(
          {
            androidMsgId: msg.androidMsgId,
            error: (err as Error).message,
          },
          "Failed to upsert SMS",
        );
        // Continue processing remaining messages — don't fail the whole batch
      }
    }

    return { ackedIds, savedMessages };
  }

  // ─── Send From iOS ────────────────────────────────────────────────────────

  /**
   * Creates an outgoing SMS record when iOS wants to send through Android.
   * The message is saved as 'pending' and will be pushed to Android via WebSocket.
   */
  async createOutgoingSms(
    deviceId: string,
    dto: SmsSendDto,
  ): Promise<MessageWithRelations> {
    const androidMsgId = `ios-out-${uuidv4()}`;
    const code = extractCode(dto.body);

    const message = await this.smsRepository.upsertMessage({
      deviceId,
      simId: dto.simId,
      extraNumberId: dto.extraNumberId ?? null,
      direction: "outgoing",
      address: dto.to,
      contactId: null,
      body: dto.body,
      extractedCode: code,
      androidMsgId,
      status: "pending",
    });

    const full = await this.smsRepository.findById(message.id);
    if (!full) {
      throw new BadRequestException("Failed to create outgoing SMS");
    }

    logger.info(
      { messageId: full.id, to: dto.to, simId: dto.simId },
      "Outgoing SMS created from iOS",
    );

    return full;
  }

  // ─── Read Operations ──────────────────────────────────────────────────────

  /**
   * Get paginated message list with optional filters.
   */
  async getMessages(
    deviceIds: string[],
    query: ListMessagesQuery,
  ): Promise<PaginatedMessages> {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;

    const result = await this.smsRepository.listMessages({
      deviceIds,
      offset,
      limit,
      simId: query.simId,
      extraNumberId: query.extraNumberId,
      direction: query.direction,
    });

    return {
      items: result.items,
      total: result.total,
      offset,
      limit,
    };
  }

  /**
   * Get conversation list: grouped by address, latest message + unread count.
   */
  async getConversations(
    deviceIds: string[],
    offset: number = 0,
    limit: number = 50,
  ): Promise<PaginatedConversations> {
    const result = await this.smsRepository.getConversations(deviceIds, offset, limit);

    return {
      items: result.items,
      total: result.total,
      offset,
      limit,
    };
  }

  /**
   * Get messages for a specific conversation (by address).
   */
  async getConversationMessages(
    deviceIds: string[],
    address: string,
    offset: number = 0,
    limit: number = 50,
  ): Promise<PaginatedMessages> {
    const result = await this.smsRepository.getConversationMessages(
      deviceIds,
      address,
      offset,
      limit,
    );

    return {
      items: result.items,
      total: result.total,
      offset,
      limit,
    };
  }

  /**
   * Get a single message by ID.
   */
  async getMessageById(id: string): Promise<MessageWithRelations> {
    const message = await this.smsRepository.findById(id);
    if (!message) {
      throw new NotFoundException(`Message ${id} not found`);
    }
    return message;
  }

  /**
   * Mark all incoming messages in a conversation as read (delivered).
   */
  async markConversationRead(
    deviceIds: string[],
    address: string,
  ): Promise<{ updated: number }> {
    const updated = await this.smsRepository.markConversationRead(deviceIds, address);
    logger.info({ address, updated }, "Conversation marked as read");
    return { updated };
  }

  /**
   * Delete all messages in a conversation.
   */
  async deleteConversation(
    deviceIds: string[],
    address: string,
  ): Promise<{ deleted: number }> {
    const deleted = await this.smsRepository.deleteByAddress(deviceIds, address);
    logger.info({ address, deleted }, "Conversation deleted");
    return { deleted };
  }

  /**
   * Delete a single message.
   */
  async deleteMessage(id: string): Promise<{ success: boolean }> {
    const success = await this.smsRepository.deleteMessageById(id);
    return { success };
  }

  /**
   * Mark a message as delivered to iOS.
   */
  async markDelivered(messageId: string): Promise<void> {
    const updated = await this.smsRepository.markDelivered(messageId);
    if (!updated) {
      logger.warn({ messageId }, "Attempted to mark non-existent message as delivered");
    }
  }

  /**
   * Get all undelivered messages for reconnect sync.
   */
  async getUndelivered(deviceId: string): Promise<MessageWithRelations[]> {
    return this.smsRepository.getUndelivered(deviceId);
  }
}
