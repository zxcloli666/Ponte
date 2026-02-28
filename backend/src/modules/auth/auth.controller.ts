import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { z } from "zod";
import { AuthService } from "./auth.service.ts";
import { JwtGuard, type JwtPayload } from "../../shared/guards/jwt.guard.ts";
import {
  pairRequestSchema,
  refreshRequestSchema,
} from "../../shared/types/index.ts";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Create a pairing token for QR display on iOS PWA. */
  @Get("qr")
  createQrToken() {
    return this.authService.createPairingToken();
  }

  /** Poll pairing status (used by web client). */
  @Get("pairing-status/:token")
  pairingStatus(@Param("token") token: string) {
    return this.authService.getPairingStatus(token);
  }

  /** Android scans QR, sends pairing token + device info. */
  @Post("pair")
  pair(@Body() body: unknown) {
    const parsed = pairRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.authService.pairDevice(parsed.data);
  }

  /** Rotate refresh token, issue new JWT pair. */
  @Post("refresh")
  refresh(@Body() body: unknown) {
    const parsed = refreshRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.authService.refreshTokens(parsed.data);
  }

  /** Invalidate current session. */
  @Post("logout")
  @UseGuards(JwtGuard)
  async logout(@Req() req: { user: JwtPayload & { sessionId: string } }) {
    await this.authService.logout(req.user.sessionId);
    return { message: "Logged out" };
  }

  // ─── Passkeys ───────────────────────────────────────────────────────────────

  /** Generate passkey registration options (requires auth). */
  @Post("passkey/register/options")
  @UseGuards(JwtGuard)
  generatePasskeyRegOptions(@Req() req: { user: JwtPayload }) {
    return this.authService.generatePasskeyRegistrationOptions(req.user.sub);
  }

  /** Verify passkey registration response (requires auth). */
  @Post("passkey/register/verify")
  @UseGuards(JwtGuard)
  verifyPasskeyRegistration(
    @Req() req: { user: JwtPayload },
    @Body() body: unknown,
  ) {
    const parsed = z.object({ response: z.any() }).safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid registration response");
    }
    return this.authService.verifyPasskeyRegistration(
      req.user.sub,
      parsed.data.response,
    );
  }

  /** Generate passkey authentication options (no auth required). */
  @Post("passkey/authenticate/options")
  generatePasskeyAuthOptions(@Req() req: { headers: { "user-agent"?: string } }) {
    return this.authService.generatePasskeyAuthenticationOptions(
      req.headers["user-agent"] ?? "unknown",
    );
  }

  /** Verify passkey authentication response (no auth required). */
  @Post("passkey/authenticate/verify")
  verifyPasskeyAuthentication(@Body() body: unknown) {
    const parsed = z.object({
      challengeId: z.string().min(1),
      response: z.any(),
    }).safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid authentication response");
    }
    return this.authService.verifyPasskeyAuthentication(
      parsed.data.challengeId,
      parsed.data.response,
    );
  }
}
