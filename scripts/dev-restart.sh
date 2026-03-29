#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/local_stack_launchd.sh"

echo "Rebuilding API runtime dist..."
(
  cd "$ROOT_DIR"
  npx nest build api
)

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
if stack_launch_agents_installed; then
  echo "Restarting launchd-managed local stack services..."
  stack_bootout_agents || true
fi
(
  cd "$ROOT_DIR"
  bash scripts/dev-up.sh
)
