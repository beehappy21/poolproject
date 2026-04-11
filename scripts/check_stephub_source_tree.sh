#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_ROOT="${1:-$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc}"

BACKEND_DIR="$SOURCE_ROOT/backend"
WAP_DIR="$SOURCE_ROOT/stephub"

missing=0

check_file() {
  local path="$1"
  if [[ -f "$path" ]]; then
    printf '[stephub-tree] ok   %s\n' "$path"
  else
    printf '[stephub-tree] miss %s\n' "$path" >&2
    missing=1
  fi
}

printf '[stephub-tree] source root: %s\n' "$SOURCE_ROOT"

check_file "$BACKEND_DIR/Dockerfile.bao"
check_file "$BACKEND_DIR/docker-entrypoint.sh"
check_file "$BACKEND_DIR/artisan"
check_file "$BACKEND_DIR/composer.json"
check_file "$BACKEND_DIR/public/index.php"
check_file "$BACKEND_DIR/vendor/autoload.php"
check_file "$BACKEND_DIR/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php"

check_file "$WAP_DIR/Dockerfile.wap"
check_file "$WAP_DIR/package.json"
check_file "$WAP_DIR/package-lock.json"
check_file "$WAP_DIR/docker-serve-build.mjs"
check_file "$WAP_DIR/public/index.html"
check_file "$WAP_DIR/public/manifest.json"
check_file "$WAP_DIR/src/App.tsx"
check_file "$WAP_DIR/src/index.tsx"

if [[ "$missing" -ne 0 ]]; then
  cat >&2 <<MSG
[stephub-tree] source tree is incomplete.
[stephub-tree] stop here before docker compose build bao wap.
[stephub-tree] common cause: stale or partial copy on VPS instead of a complete repo checkout.
MSG
  exit 1
fi

printf '[stephub-tree] source tree looks complete for bao/wap builds\n'
