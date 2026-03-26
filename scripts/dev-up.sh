#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BAO_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend"
APP_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub"

API_LOG="/tmp/poolproject-dev-api.log"
BAO_LOG="/tmp/poolproject-dev-bao.log"
APP_LOG="/tmp/poolproject-dev-app.log"

is_listening() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

get_project_api_pids() {
  ps -ax -o pid=,command= | grep 'poolproject' | grep -E 'node .*nest start api( --watch)?|dist/apps/api/apps/api/src/main(\.js)?' | awk '{print $1}' || true
}

start_bg() {
  local name="$1"
  local log_file="$2"
  shift 2

  nohup "$@" >"$log_file" 2>&1 </dev/null &
  echo "$name started. log: $log_file"
}

echo "Starting local Postgres..."
(
  cd "$ROOT_DIR"
  docker compose up -d postgres
)

echo "Applying Prisma schema..."
(
  cd "$ROOT_DIR"
  npm run prisma:push
)

echo "Seeding dev data..."
(
  cd "$ROOT_DIR"
  npm run db:seed
)

echo "Ensuring Stephub local baseline..."
(
  cd "$ROOT_DIR"
  bash scripts/ensure-stephub-local-state.sh
)

API_PIDS="$(get_project_api_pids || true)"
API_PID_COUNT="$(printf '%s\n' "$API_PIDS" | sed '/^$/d' | wc -l | tr -d ' ')"
if [[ "$API_PID_COUNT" -gt 1 ]]; then
  echo "Multiple project API processes detected: $API_PIDS"
  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    kill "$pid" || true
  done <<< "$API_PIDS"
  sleep 2
fi

if is_listening 3000 && [[ "$API_PID_COUNT" -le 1 ]]; then
  echo "API already listening on 3000"
else
  (
    cd "$ROOT_DIR"
    start_bg "API" "$API_LOG" node dist/apps/api/apps/api/src/main.js
  )
fi

if is_listening 8001; then
  echo "BAO already listening on 8001"
else
  (
    cd "$BAO_DIR"
    start_bg "BAO" "$BAO_LOG" php artisan serve --host=127.0.0.1 --port=8001
  )
fi

if is_listening 3002; then
  echo "Stephub app already listening on 3002"
else
  (
    cd "$APP_DIR"
    start_bg "Stephub app" "$APP_LOG" env HOST=127.0.0.1 PORT=3002 npm start
  )
fi

echo "Local stack boot requested."
echo "Run 'npm run dev:check' to verify readiness."
