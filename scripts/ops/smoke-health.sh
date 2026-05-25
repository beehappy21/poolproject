#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://127.0.0.1:${APP_PORT:-3000}}"
METRICS_PATH="${METRICS_PATH:-metrics}"

check_endpoint() {
  local path="$1"
  curl -fsS "${BASE_URL}${path}" >/dev/null
  printf 'ok %s\n' "${path}"
}

check_endpoint "/health"
check_endpoint "/health/live"
check_endpoint "/health/ready"

if [ "${METRICS_ENABLED:-true}" != "false" ]; then
  check_endpoint "/${METRICS_PATH}"
fi
