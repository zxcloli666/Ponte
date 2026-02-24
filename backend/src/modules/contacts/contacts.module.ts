import { Module } from "@nestjs/common";
import { ContactsController } from "./contacts.controller.ts";
import { ContactsService } from "./contacts.service.ts";
import { ContactsRepository } from "./contacts.repository.ts";
import { ContactsGateway } from "./contacts.gateway.ts";
import { WsModule } from "../../shared/ws/ws.module.ts";

@Module({
  imports: [WsModule],
  controllers: [ContactsController],
  providers: [ContactsService, ContactsRepository, ContactsGateway],
  exports: [ContactsService],
})
export class ContactsModule {}
