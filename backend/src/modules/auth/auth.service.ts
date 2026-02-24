import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import Redis from "ioredis";
import pino from "pino";
import { REDIS } from "../../shared/redis/redis.module.ts";
import { AuthRepository } from "./auth.repository.ts";
import type { TokenPair, JwtClaims, PairRequestDto, RefreshRequestDto } from "../../shared/types/index.ts";

const logger = pino({ level: Deno.env.get("LOG_LEVEL") ?? "info" });

const PAIRING_TOKEN_PREFIX = "pairing:";
const PAIRING_RESULT_PREFIX = "pairing-result:";
const PAIRING_TTL_SECONDS = 300; // 5 minutes
const ACCESS_TOKEN_EXPIRY = "1825d"; // ~5 years
const REFRESH_TOKEN_EXPIRY_SECONDS = 5 * 365 * 24 * 60 * 60; // 5 years
const BCRYPT_ROUNDS = 12;
const DEVICE_SECRET_BYTES = 32; // 256-bit

interface TokenPairWithSessionId extends TokenPair {
  sessionId: string;
}

@Injectable()
export class AuthService {
  private readonly jwtAccessSecret: string;
  private readonly jwtRefreshSecret: string;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly authRepository: AuthRepository,
  ) {
    this.jwtAccessSecret = Deno.env.get("JWT_ACCESS_SECRET") ?? "";
    this.jwtRefreshSecret = Deno.env.get("JWT_REFRESH_SECRET") ?? "";

    if (!this.jwtAccessSecret || !this.jwtRefreshSecret) {
      logger.warn("JWT secrets not configured — auth will fail at runtime");
    }
  }

  // ─── QR Pairing Token ──────────────────────────────────────────────────────

  async createPairingToken(): Promise<{ pairingToken: string }> {
    const pairingToken = uuidv4();
    const key = `${PAIRING_TOKEN_PREFIX}${pairingToken}`;
    await this.redis.set(key, "pending", "EX", PAIRING_TTL_SECONDS);
    return { pairingToken };
  }

  // ─── Pair Device ───────────────────────────────────────────────────────────

  async pairDevice(dto: PairRequestDto): Promise<{
    accessToken: string;
    refreshToken: string;
    deviceSecret: string;
  }> {
    const key = `${PAIRING_TOKEN_PREFIX}${dto.pairingToken}`;

    // Validate and consume the pairing token atomically
    const tokenValue = await this.redis.get(key);
    if (!tokenValue) {
      throw new BadRequestException("Invalid or expired pairing token");
    }
    await this.redis.del(key);

    // Generate userId for this paired session
    const userId = uuidv4();

    // Generate device secret (256-bit random), hash it for storage
    const deviceSecret = randomBytes(DEVICE_SECRET_BYTES).toString("hex");
    const secretHash = await bcrypt.hash(deviceSecret, BCRYPT_ROUNDS);

    // Create device record
    const deviceId = uuidv4();
    await this.authRepository.createDevice({
      id: deviceId,
      userId,
      name: dto.deviceInfo.name,
      androidVersion: dto.deviceInfo.androidVersion,
      secretHash,
    });

    // Create Android session: generate token pair, persist session
    const androidResult = await this.createSessionWithTokens({
      userId,
      deviceId,
      deviceType: "android",
    });

    // Create iOS session: generate token pair, persist session
    const iosResult = await this.createSessionWithTokens({
      userId,
      deviceId: null,
      deviceType: "ios",
    });

    // Store iOS tokens in Redis so the web client can poll for them
    const resultKey = `${PAIRING_RESULT_PREFIX}${dto.pairingToken}`;
    await this.redis.set(
      resultKey,
      JSON.stringify({
        accessToken: iosResult.accessToken,
        refreshToken: iosResult.refreshToken,
        deviceName: dto.deviceInfo.name,
      }),
      "EX",
      PAIRING_TTL_SECONDS,
    );

    logger.info({ userId, deviceId }, "Device paired successfully");

    return {
      accessToken: androidResult.accessToken,
      refreshToken: androidResult.refreshToken,
      deviceSecret,
      deviceId,
    };
  }

  // ─── Pairing Status (polled by web client) ─────────────────────────────────

  async getPairingStatus(pairingToken: string): Promise<{
    status: "pending" | "connected";
    accessToken?: string;
    refreshToken?: string;
    deviceName?: string;
  }> {
    // Check if pairing completed (result stored)
    const resultKey = `${PAIRING_RESULT_PREFIX}${pairingToken}`;
    const result = await this.redis.get(resultKey);
    if (result) {
      // Consume the result so it can't be read again
      await this.redis.del(resultKey);
      const parsed = JSON.parse(result) as {
        accessToken: string;
        refreshToken: string;
        deviceName: string;
      };
      return { status: "connected", ...parsed };
    }

    // Check if pairing token still exists (pending)
    const tokenKey = `${PAIRING_TOKEN_PREFIX}${pairingToken}`;
    const exists = await this.redis.exists(tokenKey);
    if (exists) {
      return { status: "pending" };
    }

    // Token expired or never existed
    throw new BadRequestException("Invalid or expired pairing token");
  }

  // ─── Refresh Token ─────────────────────────────────────────────────────────

  async refreshTokens(dto: RefreshRequestDto): Promise<TokenPair> {
    const payload = this.verifyRefreshToken(dto.refreshToken);

    const session = await this.authRepository.findSessionById(payload.sessionId);
    if (!session) {
      throw new UnauthorizedException("Session not found");
    }

    if (new Date() > session.expiresAt) {
      await this.authRepository.deleteSession(session.id);
      throw new UnauthorizedException("Session expired");
    }

    // Verify the refresh token hash matches
    const isValid = await bcrypt.compare(dto.refreshToken, session.refreshTokenHash);
    if (!isValid) {
      // Potential token reuse — invalidate entire session for security
      await this.authRepository.deleteSession(session.id);
      throw new UnauthorizedException("Invalid refresh token — session revoked");
    }

    // Generate new token pair reusing the same session ID
    const newPair = this.generateTokenPair(
      {
        sub: session.userId,
        deviceType: session.deviceType as "android" | "ios",
        deviceId: session.deviceId ?? undefined,
      },
      session.id,
    );

    // Rotate: update session with new refresh token hash
    const newRefreshHash = await bcrypt.hash(newPair.refreshToken, BCRYPT_ROUNDS);
    await this.authRepository.updateSessionRefreshToken(
      session.id,
      newRefreshHash,
      new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000),
    );

    logger.info({ userId: session.userId, sessionId: session.id }, "Tokens refreshed");

    return { accessToken: newPair.accessToken, refreshToken: newPair.refreshToken };
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  async logout(sessionId: string): Promise<void> {
    const deleted = await this.authRepository.deleteSession(sessionId);
    if (!deleted) {
      throw new UnauthorizedException("Session not found");
    }
    logger.info({ sessionId }, "Session invalidated");
  }

  // ─── Public Token Verification ─────────────────────────────────────────────

  verifyAccessToken(token: string): {
    sub: string;
    deviceType: "android" | "ios";
    deviceId?: string;
    sessionId: string;
  } {
    try {
      return jwt.verify(token, this.jwtAccessSecret) as {
        sub: string;
        deviceType: "android" | "ios";
        deviceId?: string;
        sessionId: string;
      };
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Creates a DB session record and generates a matching JWT pair.
   * The session ID embedded in the JWTs matches the DB row ID.
   */
  private async createSessionWithTokens(params: {
    userId: string;
    deviceId: string | null;
    deviceType: "android" | "ios";
  }): Promise<TokenPairWithSessionId> {
    const sessionId = uuidv4();

    const pair = this.generateTokenPair(
      {
        sub: params.userId,
        deviceType: params.deviceType,
        deviceId: params.deviceId ?? undefined,
      },
      sessionId,
    );

    const refreshHash = await bcrypt.hash(pair.refreshToken, BCRYPT_ROUNDS);

    await this.authRepository.createSession({
      id: sessionId,
      userId: params.userId,
      deviceId: params.deviceId,
      deviceType: params.deviceType,
      refreshTokenHash: refreshHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000),
    });

    return { ...pair, sessionId };
  }

  /**
   * Pure JWT generation — no DB side effects.
   */
  private generateTokenPair(claims: JwtClaims, sessionId: string): TokenPair {
    const accessToken = jwt.sign(
      {
        sub: claims.sub,
        deviceType: claims.deviceType,
        deviceId: claims.deviceId,
        sessionId,
      },
      this.jwtAccessSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: "HS256" },
    );

    const refreshToken = jwt.sign(
      {
        sub: claims.sub,
        sessionId,
        type: "refresh",
      },
      this.jwtRefreshSecret,
      { expiresIn: `${REFRESH_TOKEN_EXPIRY_SECONDS}s`, algorithm: "HS256" },
    );

    return { accessToken, refreshToken };
  }

  private verifyRefreshToken(token: string): {
    sub: string;
    sessionId: string;
  } {
    try {
      return jwt.verify(token, this.jwtRefreshSecret) as {
        sub: string;
        sessionId: string;
      };
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }
}
