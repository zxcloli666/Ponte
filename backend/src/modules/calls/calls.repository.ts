import { Injectable, Inject } from "@nestjs/common";
import { eq, and, desc, sql, type SQL } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../shared/database/database.module.ts";
import {
  calls,
  sims,
  extraNumbers,
  contacts,
  devices,
} from "../../shared/database/schema.ts";
import type { PaginationDto, PaginatedResult } from "../../shared/types/index.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CallRow {
  id: string;
  deviceId: string;
  simId: string;
  extraNumberId: string | null;
  direction: "incoming" | "outgoing" | "missed";
  address: string;
  contactId: string | null;
  duration: number;
  startedAt: Date;
  endedAt: Date | null;
  androidCallId: string;
  createdAt: Date;
  sim: {
    id: string;
    displayName: string;
    displayNumber: string | null;
    color: string;
  };
  extraNumber: {
    id: string;
    displayName: string;
    displayNumber: string;
    color: string;
  } | null;
  contact: {
    id: string;
    name: string;
    photoUrl: string | null;
  } | null;
}

export interface UpsertCallInput {
  deviceId: string;
  simId: string;
  extraNumberId: string | null;
  direction: "incoming" | "outgoing" | "missed";
  address: string;
  contactId: string | null;
  duration: number;
  startedAt: string;
  endedAt: string | null;
  androidCallId: string;
}

export interface SimInfo {
  id: string;
  deviceId: string;
  displayName: string;
  displayNumber: string | null;
  color: string;
}

export interface ExtraNumberInfo {
  id: string;
  displayName: string;
  displayNumber: string;
  color: string;
}

export interface ContactInfo {
  id: string;
  name: string;
  photoUrl: string | null;
}

// ─── Shared select shape for call queries ──────────────────────────────────

const callSelectFields = {
  id: calls.id,
  deviceId: calls.deviceId,
  simId: calls.simId,
  extraNumberId: calls.extraNumberId,
  direction: calls.direction,
  address: calls.address,
  contactId: calls.contactId,
  duration: calls.duration,
  startedAt: calls.startedAt,
  endedAt: calls.endedAt,
  androidCallId: calls.androidCallId,
  createdAt: calls.createdAt,
  sim: {
    id: sims.id,
    displayName: sims.displayName,
    displayNumber: sims.displayNumber,
    color: sims.color,
  },
  extraNumber: {
    id: extraNumbers.id,
    displayName: extraNumbers.displayName,
    displayNumber: extraNumbers.displayNumber,
    color: extraNumbers.color,
  },
  contact: {
    id: contacts.id,
    name: contacts.name,
    photoUrl: contacts.photoUrl,
  },
} as const;

// ─── Repository ─────────────────────────────────────────────────────────────

@Injectable()
export class CallsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async upsertBatch(deviceId: string, batch: UpsertCallInput[]): Promise<string[]> {
    if (batch.length === 0) return [];

    const ackedIds: string[] = [];

    for (const call of batch) {
      // Resolve contactId from address if not provided
      let contactId = call.contactId;
      if (!contactId && call.address) {
        const contact = await this.findContactByAddress(deviceId, call.address);
        if (contact) contactId = contact.id;
      }

      await this.db
        .insert(calls)
        .values({
          deviceId,
          simId: call.simId,
          extraNumberId: call.extraNumberId,
          direction: call.direction,
          address: call.address,
          contactId,
          duration: call.duration,
          startedAt: new Date(call.startedAt),
          endedAt: call.endedAt ? new Date(call.endedAt) : null,
          androidCallId: call.androidCallId,
        })
        .onConflictDoUpdate({
          target: calls.androidCallId,
          set: {
            direction: call.direction,
            duration: call.duration,
            endedAt: call.endedAt ? new Date(call.endedAt) : null,
            contactId,
          },
        });

      ackedIds.push(call.androidCallId);
    }

    return ackedIds;
  }

  async findById(callId: string, userId: string): Promise<CallRow | null> {
    const rows = await this.db
      .select(callSelectFields)
      .from(calls)
      .innerJoin(sims, eq(calls.simId, sims.id))
      .leftJoin(extraNumbers, eq(calls.extraNumberId, extraNumbers.id))
      .leftJoin(contacts, eq(calls.contactId, contacts.id))
      .innerJoin(devices, eq(calls.deviceId, devices.id))
      .where(and(eq(calls.id, callId), eq(devices.userId, userId)))
      .limit(1);

    return rows[0] ?? null;
  }

  async findPaginated(
    userId: string,
    pagination: PaginationDto,
    filters: { direction?: string; simId?: string; extraNumberId?: string },
  ): Promise<PaginatedResult<CallRow>> {
    const conditions: SQL[] = [
      eq(devices.userId, userId),
    ];

    if (filters.direction) {
      conditions.push(eq(calls.direction, filters.direction as "incoming" | "outgoing" | "missed"));
    }
    if (filters.simId) {
      conditions.push(eq(calls.simId, filters.simId));
    }
    if (filters.extraNumberId) {
      conditions.push(eq(calls.extraNumberId, filters.extraNumberId));
    }

    const whereClause = and(...conditions)!;
    const offset = (pagination.page - 1) * pagination.limit;

    const [items, countResult] = await Promise.all([
      this.db
        .select(callSelectFields)
        .from(calls)
        .innerJoin(sims, eq(calls.simId, sims.id))
        .leftJoin(extraNumbers, eq(calls.extraNumberId, extraNumbers.id))
        .leftJoin(contacts, eq(calls.contactId, contacts.id))
        .innerJoin(devices, eq(calls.deviceId, devices.id))
        .where(whereClause)
        .orderBy(desc(calls.startedAt))
        .limit(pagination.limit)
        .offset(offset),

      this.db
        .select({ count: sql<number>`count(*)` })
        .from(calls)
        .innerJoin(devices, eq(calls.deviceId, devices.id))
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async findContactByAddress(
    deviceId: string,
    address: string,
  ): Promise<ContactInfo | null> {
    const rows = await this.db
      .select({
        id: contacts.id,
        name: contacts.name,
        photoUrl: contacts.photoUrl,
        phones: contacts.phones,
      })
      .from(contacts)
      .where(eq(contacts.deviceId, deviceId));

    const normalizedAddress = address.replace(/[^+\d]/g, "");

    for (const row of rows) {
      const phones = row.phones as { number: string; type: string; label: string }[];
      const match = phones.some(
        (p) => p.number.replace(/[^+\d]/g, "") === normalizedAddress,
      );
      if (match) {
        return { id: row.id, name: row.name, photoUrl: row.photoUrl };
      }
    }

    return null;
  }

  async findSimById(simId: string): Promise<SimInfo | null> {
    const rows = await this.db
      .select({
        id: sims.id,
        deviceId: sims.deviceId,
        displayName: sims.displayName,
        displayNumber: sims.displayNumber,
        color: sims.color,
      })
      .from(sims)
      .where(eq(sims.id, simId))
      .limit(1);

    return rows[0] ?? null;
  }

  async findExtraNumberById(extraNumberId: string): Promise<ExtraNumberInfo | null> {
    const rows = await this.db
      .select({
        id: extraNumbers.id,
        displayName: extraNumbers.displayName,
        displayNumber: extraNumbers.displayNumber,
        color: extraNumbers.color,
      })
      .from(extraNumbers)
      .where(eq(extraNumbers.id, extraNumberId))
      .limit(1);

    return rows[0] ?? null;
  }

}
