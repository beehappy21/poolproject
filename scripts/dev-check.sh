#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BAO_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend"
APP_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub"

API_LOG="/tmp/poolproject-dev-api.log"
BAO_LOG="/tmp/poolproject-dev-bao.log"
APP_LOG="/tmp/poolproject-dev-app.log"

check_port() {
  local label="$1"
  local port="$2"

  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[ok] $label is listening on $port"
  else
    echo "[fail] $label is not listening on $port"
    return 1
  fi
}

is_listening() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

start_bg() {
  local name="$1"
  local log_file="$2"
  shift 2

  nohup "$@" >"$log_file" 2>&1 </dev/null &
  echo "[info] starting $name"
}

ensure_runtime() {
  local label="$1"
  local port="$2"
  local log_file="$3"
  shift 3

  if is_listening "$port"; then
    return 0
  fi

  start_bg "$label" "$log_file" "$@"

  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if is_listening "$port"; then
      echo "[ok] $label started on $port"
      return 0
    fi
    sleep 1
  done

  echo "[fail] $label did not start on $port"
  return 1
}

check_url() {
  local label="$1"
  local url="$2"
  local attempt

  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
      echo "[ok] $label"
      return 0
    fi
    sleep 1
  done

  echo "[fail] $label"
  return 1
}

check_port "Postgres" 5432

ensure_runtime "API" 3000 "$API_LOG" node "$ROOT_DIR/dist/apps/api/apps/api/src/main.js"
ensure_runtime "BAO" 8001 "$BAO_LOG" "$ROOT_DIR/scripts/start_bao_server.sh"
ensure_runtime "Stephub app" 3002 "$APP_LOG" env HOST=127.0.0.1 PORT=3002 npm --prefix "$APP_DIR" start

check_port "API" 3000
check_port "BAO" 8001
check_port "Stephub app" 3002
check_url "BAO admin login responds" "http://127.0.0.1:8001/admin/login"
echo "[info] run 'npm run dev:check:stephub' for full Stephub baseline validation"
echo "Local dev runtime checks passed."
