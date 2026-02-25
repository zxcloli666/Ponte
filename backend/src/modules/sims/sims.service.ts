import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { SimsRepository } from "./sims.repository.ts";
import type {
  SimSyncDto,
  SimUpdateDto,
  ExtraNumberCreateDto,
  ExtraNumberUpdateDto,
} from "../../shared/types/index.ts";

// ─── Return types for resolveCallerLine ──────────────────────────────────────

export interface ResolvedLine {
  extraNumberId: string | null;
  address: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class SimsService {
  constructor(private readonly simsRepository: SimsRepository) {}

  // ── SIM list ─────────────────────────────────────────────────────────────

  /**
   * List all physical SIMs (with nested extra numbers) for the current user.
   */
  listSims(userId: string) {
    return this.simsRepository.findSimsByUserId(userId);
  }

  // ── SIM sync (Android push) ──────────────────────────────────────────────

  /**
   * Upsert physical SIM cards pushed from Android.
   * Matches by iccId + deviceId. Creates new SIMs or updates existing ones.
   */
  async syncSims(userId: string, deviceId: string, dto: SimSyncDto) {
    await this.verifyDeviceOwnership(userId, deviceId);

    const results = [];

    for (const simData of dto.sims) {
      // Match by iccId if available, otherwise fall back to slotIndex
      const existing = simData.iccId
        ? await this.simsRepository.findSimByIccIdAndDeviceId(simData.iccId, deviceId)
        : await this.simsRepository.findSimBySlotIndexAndDeviceId(simData.slotIndex, deviceId);

      if (existing) {
        // Update mutable fields from Android
        const updated = await this.simsRepository.updateSim(existing.id, {
          slotIndex: simData.slotIndex,
          carrierName: simData.carrierName,
          rawNumber: simData.rawNumber ?? null,
          displayName: simData.displayName,
          displayNumber: simData.displayNumber ?? null,
          color: simData.color,
          isDefault: simData.isDefault,
        });
        results.push(updated);
      } else {
        const created = await this.simsRepository.createSim({
          deviceId,
          slotIndex: simData.slotIndex,
          iccId: simData.iccId,
          carrierName: simData.carrierName,
          rawNumber: simData.rawNumber ?? null,
          displayName: simData.displayName,
          displayNumber: simData.displayNumber ?? null,
          color: simData.color,
          isDefault: simData.isDefault,
        });
        results.push(created);
      }
    }

    return results;
  }

  // ── SIM update (user settings) ───────────────────────────────────────────

  /**
   * Update display settings for a physical SIM (name, color, displayNumber, isDefault).
   */
  async updateSim(userId: string, simId: string, dto: SimUpdateDto) {
    const sim = await this.simsRepository.findSimById(simId);
    if (!sim) throw new NotFoundException("SIM not found");

    await this.verifySimOwnership(userId, simId);

    // If setting this SIM as default, clear default on all other SIMs for the device
    if (dto.isDefault === true) {
      await this.simsRepository.clearDefaultForDevice(sim.deviceId);
    }

    return this.simsRepository.updateSim(simId, dto);
  }

  // ── Extra numbers CRUD ───────────────────────────────────────────────────

  /**
   * Create an extra number on a physical SIM.
   */
  async createExtraNumber(
    userId: string,
    simId: string,
    dto: ExtraNumberCreateDto,
  ) {
    const sim = await this.simsRepository.findSimById(simId);
    if (!sim) throw new NotFoundException("SIM not found");

    await this.verifySimOwnership(userId, simId);

    // Validate prefix uniqueness within the SIM
    const existing = sim.extraNumbers?.find((en) => en.prefix === dto.prefix);
    if (existing) {
      throw new BadRequestException(
        `Prefix "${dto.prefix}" already exists on this SIM`,
      );
    }

    return this.simsRepository.createExtraNumber({
      simId,
      prefix: dto.prefix,
      phoneNumber: dto.phoneNumber,
      displayName: dto.displayName,
      displayNumber: dto.displayNumber,
      color: dto.color,
      sortOrder: dto.sortOrder ?? 0,
    });
  }

  /**
   * Update an extra number.
   */
  async updateExtraNumber(
    userId: string,
    extraNumberId: string,
    dto: ExtraNumberUpdateDto,
  ) {
    const extraNumber = await this.simsRepository.findExtraNumberWithSim(extraNumberId);
    if (!extraNumber) throw new NotFoundException("Extra number not found");

    this.assertOwnership(extraNumber.sim.device.userId, userId);

    // If updating prefix, validate uniqueness within the same SIM
    if (dto.prefix !== undefined) {
      const siblings = await this.simsRepository.findExtraNumbersBySimId(
        extraNumber.simId,
      );
      const conflict = siblings.find(
        (en) => en.prefix === dto.prefix && en.id !== extraNumberId,
      );
      if (conflict) {
        throw new BadRequestException(
          `Prefix "${dto.prefix}" already exists on this SIM`,
        );
      }
    }

    return this.simsRepository.updateExtraNumber(extraNumberId, dto);
  }

  /**
   * Delete an extra number.
   */
  async deleteExtraNumber(userId: string, extraNumberId: string) {
    const extraNumber = await this.simsRepository.findExtraNumberWithSim(extraNumberId);
    if (!extraNumber) throw new NotFoundException("Extra number not found");

    this.assertOwnership(extraNumber.sim.device.userId, userId);

    return this.simsRepository.deleteExtraNumber(extraNumberId);
  }

  // ── Caller ID resolution (used by SMS/Calls modules) ────────────────────

  /**
   * Given a physical SIM and a raw caller ID, decode the line.
   *
   * If the SIM has extra numbers, the first 2 characters of callerId are
   * treated as a potential prefix. If a matching extra number is found,
   * the prefix is stripped and the decoded address + extraNumberId are returned.
   *
   * If no match or no extra numbers exist, the caller ID is returned as-is
   * with extraNumberId = null.
   */
  async resolveCallerLine(
    simId: string,
    callerId: string,
  ): Promise<ResolvedLine> {
    const sim = await this.simsRepository.findSimById(simId);

    // No SIM or no extra numbers: return caller ID as-is
    if (!sim || !sim.extraNumbers || sim.extraNumbers.length === 0) {
      return { extraNumberId: null, address: callerId };
    }

    // Need at least 2 chars to extract a prefix
    if (callerId.length < 3) {
      return { extraNumberId: null, address: callerId };
    }

    const potentialPrefix = callerId.substring(0, 2);

    const matched = sim.extraNumbers.find(
      (en) => en.prefix === potentialPrefix,
    );

    if (matched) {
      const decodedAddress = callerId.substring(2);
      return {
        extraNumberId: matched.id,
        address: decodedAddress,
      };
    }

    return { extraNumberId: null, address: callerId };
  }

  // ── Lookup helpers (for SMS/Calls modules) ───────────────────────────────

  /**
   * Get a SIM by ID (with extra numbers). Useful for enriching SMS/Call data.
   */
  getSimById(simId: string) {
    return this.simsRepository.findSimById(simId);
  }

  /**
   * Get an extra number by ID. Useful for enriching SMS/Call data.
   */
  getExtraNumberById(extraNumberId: string) {
    return this.simsRepository.findExtraNumberById(extraNumberId);
  }

  // ── Ownership verification ───────────────────────────────────────────────

  /**
   * Verify that a device belongs to the given user.
   */
  private async verifyDeviceOwnership(
    userId: string,
    deviceId: string,
  ): Promise<void> {
    const device = await this.simsRepository.findDeviceByIdAndUserId(
      deviceId,
      userId,
    );
    if (!device) {
      throw new ForbiddenException("Device does not belong to this user");
    }
  }

  /**
   * Verify that a SIM belongs to the user (through device ownership).
   */
  private async verifySimOwnership(
    userId: string,
    simId: string,
  ): Promise<void> {
    const device = await this.simsRepository.findDeviceBySim(simId);
    if (!device) throw new NotFoundException("SIM not found");
    this.assertOwnership(device.userId, userId);
  }

  private assertOwnership(ownerId: string, requesterId: string): void {
    if (ownerId !== requesterId) {
      throw new ForbiddenException("Access denied");
    }
  }
}
