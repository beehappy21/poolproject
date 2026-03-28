#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BAO_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend"
APP_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub"

source "$ROOT_DIR/scripts/local_stack_launchd.sh"

API_LOG="/tmp/poolproject-dev-api.log"
BAO_LOG="/tmp/poolproject-dev-bao.log"
APP_LOG="/tmp/poolproject-dev-app.log"

start_bg() {
  local name="$1"
  local log_file="$2"
  shift 2

  nohup "$@" >"$log_file" 2>&1 </dev/null &
  echo "[info] starting $name"
}

docker_daemon_available() {
  docker info >/dev/null 2>&1
}

ensure_postgres() {
  if stack_is_listening 5432; then
    echo "[ok] Postgres is listening on 5432"
    return 0
  fi

  if ! docker_daemon_available; then
    echo "[fail] Postgres is not listening on 5432"
    echo "[info] Docker daemon is unavailable. Start Docker Desktop or Colima, then rerun 'npm run dev:check'."
    return 1
  fi

  echo "[info] starting Postgres via docker compose"
  (
    cd "$ROOT_DIR"
    docker compose up -d postgres
  )

  if stack_wait_for_port 5432 30; then
    echo "[ok] Postgres started on 5432"
    return 0
  fi

  echo "[fail] Postgres did not start on 5432"
  return 1
}

ensure_runtime() {
  local label="$1"
  local port="$2"
  local log_file="$3"
  shift 3

  if stack_is_listening "$port"; then
    return 0
  fi

  if stack_launch_agents_installed; then
    case "$port" in
      3000)
        stack_kickstart_agent "$STACK_AGENT_API_LABEL"
        ;;
      8001)
        stack_kickstart_agent "$STACK_AGENT_BAO_LABEL"
        ;;
      3002)
        stack_kickstart_agent "$STACK_AGENT_APP_LABEL"
        ;;
    esac
  else
    start_bg "$label" "$log_file" "$@"
  fi

  if stack_wait_for_port "$port" 30; then
    echo "[ok] $label started on $port"
    return 0
  fi

  echo "[fail] $label did not start on $port"
  return 1
}

check_port() {
  local label="$1"
  local port="$2"

  if stack_is_listening "$port"; then
    echo "[ok] $label is listening on $port"
  else
    echo "[fail] $label is not listening on $port"
    return 1
  fi
}

check_url() {
  local label="$1"
  local url="$2"
  local host_port
  local host
  local port

  if curl \
    -fsSI \
    --retry 10 \
    --retry-delay 1 \
    --retry-connrefused \
    --max-time 5 \
    "$url" >/dev/null 2>&1; then
    echo "[ok] $label"
    return 0
  fi

  host_port="${url#*://}"
  host_port="${host_port%%/*}"
  host="${host_port%%:*}"
  port="${host_port##*:}"

  if [[ "$host" == "$host_port" ]]; then
    port=80
  fi

  if [[ "$host" == "127.0.0.1" || "$host" == "localhost" ]] && stack_is_listening "$port"; then
    echo "[ok] $label (port fallback)"
    return 0
  fi

  echo "[fail] $label"
  return 1
}

ensure_postgres

ensure_runtime "API" 3000 "$API_LOG" node "$ROOT_DIR/dist/apps/api/apps/api/src/main.js"
ensure_runtime "BAO" 8001 "$BAO_LOG" "$ROOT_DIR/scripts/start_bao_server.sh"
ensure_runtime "Stephub app" 3002 "$APP_LOG" env HOST=127.0.0.1 PORT=3002 npm --prefix "$APP_DIR" start

check_port "API" 3000
check_port "BAO" 8001
check_port "Stephub app" 3002
check_url "API health responds" "http://127.0.0.1:3000/health"
check_url "BAO admin login responds" "http://127.0.0.1:8001/admin/login"
check_url "Stephub app responds" "http://127.0.0.1:3002"
echo "[info] run 'npm run dev:check:stephub' for full Stephub baseline validation"
echo "Local dev runtime checks passed."
