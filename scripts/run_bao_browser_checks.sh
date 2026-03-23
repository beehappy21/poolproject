#!/usr/bin/env bash

set -euo pipefail

# This smoke is meant for disposable local environments.
# It resets the local Postgres schema, reseeds dev data, rewrites the
# local BAO sqlite admin password to a known value, and restarts listeners
# on :3000 and :8001 before running the BAO cashback + shipment checks.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
BAO_ADMIN_PASSWORD_HASH="${BAO_ADMIN_PASSWORD_HASH:-\$2y\$12\$Jw9OKLQV2/ItEnM3DXnyYO/Pm8x5.W7d1Mrpz5R9mduWWwyvRCdNW}"

API_PID=""
BAO_PID=""

cleanup() {
  if [[ -n "$API_PID" ]]; then
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "$BAO_PID" ]]; then
    kill "$BAO_PID" >/dev/null 2>&1 || true
    wait "$BAO_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

cd "$ROOT_DIR"

EXISTING_API_PIDS="$(lsof -ti tcp:3000 2>/dev/null || true)"
if [[ -n "$EXISTING_API_PIDS" ]]; then
  xargs kill <<<"$EXISTING_API_PIDS" >/dev/null 2>&1 || true
  sleep 1
fi

EXISTING_BAO_PIDS="$(lsof -ti tcp:8001 2>/dev/null || true)"
if [[ -n "$EXISTING_BAO_PIDS" ]]; then
  xargs kill <<<"$EXISTING_BAO_PIDS" >/dev/null 2>&1 || true
  sleep 1
fi

docker compose up -d postgres >/dev/null
sleep 3

DATABASE_URL="$DATABASE_URL" ./node_modules/.bin/prisma db push --schema prisma/schema.prisma --accept-data-loss >/dev/null
DATABASE_URL="$DATABASE_URL" node scripts/seed-dev.js >/dev/null
docker exec -i poolproject-postgres psql -U postgres -d poolproject < "$ROOT_DIR/scripts/migrations/create_stephub_compat_views.sql" >/dev/null
sqlite3 "$BACKEND_DIR/database/database.sqlite" \
  "update users set password = '$BAO_ADMIN_PASSWORD_HASH' where email = 'admin@stephub.local';" >/dev/null

DATABASE_URL="$DATABASE_URL" npm run start:api >/tmp/poolproject-bao-browser-api.log 2>&1 &
API_PID=$!

(
  cd "$BACKEND_DIR"
  php artisan serve --host=127.0.0.1 --port=8001 >/tmp/poolproject-bao-browser.log 2>&1
) &
BAO_PID=$!

for _ in $(seq 1 40); do
  if curl -s http://127.0.0.1:3000/health >/dev/null 2>&1 && curl -s http://127.0.0.1:8001/admin/login >/dev/null 2>&1; then
    break
  fi

  sleep 1
done

node scripts/cashback-smoke.js
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123}" bash scripts/check_stephub_admin_cashback_report.sh http://127.0.0.1:8001
COOKIE_JAR=/tmp/stephub-cashback-report.cookies SKIP_BAO_LOGIN=1 BOOTSTRAP_LOCAL_STACK=0 bash scripts/check_stephub_order_shipment_flow.sh
