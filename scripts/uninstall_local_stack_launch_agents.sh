#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/local_stack_launchd.sh"

if ! stack_launchd_available; then
  echo "launchd helpers are only available on macOS."
  exit 1
fi

for label in "${STACK_AGENT_LABELS[@]}"; do
  plist_path="$(stack_agent_plist_path "$label")"
  stack_bootout_agent "$label" "$plist_path"
  rm -f "$plist_path"
  echo "Removed $(stack_service_name "$label") launch agent: $plist_path"
done

echo
stack_print_status
