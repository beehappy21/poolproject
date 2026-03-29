#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

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

if ! command -v docker >/dev/null 2>&1; then
  echo "docker was not found in PATH."
  pause_if_interactive
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not available. Start Docker Desktop or Colima first."
  pause_if_interactive
  exit 1
fi

if [[ ! -f "$HOME/Library/LaunchAgents/com.poolproject.local-api.plist" ]] || \
   [[ ! -f "$HOME/Library/LaunchAgents/com.poolproject.local-bao.plist" ]] || \
   [[ ! -f "$HOME/Library/LaunchAgents/com.poolproject.local-stephub-app.plist" ]]; then
  run_step "Install launchd agents" npm run dev:launchd:install
else
  run_step "Current launchd status" npm run dev:launchd:status
fi

run_step "Restart local stack" npm run dev:restart
run_step "Verify local stack" npm run dev:check
run_step "Verify public auth bridge" bash scripts/check_public_auth_bridge.sh

print_step "Ready"
echo "App: http://127.0.0.1:3002"
echo "API: http://127.0.0.1:3000/health"
echo "BAO: http://127.0.0.1:8001/admin/login"

pause_if_interactive
