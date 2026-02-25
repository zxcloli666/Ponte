import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  ParseUUIDPipe,
} from "@nestjs/common";
import { JwtGuard, type JwtPayload } from "../../shared/guards/jwt.guard.ts";
import { SimsService } from "./sims.service.ts";
import {
  simSyncSchema,
  simUpdateSchema,
  extraNumberCreateSchema,
  type SimSyncDto,
  type SimUpdateDto,
  type ExtraNumberCreateDto,
} from "../../shared/types/index.ts";

interface AuthenticatedRequest {
  user: JwtPayload;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@Controller("sims")
@UseGuards(JwtGuard)
export class SimsController {
  constructor(private readonly simsService: SimsService) {}

  // ── GET /sims ──────────────────────────────────────────────────────────

  /**
   * List all physical SIMs (with nested extra numbers) for the current user.
   * Works for both Android and iOS clients.
   */
  @Get()
  listSims(@Req() req: AuthenticatedRequest) {
    return this.simsService.listSims(req.user.sub);
  }

  // ── POST /sims/sync ───────────────────────────────────────────────────

  /**
   * Android pushes physical SIM cards. Upsert by iccId + deviceId.
   * Requires deviceId in JWT claims (Android-only endpoint).
   */
  @Post("sync")
  syncSims(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const deviceId = req.user.deviceId;
    if (!deviceId) {
      throw new BadRequestException(
        "Device ID required. This endpoint is for Android clients only.",
      );
    }

    const dto = this.validate<SimSyncDto>(simSyncSchema, body);
    return this.simsService.syncSims(req.user.sub, deviceId, dto);
  }

  // ── PUT /sims/:id ─────────────────────────────────────────────────────

  /**
   * Update SIM display settings (name, color, displayNumber, isDefault).
   */
  @Put(":id")
  updateSim(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const dto = this.validate<SimUpdateDto>(simUpdateSchema, body);
    return this.simsService.updateSim(req.user.sub, id, dto);
  }

  // ── POST /sims/:simId/extra-numbers ───────────────────────────────────

  /**
   * Create an extra number on a physical SIM.
   */
  @Post(":simId/extra-numbers")
  createExtraNumber(
    @Req() req: AuthenticatedRequest,
    @Param("simId", ParseUUIDPipe) simId: string,
    @Body() body: unknown,
  ) {
    const dto = this.validate<ExtraNumberCreateDto>(
      extraNumberCreateSchema,
      body,
    );
    return this.simsService.createExtraNumber(req.user.sub, simId, dto);
  }

  // ── Validation helper ─────────────────────────────────────────────────

  private validate<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Validation failed";
      throw new BadRequestException(message);
    }
  }
}
