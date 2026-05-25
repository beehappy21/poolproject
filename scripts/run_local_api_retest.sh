#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/poolproject_retest?schema=public}"
export ADMIN_MEMBER_CODES="${ADMIN_MEMBER_CODES:-}"

exec bash "$ROOT_DIR/scripts/run_local_api.sh"
