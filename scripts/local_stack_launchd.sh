#!/usr/bin/env bash
set -euo pipefail

STACK_AGENT_API_LABEL="com.poolproject.local-api"
STACK_AGENT_BAO_LABEL="com.poolproject.local-bao"
STACK_AGENT_APP_LABEL="com.poolproject.local-stephub-app"
STACK_AGENT_GUI_DOMAIN="gui/$(id -u)"

STACK_AGENT_LABELS=(
  "$STACK_AGENT_API_LABEL"
  "$STACK_AGENT_BAO_LABEL"
  "$STACK_AGENT_APP_LABEL"
)

stack_launchd_available() {
  [[ "$(uname -s)" == "Darwin" ]]
}

stack_service_name() {
  local label="$1"

  case "$label" in
    "$STACK_AGENT_API_LABEL") printf 'API\n' ;;
    "$STACK_AGENT_BAO_LABEL") printf 'BAO\n' ;;
    "$STACK_AGENT_APP_LABEL") printf 'Stephub app\n' ;;
    *) printf '%s\n' "$label" ;;
  esac
}

stack_service_port() {
  local label="$1"

  case "$label" in
    "$STACK_AGENT_API_LABEL") printf '3000\n' ;;
    "$STACK_AGENT_BAO_LABEL") printf '8001\n' ;;
    "$STACK_AGENT_APP_LABEL") printf '3002\n' ;;
    *) return 1 ;;
  esac
}

stack_agent_plist_path() {
  local label="$1"
  printf '%s/Library/LaunchAgents/%s.plist\n' "$HOME" "$label"
}

stack_agent_stdout_path() {
  local label="$1"
  printf '%s/Library/Logs/%s.out.log\n' "$HOME" "$label"
}

stack_agent_stderr_path() {
  local label="$1"
  printf '%s/Library/Logs/%s.err.log\n' "$HOME" "$label"
}

stack_agent_print_target() {
  local label="$1"
  printf '%s/%s\n' "$STACK_AGENT_GUI_DOMAIN" "$label"
}

stack_is_listening() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

stack_launch_agents_installed() {
  local label

  stack_launchd_available || return 1

  for label in "${STACK_AGENT_LABELS[@]}"; do
    [[ -f "$(stack_agent_plist_path "$label")" ]] || return 1
  done
}

stack_agent_loaded() {
  local label="$1"
  launchctl print "$(stack_agent_print_target "$label")" >/dev/null 2>&1
}

stack_ensure_agent_loaded() {
  local label="$1"
  local plist_path="$2"

  if stack_agent_loaded "$label"; then
    return 0
  fi

  launchctl bootstrap "$STACK_AGENT_GUI_DOMAIN" "$plist_path" >/dev/null 2>&1 || true
}

stack_kickstart_agent() {
  local label="$1"

  launchctl kickstart -k "$(stack_agent_print_target "$label")" >/dev/null 2>&1 || true
}

stack_bootout_agent() {
  local label="$1"
  local plist_path="$2"

  launchctl bootout "$STACK_AGENT_GUI_DOMAIN" "$plist_path" >/dev/null 2>&1 || true
}

stack_ensure_agents_loaded() {
  local label
  local plist_path

  stack_launch_agents_installed || return 1

  for label in "${STACK_AGENT_LABELS[@]}"; do
    plist_path="$(stack_agent_plist_path "$label")"
    stack_ensure_agent_loaded "$label" "$plist_path"
  done
}

stack_bootout_agents() {
  local label
  local plist_path

  stack_launch_agents_installed || return 1

  for label in "${STACK_AGENT_LABELS[@]}"; do
    plist_path="$(stack_agent_plist_path "$label")"
    stack_bootout_agent "$label" "$plist_path"
  done
}

stack_restart_agents() {
  local label

  stack_ensure_agents_loaded || return 1

  for label in "${STACK_AGENT_LABELS[@]}"; do
    stack_kickstart_agent "$label"
  done
}

stack_wait_for_port() {
  local port="$1"
  local timeout="${2:-30}"
  local remaining="$timeout"

  while (( remaining > 0 )); do
    if stack_is_listening "$port"; then
      return 0
    fi
    sleep 1
    remaining=$((remaining - 1))
  done

  return 1
}

stack_print_status() {
  local label
  local plist_path
  local port
  local installed_state
  local loaded_state
  local port_state

  for label in "${STACK_AGENT_LABELS[@]}"; do
    plist_path="$(stack_agent_plist_path "$label")"
    port="$(stack_service_port "$label")"

    if [[ -f "$plist_path" ]]; then
      installed_state="installed"
    else
      installed_state="missing"
    fi

    if stack_agent_loaded "$label"; then
      loaded_state="loaded"
    else
      loaded_state="not-loaded"
    fi

    if stack_is_listening "$port"; then
      port_state="listening"
    else
      port_state="down"
    fi

    printf '%-12s  %-10s  %-10s  port:%-5s  plist:%s\n' \
      "$(stack_service_name "$label")" \
      "$installed_state" \
      "$loaded_state" \
      "$port/$port_state" \
      "$plist_path"
  done
}
