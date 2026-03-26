#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Importing member003 baseline..."
(
  cd "$ROOT_DIR"
  node scripts/seed_members_from_xlsx.mjs member003.xlsx 123456 --apply >/dev/null
  python3 scripts/import_member_profiles_from_xlsx.py member003.xlsx --apply >/dev/null
)

echo "Ensuring Stephub demo catalog exists when catalog is empty..."
(
  cd "$ROOT_DIR"
  node scripts/seed_stephub_catalog_baseline.js
)

echo "Applying Stephub compatibility views..."
docker exec -i poolproject-postgres psql -v ON_ERROR_STOP=1 -U postgres -d poolproject \
  < "$ROOT_DIR/scripts/migrations/create_stephub_compat_views.sql" >/dev/null

echo "Stephub local baseline is ready."
