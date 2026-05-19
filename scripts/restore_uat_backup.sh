#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${1:-}"
CONFIRM_FLAG="${2:-}"

BAO_DB_PATH="${BAO_DB_PATH:-$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/database/database.sqlite}"
RUNTIME_DIR="${RUNTIME_DIR:-$ROOT_DIR/runtime}"
MANUAL_PAYMENTS_DIR="${MANUAL_PAYMENTS_DIR:-$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/public/manual-payments}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-poolproject-postgres}"
POSTGRES_DB="${POSTGRES_DB:-poolproject}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
DESTRUCTIVE_FLAG="${ALLOW_DESTRUCTIVE_UAT_RESTORE:-0}"

usage() {
  cat <<'EOF'
Usage:
  ALLOW_DESTRUCTIVE_UAT_RESTORE=1 bash scripts/restore_uat_backup.sh <backup-dir> --yes

Environment overrides:
  BAO_DB_PATH=/path/to/backend/database/database.sqlite
  RUNTIME_DIR=/path/to/runtime
  MANUAL_PAYMENTS_DIR=/path/to/backend/public/manual-payments
  POSTGRES_CONTAINER=poolproject-uat-postgres-1
  POSTGRES_DB=poolproject
  POSTGRES_USER=postgres
  DATABASE_URL=postgres://...

Expected backup contents:
  - poolproject.sql
  - bao-database.sqlite
  - runtime/
  - manual-payments/   (optional)

Safety:
  - This is destructive. It overwrites the current UAT database/runtime state.
  - The script requires both ALLOW_DESTRUCTIVE_UAT_RESTORE=1 and --yes.
EOF
}

resolve_postgres_container() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    return
  fi

  local names preferred first_match
  names="$(docker ps --format '{{.Names}}' 2>/dev/null || true)"

  if grep -Fxq "$POSTGRES_CONTAINER" <<<"$names"; then
    return
  fi

  preferred="$(grep -E '^poolproject-uat-postgres' <<<"$names" | head -n1 || true)"
  first_match="$(grep -E 'poolproject.*postgres|postgres.*poolproject' <<<"$names" | head -n1 || true)"

  if [[ -n "$preferred" ]]; then
    POSTGRES_CONTAINER="$preferred"
  elif [[ -n "$first_match" ]]; then
    POSTGRES_CONTAINER="$first_match"
  fi
}

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Missing required file: $path" >&2
    exit 1
  fi
}

restore_postgres() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    if ! command -v psql >/dev/null 2>&1; then
      echo "psql was not found in PATH." >&2
      exit 1
    fi

    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
      -c 'drop schema if exists public cascade; create schema public;'
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 < "$SQL_DUMP"
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "docker was not found in PATH." >&2
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Docker daemon is not available." >&2
    exit 1
  fi

  docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 \
    -c 'drop schema if exists public cascade; create schema public;'
  docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 < "$SQL_DUMP"
}

if [[ -z "$BACKUP_DIR" || "$BACKUP_DIR" == "-h" || "$BACKUP_DIR" == "--help" ]]; then
  usage
  exit 0
fi

resolve_postgres_container

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
MANUAL_PAYMENTS_SNAPSHOT="$BACKUP_DIR/manual-payments"

require_file "$SQL_DUMP"
require_file "$SQLITE_SNAPSHOT"

if [[ ! -d "$RUNTIME_SNAPSHOT" ]]; then
  echo "Missing required runtime snapshot directory: $RUNTIME_SNAPSHOT" >&2
  exit 1
fi

echo "Restoring Postgres..."
restore_postgres

echo "Restoring BAO sqlite snapshot..."
mkdir -p "$(dirname "$BAO_DB_PATH")"
cp "$SQLITE_SNAPSHOT" "$BAO_DB_PATH"

echo "Restoring runtime snapshot..."
rm -rf "$RUNTIME_DIR"
cp -R "$RUNTIME_SNAPSHOT" "$RUNTIME_DIR"

if [[ -d "$MANUAL_PAYMENTS_SNAPSHOT" ]]; then
  echo "Restoring manual-payments snapshot..."
  rm -rf "$MANUAL_PAYMENTS_DIR"
  mkdir -p "$(dirname "$MANUAL_PAYMENTS_DIR")"
  cp -R "$MANUAL_PAYMENTS_SNAPSHOT" "$MANUAL_PAYMENTS_DIR"
fi

echo "UAT restore completed from: $BACKUP_DIR"
