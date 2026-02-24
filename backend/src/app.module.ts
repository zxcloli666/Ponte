import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { DatabaseModule } from "./shared/database/database.module.ts";
import { RedisModule } from "./shared/redis/redis.module.ts";
import { WsModule } from "./shared/ws/ws.module.ts";
import { QueueModule } from "./shared/queue/queue.module.ts";
import { AuthModule } from "./modules/auth/auth.module.ts";
import { DevicesModule } from "./modules/devices/devices.module.ts";
import { SimsModule } from "./modules/sims/sims.module.ts";
import { SmsModule } from "./modules/sms/sms.module.ts";
import { CallsModule } from "./modules/calls/calls.module.ts";
import { NotificationsModule } from "./modules/notifications/notifications.module.ts";
import { ContactsModule } from "./modules/contacts/contacts.module.ts";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    DatabaseModule,
    RedisModule,
    QueueModule,
    WsModule,
    AuthModule,
    DevicesModule,
    SimsModule,
    SmsModule,
    CallsModule,
    NotificationsModule,
    ContactsModule,
  ],
})
export class AppModule {}
