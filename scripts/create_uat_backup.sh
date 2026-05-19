#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP="${1:-$(date +%Y%m%d-%H%M%S)}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/uat-full-$TIMESTAMP}"
BAO_DB_PATH="${BAO_DB_PATH:-$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/database/database.sqlite}"
RUNTIME_DIR="${RUNTIME_DIR:-$ROOT_DIR/runtime}"
MANUAL_PAYMENTS_DIR="${MANUAL_PAYMENTS_DIR:-$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/public/manual-payments}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-poolproject-postgres}"
POSTGRES_DB="${POSTGRES_DB:-poolproject}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
NOW_HUMAN="$(date '+%Y-%m-%d %H:%M:%S %z')"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/create_uat_backup.sh [timestamp]

Environment overrides:
  BACKUP_DIR=/path/to/output
  BAO_DB_PATH=/path/to/backend/database/database.sqlite
  RUNTIME_DIR=/path/to/runtime
  MANUAL_PAYMENTS_DIR=/path/to/backend/public/manual-payments
  POSTGRES_CONTAINER=poolproject-uat-postgres-1
  POSTGRES_DB=poolproject
  POSTGRES_USER=postgres
  DATABASE_URL=postgres://...

What this creates:
  - backups/uat-full-<timestamp>/poolproject.sql
  - backups/uat-full-<timestamp>/bao-database.sqlite
  - backups/uat-full-<timestamp>/runtime/
  - backups/uat-full-<timestamp>/manual-payments/   (when present)
  - backups/uat-full-<timestamp>/README.md

Database dump modes:
  1. If DATABASE_URL is set, the script uses pg_dump "$DATABASE_URL"
  2. Otherwise it uses docker exec "$POSTGRES_CONTAINER" pg_dump ...
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

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

resolve_postgres_container

require_path() {
  local path="$1"
  local label="$2"
  if [[ ! -e "$path" ]]; then
    echo "Missing $label: $path" >&2
    exit 1
  fi
}

dump_postgres() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    if ! command -v pg_dump >/dev/null 2>&1; then
      echo "pg_dump was not found in PATH." >&2
      exit 1
    fi

    pg_dump "$DATABASE_URL" \
      --clean \
      --if-exists \
      --no-owner \
      --no-privileges > "$BACKUP_DIR/poolproject.sql"
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

  docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges > "$BACKUP_DIR/poolproject.sql"
}

require_path "$BAO_DB_PATH" "BAO sqlite database"
require_path "$RUNTIME_DIR" "runtime directory"

mkdir -p "$BACKUP_DIR"

cat > "$BACKUP_DIR/README.md" <<EOF
UAT backup created: $NOW_HUMAN
Included:
- Postgres dump (poolproject.sql)
- BAO sqlite snapshot
- runtime directory snapshot
- manual-payments snapshot (when present)
EOF

cp "$BAO_DB_PATH" "$BACKUP_DIR/bao-database.sqlite"
cp -R "$RUNTIME_DIR" "$BACKUP_DIR/runtime"

if [[ -d "$MANUAL_PAYMENTS_DIR" ]]; then
  cp -R "$MANUAL_PAYMENTS_DIR" "$BACKUP_DIR/manual-payments"
fi

dump_postgres

echo "UAT backup created at: $BACKUP_DIR"
