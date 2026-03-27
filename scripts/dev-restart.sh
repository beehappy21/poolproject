#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

stop_port() {
  local port="$1"
  local pids

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [[ -z "$pids" ]]; then
    echo "No listener found on $port"
    return
  fi

  echo "Stopping listeners on $port: $pids"
  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    kill "$pid" || true
  done <<< "$pids"
}

stop_port 3000
stop_port 3002
stop_port 8001

echo "Restarting standard local stack..."
(
  cd "$ROOT_DIR"
  if [[ "${DEV_RESET_BASELINE:-0}" != "1" ]]; then
    echo "Preserving current local database state during restart."
  fi
  bash scripts/dev-up.sh
)
