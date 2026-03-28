#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-restart}"

TUNNEL_LABEL="com.cloudflare.blifehealthy-tunnel"
TUNNEL_PLIST="$HOME/Library/LaunchAgents/${TUNNEL_LABEL}.plist"

print_section() {
  printf '\n== %s ==\n' "$1"
}

check_url() {
  local label="$1"
  local url="$2"

  if curl -fsSIL --max-time 10 "$url" >/dev/null 2>&1; then
    echo "[ok] $label"
  else
    echo "[fail] $label -> $url"
    return 1
  fi
}

ensure_tunnel_agent() {
  print_section "Tunnel"

  if launchctl print "gui/$(id -u)/${TUNNEL_LABEL}" >/dev/null 2>&1; then
    echo "[ok] tunnel launch agent is loaded"
    launchctl kickstart -k "gui/$(id -u)/${TUNNEL_LABEL}" >/dev/null 2>&1 || true
    return 0
  fi

  if [[ ! -f "$TUNNEL_PLIST" ]]; then
    echo "[fail] missing tunnel plist at $TUNNEL_PLIST"
    echo "Create the Cloudflare tunnel auto-start first."
    return 1
  fi

  echo "[info] bootstrapping tunnel launch agent"
  launchctl bootstrap "gui/$(id -u)" "$TUNNEL_PLIST"
  launchctl kickstart -k "gui/$(id -u)/${TUNNEL_LABEL}" >/dev/null 2>&1 || true
  echo "[ok] tunnel launch agent bootstrapped"
}

start_stack() {
  print_section "Local Stack"

  case "$MODE" in
    start)
      bash "$ROOT_DIR/scripts/dev-up.sh"
      ;;
    restart)
      bash "$ROOT_DIR/scripts/dev-restart.sh"
      ;;
    check)
      echo "[info] check-only mode; skipping stack start"
      ;;
    *)
      echo "Usage: $0 [start|restart|check]"
      return 1
      ;;
  esac
}

verify_stack() {
  print_section "Local Checks"
  (
    cd "$ROOT_DIR"
    npm run dev:check
  )
}

verify_public_urls() {
  print_section "Public URLs"
  check_url "API health responds" "https://api.blifehealthy.com/health"
  check_url "BAO login responds" "https://bao.blifehealthy.com/admin/login"
  check_url "WAP app responds" "https://wap.blifehealthy.com"
}

print_summary() {
  print_section "Ready"
  echo "App: https://wap.blifehealthy.com"
  echo "API: https://api.blifehealthy.com/health"
  echo "BAO: https://bao.blifehealthy.com/admin/login"
  echo
  echo "App test login:"
  echo "  TH0000001 / a1a1a1"
  echo
  echo "BAO test login:"
  echo "  superadmin@blifehealthy.com / 472121"
}

ensure_tunnel_agent
start_stack
verify_stack
verify_public_urls
print_summary
