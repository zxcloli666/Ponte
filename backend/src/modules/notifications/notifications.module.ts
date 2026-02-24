import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller.ts";
import { NotificationsService } from "./notifications.service.ts";
import { NotificationsRepository } from "./notifications.repository.ts";
import { NotificationsGateway } from "./notifications.gateway.ts";
import { WsModule } from "../../shared/ws/ws.module.ts";
import { DevicesModule } from "../devices/devices.module.ts";

@Module({
  imports: [WsModule, DevicesModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationsGateway,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
