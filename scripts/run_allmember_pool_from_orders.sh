#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCENARIO_PATH="${1:-$ROOT_DIR/runtime/allmember-pool-from-orders-scenario.json}"
REPORT_PATH="${2:-$ROOT_DIR/runtime/allmember-pool-from-orders-report.json}"
POOL_RATE_MODE="${POOL_RATE_MODE:-default_50_percent}"
CUSTOM_POOL_RATE="${CUSTOM_POOL_RATE:-0}"
POOL_CAP_MULTIPLE="${POOL_CAP_MULTIPLE:-0}"
COMMISSION_CAP_SCOPE="${COMMISSION_CAP_SCOPE:-pool_only}"
COMMISSION_CAP_MULTIPLE="${COMMISSION_CAP_MULTIPLE:-0}"

cd "$ROOT_DIR"

python3 scripts/build_allmember_pool_from_orders.py \
  "$ROOT_DIR/allmember.xlsx" \
  "$ROOT_DIR/runtime/allsale-user-supplied-orders.json" \
  "$SCENARIO_PATH" \
  "$POOL_RATE_MODE" \
  "$CUSTOM_POOL_RATE" \
  "$POOL_CAP_MULTIPLE" \
  "$COMMISSION_CAP_SCOPE" \
  "$COMMISSION_CAP_MULTIPLE"

node scripts/commission-sandbox.js "$SCENARIO_PATH" "$REPORT_PATH" >/dev/null
python3 scripts/summarize_pool_report.py "$REPORT_PATH"
python3 scripts/export_pool_report_csv.py "$REPORT_PATH"
