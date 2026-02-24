import { Injectable, Inject } from "@nestjs/common";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../shared/database/database.module.ts";
import {
  notifications,
  notificationFilters,
} from "../../shared/database/schema.ts";
import type { PaginationDto } from "../../shared/types/index.ts";

// ─── Notification insert shape ──────────────────────────────────────────────

export interface InsertNotification {
  deviceId: string;
  packageName: string;
  appName: string;
  title: string;
  body: string;
  androidNotifId: string;
  postedAt: Date;
}

// ─── Filter insert/update shape ─────────────────────────────────────────────

export interface UpsertFilter {
  deviceId: string;
  packageName: string;
  enabled: boolean;
}

// ─── App sync shape ─────────────────────────────────────────────────────────

export interface AppEntry {
  packageName: string;
  appName: string;
}

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ─── Notifications ──────────────────────────────────────────────────────────

  /**
   * Upsert a single notification by androidNotifId.
   * Returns the row (inserted or existing).
   */
  async upsertNotification(data: InsertNotification) {
    const [row] = await this.db
      .insert(notifications)
      .values(data)
      .onConflictDoUpdate({
        target: notifications.androidNotifId,
        set: {
          packageName: data.packageName,
          appName: data.appName,
          title: data.title,
          body: data.body,
          postedAt: data.postedAt,
        },
      })
      .returning();

    return row;
  }

  /**
   * Upsert a batch of notifications. Returns all upserted rows.
   */
  async upsertBatch(items: InsertNotification[]) {
    if (items.length === 0) return [];

    return this.db
      .insert(notifications)
      .values(items)
      .onConflictDoUpdate({
        target: notifications.androidNotifId,
        set: {
          packageName: sql`excluded.package_name`,
          appName: sql`excluded.app_name`,
          title: sql`excluded.title`,
          body: sql`excluded.body`,
          postedAt: sql`excluded.posted_at`,
        },
      })
      .returning();
  }

  async deleteById(id: string) {
    await this.db.delete(notifications).where(eq(notifications.id, id));
  }

  /**
   * Paginated list of notifications for a device, optionally filtered by packageName.
   */
  async findByDevices(
    deviceIds: string[],
    pagination: PaginationDto,
    packageName?: string,
  ) {
    const conditions = [inArray(notifications.deviceId, deviceIds)];
    if (packageName) {
      conditions.push(eq(notifications.packageName, packageName));
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.postedAt))
        .limit(pagination.limit)
        .offset((pagination.page - 1) * pagination.limit),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    return { items, total };
  }

  // ─── Filters ────────────────────────────────────────────────────────────────

  /**
   * Get all notification filters for a device.
   */
  async findFiltersByDevices(deviceIds: string[]) {
    return this.db
      .select()
      .from(notificationFilters)
      .where(inArray(notificationFilters.deviceId, deviceIds))
      .orderBy(notificationFilters.packageName);
  }

  /**
   * Upsert a single filter by (deviceId, packageName).
   */
  async upsertFilter(data: UpsertFilter) {
    const existing = await this.db
      .select()
      .from(notificationFilters)
      .where(
        and(
          eq(notificationFilters.deviceId, data.deviceId),
          eq(notificationFilters.packageName, data.packageName),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await this.db
        .update(notificationFilters)
        .set({ enabled: data.enabled })
        .where(eq(notificationFilters.id, existing[0].id))
        .returning();
      return updated;
    }

    const [inserted] = await this.db
      .insert(notificationFilters)
      .values(data)
      .returning();

    return inserted;
  }

  /**
   * Check if a package is enabled for a device.
   * Returns true if no filter exists (default = enabled) or filter.enabled is true.
   */
  async isPackageEnabled(deviceId: string, packageName: string): Promise<boolean> {
    const [filter] = await this.db
      .select()
      .from(notificationFilters)
      .where(
        and(
          eq(notificationFilters.deviceId, deviceId),
          eq(notificationFilters.packageName, packageName),
        ),
      )
      .limit(1);

    return filter ? filter.enabled : true;
  }

  /**
   * List distinct apps (packageName + appName) from notification_filters for a device.
   * Used by the "apps" endpoint — returns all apps Android has synced.
   */
  async findAppsByDevices(deviceIds: string[]) {
    return this.db
      .select({
        packageName: notificationFilters.packageName,
        enabled: notificationFilters.enabled,
      })
      .from(notificationFilters)
      .where(inArray(notificationFilters.deviceId, deviceIds))
      .orderBy(notificationFilters.packageName);
  }

  /**
   * Bulk upsert filters for app sync.
   * Creates a filter entry for each app (default enabled = true) if not already present.
   */
  async syncApps(deviceId: string, apps: AppEntry[]) {
    if (apps.length === 0) return [];

    const values = apps.map((app) => ({
      deviceId,
      packageName: app.packageName,
      enabled: true,
    }));

    // For each app, insert if not exists. If exists, do NOT overwrite the user's enabled setting.
    const results: Array<typeof notificationFilters.$inferSelect> = [];

    for (const value of values) {
      const existing = await this.db
        .select()
        .from(notificationFilters)
        .where(
          and(
            eq(notificationFilters.deviceId, value.deviceId),
            eq(notificationFilters.packageName, value.packageName),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        results.push(existing[0]);
      } else {
        const [inserted] = await this.db
          .insert(notificationFilters)
          .values(value)
          .returning();
        results.push(inserted);
      }
    }

    return results;
  }
}
