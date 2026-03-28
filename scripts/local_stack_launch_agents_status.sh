#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/local_stack_launchd.sh"

if ! stack_launchd_available; then
  echo "launchd helpers are only available on macOS."
  exit 1
fi

stack_print_status
