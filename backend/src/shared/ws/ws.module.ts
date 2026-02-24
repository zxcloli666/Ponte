import { Module } from "@nestjs/common";
import { WsGateway } from "./ws.gateway.ts";
import { AckService } from "./ack.service.ts";

@Module({
  providers: [WsGateway, AckService],
  exports: [WsGateway, AckService],
})
export class WsModule {}
