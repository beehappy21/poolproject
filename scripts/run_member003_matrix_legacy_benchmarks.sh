#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCENARIO_PATH="$ROOT_DIR/runtime/member003-matrix-legacy-scenario.json"
REPORT_PATH="$ROOT_DIR/runtime/member003-matrix-legacy-report.json"

cd "$ROOT_DIR"

python3 scripts/build_member003_matrix_scenario.py "$ROOT_DIR/scripts/member003-members.json" "$SCENARIO_PATH"
node scripts/matrix-sandbox-legacy.js "$SCENARIO_PATH" > "$REPORT_PATH"
python3 scripts/assert_member003_matrix_legacy_feeders.py "$REPORT_PATH"
python3 scripts/assert_member003_matrix_legacy_benchmarks.py "$REPORT_PATH"

printf 'Matrix legacy benchmark complete\n'
printf 'Scenario: %s\n' "$SCENARIO_PATH"
printf 'Report: %s\n' "$REPORT_PATH"
