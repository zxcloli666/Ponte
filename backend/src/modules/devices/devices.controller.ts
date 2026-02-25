import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtGuard, type JwtPayload } from "../../shared/guards/jwt.guard.ts";
import { DevicesService } from "./devices.service.ts";
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

// ─── Decorator to extract the authenticated user from JWT ───────────────────

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtPayload;
  },
);

// ─── DTO ────────────────────────────────────────────────────────────────────

// deno-lint-ignore no-unused-vars
class UpdateDeviceDto {
  name?: string;
}

// ─── Controller ─────────────────────────────────────────────────────────────

@Controller("devices")
@UseGuards(JwtGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * GET /devices
   * List all devices belonging to the authenticated user.
   */
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.devicesService.findByUserId(user.sub);
  }

  /**
   * GET /devices/:id
   * Get a single device by ID. Enforces ownership.
   */
  @Get(":id")
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.devicesService.findByIdForUser(id, user.sub);
  }

  /**
   * PUT /devices/:id
   * Update device name. Enforces ownership.
   */
  @Put(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeviceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.devicesService.update(id, user.sub, { name: dto.name });
  }

  /**
   * DELETE /devices/:id
   * Remove a device and cascade-delete all related data.
   * Enforces ownership.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.devicesService.delete(id, user.sub);
  }
}
