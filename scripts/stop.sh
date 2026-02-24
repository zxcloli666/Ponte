#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Stopping dev servers..."

# Kill deno dev processes
pkill -f "deno task dev" 2>/dev/null && echo "Stopped backend dev server" || echo "No backend dev server running"

# Kill vite dev processes
pkill -f "vite" 2>/dev/null && echo "Stopped web dev server" || echo "No web dev server running"

# Stop docker services
echo "Stopping docker services..."
docker compose -f "$ROOT_DIR/docker-compose.yml" stop 2>/dev/null && echo "Stopped docker services" || echo "No docker services running"

echo "All services stopped."
