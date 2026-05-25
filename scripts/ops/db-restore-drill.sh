#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/postgres}"
BACKUP_PREFIX="${BACKUP_PREFIX:-poolproject}"
DRILL_DATABASE_URL="${DRILL_DATABASE_URL:-${RESTORE_DATABASE_URL:-}}"

fail() {
  printf 'db-restore-drill: %s\n' "$1" >&2
  exit 1
}

if [[ -z "$DRILL_DATABASE_URL" ]]; then
  fail "DRILL_DATABASE_URL or RESTORE_DATABASE_URL is required."
fi

if [[ ! "$BACKUP_PREFIX" =~ ^[A-Za-z0-9._-]+$ ]]; then
  fail "BACKUP_PREFIX may only contain letters, numbers, dot, underscore, and dash."
fi

LATEST_BACKUP="$(
  find "$BACKUP_DIR" -type f \( -name "$BACKUP_PREFIX-????????-??????.sql" -o -name "$BACKUP_PREFIX-????????-??????.sql.gz" \) -print \
    | sort \
    | tail -n 1
)"

[[ -n "$LATEST_BACKUP" ]] || fail "No matching backup file found."

printf 'db-restore-drill: backup_file=%s\n' "$LATEST_BACKUP"
printf 'db-restore-drill: target_env=staging\n'

RESTORE_DATABASE_URL="$DRILL_DATABASE_URL" \
RESTORE_TARGET_ENV=staging \
CONFIRM_RESTORE_TARGET=staging \
FORCE_RESTORE=true \
bash "$ROOT_DIR/scripts/ops/db-restore.sh" "$LATEST_BACKUP"

if command -v psql >/dev/null 2>&1; then
  psql "$DRILL_DATABASE_URL" -v ON_ERROR_STOP=1 -Atqc 'select 1;' >/dev/null
  printf 'db-restore-drill: validation_query=ok\n'
else
  printf 'db-restore-drill: validation_query=skipped_psql_missing\n'
fi
