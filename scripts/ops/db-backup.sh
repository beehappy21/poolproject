#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATABASE_SOURCE="${BACKUP_DATABASE_URL:-${DATABASE_URL:-}}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/postgres}"
BACKUP_PREFIX="${BACKUP_PREFIX:-poolproject}"
BACKUP_COMPRESS="${BACKUP_COMPRESS:-true}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"

usage() {
  cat <<'EOF'
Usage:
  BACKUP_DATABASE_URL=postgresql://... npm run ops:backup:db

Environment:
  BACKUP_DATABASE_URL       Preferred database URL for backups
  DATABASE_URL              Fallback database URL
  BACKUP_DIR                Output directory, defaults to backups/postgres
  BACKUP_PREFIX             Filename prefix, defaults to poolproject
  BACKUP_COMPRESS           true or false, defaults to true

Safety:
  - Database URLs and credentials are never printed.
  - Backups contain sensitive customer, order, wallet, and commission data.
EOF
}

fail() {
  printf 'db-backup: %s\n' "$1" >&2
  exit 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "$1 was not found in PATH."
  fi
}

validate_prefix() {
  if [[ ! "$BACKUP_PREFIX" =~ ^[A-Za-z0-9._-]+$ ]]; then
    fail "BACKUP_PREFIX may only contain letters, numbers, dot, underscore, and dash."
  fi
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

[[ -n "$DATABASE_SOURCE" ]] || fail "BACKUP_DATABASE_URL or DATABASE_URL is required."
validate_prefix
require_command pg_dump

if [[ "$BACKUP_COMPRESS" != "true" && "$BACKUP_COMPRESS" != "false" ]]; then
  fail "BACKUP_COMPRESS must be true or false."
fi

mkdir -p "$BACKUP_DIR"

if [[ "$BACKUP_COMPRESS" == "true" ]]; then
  require_command gzip
  OUTPUT_FILE="$BACKUP_DIR/$BACKUP_PREFIX-$TIMESTAMP.sql.gz"
  pg_dump "$DATABASE_SOURCE" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    | gzip -c > "$OUTPUT_FILE"
else
  OUTPUT_FILE="$BACKUP_DIR/$BACKUP_PREFIX-$TIMESTAMP.sql"
  pg_dump "$DATABASE_SOURCE" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges > "$OUTPUT_FILE"
fi

BYTES="$(wc -c < "$OUTPUT_FILE" | tr -d '[:space:]')"

printf 'db-backup: created=%s\n' "$OUTPUT_FILE"
printf 'db-backup: bytes=%s\n' "$BYTES"
printf 'db-backup: compressed=%s\n' "$BACKUP_COMPRESS"
