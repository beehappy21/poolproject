#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub"
APP_MODE="${STEPHUB_APP_MODE:-static}"
APP_BUILD_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/build"

resolve_npm_bin() {
  if command -v npm >/dev/null 2>&1; then
    command -v npm
    return 0
  fi

  ls -1dt "$HOME"/.nvm/versions/node/*/bin/npm 2>/dev/null | head -n 1
}

NPM_BIN="$(resolve_npm_bin)"

if [[ -z "${NPM_BIN:-}" || ! -x "$NPM_BIN" ]]; then
  echo "Unable to find a usable npm binary" >&2
  exit 127
fi

cd "$APP_DIR"

export REACT_APP_API_BASE_URL="${REACT_APP_API_BASE_URL:-/api}"
export REACT_APP_BAO_BASE_URL="${REACT_APP_BAO_BASE_URL:-/bao-api}"
export REACT_APP_LINE_LIFF_ID="${REACT_APP_LINE_LIFF_ID:-2009662380-OAbgN6VR}"
export REACT_APP_LINE_LOGIN_CALLBACK_URL="${REACT_APP_LINE_LOGIN_CALLBACK_URL:-https://wap.blifehealthy.com/line/liff/signin}"
export REACT_APP_LINE_LIFF_SIGNIN_URL="${REACT_APP_LINE_LIFF_SIGNIN_URL:-https://wap.blifehealthy.com/line/liff/signin}"

build_is_usable() {
  [[ -f "$APP_BUILD_DIR/index.html" && -d "$APP_BUILD_DIR/static" ]]
}

if [[ "$APP_MODE" == "static" ]] && ! build_is_usable; then
  echo "Static build is incomplete. Falling back to dev mode on port 3002." >&2
  APP_MODE="dev"
fi

if [[ "$APP_MODE" == "dev" ]]; then
  exec env BROWSER=none HOST=127.0.0.1 PORT=3002 "$NPM_BIN" start
fi

"$NPM_BIN" run build
exec env HOST=127.0.0.1 PORT=3002 node "$ROOT_DIR/scripts/serve_stephub_build.mjs" "$APP_DIR/build"
