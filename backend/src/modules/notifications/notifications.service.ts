import { Injectable } from "@nestjs/common";
import pino from "pino";
import {
  NotificationsRepository,
  type InsertNotification,
  type AppEntry,
} from "./notifications.repository.ts";
import type {
  NotificationPushDto,
  PaginationDto,
  PaginatedResult,
} from "../../shared/types/index.ts";
import type { notifications, notificationFilters } from "../../shared/database/schema.ts";

const logger = pino({ level: Deno.env.get("LOG_LEVEL") ?? "info" });

type Notification = typeof notifications.$inferSelect;
type NotificationFilter = typeof notificationFilters.$inferSelect;

@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  // ─── Process batch from Android ─────────────────────────────────────────────

  /**
   * Android pushes a batch of notifications.
   * 1. Upsert each by androidNotifId for idempotency.
   * 2. Filter out disabled packages.
   * 3. Return the full list of acked androidNotifIds and the notifications to forward to iOS.
   */
  async processBatch(
    deviceId: string,
    batch: NotificationPushDto["notifications"],
  ): Promise<{ ackedIds: string[]; toForward: Notification[] }> {
    const insertions: InsertNotification[] = batch.map((n) => ({
      deviceId,
      packageName: n.packageName,
      appName: n.appName,
      title: n.title,
      body: n.body,
      androidNotifId: n.androidNotifId,
      postedAt: new Date(n.postedAt),
    }));

    const upserted = await this.repository.upsertBatch(insertions);

    logger.info(
      { deviceId, batchSize: batch.length, upsertedCount: upserted.length },
      "Notification batch processed",
    );

    // All androidNotifIds are acked regardless of filter status
    const ackedIds = upserted.map((n) => n.androidNotifId);

    // Determine which notifications pass the filter for forwarding to iOS
    const toForward: Notification[] = [];
    for (const notification of upserted) {
      const enabled = await this.repository.isPackageEnabled(
        deviceId,
        notification.packageName,
      );
      if (enabled) {
        toForward.push(notification);
      }
    }

    logger.debug(
      { deviceId, total: ackedIds.length, forwarded: toForward.length },
      "Notifications filtered for iOS delivery",
    );

    return { ackedIds, toForward };
  }

  // ─── List notifications (REST) ──────────────────────────────────────────────

  async listNotifications(
    deviceIds: string[],
    pagination: PaginationDto,
    packageName?: string,
  ): Promise<PaginatedResult<Notification>> {
    const { items, total } = await this.repository.findByDevices(
      deviceIds,
      pagination,
      packageName,
    );

    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async deleteNotification(id: string): Promise<{ success: boolean }> {
    await this.repository.deleteById(id);
    return { success: true };
  }

  // ─── Filters ────────────────────────────────────────────────────────────────

  async getFilters(deviceIds: string[]): Promise<NotificationFilter[]> {
    return this.repository.findFiltersByDevices(deviceIds);
  }

  async updateFilter(
    deviceId: string,
    packageName: string,
    enabled: boolean,
  ): Promise<NotificationFilter> {
    const filter = await this.repository.upsertFilter({
      deviceId,
      packageName,
      enabled,
    });

    logger.info(
      { deviceId, packageName, enabled },
      "Notification filter updated",
    );

    return filter;
  }

  // ─── Apps sync ──────────────────────────────────────────────────────────────

  async getApps(deviceIds: string[]) {
    return this.repository.findAppsByDevices(deviceIds);
  }

  /**
   * Android pushes the list of installed apps.
   * Creates filter entries for new apps (default enabled = true),
   * preserves existing user-configured filter state.
   */
  async syncApps(
    deviceId: string,
    apps: AppEntry[],
  ): Promise<NotificationFilter[]> {
    const filters = await this.repository.syncApps(deviceId, apps);

    logger.info(
      { deviceId, appsCount: apps.length },
      "Apps synced",
    );

    return filters;
  }
}
