import {
  Controller,
  Put,
  Delete,
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
  extraNumberUpdateSchema,
  type ExtraNumberUpdateDto,
} from "../../shared/types/index.ts";

interface AuthenticatedRequest {
  user: JwtPayload;
}

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * Handles root-level /extra-numbers routes as defined in the spec.
 * Part of the SIMs module but mounted at a different path.
 */
@Controller("extra-numbers")
@UseGuards(JwtGuard)
export class ExtraNumbersController {
  constructor(private readonly simsService: SimsService) {}

  // ── PUT /extra-numbers/:id ────────────────────────────────────────────

  /**
   * Update an extra number.
   */
  @Put(":id")
  async updateExtraNumber(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const dto = this.validate<ExtraNumberUpdateDto>(
      extraNumberUpdateSchema,
      body,
    );
    return this.simsService.updateExtraNumber(req.user.sub, id, dto);
  }

  // ── DELETE /extra-numbers/:id ─────────────────────────────────────────

  /**
   * Delete an extra number.
   */
  @Delete(":id")
  async deleteExtraNumber(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.simsService.deleteExtraNumber(req.user.sub, id);
    return { success: true };
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
