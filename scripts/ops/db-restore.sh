#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
DATABASE_TARGET="${RESTORE_DATABASE_URL:-${DATABASE_URL:-}}"
RESTORE_TARGET_ENV="${RESTORE_TARGET_ENV:-}"
CONFIRM_RESTORE_TARGET="${CONFIRM_RESTORE_TARGET:-}"
FORCE_RESTORE="${FORCE_RESTORE:-false}"
CONFIRM_PRODUCTION_RESTORE="${CONFIRM_PRODUCTION_RESTORE:-false}"

usage() {
  cat <<'EOF'
Usage:
  RESTORE_TARGET_ENV=staging CONFIRM_RESTORE_TARGET=staging FORCE_RESTORE=true \
    RESTORE_DATABASE_URL=postgresql://... npm run ops:restore:db -- /path/to/backup.sql.gz

Environment:
  RESTORE_DATABASE_URL          Preferred restore target database URL
  DATABASE_URL                  Fallback restore target database URL
  RESTORE_TARGET_ENV            staging or production
  CONFIRM_RESTORE_TARGET        Must equal RESTORE_TARGET_ENV
  FORCE_RESTORE                 Must be true
  CONFIRM_PRODUCTION_RESTORE    Must be true for production restores

Safety:
  - Restore is destructive and resets the public schema.
  - Database URLs and credentials are never printed.
  - Production restore requires CONFIRM_PRODUCTION_RESTORE=true.
EOF
}

fail() {
  printf 'db-restore: %s\n' "$1" >&2
  exit 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "$1 was not found in PATH."
  fi
}

if [[ "$BACKUP_FILE" == "-h" || "$BACKUP_FILE" == "--help" || -z "$BACKUP_FILE" ]]; then
  usage
  exit 0
fi

[[ -n "$DATABASE_TARGET" ]] || fail "RESTORE_DATABASE_URL or DATABASE_URL is required."
[[ -f "$BACKUP_FILE" ]] || fail "Backup file does not exist."
[[ "$RESTORE_TARGET_ENV" == "staging" || "$RESTORE_TARGET_ENV" == "production" ]] || fail "RESTORE_TARGET_ENV must be staging or production."
[[ "$CONFIRM_RESTORE_TARGET" == "$RESTORE_TARGET_ENV" ]] || fail "CONFIRM_RESTORE_TARGET must match RESTORE_TARGET_ENV."
[[ "$FORCE_RESTORE" == "true" ]] || fail "FORCE_RESTORE=true is required."

if [[ "$RESTORE_TARGET_ENV" == "production" && "$CONFIRM_PRODUCTION_RESTORE" != "true" ]]; then
  fail "CONFIRM_PRODUCTION_RESTORE=true is required for production restore."
fi

require_command psql

if [[ "$BACKUP_FILE" == *.gz ]]; then
  require_command gzip
  RESTORE_INPUT=(gzip -dc "$BACKUP_FILE")
else
  RESTORE_INPUT=(cat "$BACKUP_FILE")
fi

printf 'db-restore: target_env=%s\n' "$RESTORE_TARGET_ENV"
printf 'db-restore: backup_file=%s\n' "$BACKUP_FILE"
printf 'db-restore: resetting_schema=true\n'

psql "$DATABASE_TARGET" -v ON_ERROR_STOP=1 \
  -c 'drop schema if exists public cascade; create schema public;'

"${RESTORE_INPUT[@]}" | psql "$DATABASE_TARGET" -v ON_ERROR_STOP=1

printf 'db-restore: completed=true\n'
