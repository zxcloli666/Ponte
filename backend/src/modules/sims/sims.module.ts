import { Module } from "@nestjs/common";
import { SimsController } from "./sims.controller.ts";
import { ExtraNumbersController } from "./extra-numbers.controller.ts";
import { SimsService } from "./sims.service.ts";
import { SimsRepository } from "./sims.repository.ts";

@Module({
  controllers: [SimsController, ExtraNumbersController],
  providers: [SimsService, SimsRepository],
  exports: [SimsService],
})
export class SimsModule {}
