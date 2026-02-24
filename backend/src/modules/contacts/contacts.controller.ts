import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ContactsService } from "./contacts.service.ts";
import { JwtGuard, type JwtPayload } from "../../shared/guards/jwt.guard.ts";
import { DeviceGuard } from "../../shared/guards/device.guard.ts";
import {
  paginationSchema,
  contactSyncSchema,
} from "../../shared/types/index.ts";
import { z } from "zod";

// ─── Query schemas ──────────────────────────────────────────────────────────

const contactsQuerySchema = paginationSchema.extend({
  q: z.string().optional(),
});

const syncBodySchema = contactSyncSchema.extend({
  isFullSync: z.boolean().optional().default(false),
});

// ─── Controller ─────────────────────────────────────────────────────────────

@Controller("contacts")
@UseGuards(JwtGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  /**
   * GET /contacts — List contacts with optional search and pagination.
   * Query params: q (search query), page, limit.
   */
  @Get()
  async list(
    @Req() req: { user: JwtPayload },
    @Query() query: Record<string, unknown>,
  ) {
    const parsed = contactsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const { q, page, limit } = parsed.data;
    const deviceId = req.user.deviceId;
    const userId = req.user.sub;

    if (deviceId) {
      return this.contactsService.search(deviceId, q, page, limit);
    }

    // iOS/web user without deviceId: resolve first device via userId
    return this.contactsService.searchByUserId(userId, q, page, limit);
  }

  /**
   * GET /contacts/:id — Get a single contact by ID.
   */
  @Get(":id")
  async getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.contactsService.getContact(id);
  }

  /**
   * POST /contacts/sync — Android pushes full dump or delta update.
   * Requires Android device authentication.
   */
  @Post("sync")
  @UseGuards(DeviceGuard)
  async sync(
    @Req() req: { user: JwtPayload },
    @Body() body: unknown,
  ) {
    const parsed = syncBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const { contacts, deletedIds, isFullSync } = parsed.data;
    const deviceId = req.user.deviceId!;
    const userId = req.user.sub;

    const result = await this.contactsService.syncContacts(
      deviceId,
      userId,
      { contacts, deletedIds },
      isFullSync,
    );

    return {
      success: true,
      ...result,
    };
  }
}
