#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT_DIR"
bash "$ROOT_DIR/scripts/blifehealthy_uat.sh" restart

echo
read -r -p "Press Enter to close..."
