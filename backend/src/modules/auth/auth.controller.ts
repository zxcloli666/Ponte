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
  async createQrToken() {
    return this.authService.createPairingToken();
  }

  /** Poll pairing status (used by web client). */
  @Get("pairing-status/:token")
  async pairingStatus(@Param("token") token: string) {
    return this.authService.getPairingStatus(token);
  }

  /** Android scans QR, sends pairing token + device info. */
  @Post("pair")
  async pair(@Body() body: unknown) {
    const parsed = pairRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.authService.pairDevice(parsed.data);
  }

  /** Rotate refresh token, issue new JWT pair. */
  @Post("refresh")
  async refresh(@Body() body: unknown) {
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
}
