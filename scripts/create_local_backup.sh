#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP="${1:-$(date +%Y%m%d-%H%M%S)}"
BACKUP_DIR="$ROOT_DIR/backups/stephub-full-$TIMESTAMP"
BAO_DB_PATH="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/database/database.sqlite"
RUNTIME_DIR="$ROOT_DIR/runtime"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-poolproject-postgres}"
NOW_HUMAN="$(date '+%Y-%m-%d %H:%M:%S %z')"
BASE_COMMIT="$(git -C "$ROOT_DIR" rev-parse HEAD)"
BASE_SHORT="$(git -C "$ROOT_DIR" rev-parse --short HEAD)"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/create_local_backup.sh [timestamp]

What this creates:
  - backups/stephub-full-<timestamp>/poolproject.sql
  - backups/stephub-full-<timestamp>/bao-database.sqlite
  - backups/stephub-full-<timestamp>/runtime/
  - backups/stephub-full-<timestamp>/README.md
  - backups/stephub-full-<timestamp>/base-commit.txt
  - backups/stephub-full-<timestamp>/git-status.txt
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker was not found in PATH." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not available. Start Docker Desktop or Colima first." >&2
  exit 1
fi

if [[ ! -f "$BAO_DB_PATH" ]]; then
  echo "Missing BAO sqlite database: $BAO_DB_PATH" >&2
  exit 1
fi

if [[ ! -d "$RUNTIME_DIR" ]]; then
  echo "Missing runtime directory: $RUNTIME_DIR" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

cat > "$BACKUP_DIR/README.md" <<EOF
Full backup created: $NOW_HUMAN
Base commit: $BASE_SHORT
Included:
- Postgres dump (poolproject.sql)
- BAO sqlite snapshot
- runtime directory snapshot
- git status snapshot
EOF

printf '%s\n' "$BASE_COMMIT" > "$BACKUP_DIR/base-commit.txt"
git -C "$ROOT_DIR" status --short > "$BACKUP_DIR/git-status.txt"

cp "$BAO_DB_PATH" "$BACKUP_DIR/bao-database.sqlite"
cp -R "$RUNTIME_DIR" "$BACKUP_DIR/runtime"

docker exec "$POSTGRES_CONTAINER" pg_dump -U postgres -d poolproject \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges > "$BACKUP_DIR/poolproject.sql"

echo "Backup created at: $BACKUP_DIR"
