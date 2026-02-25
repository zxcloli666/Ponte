import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { JwtGuard, type JwtPayload } from "../../shared/guards/jwt.guard.ts";
import { SmsService } from "./sms.service.ts";
import { DevicesService } from "../devices/devices.service.ts";
import { resolveDeviceIds } from "../../shared/helpers/resolve-device.ts";

// ─── Query DTOs ─────────────────────────────────────────────────────────────

interface ListSmsQuery {
  offset?: string;
  limit?: string;
  simId?: string;
  extraNumberId?: string;
  direction?: string;
}

interface PaginationQuery {
  offset?: string;
  limit?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseOffset(raw?: string): number {
  const n = parseInt(raw ?? "0", 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

function parseLimit(raw?: string): number {
  const n = parseInt(raw ?? "50", 10);
  if (Number.isNaN(n) || n < 1) return 50;
  return Math.min(n, 100);
}

function parseDirection(raw?: string): "incoming" | "outgoing" | undefined {
  if (raw === "incoming" || raw === "outgoing") return raw;
  return undefined;
}

// ─── Controller ─────────────────────────────────────────────────────────────

@Controller("sms")
@UseGuards(JwtGuard)
export class SmsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly devicesService: DevicesService,
  ) {}

  /**
   * GET /sms — List SMS messages with pagination and optional filters.
   */
  @Get()
  async listMessages(
    @Req() req: { user: JwtPayload },
    @Query() query: ListSmsQuery & { deviceId?: string },
  ) {
    const deviceIds = await resolveDeviceIds(this.devicesService, req.user, query.deviceId);

    return this.smsService.getMessages(deviceIds, {
      offset: parseOffset(query.offset),
      limit: parseLimit(query.limit),
      simId: query.simId,
      extraNumberId: query.extraNumberId,
      direction: parseDirection(query.direction),
    });
  }

  /**
   * GET /sms/conversations — Conversation list grouped by address.
   */
  @Get("conversations")
  async listConversations(
    @Req() req: { user: JwtPayload },
    @Query() query: PaginationQuery & { deviceId?: string },
  ) {
    const deviceIds = await resolveDeviceIds(this.devicesService, req.user, query.deviceId);

    return this.smsService.getConversations(
      deviceIds,
      parseOffset(query.offset),
      parseLimit(query.limit),
    );
  }

  /**
   * GET /sms/conversations/:address — Messages for a specific conversation.
   */
  @Get("conversations/:address")
  async getConversation(
    @Req() req: { user: JwtPayload },
    @Param("address") address: string,
    @Query() query: PaginationQuery & { deviceId?: string },
  ) {
    const deviceIds = await resolveDeviceIds(this.devicesService, req.user, query.deviceId);

    return this.smsService.getConversationMessages(
      deviceIds,
      decodeURIComponent(address),
      parseOffset(query.offset),
      parseLimit(query.limit),
    );
  }

  /**
   * PUT /sms/conversations/:address/read — Mark conversation as read.
   */
  @Put("conversations/:address/read")
  async markConversationRead(
    @Req() req: { user: JwtPayload },
    @Param("address") address: string,
    @Query() query: { deviceId?: string },
  ) {
    const deviceIds = await resolveDeviceIds(this.devicesService, req.user, query.deviceId);
    return this.smsService.markConversationRead(deviceIds, decodeURIComponent(address));
  }

  /**
   * DELETE /sms/conversations/:address — Delete entire conversation.
   */
  @Delete("conversations/:address")
  async deleteConversation(
    @Req() req: { user: JwtPayload },
    @Param("address") address: string,
    @Query() query: { deviceId?: string },
  ) {
    const deviceIds = await resolveDeviceIds(this.devicesService, req.user, query.deviceId);
    return this.smsService.deleteConversation(deviceIds, decodeURIComponent(address));
  }

  /**
   * GET /sms/:id — Single message by ID.
   */
  @Get(":id")
  getMessage(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.smsService.getMessageById(id);
  }

  /**
   * DELETE /sms/:id — Delete a single message.
   */
  @Delete(":id")
  deleteMessage(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.smsService.deleteMessage(id);
  }
}
