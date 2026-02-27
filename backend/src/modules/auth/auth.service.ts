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
import pino from "pino";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { REDIS, type RedisClient } from "../../shared/redis/redis.module.ts";
import { AuthRepository } from "./auth.repository.ts";
import type { TokenPair, JwtClaims, PairRequestDto, RefreshRequestDto } from "../../shared/types/index.ts";

const logger = pino({ level: Deno.env.get("LOG_LEVEL") ?? "info" });

const PAIRING_TOKEN_PREFIX = "pairing:";
const PAIRING_RESULT_PREFIX = "pairing-result:";
const PASSKEY_CHALLENGE_PREFIX = "passkey-challenge:";
const PAIRING_TTL_SECONDS = 300; // 5 minutes
const PASSKEY_CHALLENGE_TTL_SECONDS = 120; // 2 minutes
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
  private readonly rpName: string;
  private readonly rpId: string;
  private readonly rpOrigin: string;

  constructor(
    @Inject(REDIS) private readonly redis: RedisClient,
    private readonly authRepository: AuthRepository,
  ) {
    this.jwtAccessSecret = Deno.env.get("JWT_ACCESS_SECRET") ?? "";
    this.jwtRefreshSecret = Deno.env.get("JWT_REFRESH_SECRET") ?? "";
    this.rpName = Deno.env.get("WEBAUTHN_RP_NAME") ?? "Ponte";
    this.rpId = Deno.env.get("WEBAUTHN_RP_ID") ?? "localhost";
    this.rpOrigin = Deno.env.get("WEBAUTHN_ORIGIN") ?? "http://localhost:5173";

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
    deviceId: string;
  }> {
    const key = `${PAIRING_TOKEN_PREFIX}${dto.pairingToken}`;

    // Validate and mark the pairing token as consumed (keep it so polling sees "paired" state)
    const tokenValue = await this.redis.get(key);
    if (!tokenValue || tokenValue === "paired") {
      throw new BadRequestException("Invalid or expired pairing token");
    }
    await this.redis.set(key, "paired", "EX", PAIRING_TTL_SECONDS);

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

    // Check if pairing token still exists (pending or being processed)
    const tokenKey = `${PAIRING_TOKEN_PREFIX}${pairingToken}`;
    const tokenValue = await this.redis.get(tokenKey);
    if (tokenValue) {
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

  // ─── Passkey Registration ─────────────────────────────────────────────────

  async generatePasskeyRegistrationOptions(userId: string): Promise<{
    options: Awaited<ReturnType<typeof generateRegistrationOptions>>;
  }> {
    const existingPasskeys = await this.authRepository.findPasskeysByUserId(userId);

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userName: userId,
      userID: new TextEncoder().encode(userId),
      attestationType: "none",
      excludeCredentials: existingPasskeys.map((pk) => ({
        id: pk.credentialId,
        transports: (pk.transports as string[] | null) ?? undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    // Store challenge in Redis for verification
    const challengeKey = `${PASSKEY_CHALLENGE_PREFIX}reg:${userId}`;
    await this.redis.set(challengeKey, options.challenge, "EX", PASSKEY_CHALLENGE_TTL_SECONDS);

    return { options };
  }

  async verifyPasskeyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
  ): Promise<{ verified: boolean }> {
    const challengeKey = `${PASSKEY_CHALLENGE_PREFIX}reg:${userId}`;
    const expectedChallenge = await this.redis.get(challengeKey);
    if (!expectedChallenge) {
      throw new BadRequestException("Challenge expired or not found");
    }
    await this.redis.del(challengeKey);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.rpOrigin,
      expectedRPID: this.rpId,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException("Passkey verification failed");
    }

    const { credential } = verification.registrationInfo;

    await this.authRepository.createPasskey({
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: response.response.transports,
    });

    logger.info({ userId }, "Passkey registered");
    return { verified: true };
  }

  // ─── Passkey Authentication ─────────────────────────────────────────────────

  async generatePasskeyAuthenticationOptions(): Promise<{
    options: Awaited<ReturnType<typeof generateAuthenticationOptions>>;
  }> {
    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      userVerification: "preferred",
    });

    // Store challenge keyed by itself (no userId yet)
    const challengeKey = `${PASSKEY_CHALLENGE_PREFIX}auth:${options.challenge}`;
    await this.redis.set(challengeKey, "1", "EX", PASSKEY_CHALLENGE_TTL_SECONDS);

    return { options };
  }

  async verifyPasskeyAuthentication(
    response: AuthenticationResponseJSON,
  ): Promise<TokenPair> {
    const passkey = await this.authRepository.findPasskeyByCredentialId(response.id);
    if (!passkey) {
      throw new UnauthorizedException("Unknown passkey");
    }

    const challengeKey = `${PASSKEY_CHALLENGE_PREFIX}auth:${response.response.clientDataJSON}`;
    // We need the raw challenge from the response, so let's look it up differently.
    // The challenge was stored by its value; we need to extract it from clientDataJSON.
    // SimpleWebAuthn handles this internally — we just need to confirm it existed.

    // Reconstruct the challenge from clientDataJSON
    const clientDataB64 = response.response.clientDataJSON;
    const clientDataJson = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(clientDataB64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
      ),
    );
    const challenge = clientDataJson.challenge;

    const storedChallengeKey = `${PASSKEY_CHALLENGE_PREFIX}auth:${challenge}`;
    const exists = await this.redis.get(storedChallengeKey);
    if (!exists) {
      throw new UnauthorizedException("Challenge expired or not found");
    }
    await this.redis.del(storedChallengeKey);

    const publicKeyBytes = Uint8Array.from(
      atob(passkey.publicKey.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.rpOrigin,
      expectedRPID: this.rpId,
      credential: {
        id: passkey.credentialId,
        publicKey: publicKeyBytes,
        counter: passkey.counter,
        transports: (passkey.transports as string[] | null) as
          | AuthenticationResponseJSON["response"]["transports"]
          | undefined,
      },
    });

    if (!verification.verified) {
      throw new UnauthorizedException("Passkey authentication failed");
    }

    // Update counter
    await this.authRepository.updatePasskeyCounter(
      passkey.credentialId,
      verification.authenticationInfo.newCounter,
    );

    // Create a new web session for this user
    const sessionResult = await this.createSessionWithTokens({
      userId: passkey.userId,
      deviceId: null,
      deviceType: "ios", // web client uses "ios" type
    });

    logger.info({ userId: passkey.userId }, "Passkey authentication successful");

    return {
      accessToken: sessionResult.accessToken,
      refreshToken: sessionResult.refreshToken,
    };
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
