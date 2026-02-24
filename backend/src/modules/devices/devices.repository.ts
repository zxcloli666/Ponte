import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../shared/database/database.module.ts";
import { devices } from "../../shared/database/schema.ts";

export type Device = typeof devices.$inferSelect;
export type DeviceInsert = typeof devices.$inferInsert;

@Injectable()
export class DevicesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<Device | undefined> {
    const rows = await this.db
      .select()
      .from(devices)
      .where(eq(devices.id, id))
      .limit(1);

    return rows[0];
  }

  async findByUserId(userId: string): Promise<Device[]> {
    return this.db
      .select()
      .from(devices)
      .where(eq(devices.userId, userId));
  }

  async create(data: DeviceInsert): Promise<Device> {
    const rows = await this.db
      .insert(devices)
      .values(data)
      .returning();

    return rows[0];
  }

  async update(id: string, data: Partial<Pick<DeviceInsert, "name" | "lastSeenAt">>): Promise<Device | undefined> {
    const rows = await this.db
      .update(devices)
      .set(data)
      .where(eq(devices.id, id))
      .returning();

    return rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(devices)
      .where(eq(devices.id, id))
      .returning({ id: devices.id });

    return rows.length > 0;
  }

  async updateLastSeen(id: string): Promise<void> {
    await this.db
      .update(devices)
      .set({ lastSeenAt: new Date() })
      .where(eq(devices.id, id));
  }
}
