#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
CALC_SCENARIOS_REPORT_PATH="${CALC_SCENARIOS_REPORT_PATH:-$ROOT_DIR/runtime/calc-scenarios-report.json}"

cd "$ROOT_DIR"

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

EXISTING_PIDS="$(lsof -ti tcp:3000 2>/dev/null || true)"
if [[ -n "$EXISTING_PIDS" ]]; then
  xargs kill <<<"$EXISTING_PIDS" >/dev/null 2>&1 || true
  sleep 1
fi

rm -f "$ROOT_DIR/runtime/commission-settings.json"

docker compose up -d postgres >/dev/null
sleep 3
DATABASE_URL="$DATABASE_URL" npm run prisma:push >/dev/null
DATABASE_URL="$DATABASE_URL" npm run db:seed >/dev/null

DATABASE_URL="$DATABASE_URL" npm run start:api >/tmp/poolproject-calc-api.log 2>&1 &
API_PID=$!

for _ in $(seq 1 20); do
  if curl -s "$API_BASE_URL/health" >/dev/null 2>&1; then
    break
  fi

  sleep 1
done

curl -s "$API_BASE_URL/health" >/dev/null
API_BASE_URL="$API_BASE_URL" DATABASE_URL="$DATABASE_URL" CALC_SCENARIOS_REPORT_PATH="$CALC_SCENARIOS_REPORT_PATH" node scripts/calc-scenarios.js
