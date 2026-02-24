import { Injectable, Inject } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../shared/database/database.module.ts";
import { sims, extraNumbers, devices } from "../../shared/database/schema.ts";

// ─── Param interfaces ────────────────────────────────────────────────────────

export interface UpsertSimParams {
  deviceId: string;
  slotIndex: number;
  iccId: string;
  carrierName: string;
  rawNumber: string | null;
  displayName: string;
  displayNumber: string | null;
  color: string;
  isDefault: boolean;
}

export interface UpdateSimParams {
  slotIndex?: number;
  carrierName?: string;
  rawNumber?: string | null;
  displayName?: string;
  displayNumber?: string | null;
  color?: string;
  isDefault?: boolean;
}

export interface CreateExtraNumberParams {
  simId: string;
  prefix: string;
  phoneNumber: string;
  displayName: string;
  displayNumber: string;
  color: string;
  sortOrder: number;
}

export interface UpdateExtraNumberParams {
  prefix?: string;
  phoneNumber?: string;
  displayName?: string;
  displayNumber?: string;
  color?: string;
  sortOrder?: number;
}

// ─── Repository ──────────────────────────────────────────────────────────────

@Injectable()
export class SimsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ── SIM queries ──────────────────────────────────────────────────────────

  /**
   * Find all SIMs belonging to a specific device, with nested extra numbers.
   */
  async findSimsByDeviceId(deviceId: string) {
    return this.db.query.sims.findMany({
      where: eq(sims.deviceId, deviceId),
      with: { extraNumbers: true },
      orderBy: (sims, { asc }) => [asc(sims.slotIndex)],
    });
  }

  /**
   * Find all SIMs for all devices owned by a given user, with nested extra numbers.
   */
  async findSimsByUserId(userId: string) {
    const userDevices = await this.db
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.userId, userId));

    if (userDevices.length === 0) return [];

    const deviceIds = userDevices.map((d) => d.id);

    const results: Awaited<ReturnType<typeof this.findSimsByDeviceId>>[] = [];
    for (const deviceId of deviceIds) {
      const deviceSims = await this.findSimsByDeviceId(deviceId);
      results.push(deviceSims);
    }

    return results.flat();
  }

  /**
   * Find a single SIM by ID.
   */
  async findSimById(simId: string) {
    const sim = await this.db.query.sims.findFirst({
      where: eq(sims.id, simId),
      with: { extraNumbers: true },
    });
    return sim ?? null;
  }

  /**
   * Find SIM by iccId + deviceId (for upsert matching).
   */
  async findSimByIccIdAndDeviceId(iccId: string, deviceId: string) {
    const [sim] = await this.db
      .select()
      .from(sims)
      .where(and(eq(sims.iccId, iccId), eq(sims.deviceId, deviceId)))
      .limit(1);
    return sim ?? null;
  }

  async findSimBySlotIndexAndDeviceId(slotIndex: number, deviceId: string) {
    const [sim] = await this.db
      .select()
      .from(sims)
      .where(and(eq(sims.slotIndex, slotIndex), eq(sims.deviceId, deviceId)))
      .limit(1);
    return sim ?? null;
  }

  /**
   * Insert a new SIM.
   */
  async createSim(params: UpsertSimParams) {
    const [sim] = await this.db
      .insert(sims)
      .values({
        deviceId: params.deviceId,
        slotIndex: params.slotIndex,
        iccId: params.iccId,
        carrierName: params.carrierName,
        rawNumber: params.rawNumber,
        displayName: params.displayName,
        displayNumber: params.displayNumber,
        color: params.color,
        isDefault: params.isDefault,
      })
      .returning();
    return sim;
  }

  /**
   * Update an existing SIM by ID (for sync and manual edits).
   */
  async updateSim(simId: string, params: UpdateSimParams) {
    const setClause: Record<string, unknown> = {};
    if (params.displayName !== undefined) setClause.displayName = params.displayName;
    if (params.displayNumber !== undefined) setClause.displayNumber = params.displayNumber;
    if (params.color !== undefined) setClause.color = params.color;
    if (params.isDefault !== undefined) setClause.isDefault = params.isDefault;
    if (params.slotIndex !== undefined) setClause.slotIndex = params.slotIndex;
    if (params.carrierName !== undefined) setClause.carrierName = params.carrierName;
    if (params.rawNumber !== undefined) setClause.rawNumber = params.rawNumber;

    if (Object.keys(setClause).length === 0) return this.findSimById(simId);

    const [updated] = await this.db
      .update(sims)
      .set(setClause)
      .where(eq(sims.id, simId))
      .returning();
    return updated ?? null;
  }

  /**
   * Clear isDefault for all SIMs on a device (used before setting a new default).
   */
  async clearDefaultForDevice(deviceId: string) {
    await this.db
      .update(sims)
      .set({ isDefault: false })
      .where(eq(sims.deviceId, deviceId));
  }

  /**
   * Find a device by ID and userId (for ownership verification).
   */
  async findDeviceByIdAndUserId(deviceId: string, userId: string) {
    const [device] = await this.db
      .select()
      .from(devices)
      .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)))
      .limit(1);
    return device ?? null;
  }

  /**
   * Find the device that owns a SIM.
   */
  async findDeviceBySim(simId: string) {
    const sim = await this.db.query.sims.findFirst({
      where: eq(sims.id, simId),
      with: { device: true },
    });
    return sim?.device ?? null;
  }

  // ── Extra number queries ─────────────────────────────────────────────────

  /**
   * Find extra numbers for a SIM.
   */
  async findExtraNumbersBySimId(simId: string) {
    return this.db
      .select()
      .from(extraNumbers)
      .where(eq(extraNumbers.simId, simId))
      .orderBy(extraNumbers.sortOrder);
  }

  /**
   * Find a single extra number by ID.
   */
  async findExtraNumberById(extraNumberId: string) {
    const [row] = await this.db
      .select()
      .from(extraNumbers)
      .where(eq(extraNumbers.id, extraNumberId))
      .limit(1);
    return row ?? null;
  }

  /**
   * Find extra number by ID, with its parent SIM and the SIM's device.
   * Used for ownership verification.
   */
  async findExtraNumberWithSim(extraNumberId: string) {
    const result = await this.db.query.extraNumbers.findFirst({
      where: eq(extraNumbers.id, extraNumberId),
      with: {
        sim: {
          with: { device: true },
        },
      },
    });
    return result ?? null;
  }

  /**
   * Create an extra number.
   */
  async createExtraNumber(params: CreateExtraNumberParams) {
    const [row] = await this.db
      .insert(extraNumbers)
      .values({
        simId: params.simId,
        prefix: params.prefix,
        phoneNumber: params.phoneNumber,
        displayName: params.displayName,
        displayNumber: params.displayNumber,
        color: params.color,
        sortOrder: params.sortOrder,
      })
      .returning();
    return row;
  }

  /**
   * Update an extra number.
   */
  async updateExtraNumber(extraNumberId: string, params: UpdateExtraNumberParams) {
    const setClause: Record<string, unknown> = {};
    if (params.prefix !== undefined) setClause.prefix = params.prefix;
    if (params.phoneNumber !== undefined) setClause.phoneNumber = params.phoneNumber;
    if (params.displayName !== undefined) setClause.displayName = params.displayName;
    if (params.displayNumber !== undefined) setClause.displayNumber = params.displayNumber;
    if (params.color !== undefined) setClause.color = params.color;
    if (params.sortOrder !== undefined) setClause.sortOrder = params.sortOrder;

    if (Object.keys(setClause).length === 0) {
      return this.findExtraNumberById(extraNumberId);
    }

    const [updated] = await this.db
      .update(extraNumbers)
      .set(setClause)
      .where(eq(extraNumbers.id, extraNumberId))
      .returning();
    return updated ?? null;
  }

  /**
   * Delete an extra number.
   */
  async deleteExtraNumber(extraNumberId: string) {
    const [deleted] = await this.db
      .delete(extraNumbers)
      .where(eq(extraNumbers.id, extraNumberId))
      .returning();
    return deleted ?? null;
  }
}
