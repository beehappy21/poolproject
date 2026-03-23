#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"

echo "[1/2] Running pool cap smoke..."
bash scripts/pool-cap-local-smoke.sh

echo "[2/3] Running pool rules smoke..."
bash scripts/pool-config-rules-local-smoke.sh

echo "[3/3] Running all-commissions E2E smoke..."
bash scripts/pool-all-commissions-e2e-smoke.sh
