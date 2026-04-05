#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[info] checking Stephub local baseline"

php "$ROOT_DIR/scripts/check_stephub_backend_baseline.php"
echo "[ok] DB baseline counts and compat views"

sqlite3 "$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/database/database.sqlite" \
  "select count(*) from users where email = 'superadmin@blifehealthy.com';" | grep -qx '1' && \
  echo "[ok] BAO superadmin exists" || {
  echo "[fail] BAO superadmin exists"
  exit 1
}

sqlite3 "$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/database/database.sqlite" \
  "select count(*) from users where email = 'superadmin@blifehealthy.com' and permissions like '%platform.index%';" | grep -qx '1' && \
  echo "[ok] BAO superadmin dashboard access exists" || {
  echo "[fail] BAO superadmin dashboard access exists"
  exit 1
}

echo "[ok] Storefront products are present"

node - "$ROOT_DIR/runtime/commission-settings.json" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
const raw = fs.readFileSync(path, 'utf8');
const data = JSON.parse(raw);
const expected = {
  directLevelRates: ['0.05', '0.03', '0.02'],
  uniLevelRates: ['0'],
  poolRate: '0',
  cashbackRate: '0',
  appVisibility: {
    cashback: false,
    direct: true,
    unilevel: false,
    matrix: true,
    pool: true,
  },
};
const pass =
  JSON.stringify(data.directLevelRates) === JSON.stringify(expected.directLevelRates) &&
  JSON.stringify(data.uniLevelRates) === JSON.stringify(expected.uniLevelRates) &&
  data.poolRate === expected.poolRate &&
  data.cashbackRate === expected.cashbackRate &&
  Object.keys(expected.appVisibility).every((key) => data.appVisibility?.[key] === expected.appVisibility[key]);
process.exit(pass ? 0 : 1);
NODE
echo "[ok] Commission settings match Stephub UAT profile"

php "$ROOT_DIR/scripts/check_stephub_admin_internal.php" >/tmp/stephub-admin-internal-check.log 2>&1 || {
  cat /tmp/stephub-admin-internal-check.log
  echo "[fail] BAO internal pages"
  exit 1
}
echo "[ok] BAO internal pages"

python3 - <<'PY' "$ROOT_DIR/runtime/withdraw-settings.json"
import json, os, sys
path = sys.argv[1]
if not os.path.exists(path):
    raise SystemExit(1)
with open(path, encoding="utf-8") as f:
    data = json.load(f)
required = {"withdrawEnabled", "withholdingTaxRate", "autoSweepRate", "feeFlatAmount", "minimumWithdrawAmount"}
if required.issubset(data):
    raise SystemExit(0)
raise SystemExit(1)
PY
echo "[ok] Withdraw settings baseline exists"

echo "[ok] Stephub baseline checks passed"
