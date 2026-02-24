import { Module } from "@nestjs/common";
import { DevicesController } from "./devices.controller.ts";
import { DevicesService } from "./devices.service.ts";
import { DevicesRepository } from "./devices.repository.ts";

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, DevicesRepository],
  exports: [DevicesService],
})
export class DevicesModule {}
