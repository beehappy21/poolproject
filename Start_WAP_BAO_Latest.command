#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
WAP_URL="http://127.0.0.1:3002"
BAO_URL="http://127.0.0.1:8001/admin"

cd "$ROOT_DIR"
bash "$ROOT_DIR/scripts/run_wap_bao_latest.sh"

open "$WAP_URL"
open "$BAO_URL"
