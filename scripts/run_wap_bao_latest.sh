#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WAP_URL="http://127.0.0.1:3002"
BAO_URL="http://127.0.0.1:8001/admin"
API_HEALTH_URL="http://127.0.0.1:3000/health"

pause_if_interactive() {
  if [[ -t 0 || -t 1 ]]; then
    printf '\nPress Enter to close...'
    read -r _
  fi
}

print_step() {
  printf '\n== %s ==\n' "$1"
}

run_step() {
  local label="$1"
  shift

  print_step "$label"
  "$@"
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This launcher is intended for macOS."
  pause_if_interactive
  exit 1
fi

cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found in PATH."
  pause_if_interactive
  exit 1
fi

run_step "Restart latest local stack for WAP + BAO" npm run dev:restart
run_step "Verify local stack" npm run dev:check

print_step "Open local WAP and BAO"
open "$WAP_URL"
open "$BAO_URL"

print_step "Ready"
echo "WAP: $WAP_URL"
echo "BAO: $BAO_URL"
echo "API: $API_HEALTH_URL"
echo "This flow preserves current local data and uses the latest WAP proxy fixes."

pause_if_interactive
