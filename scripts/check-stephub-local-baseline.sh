#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

check_json_count() {
  local label="$1"
  local url="$2"

  if node -e '
const url = process.argv[1];
const transport = url.startsWith("https:") ? require("node:https") : require("node:http");
transport.get(url, (response) => {
  let body = "";
  response.setEncoding("utf8");
  response.on("data", (chunk) => {
    body += chunk;
  });
  response.on("end", () => {
    if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 400) {
      process.exit(1);
      return;
    }
    try {
      const parsed = JSON.parse(body);
      const data = Array.isArray(parsed) ? parsed : parsed.data;
      if (Array.isArray(data) && data.length > 0) {
        process.exit(0);
        return;
      }
      process.exit(1);
    } catch {
      process.exit(1);
    }
  });
}).on("error", () => process.exit(1));
' "$url"; then
    echo "[ok] $label"
  else
    echo "[fail] $label"
    return 1
  fi
}

echo "[info] checking Stephub local baseline"

docker exec -i poolproject-postgres psql -U postgres -d poolproject -Atqc '
select
  case
    when (select count(*) from "ProductCategory") > 0
     and (select count(*) from "Product") > 0
     and (select count(*) from "ProductDetail") > 0
     and (select count(*) from "User" where "memberCode" like '\''TH%'\'' and "isAdmin" = false) > 0
     and to_regclass('\''public."WithdrawRequest"'\'') is not null
     and to_regclass('\''public."KycRequest"'\'') is not null
     and exists (select 1 from pg_views where viewname = '\''stephub_products_v1'\'')
     and exists (select 1 from pg_views where viewname = '\''stephub_members_v1'\'')
    then '\''OK'\''
    else '\''FAIL'\''
  end;
' | grep -qx 'OK' && echo "[ok] DB baseline counts and compat views" || {
  echo "[fail] DB baseline counts and compat views"
  exit 1
}

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

check_json_count "Storefront products are present" "http://127.0.0.1:3000/products/storefront"
check_json_count "Storefront categories are present" "http://127.0.0.1:3000/products/categories"

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
