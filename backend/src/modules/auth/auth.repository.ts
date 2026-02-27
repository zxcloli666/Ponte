import { Injectable, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../shared/database/database.module.ts";
import { devices, sessions, passkeys } from "../../shared/database/schema.ts";

export interface CreateDeviceParams {
  id: string;
  userId: string;
  name: string;
  androidVersion: string;
  secretHash: string;
}

export interface CreateSessionParams {
  id: string;
  userId: string;
  deviceId: string | null;
  deviceType: "android" | "ios";
  refreshTokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async createDevice(params: CreateDeviceParams) {
    const [device] = await this.db
      .insert(devices)
      .values({
        id: params.id,
        userId: params.userId,
        name: params.name,
        androidVersion: params.androidVersion,
        secretHash: params.secretHash,
      })
      .returning();
    return device;
  }

  async findDeviceById(deviceId: string) {
    const [device] = await this.db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId))
      .limit(1);
    return device ?? null;
  }

  async createSession(params: CreateSessionParams) {
    const [session] = await this.db
      .insert(sessions)
      .values({
        id: params.id,
        userId: params.userId,
        deviceId: params.deviceId,
        deviceType: params.deviceType,
        refreshTokenHash: params.refreshTokenHash,
        expiresAt: params.expiresAt,
      })
      .returning();
    return session;
  }

  async findSessionById(sessionId: string) {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);
    return session ?? null;
  }

  async updateSessionRefreshToken(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ) {
    const [updated] = await this.db
      .update(sessions)
      .set({ refreshTokenHash, expiresAt })
      .where(eq(sessions.id, sessionId))
      .returning();
    return updated ?? null;
  }

  async deleteSession(sessionId: string) {
    const [deleted] = await this.db
      .delete(sessions)
      .where(eq(sessions.id, sessionId))
      .returning();
    return deleted ?? null;
  }

  deleteSessionsByUserId(userId: string) {
    return this.db
      .delete(sessions)
      .where(eq(sessions.userId, userId))
      .returning();
  }

  // ─── Passkeys ───────────────────────────────────────────────────────────────

  async createPasskey(params: {
    userId: string;
    credentialId: string;
    publicKey: string;
    counter: number;
    transports?: string[];
  }) {
    const [passkey] = await this.db
      .insert(passkeys)
      .values({
        userId: params.userId,
        credentialId: params.credentialId,
        publicKey: params.publicKey,
        counter: params.counter,
        transports: params.transports ?? null,
      })
      .returning();
    return passkey;
  }

  async findPasskeyByCredentialId(credentialId: string) {
    const [passkey] = await this.db
      .select()
      .from(passkeys)
      .where(eq(passkeys.credentialId, credentialId))
      .limit(1);
    return passkey ?? null;
  }

  async findPasskeysByUserId(userId: string) {
    return this.db
      .select()
      .from(passkeys)
      .where(eq(passkeys.userId, userId));
  }

  async updatePasskeyCounter(credentialId: string, counter: number) {
    const [updated] = await this.db
      .update(passkeys)
      .set({ counter })
      .where(eq(passkeys.credentialId, credentialId))
      .returning();
    return updated ?? null;
  }
}
