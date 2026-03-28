#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

resolve_node_bin() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  ls -1dt "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | head -n 1
}

NODE_BIN="$(resolve_node_bin)"

if [[ -z "${NODE_BIN:-}" || ! -x "$NODE_BIN" ]]; then
  echo "Unable to find a usable node binary" >&2
  exit 127
fi

cd "$ROOT_DIR"
exec "$NODE_BIN" dist/apps/api/apps/api/src/main.js
