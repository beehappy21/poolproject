#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Importing member003 baseline..."
(
  cd "$ROOT_DIR"
  node scripts/seed_members_from_xlsx.mjs member003.xlsx 123456 --apply >/dev/null
  python3 scripts/import_member_profiles_from_xlsx.py member003.xlsx --apply >/dev/null
)

echo "Ensuring Stephub superadmin exists..."
(
  cd "$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend"
  if ! php -r 'require "vendor/autoload.php"; exit(class_exists("Database\\\\Seeders\\\\EnsureStephubSuperadminSeeder") ? 0 : 1);'; then
    composer dumpautoload --quiet >/dev/null
  fi
  php -d error_reporting='E_ALL & ~E_DEPRECATED' artisan db:seed --class=Database\\Seeders\\EnsureStephubSuperadminSeeder --force >/dev/null
)

echo "Ensuring Stephub demo catalog exists when catalog is empty..."
(
  cd "$ROOT_DIR"
  node scripts/seed_stephub_catalog_baseline.js
)

echo "Ensuring withdraw settings defaults exist..."
(
  cd "$ROOT_DIR"
  mkdir -p runtime
  if [[ ! -f runtime/withdraw-settings.json ]]; then
    cat > runtime/withdraw-settings.json <<'JSON'
{
  "withdrawEnabled": true,
  "withholdingTaxRate": "0.05",
  "autoSweepRate": "0",
  "feeFlatAmount": "0",
  "minimumWithdrawAmount": "0"
}
JSON
  fi
)

echo "Applying Stephub compatibility views..."
docker exec -i poolproject-postgres psql -v ON_ERROR_STOP=1 -U postgres -d poolproject \
  < "$ROOT_DIR/scripts/migrations/create_stephub_compat_views.sql" >/dev/null

echo "Stephub local baseline is ready."
