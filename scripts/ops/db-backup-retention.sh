#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/postgres}"
BACKUP_PREFIX="${BACKUP_PREFIX:-poolproject}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DRY_RUN="${DRY_RUN:-false}"

fail() {
  printf 'db-backup-retention: %s\n' "$1" >&2
  exit 1
}

if [[ ! "$BACKUP_PREFIX" =~ ^[A-Za-z0-9._-]+$ ]]; then
  fail "BACKUP_PREFIX may only contain letters, numbers, dot, underscore, and dash."
fi

if [[ ! "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ || "$BACKUP_RETENTION_DAYS" -le 0 ]]; then
  fail "BACKUP_RETENTION_DAYS must be a positive integer."
fi

if [[ "$DRY_RUN" != "true" && "$DRY_RUN" != "false" ]]; then
  fail "DRY_RUN must be true or false."
fi

if [[ ! -d "$BACKUP_DIR" ]]; then
  printf 'db-backup-retention: backup_dir_missing=%s\n' "$BACKUP_DIR"
  exit 0
fi

MATCH_NAME_SQL="$BACKUP_PREFIX-????????-??????.sql"
MATCH_NAME_GZ="$BACKUP_PREFIX-????????-??????.sql.gz"
COUNT=0

while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  COUNT=$((COUNT + 1))

  if [[ "$DRY_RUN" == "true" ]]; then
    printf 'db-backup-retention: would_delete=%s\n' "$file"
  else
    rm -f -- "$file"
    printf 'db-backup-retention: deleted=%s\n' "$file"
  fi
done < <(
  find "$BACKUP_DIR" -type f \( -name "$MATCH_NAME_SQL" -o -name "$MATCH_NAME_GZ" \) -mtime +"$BACKUP_RETENTION_DAYS" -print
)

printf 'db-backup-retention: matched=%s\n' "$COUNT"
printf 'db-backup-retention: dry_run=%s\n' "$DRY_RUN"
