import { Module, Global } from "@nestjs/common";
import { Queue, Worker, type ConnectionOptions } from "bullmq";

export const QUEUE_CONNECTION = Symbol("QUEUE_CONNECTION");
export const DELIVERY_QUEUE = Symbol("DELIVERY_QUEUE");

function getRedisConnection(): ConnectionOptions {
  const url = new URL(Deno.env.get("REDIS_URL") ?? "redis://localhost:6379");
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379", 10),
    password: url.password || undefined,
  };
}

@Global()
@Module({
  providers: [
    {
      provide: QUEUE_CONNECTION,
      useFactory: (): ConnectionOptions => getRedisConnection(),
    },
    {
      provide: DELIVERY_QUEUE,
      useFactory: (): Queue => {
        return new Queue("delivery", {
          connection: getRedisConnection(),
          defaultJobOptions: {
            attempts: 10,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          },
        });
      },
    },
  ],
  exports: [QUEUE_CONNECTION, DELIVERY_QUEUE],
})
export class QueueModule {}
