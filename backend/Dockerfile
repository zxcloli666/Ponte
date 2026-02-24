# Stage 1: Cache dependencies
FROM denoland/deno:2 AS cache
WORKDIR /app
COPY deno.json deno.lock* ./
RUN deno install --allow-scripts=npm:@nestjs/core,npm:msgpackr-extract

# Stage 2: Build
FROM cache AS build
COPY src/ src/
COPY drizzle/ drizzle/
COPY tsconfig.json ./
RUN deno compile --allow-net --allow-env --allow-read --allow-sys --allow-write --output ponte-backend src/main.ts

# Stage 3: Runtime
FROM debian:bookworm-slim
RUN useradd --create-home appuser
WORKDIR /app
COPY --from=build /app/ponte-backend ./ponte-backend
COPY --from=build /app/drizzle ./drizzle
USER appuser
EXPOSE 3000
CMD ["./ponte-backend"]