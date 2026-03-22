#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCENARIO_PATH="$ROOT_DIR/runtime/member003-direct-scenario.json"
REPORT_PATH="$ROOT_DIR/runtime/member003-direct-report.json"
XLSX_PATH="$ROOT_DIR/runtime/member003-direct-report.xlsx"

cd "$ROOT_DIR"

python3 scripts/build_member003_direct_scenario.py
node scripts/commission-sandbox.js "$SCENARIO_PATH" > "$REPORT_PATH"
python3 scripts/assert_member003_direct_test.py "$REPORT_PATH"
python3 scripts/export_member003_direct_report_xlsx.py "$REPORT_PATH" "$XLSX_PATH"

printf 'Direct test complete\n'
printf 'Scenario: %s\n' "$SCENARIO_PATH"
printf 'Report: %s\n' "$REPORT_PATH"
printf 'Excel: %s\n' "$XLSX_PATH"
