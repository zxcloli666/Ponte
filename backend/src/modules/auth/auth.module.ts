import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.ts";
import { AuthService } from "./auth.service.ts";
import { AuthRepository } from "./auth.repository.ts";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository],
  exports: [AuthService],
})
export class AuthModule {}
