#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$ROOT_DIR/runtime"

cat > "$ROOT_DIR/runtime/commission-settings.json" <<'JSON'
{
  "directLevelRates": [
    "0.2"
  ],
  "uniLevelRates": [
    "0.05",
    "0.05",
    "0.05",
    "0.05",
    "0.05"
  ],
  "poolRate": "0.5",
  "cashbackRate": "0",
  "appVisibility": {
    "cashback": true,
    "direct": true,
    "unilevel": true,
    "matrix": true,
    "pool": true
  }
}
JSON

echo "Stephub UAT commission settings applied."
