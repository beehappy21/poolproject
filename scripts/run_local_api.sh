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
export APP_WAP_URL="${APP_WAP_URL:-https://wap.blifehealthy.com}"
export APP_PUBLIC_BASE_URL="${APP_PUBLIC_BASE_URL:-https://api.blifehealthy.com}"
export LINE_LOGIN_CALLBACK_URL="${LINE_LOGIN_CALLBACK_URL:-https://wap.blifehealthy.com/line/liff/signin}"
export LINE_LIFF_SIGNIN_URL="${LINE_LIFF_SIGNIN_URL:-https://wap.blifehealthy.com/line/liff/signin}"
exec "$NODE_BIN" dist/apps/api/apps/api/src/main.js
