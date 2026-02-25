# Stage 1: Cache dependencies
FROM denoland/deno:latest AS cache
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY deno.json deno.lock* ./
RUN deno install --allow-scripts=npm:@nestjs/core,npm:msgpackr-extract

# Stage 2: Build
FROM cache AS build
COPY src/ src/
COPY drizzle/ drizzle/
COPY tsconfig.json ./
RUN deno compile \
    --allow-net \
    --allow-env \
    --allow-read \
    --allow-write \
    --allow-sys \
    --output ponte-backend \
    src/main.ts
RUN deno compile \
    --allow-net \
    --allow-env \
    --allow-read \
    --allow-write \
    --allow-sys \
    --output ponte-migrate \
    src/shared/database/migrate.ts

# Stage 3: Runtime
FROM debian:bookworm-slim
RUN useradd --create-home appuser
WORKDIR /app

COPY --from=build /app/ponte-backend ./ponte-backend
COPY --from=build /app/ponte-migrate ./ponte-migrate
COPY --from=build /app/drizzle ./drizzle

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER appuser
EXPOSE 3000
CMD ["./entrypoint.sh"]