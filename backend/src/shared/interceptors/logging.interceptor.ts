import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import type { Request } from "express";
import type { Logger } from "pino";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.info({ method, url, duration }, `${method} ${url} - ${duration}ms`);
        },
        error: (error: Error) => {
          const duration = Date.now() - start;
          this.logger.error(
            { method, url, duration, error: error.message },
            `${method} ${url} - ${duration}ms [ERROR]`,
          );
        },
      }),
    );
  }
}
