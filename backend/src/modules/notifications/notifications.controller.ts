import {
  Controller,
  Delete,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  ParseUUIDPipe,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service.ts";
import { JwtGuard, type JwtPayload } from "../../shared/guards/jwt.guard.ts";
import { DevicesService } from "../devices/devices.service.ts";
import { resolveDeviceIds } from "../../shared/helpers/resolve-device.ts";
import {
  paginationSchema,
  notificationFilterUpdateSchema,
  type NotificationFilterUpdateDto,
  type PaginationDto,
} from "../../shared/types/index.ts";

@Controller("notifications")
@UseGuards(JwtGuard)
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly devicesService: DevicesService,
  ) {}

  // ─── GET /notifications ───────────────────────────────────────────────────

  @Get()
  async list(
    @Req() req: { user: JwtPayload },
    @Query() query: Record<string, string>,
  ) {
    const pagination: PaginationDto = paginationSchema.parse(query);
    const packageName = query.packageName;
    const deviceIds = await resolveDeviceIds(this.devicesService, req.user, query.deviceId);

    return this.service.listNotifications(deviceIds, pagination, packageName);
  }

  // ─── GET /notifications/filters ───────────────────────────────────────────

  @Get("filters")
  async getFilters(
    @Req() req: { user: JwtPayload },
    @Query() query: Record<string, string>,
  ) {
    const deviceIds = await resolveDeviceIds(this.devicesService, req.user, query.deviceId);
    // Filters are per-device, return merged list from all devices
    return this.service.getFilters(deviceIds);
  }

  // ─── PUT /notifications/filters/:packageName ─────────────────────────────

  @Put("filters/:packageName")
  updateFilter(
    @Req() req: { user: JwtPayload },
    @Param("packageName") packageName: string,
    @Body() body: unknown,
    @Query() query: Record<string, string>,
  ) {
    const { enabled }: NotificationFilterUpdateDto =
      notificationFilterUpdateSchema.parse(body);

    // Update filter requires specific deviceId
    const deviceId = req.user.deviceId ?? query.deviceId;
    if (!deviceId) {
      throw new BadRequestException("deviceId is required for updating filters");
    }

    return this.service.updateFilter(deviceId, packageName, enabled);
  }

  // ─── DELETE /notifications/:id ───────────────────────────────────────────

  @Delete(":id")
  dismiss(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.deleteNotification(id);
  }

  // ─── GET /notifications/apps ──────────────────────────────────────────────

  @Get("apps")
  async getApps(
    @Req() req: { user: JwtPayload },
    @Query() query: Record<string, string>,
  ) {
    const deviceIds = await resolveDeviceIds(this.devicesService, req.user, query.deviceId);
    return this.service.getApps(deviceIds);
  }
}
