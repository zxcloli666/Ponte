#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_PID=""
WEB_PID=""

cleanup() {
    echo ""
    echo "Shutting down..."
    [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null && echo "Stopped backend (PID $BACKEND_PID)"
    [[ -n "$WEB_PID" ]] && kill "$WEB_PID" 2>/dev/null && echo "Stopped web (PID $WEB_PID)"
    echo "Stopping docker services..."
    podman compose -f "$ROOT_DIR/docker-compose.yml" stop postgres redis 2>/dev/null
    echo "Done."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Symlink .env to subprojects (so they always read the root .env)
echo "Linking .env to subprojects..."
ln -sf "$ROOT_DIR/.env" "$ROOT_DIR/backend/.env"
ln -sf "$ROOT_DIR/.env" "$ROOT_DIR/web/.env"

# Start infrastructure
echo "Starting postgres and redis..."
podman compose -f "$ROOT_DIR/docker-compose.yml" up -d postgres redis

# Wait for postgres
echo "Waiting for postgres to be healthy..."
until podman compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres pg_isready -U ponte > /dev/null 2>&1; do
    sleep 1
done
echo "Postgres is ready."

# Wait for redis
echo "Waiting for redis to be healthy..."
until podman compose -f "$ROOT_DIR/docker-compose.yml" exec -T redis redis-cli ping > /dev/null 2>&1; do
    sleep 1
done
echo "Redis is ready."

# Run migrations
echo "Running database migrations..."
cd "$ROOT_DIR/backend" && deno task migrate
cd "$ROOT_DIR"

# Start backend dev server
echo "Starting backend dev server..."
cd "$ROOT_DIR/backend" && deno task dev &
BACKEND_PID=$!
cd "$ROOT_DIR"

# Start web dev server
echo "Starting web dev server..."
cd "$ROOT_DIR/web" && pnpm dev &
WEB_PID=$!
cd "$ROOT_DIR"

echo ""
echo "========================================="
echo "  Ponte dev environment is running"
echo "========================================="
echo "  Backend:  http://localhost:3000"
echo "  Web:      http://localhost:5173"
echo "  Postgres: localhost:5432"
echo "  Redis:    localhost:6379"
echo ""
echo "  Backend PID: $BACKEND_PID"
echo "  Web PID:     $WEB_PID"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "========================================="

wait
