#!/bin/sh
set -e

# ----------------------------------------------------------------------
# Wait for PostgreSQL to be reachable
# ----------------------------------------------------------------------
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h "${POSTGRES_HOST:-postgres}" -U "${POSTGRES_USER:-ponte}" >/dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL is up – running migrations."

# ----------------------------------------------------------------------
# Run Drizzle migrations
# ----------------------------------------------------------------------
./ponte-migrate

# ----------------------------------------------------------------------
# Start the compiled backend
# ----------------------------------------------------------------------
exec ./ponte-backend