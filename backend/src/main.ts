import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import pino from "pino";
import { AppModule } from "./app.module.ts";
import { GlobalExceptionFilter } from "./shared/filters/global-exception.filter.ts";
import { LoggingInterceptor } from "./shared/interceptors/logging.interceptor.ts";
import { TransformInterceptor } from "./shared/interceptors/transform.interceptor.ts";

const logger = pino({
  level: Deno.env.get("LOG_LEVEL") ?? "info",
  transport:
    Deno.env.get("NODE_ENV") !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

// Prevent process crash on unhandled rejections / socket errors
globalThis.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  // Ignore transient socket errors (client disconnect, reset, etc.)
  if (
    reason?.code === "ConnectionReset" ||
    reason?.code === "ECONNRESET" ||
    reason?.code === "EPIPE" ||
    reason?.message?.includes("Connection reset by peer")
  ) {
    logger.debug({ err: reason?.message ?? reason }, "Socket closed by peer (ignored)");
  } else {
    logger.error({ err: reason }, "Unhandled rejection");
  }
  event.preventDefault();
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(), {
    logger: {
      log: (msg: string) => logger.info(msg),
      error: (msg: string, trace?: string) => logger.error({ trace }, msg),
      warn: (msg: string) => logger.warn(msg),
      debug: (msg: string) => logger.debug(msg),
      verbose: (msg: string) => logger.trace(msg),
    },
  });

  app.enableCors({ origin: "*" });

  app.setGlobalPrefix("v1");
  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.useGlobalInterceptors(
    new LoggingInterceptor(logger),
    new TransformInterceptor(),
  );

  const port = parseInt(Deno.env.get("PORT") ?? "3000", 10);
  await app.listen(port);
  logger.info(`Ponte backend listening on :${port}`);
}

bootstrap();
