#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub"
WAP_URL="${WAP_REFRESH_URL:-http://127.0.0.1:3002}"
BAO_URL="${WAP_REFRESH_BAO_URL:-http://127.0.0.1:8001}"

source "$ROOT_DIR/scripts/local_stack_launchd.sh"

resolve_npm_bin() {
  if command -v npm >/dev/null 2>&1; then
    command -v npm
    return 0
  fi

  ls -1dt "$HOME"/.nvm/versions/node/*/bin/npm 2>/dev/null | head -n 1
}

NPM_BIN="$(resolve_npm_bin)"

wait_for_http_ok() {
  local url="$1"
  local attempts="${2:-15}"
  local delay_seconds="${3:-1}"
  local try

  for ((try = 1; try <= attempts; try += 1)); do
    if curl -I --silent --show-error "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay_seconds"
  done

  return 1
}

if [[ -z "${NPM_BIN:-}" || ! -x "$NPM_BIN" ]]; then
  echo "Unable to find a usable npm binary" >&2
  exit 127
fi

echo "Building Stephub WAP..."
(
  cd "$APP_DIR"
  "$NPM_BIN" run build
)

echo "Restarting Stephub WAP..."
if stack_launch_agents_installed; then
  stack_ensure_agents_loaded
  stack_kickstart_agent "$STACK_AGENT_APP_LABEL"
else
  EXISTING_PIDS="$(lsof -tiTCP:3002 -sTCP:LISTEN || true)"
  if [[ -n "$EXISTING_PIDS" ]]; then
    echo "Stopping existing WAP listeners on 3002: $EXISTING_PIDS"
    while IFS= read -r pid; do
      [[ -n "$pid" ]] || continue
      kill "$pid" || true
    done <<< "$EXISTING_PIDS"
    sleep 2
  fi

  nohup env HOST=127.0.0.1 PORT=3002 \
    node "$ROOT_DIR/scripts/serve_stephub_build.mjs" "$APP_DIR/build" \
    >/tmp/poolproject-wap-refresh.log 2>&1 </dev/null &
fi

echo "Verifying WAP and BAO..."
if ! stack_wait_for_port 3002 30; then
  echo "Stephub WAP did not become ready on 3002" >&2
  exit 1
fi

if ! wait_for_http_ok "$WAP_URL" 30 2; then
  echo "Warning: Stephub WAP is listening on 3002 but HTTP verification timed out. Refresh on mobile again in a few seconds." >&2
fi

if ! wait_for_http_ok "$BAO_URL" 10 1; then
  echo "Warning: BAO HTTP verification timed out. This does not block WAP refresh." >&2
fi

echo "WAP refresh complete."
echo "WAP: $WAP_URL"
echo "BAO: $BAO_URL"
