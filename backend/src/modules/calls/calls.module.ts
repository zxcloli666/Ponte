import { Module } from "@nestjs/common";
import { CallsController } from "./calls.controller.ts";
import { CallsService } from "./calls.service.ts";
import { CallsRepository } from "./calls.repository.ts";
import { CallsGateway } from "./calls.gateway.ts";
import { WsModule } from "../../shared/ws/ws.module.ts";

@Module({
  imports: [WsModule],
  controllers: [CallsController],
  providers: [CallsService, CallsRepository, CallsGateway],
  exports: [CallsService],
})
export class CallsModule {}
