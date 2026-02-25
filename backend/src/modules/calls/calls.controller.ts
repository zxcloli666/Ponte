import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  NotFoundException,
} from "@nestjs/common";
import { CallsService } from "./calls.service.ts";
import { JwtGuard, type JwtPayload } from "../../shared/guards/jwt.guard.ts";
import { paginationSchema } from "../../shared/types/index.ts";
import { z } from "zod";

const callFiltersSchema = z.object({
  direction: z.enum(["incoming", "outgoing", "missed"]).optional(),
  simId: z.string().uuid().optional(),
  extraNumberId: z.string().uuid().optional(),
});

@Controller("calls")
@UseGuards(JwtGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  getCallHistory(
    @Req() req: { user: JwtPayload },
    @Query() query: Record<string, string>,
  ) {
    const pagination = paginationSchema.parse(query);
    const filters = callFiltersSchema.parse(query);

    return this.callsService.getCallHistory(req.user.sub, pagination, filters);
  }

  @Get(":id")
  async getCallById(
    @Req() req: { user: JwtPayload },
    @Param("id") id: string,
  ) {
    const call = await this.callsService.getCallById(id, req.user.sub);
    if (!call) {
      throw new NotFoundException("Call not found");
    }
    return call;
  }
}
