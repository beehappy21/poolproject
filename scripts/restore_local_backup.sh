#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${1:-}"
CONFIRM_FLAG="${2:-}"

BAO_DB_PATH="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/database/database.sqlite"
RUNTIME_DIR="$ROOT_DIR/runtime"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-poolproject-postgres}"
DESTRUCTIVE_FLAG="${ALLOW_DESTRUCTIVE_LOCAL_RESET:-0}"

usage() {
  cat <<'EOF'
Usage:
  ALLOW_DESTRUCTIVE_LOCAL_RESET=1 bash scripts/restore_local_backup.sh <backup-dir> --yes

What this restores:
  - Postgres database from poolproject.sql
  - BAO sqlite database from bao-database.sqlite
  - runtime/ directory snapshot

Expected backup contents:
  - poolproject.sql
  - bao-database.sqlite
  - runtime/

Safety:
  - This is destructive. It overwrites the current local database/runtime state.
  - The script requires both ALLOW_DESTRUCTIVE_LOCAL_RESET=1 and --yes.
EOF
}

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Missing required file: $path" >&2
    exit 1
  fi
}

stop_port() {
  local port="$1"
  local pids

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [[ -z "$pids" ]]; then
    return
  fi

  echo "Stopping listeners on $port: $pids"
  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    kill "$pid" || true
  done <<< "$pids"
}

if [[ -z "$BACKUP_DIR" || "$BACKUP_DIR" == "-h" || "$BACKUP_DIR" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "$DESTRUCTIVE_FLAG" != "1" || "$CONFIRM_FLAG" != "--yes" ]]; then
  echo "Refusing to restore without explicit confirmation." >&2
  usage >&2
  exit 1
fi

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "Backup directory not found: $BACKUP_DIR" >&2
  exit 1
fi

SQL_DUMP="$BACKUP_DIR/poolproject.sql"
SQLITE_SNAPSHOT="$BACKUP_DIR/bao-database.sqlite"
RUNTIME_SNAPSHOT="$BACKUP_DIR/runtime"

require_file "$SQL_DUMP"
require_file "$SQLITE_SNAPSHOT"

if [[ ! -d "$RUNTIME_SNAPSHOT" ]]; then
  echo "Missing required runtime snapshot directory: $RUNTIME_SNAPSHOT" >&2
  exit 1
fi

echo "Preparing local services for restore..."
stop_port 3000
stop_port 3002
stop_port 8001

echo "Ensuring Postgres container is running..."
(
  cd "$ROOT_DIR"
  docker compose up -d postgres >/dev/null
)

echo "Resetting Postgres schema and restoring dump..."
docker exec -i "$POSTGRES_CONTAINER" psql -U postgres -d poolproject \
  -v ON_ERROR_STOP=1 \
  -c 'drop schema if exists public cascade; create schema public;'
docker exec -i "$POSTGRES_CONTAINER" psql -U postgres -d poolproject \
  -v ON_ERROR_STOP=1 < "$SQL_DUMP"

echo "Restoring BAO sqlite snapshot..."
mkdir -p "$(dirname "$BAO_DB_PATH")"
cp "$SQLITE_SNAPSHOT" "$BAO_DB_PATH"

echo "Restoring runtime snapshot..."
rm -rf "$RUNTIME_DIR"
cp -R "$RUNTIME_SNAPSHOT" "$RUNTIME_DIR"

echo "Restore completed from: $BACKUP_DIR"
echo "Recommended next steps:"
echo "  1. bash scripts/dev-restart.sh"
echo "  2. npm run dev:check"
