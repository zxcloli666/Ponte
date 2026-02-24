import { Module } from "@nestjs/common";
import { WsModule } from "../../shared/ws/ws.module.ts";
import { DevicesModule } from "../devices/devices.module.ts";
import { SmsController } from "./sms.controller.ts";
import { SmsService } from "./sms.service.ts";
import { SmsRepository } from "./sms.repository.ts";
import { SmsGateway } from "./sms.gateway.ts";

@Module({
  imports: [WsModule, DevicesModule],
  controllers: [SmsController],
  providers: [SmsService, SmsRepository, SmsGateway],
  exports: [SmsService],
})
export class SmsModule {}
