import { Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  ContactsRepository,
  type Contact,
  type ContactPhone,
} from "./contacts.repository.ts";
import type { PaginatedResult, ContactSyncDto } from "../../shared/types/index.ts";
import pino from "pino";

const logger = pino({ level: Deno.env.get("LOG_LEVEL") ?? "info" });

// ─── Events ─────────────────────────────────────────────────────────────────

export const CONTACTS_UPDATED_EVENT = "contacts.updated";

export interface ContactsUpdatedPayload {
  deviceId: string;
  userId: string;
  inserted: number;
  updated: number;
  deleted: number;
}

// ─── Contact enrichment result (exported for SMS/Calls modules) ─────────────

export interface ContactInfo {
  id: string;
  name: string;
  photoUrl: string | null;
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class ContactsService {
  constructor(
    private readonly contactsRepository: ContactsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Sync contacts from Android device.
   *
   * Full sync (isFullSync = true): upserts all contacts from the batch,
   * soft-deletes any existing contacts not present in the batch.
   *
   * Delta sync (isFullSync = false): upserts only the provided contacts,
   * soft-deletes contacts listed in deletedIds.
   */
  async syncContacts(
    deviceId: string,
    userId: string,
    dto: ContactSyncDto,
    isFullSync: boolean = false,
  ): Promise<{ inserted: number; updated: number; deleted: number }> {
    const { contacts: incoming, deletedIds } = dto;

    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    // Track which android IDs are in this batch (for full sync cleanup)
    const batchAndroidIds = new Set<string>();

    // Upsert incoming contacts
    for (const contact of incoming) {
      batchAndroidIds.add(contact.androidId);

      const existing = await this.contactsRepository.findByAndroidIdAndDeviceId(
        contact.androidId,
        deviceId,
      );

      if (existing) {
        // Update existing contact
        await this.contactsRepository.update(existing.id, {
          name: contact.name,
          phones: contact.phones as ContactPhone[],
          photoUrl: contact.photoUrl ?? null,
        });
        updated++;
      } else {
        // Insert new contact
        await this.contactsRepository.create({
          deviceId,
          androidId: contact.androidId,
          name: contact.name,
          phones: contact.phones as ContactPhone[],
          photoUrl: contact.photoUrl ?? null,
        });
        inserted++;
      }
    }

    // Handle deletions
    if (isFullSync) {
      // Full sync: soft-delete contacts not present in the batch
      const activeContacts =
        await this.contactsRepository.findActiveAndroidIdsByDeviceId(deviceId);

      const missingAndroidIds = activeContacts
        .filter((c) => !batchAndroidIds.has(c.androidId))
        .map((c) => c.androidId);

      if (missingAndroidIds.length > 0) {
        await this.contactsRepository.softDeleteByAndroidIds(
          missingAndroidIds,
          deviceId,
        );
        deleted = missingAndroidIds.length;
      }
    } else if (deletedIds && deletedIds.length > 0) {
      // Delta sync: soft-delete explicitly listed contacts
      await this.contactsRepository.softDeleteByAndroidIds(deletedIds, deviceId);
      deleted = deletedIds.length;
    }

    logger.info(
      { deviceId, inserted, updated, deleted, isFullSync },
      "Contacts synced",
    );

    // Emit event for WebSocket gateway to notify iOS
    this.eventEmitter.emit(CONTACTS_UPDATED_EVENT, {
      deviceId,
      userId,
      inserted,
      updated,
      deleted,
    } satisfies ContactsUpdatedPayload);

    return { inserted, updated, deleted };
  }

  /**
   * Search contacts by name or phone number with pagination.
   */
  async search(
    deviceId: string,
    query: string | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Contact>> {
    const { items, total } = await this.contactsRepository.search({
      deviceId,
      query,
      page,
      limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Search contacts using userId (for iOS/web clients without deviceId).
   * Finds the user's first device and delegates to search().
   */
  async searchByUserId(
    userId: string,
    query: string | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Contact>> {
    const deviceId = await this.contactsRepository.findFirstDeviceId(userId);
    if (!deviceId) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }
    return this.search(deviceId, query, page, limit);
  }

  /**
   * Get a single contact by ID.
   * Throws NotFoundException if not found or soft-deleted.
   */
  async getContact(id: string): Promise<Contact> {
    const contact = await this.contactsRepository.findById(id);

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    return contact;
  }

  /**
   * Lookup contact by phone number for a specific device.
   * Normalizes phone number formats before matching.
   *
   * Used by SMS/Calls modules to enrich data with contact name + photo.
   */
  async findByPhone(
    deviceId: string,
    phoneNumber: string,
  ): Promise<ContactInfo | null> {
    const contact = await this.contactsRepository.findByPhone(
      deviceId,
      phoneNumber,
    );

    if (!contact) return null;

    return {
      id: contact.id,
      name: contact.name,
      photoUrl: contact.photoUrl,
    };
  }

  /**
   * Lookup contact by phone number across all devices of a user.
   * Fallback when deviceId is not available.
   */
  async findByPhoneForUser(
    userId: string,
    phoneNumber: string,
  ): Promise<ContactInfo | null> {
    const contact = await this.contactsRepository.findByPhoneForUser(
      userId,
      phoneNumber,
    );

    if (!contact) return null;

    return {
      id: contact.id,
      name: contact.name,
      photoUrl: contact.photoUrl,
    };
  }
}
