#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend"
PUBLIC_DIR="$BACKEND_DIR/public"
ROUTER_SCRIPT="$BACKEND_DIR/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php"

HOST="${BAO_HOST:-127.0.0.1}"
PORT="${BAO_PORT:-8001}"
UPLOAD_MAX_FILESIZE="${BAO_UPLOAD_MAX_FILESIZE:-32M}"
POST_MAX_SIZE="${BAO_POST_MAX_SIZE:-64M}"
MAX_FILE_UPLOADS="${BAO_MAX_FILE_UPLOADS:-20}"

cd "$PUBLIC_DIR"

exec php \
  -d upload_max_filesize="$UPLOAD_MAX_FILESIZE" \
  -d post_max_size="$POST_MAX_SIZE" \
  -d max_file_uploads="$MAX_FILE_UPLOADS" \
  -S "$HOST:$PORT" \
  "$ROUTER_SCRIPT"
