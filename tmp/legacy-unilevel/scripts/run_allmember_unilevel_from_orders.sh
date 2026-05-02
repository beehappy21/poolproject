#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCENARIO_PATH="${1:-$ROOT_DIR/runtime/allmember-unilevel-from-orders-scenario.json}"
REPORT_PATH="${2:-$ROOT_DIR/runtime/allmember-unilevel-from-orders-report.json}"
UNI_RATES="${UNI_RATES:-0.05,0.05,0.05,0.05,0.05}"

cd "$ROOT_DIR"

python3 scripts/build_allmember_unilevel_from_orders.py \
  "$ROOT_DIR/allmember.xlsx" \
  "$ROOT_DIR/runtime/allsale-user-supplied-orders.json" \
  "$SCENARIO_PATH" \
  "$UNI_RATES"

node scripts/commission-sandbox.js "$SCENARIO_PATH" "$REPORT_PATH" >/dev/null
python3 scripts/summarize_unilevel_report.py "$REPORT_PATH"
python3 scripts/export_unilevel_report_csv.py "$REPORT_PATH"
