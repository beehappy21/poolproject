#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub"
APP_MODE="${STEPHUB_APP_MODE:-static}"

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

if [[ "$APP_MODE" == "dev" ]]; then
  exec env BROWSER=none HOST=127.0.0.1 PORT=3002 "$NPM_BIN" start
fi

"$NPM_BIN" run build
exec env HOST=127.0.0.1 PORT=3002 node "$ROOT_DIR/scripts/serve_stephub_build.mjs" "$APP_DIR/build"
