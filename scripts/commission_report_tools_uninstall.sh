#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FILES=(
  "$ROOT_DIR/scripts/commission_report_process_next_member.sh"
  "$ROOT_DIR/scripts/commission_report_finalize_current_day.sh"
  "$ROOT_DIR/scripts/commission_report_reset_baseline_runtime.sh"
  "$ROOT_DIR/scripts/commission_report_runtime_tools.mjs"
  "$ROOT_DIR/scripts/commission_report_tools_README.md"
  "$ROOT_DIR/scripts/commission_report_tools_uninstall.sh"
)

for target in "${FILES[@]}"; do
  if [ -e "$target" ]; then
    rm -f "$target"
    printf 'removed %s\n' "$target"
  fi
done
