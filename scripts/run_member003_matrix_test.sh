#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCENARIO_PATH="$ROOT_DIR/runtime/member003-matrix-scenario.json"
REPORT_PATH="$ROOT_DIR/runtime/member003-matrix-report.json"

cd "$ROOT_DIR"

python3 scripts/build_member003_matrix_scenario.py
node scripts/matrix-sandbox.js "$SCENARIO_PATH" > "$REPORT_PATH"
python3 scripts/assert_member003_matrix_test.py "$REPORT_PATH"

printf 'Matrix test complete\n'
printf 'Scenario: %s\n' "$SCENARIO_PATH"
printf 'Report: %s\n' "$REPORT_PATH"
