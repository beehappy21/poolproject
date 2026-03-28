#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BAO_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend"
APP_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub"

source "$ROOT_DIR/scripts/local_stack_launchd.sh"

API_LOG="/tmp/poolproject-dev-api.log"
BAO_LOG="/tmp/poolproject-dev-bao.log"
APP_LOG="/tmp/poolproject-dev-app.log"
DEV_RESET_BASELINE="${DEV_RESET_BASELINE:-0}"
DEV_APPLY_PRISMA_PUSH="${DEV_APPLY_PRISMA_PUSH:-0}"
DEV_RUN_DB_SEED="${DEV_RUN_DB_SEED:-0}"

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

docker_daemon_available() {
  docker info >/dev/null 2>&1
}

ensure_postgres_runtime() {
  if stack_is_listening 5432; then
    echo "Postgres already listening on 5432"
    return 0
  fi

  if ! docker_daemon_available; then
    echo "Docker daemon is not available. Start Docker Desktop or Colima first, then rerun 'npm run dev:up'."
    return 1
  fi

  echo "Starting local Postgres..."
  (
    cd "$ROOT_DIR"
    docker compose up -d postgres
  )

  if stack_wait_for_port 5432 30; then
    echo "Postgres ready on 5432"
    return 0
  fi

  echo "Postgres did not become ready on 5432"
  return 1
}

ensure_postgres_runtime

if [[ "$DEV_APPLY_PRISMA_PUSH" == "1" ]]; then
  echo "Applying Prisma schema..."
  (
    cd "$ROOT_DIR"
    npm run prisma:push
  )
else
  echo "Skipping Prisma schema push to preserve local data. Set DEV_APPLY_PRISMA_PUSH=1 to enable."
fi

if [[ "$DEV_RUN_DB_SEED" == "1" ]]; then
  echo "Seeding dev data..."
  (
    cd "$ROOT_DIR"
    npm run db:seed
  )
else
  echo "Skipping dev seed to preserve local data. Set DEV_RUN_DB_SEED=1 to enable."
fi

if [[ "$DEV_RESET_BASELINE" == "1" ]]; then
  echo "Applying destructive Stephub baseline reset..."
  (
    cd "$ROOT_DIR"
    DEV_RESET_BASELINE=1 bash scripts/ensure-stephub-local-state.sh
  )
else
  echo "Preserving existing local member/order/wallet/commission data."
  (
    cd "$ROOT_DIR"
    bash scripts/ensure-stephub-local-state.sh
  )
fi

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

if stack_launch_agents_installed; then
  echo "Using launchd-managed local stack services..."
  stack_restart_agents
else
  if stack_is_listening 3000 && [[ "$API_PID_COUNT" -le 1 ]]; then
    echo "API already listening on 3000"
  else
    (
      cd "$ROOT_DIR"
      start_bg "API" "$API_LOG" node dist/apps/api/apps/api/src/main.js
    )
  fi

  if stack_is_listening 8001; then
    echo "BAO already listening on 8001"
  else
    (
      cd "$BAO_DIR"
      start_bg "BAO" "$BAO_LOG" "$ROOT_DIR/scripts/start_bao_server.sh"
    )
  fi

  if stack_is_listening 3002; then
    echo "Stephub app already listening on 3002"
  else
    (
      cd "$APP_DIR"
      start_bg "Stephub app" "$APP_LOG" env HOST=127.0.0.1 PORT=3002 npm start
    )
  fi
fi

for label in "${STACK_AGENT_LABELS[@]}"; do
  service_name="$(stack_service_name "$label")"
  port="$(stack_service_port "$label")"
  if stack_wait_for_port "$port" 30; then
    echo "$service_name ready on $port"
  else
    echo "$service_name failed to become ready on $port"
    exit 1
  fi
done

echo "Local stack boot requested."
echo "Run 'npm run dev:check' to verify readiness."
