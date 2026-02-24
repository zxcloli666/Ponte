import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, ilike, sql, or } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../shared/database/database.module.ts";
import { contacts, devices } from "../../shared/database/schema.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Contact = typeof contacts.$inferSelect;
export type ContactInsert = typeof contacts.$inferInsert;

export interface ContactPhone {
  number: string;
  type: string;
  label: string;
}

export interface UpsertContactParams {
  deviceId: string;
  androidId: string;
  name: string;
  phones: ContactPhone[];
  photoUrl: string | null;
}

export interface ContactSearchParams {
  deviceId: string;
  query?: string;
  page: number;
  limit: number;
}

// ─── Repository ─────────────────────────────────────────────────────────────

@Injectable()
export class ContactsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Find a contact by androidId + deviceId (for upsert matching during sync).
   * Only returns non-deleted contacts.
   */
  async findByAndroidIdAndDeviceId(
    androidId: string,
    deviceId: string,
  ): Promise<Contact | null> {
    const [row] = await this.db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.androidId, androidId),
          eq(contacts.deviceId, deviceId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  /**
   * Find a single contact by ID. Excludes soft-deleted.
   */
  async findById(id: string): Promise<Contact | null> {
    const [row] = await this.db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  /**
   * Insert a new contact.
   */
  async create(params: UpsertContactParams): Promise<Contact> {
    const [row] = await this.db
      .insert(contacts)
      .values({
        deviceId: params.deviceId,
        androidId: params.androidId,
        name: params.name,
        phones: params.phones,
        photoUrl: params.photoUrl,
      })
      .returning();
    return row;
  }

  /**
   * Update an existing contact's mutable fields.
   */
  async update(
    id: string,
    params: { name: string; phones: ContactPhone[]; photoUrl: string | null },
  ): Promise<Contact> {
    const [row] = await this.db
      .update(contacts)
      .set({
        name: params.name,
        phones: params.phones,
        photoUrl: params.photoUrl,
        updatedAt: new Date(),
        deletedAt: null, // restore if was soft-deleted
      })
      .where(eq(contacts.id, id))
      .returning();
    return row;
  }

  /**
   * Soft-delete a contact by setting deletedAt.
   */
  async softDelete(id: string): Promise<void> {
    await this.db
      .update(contacts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(contacts.id, id));
  }

  /**
   * Soft-delete multiple contacts by their IDs.
   */
  async softDeleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const now = new Date();
    for (const id of ids) {
      await this.db
        .update(contacts)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(contacts.id, id));
    }
  }

  /**
   * Soft-delete contacts by androidId + deviceId.
   * Used during full sync for contacts absent from the batch.
   */
  async softDeleteByAndroidIds(
    androidIds: string[],
    deviceId: string,
  ): Promise<void> {
    if (androidIds.length === 0) return;

    const now = new Date();
    for (const androidId of androidIds) {
      await this.db
        .update(contacts)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(contacts.androidId, androidId),
            eq(contacts.deviceId, deviceId),
            isNull(contacts.deletedAt),
          ),
        );
    }
  }

  /**
   * Get all non-deleted android IDs for a device.
   * Used during full sync to determine which contacts to soft-delete.
   */
  async findActiveAndroidIdsByDeviceId(
    deviceId: string,
  ): Promise<{ id: string; androidId: string }[]> {
    return this.db
      .select({ id: contacts.id, androidId: contacts.androidId })
      .from(contacts)
      .where(
        and(eq(contacts.deviceId, deviceId), isNull(contacts.deletedAt)),
      );
  }

  /**
   * Search contacts by name (ILIKE) or by phone number (normalized digit match).
   * Supports pagination. Only returns non-deleted contacts.
   */
  async search(params: ContactSearchParams): Promise<{
    items: Contact[];
    total: number;
  }> {
    const { deviceId, query, page, limit } = params;
    const offset = (page - 1) * limit;

    // Resolve all device IDs belonging to the same user
    const deviceIds = await this.resolveUserDeviceIds(deviceId);

    // Base condition: device ownership + not deleted
    const deviceCondition =
      deviceIds.length === 1
        ? eq(contacts.deviceId, deviceIds[0])
        : sql`${contacts.deviceId} = ANY(${deviceIds})`;

    const baseCondition = and(deviceCondition, isNull(contacts.deletedAt));

    let whereCondition = baseCondition;

    if (query && query.trim().length > 0) {
      const trimmed = query.trim();
      const normalizedDigits = trimmed.replace(/\D/g, "");

      if (normalizedDigits.length >= 3) {
        // Search by name OR by phone number (strip non-digits from stored numbers)
        whereCondition = and(
          baseCondition,
          or(
            ilike(contacts.name, `%${trimmed}%`),
            // Match normalized phone digits inside the JSONB phones array
            sql`EXISTS (
              SELECT 1 FROM jsonb_array_elements(${contacts.phones}) AS phone
              WHERE regexp_replace(phone->>'number', '[^0-9]', '', 'g')
              LIKE '%' || ${normalizedDigits} || '%'
            )`,
          ),
        );
      } else {
        // Short query: only search by name
        whereCondition = and(baseCondition, ilike(contacts.name, `%${trimmed}%`));
      }
    }

    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(contacts)
        .where(whereCondition!)
        .orderBy(contacts.name)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .where(whereCondition!),
    ]);

    return { items, total: countResult[0]?.count ?? 0 };
  }

  /**
   * Find a contact by matching a phone number against the JSONB phones array.
   * Normalizes both the search number and stored numbers by stripping non-digits.
   * Returns the first match for the given device.
   */
  async findByPhone(
    deviceId: string,
    phoneNumber: string,
  ): Promise<Contact | null> {
    const normalizedDigits = phoneNumber.replace(/\D/g, "");

    if (normalizedDigits.length === 0) return null;

    // For robust matching, we use suffix comparison on normalized digit strings.
    // This handles cases where one number has a country code and the other does not.
    // E.g. "79991234567" matches "+7 (999) 123-45-67" and "9991234567".
    // We also handle the reverse: a shorter stored number matching a longer search.
    const [row] = await this.db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.deviceId, deviceId),
          isNull(contacts.deletedAt),
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements(${contacts.phones}) AS phone
            WHERE regexp_replace(phone->>'number', '[^0-9]', '', 'g')
            LIKE '%' || ${normalizedDigits}
            OR ${normalizedDigits}
            LIKE '%' || regexp_replace(phone->>'number', '[^0-9]', '', 'g')
          )`,
        ),
      )
      .limit(1);

    return row ?? null;
  }

  /**
   * Find contacts by phone number across all devices of a user.
   * Used for contact enrichment by SMS/Calls modules.
   */
  async findByPhoneForUser(
    userId: string,
    phoneNumber: string,
  ): Promise<Contact | null> {
    const normalizedDigits = phoneNumber.replace(/\D/g, "");
    if (normalizedDigits.length === 0) return null;

    const userDevices = await this.db
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.userId, userId));

    if (userDevices.length === 0) return null;

    for (const device of userDevices) {
      const result = await this.findByPhone(device.id, phoneNumber);
      if (result) return result;
    }

    return null;
  }

  /**
   * Find the first device ID for a user (for iOS/web clients).
   */
  async findFirstDeviceId(userId: string): Promise<string | null> {
    const [device] = await this.db
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.userId, userId))
      .limit(1);
    return device?.id ?? null;
  }

  /**
   * Resolve all device IDs for the user who owns the given device.
   * This enables searching contacts across all the user's devices.
   */
  private async resolveUserDeviceIds(deviceId: string): Promise<string[]> {
    const [device] = await this.db
      .select({ userId: devices.userId })
      .from(devices)
      .where(eq(devices.id, deviceId))
      .limit(1);

    if (!device) return [deviceId];

    const userDevices = await this.db
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.userId, device.userId));

    return userDevices.map((d) => d.id);
  }
}
