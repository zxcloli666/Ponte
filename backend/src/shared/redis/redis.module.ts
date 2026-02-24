import { Module, Global } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS = Symbol("REDIS");

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: (): Redis => {
        const url = Deno.env.get("REDIS_URL") ?? "redis://localhost:6379";
        return new Redis(url, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
