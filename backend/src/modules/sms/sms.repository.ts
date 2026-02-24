import { Injectable, Inject } from "@nestjs/common";
import { eq, and, desc, sql, inArray, type SQL } from "drizzle-orm";
import { devices } from "../../shared/database/schema.ts";
import { DRIZZLE, type DrizzleDB } from "../../shared/database/database.module.ts";
import {
  messages,
  sims,
  extraNumbers,
  contacts,
} from "../../shared/database/schema.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Message = typeof messages.$inferSelect;
export type MessageInsert = typeof messages.$inferInsert;

export interface MessageWithRelations extends Message {
  sim: typeof sims.$inferSelect | null;
  extraNumber: typeof extraNumbers.$inferSelect | null;
  contact: typeof contacts.$inferSelect | null;
}

export interface ConversationSummary {
  address: string;
  lastMessage: MessageWithRelations;
  unreadCount: number;
}

export interface ListMessagesParams {
  deviceIds: string[];
  offset?: number;
  limit?: number;
  simId?: string;
  extraNumberId?: string;
  direction?: "incoming" | "outgoing";
}

// ─── Repository ─────────────────────────────────────────────────────────────

@Injectable()
export class SmsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Upsert a message by androidMsgId (idempotent).
   * If it already exists, updates body, extractedCode, and status.
   * Returns the upserted row.
   */
  async upsertMessage(data: MessageInsert): Promise<Message> {
    const [row] = await this.db
      .insert(messages)
      .values(data)
      .onConflictDoUpdate({
        target: messages.androidMsgId,
        set: {
          body: data.body,
          extractedCode: data.extractedCode,
          status: data.status,
          contactId: data.contactId,
        },
      })
      .returning();

    return row;
  }

  /**
   * Fetch a single message by ID, including related sim, extraNumber, contact.
   */
  async findById(id: string): Promise<MessageWithRelations | null> {
    const rows = await this.db
      .select({
        message: messages,
        sim: sims,
        extraNumber: extraNumbers,
        contact: contacts,
      })
      .from(messages)
      .leftJoin(sims, eq(messages.simId, sims.id))
      .leftJoin(extraNumbers, eq(messages.extraNumberId, extraNumbers.id))
      .leftJoin(contacts, eq(messages.contactId, contacts.id))
      .where(eq(messages.id, id))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      ...row.message,
      sim: row.sim,
      extraNumber: row.extraNumber,
      contact: row.contact,
    };
  }

  /**
   * Fetch a single message by androidMsgId.
   */
  async findByAndroidMsgId(androidMsgId: string): Promise<Message | null> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.androidMsgId, androidMsgId))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * List messages with pagination and optional filters.
   */
  async listMessages(
    params: ListMessagesParams,
  ): Promise<{ items: MessageWithRelations[]; total: number }> {
    const { deviceIds, offset = 0, limit = 50, simId, extraNumberId, direction } = params;

    const conditions: SQL[] = [inArray(messages.deviceId, deviceIds)];

    if (simId) {
      conditions.push(eq(messages.simId, simId));
    }
    if (extraNumberId) {
      conditions.push(eq(messages.extraNumberId, extraNumberId));
    }
    if (direction) {
      conditions.push(eq(messages.direction, direction));
    }

    const whereClause = and(...conditions)!;

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(whereClause);

    const rows = await this.db
      .select({
        message: messages,
        sim: sims,
        extraNumber: extraNumbers,
        contact: contacts,
      })
      .from(messages)
      .leftJoin(sims, eq(messages.simId, sims.id))
      .leftJoin(extraNumbers, eq(messages.extraNumberId, extraNumbers.id))
      .leftJoin(contacts, eq(messages.contactId, contacts.id))
      .where(whereClause)
      .orderBy(desc(messages.createdAt))
      .offset(offset)
      .limit(limit);

    const items = rows.map((row) => ({
      ...row.message,
      sim: row.sim,
      extraNumber: row.extraNumber,
      contact: row.contact,
    }));

    return { items, total: countResult.count };
  }

  /**
   * Get conversation list: group by address, return latest message + unread count per thread.
   * "Unread" = incoming messages with status != 'delivered'.
   */
  async getConversations(
    deviceIds: string[],
    offset: number = 0,
    limit: number = 50,
  ): Promise<{ items: ConversationSummary[]; total: number }> {
    const deviceFilter = inArray(messages.deviceId, deviceIds);

    // Subquery: for each address, get the latest message ID and the unread count
    const conversationsQuery = this.db
      .select({
        address: messages.address,
        lastMessageId: sql<string>`(
          SELECT m2.id FROM messages m2
          WHERE m2.device_id = ANY(ARRAY[${sql.join(deviceIds.map(id => sql`${id}::uuid`), sql`, `)}])
            AND m2.address = messages.address
          ORDER BY m2.created_at DESC
          LIMIT 1
        )`.as("last_message_id"),
        unreadCount: sql<number>`
          count(*) FILTER (
            WHERE ${messages.direction} = 'incoming'
              AND ${messages.status} != 'delivered'
          )::int
        `.as("unread_count"),
        lastCreatedAt: sql<Date>`max(${messages.createdAt})`.as("last_created_at"),
      })
      .from(messages)
      .where(deviceFilter)
      .groupBy(messages.address)
      .orderBy(sql`max(${messages.createdAt}) DESC`)
      .offset(offset)
      .limit(limit)
      .as("conversations");

    // Count total unique addresses
    const [countResult] = await this.db
      .select({ count: sql<number>`count(DISTINCT ${messages.address})::int` })
      .from(messages)
      .where(deviceFilter);

    // Execute conversation query
    const convRows = await this.db
      .select({
        address: conversationsQuery.address,
        lastMessageId: conversationsQuery.lastMessageId,
        unreadCount: conversationsQuery.unreadCount,
      })
      .from(conversationsQuery);

    // Fetch the full last message for each conversation (with joins)
    const items: ConversationSummary[] = [];

    for (const conv of convRows) {
      const lastMessage = await this.findById(conv.lastMessageId);
      if (lastMessage) {
        items.push({
          address: conv.address,
          lastMessage,
          unreadCount: conv.unreadCount,
        });
      }
    }

    return { items, total: countResult.count };
  }

  /**
   * Get messages for a specific conversation (by address), with pagination.
   */
  async getConversationMessages(
    deviceIds: string[],
    address: string,
    offset: number = 0,
    limit: number = 50,
  ): Promise<{ items: MessageWithRelations[]; total: number }> {
    const whereClause = and(
      inArray(messages.deviceId, deviceIds),
      eq(messages.address, address),
    )!;

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(whereClause);

    const rows = await this.db
      .select({
        message: messages,
        sim: sims,
        extraNumber: extraNumbers,
        contact: contacts,
      })
      .from(messages)
      .leftJoin(sims, eq(messages.simId, sims.id))
      .leftJoin(extraNumbers, eq(messages.extraNumberId, extraNumbers.id))
      .leftJoin(contacts, eq(messages.contactId, contacts.id))
      .where(whereClause)
      .orderBy(desc(messages.createdAt))
      .offset(offset)
      .limit(limit);

    const items = rows.map((row) => ({
      ...row.message,
      sim: row.sim,
      extraNumber: row.extraNumber,
      contact: row.contact,
    }));

    return { items, total: countResult.count };
  }

  /**
   * Mark a message as delivered (set status + deliveredAt).
   */
  async markDelivered(messageId: string): Promise<Message | null> {
    const [updated] = await this.db
      .update(messages)
      .set({
        status: "delivered",
        deliveredAt: new Date(),
      })
      .where(eq(messages.id, messageId))
      .returning();

    return updated ?? null;
  }

  /**
   * Mark all incoming messages in a conversation as delivered (read).
   */
  async markConversationRead(
    deviceIds: string[],
    address: string,
  ): Promise<number> {
    const result = await this.db
      .update(messages)
      .set({
        status: "delivered",
        deliveredAt: new Date(),
      })
      .where(
        and(
          inArray(messages.deviceId, deviceIds),
          eq(messages.address, address),
          eq(messages.direction, "incoming"),
          sql`${messages.status} != 'delivered'`,
        ),
      )
      .returning({ id: messages.id });

    return result.length;
  }

  /**
   * Delete all messages in a conversation by address.
   */
  async deleteByAddress(deviceIds: string[], address: string): Promise<number> {
    const result = await this.db
      .delete(messages)
      .where(
        and(
          inArray(messages.deviceId, deviceIds),
          eq(messages.address, address),
        ),
      )
      .returning({ id: messages.id });

    return result.length;
  }

  /**
   * Delete a single message by ID.
   */
  async deleteMessageById(id: string): Promise<boolean> {
    const result = await this.db
      .delete(messages)
      .where(eq(messages.id, id))
      .returning({ id: messages.id });

    return result.length > 0;
  }

  /**
   * Get all undelivered messages for a device (for reconnect sync).
   */
  async getUndelivered(deviceId: string): Promise<MessageWithRelations[]> {
    const rows = await this.db
      .select({
        message: messages,
        sim: sims,
        extraNumber: extraNumbers,
        contact: contacts,
      })
      .from(messages)
      .leftJoin(sims, eq(messages.simId, sims.id))
      .leftJoin(extraNumbers, eq(messages.extraNumberId, extraNumbers.id))
      .leftJoin(contacts, eq(messages.contactId, contacts.id))
      .where(
        and(
          eq(messages.deviceId, deviceId),
          eq(messages.direction, "incoming"),
          sql`${messages.status} != 'delivered'`,
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(200);

    return rows.map((row) => ({
      ...row.message,
      sim: row.sim,
      extraNumber: row.extraNumber,
      contact: row.contact,
    }));
  }
}
