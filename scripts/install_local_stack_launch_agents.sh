#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$HOME/Library/Logs"
PLIST_DIR="$HOME/Library/LaunchAgents"
NODE_BIN="$(command -v node || true)"
NPM_BIN="$(command -v npm || true)"
PHP_BIN="$(command -v php || true)"
PATH_VALUE="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

source "$ROOT_DIR/scripts/local_stack_launchd.sh"

mkdir -p "$LOG_DIR" "$PLIST_DIR"

if [[ -n "$NODE_BIN" ]]; then
  PATH_VALUE="$(dirname "$NODE_BIN"):$PATH_VALUE"
fi

if [[ -n "$NPM_BIN" ]]; then
  PATH_VALUE="$(dirname "$NPM_BIN"):$PATH_VALUE"
fi

if [[ -n "$PHP_BIN" ]]; then
  PATH_VALUE="$(dirname "$PHP_BIN"):$PATH_VALUE"
fi

write_plist() {
  local label="$1"
  local program="$2"
  local stdout_log="$3"
  local stderr_log="$4"
  local plist_path

  plist_path="$(stack_agent_plist_path "$label")"

  cat >"$plist_path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>$label</string>
    <key>ProgramArguments</key>
    <array>
      <string>$program</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
      <key>SuccessfulExit</key>
      <false/>
    </dict>
    <key>EnvironmentVariables</key>
    <dict>
      <key>PATH</key>
      <string>$PATH_VALUE</string>
    </dict>
    <key>StandardOutPath</key>
    <string>$stdout_log</string>
    <key>StandardErrorPath</key>
    <string>$stderr_log</string>
    <key>WorkingDirectory</key>
    <string>$ROOT_DIR</string>
  </dict>
</plist>
EOF

  chmod 644 "$plist_path"
}

write_plist \
  "$STACK_AGENT_API_LABEL" \
  "$ROOT_DIR/scripts/run_local_api.sh" \
  "$LOG_DIR/${STACK_AGENT_API_LABEL}.out.log" \
  "$LOG_DIR/${STACK_AGENT_API_LABEL}.err.log"

write_plist \
  "$STACK_AGENT_BAO_LABEL" \
  "$ROOT_DIR/scripts/start_bao_server.sh" \
  "$LOG_DIR/${STACK_AGENT_BAO_LABEL}.out.log" \
  "$LOG_DIR/${STACK_AGENT_BAO_LABEL}.err.log"

write_plist \
  "$STACK_AGENT_APP_LABEL" \
  "$ROOT_DIR/scripts/run_local_stephub_app.sh" \
  "$LOG_DIR/${STACK_AGENT_APP_LABEL}.out.log" \
  "$LOG_DIR/${STACK_AGENT_APP_LABEL}.err.log"

stack_bootout_agents || true
stack_restart_agents

printf 'Installed local stack launch agents:\n'
printf '  - %s\n' "${STACK_AGENT_LABELS[@]}"
echo
stack_print_status
