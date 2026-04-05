#!/usr/bin/env bash

set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
REAL_TEST_SEED_TREE="${REAL_TEST_SEED_TREE:-0}"
BINARY_TREE_DEPTH="${BINARY_TREE_DEPTH:-5}"
BINARY_TREE_ROOT_CODE="${BINARY_TREE_ROOT_CODE:-TH0000001}"
BINARY_TREE_MEMBER_PASSWORD="${BINARY_TREE_MEMBER_PASSWORD:-a1a1a1}"
MAIN_PLAN_ADMIN_IDENTIFIER="${MAIN_PLAN_ADMIN_IDENTIFIER:-TH0000013}"
MAIN_PLAN_ADMIN_PASSWORD="${MAIN_PLAN_ADMIN_PASSWORD:-a1a1a1}"
MAIN_PLAN_BENEFICIARY="${MAIN_PLAN_BENEFICIARY:-TH0000023}"
MAIN_PLAN_POOL_DATE="${MAIN_PLAN_POOL_DATE:-}"
MAIN_PLAN_SOURCE_TAG="${MAIN_PLAN_SOURCE_TAG:-commission-main-runtime}"
MAIN_PLAN_SEED_COMPLETION="${MAIN_PLAN_SEED_COMPLETION:-1}"
LIMIT_ROWS="${LIMIT_ROWS:-10}"

date_add() {
  node -e 'const [value, days] = process.argv.slice(1); const d = new Date(`${value}T00:00:00.000Z`); d.setUTCDate(d.getUTCDate() + Number(days)); process.stdout.write(d.toISOString().slice(0, 10));' "$1" "$2"
}

if [[ -z "$MAIN_PLAN_POOL_DATE" ]]; then
  MAIN_PLAN_POOL_DATE="$(node -e 'const now = new Date(); const utcDay = now.getUTCDay(); const sunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + ((7 - utcDay) % 7), 0, 0, 0, 0)); process.stdout.write(sunday.toISOString().slice(0, 10));')"
fi

DATE_FROM="${DATE_FROM:-$(date_add "$MAIN_PLAN_POOL_DATE" -6)}"
DATE_TO="${DATE_TO:-$MAIN_PLAN_POOL_DATE}"
MEMBER_CODE="${MEMBER_CODE:-$MAIN_PLAN_BENEFICIARY}"

echo "== COMMISSION MAIN REAL TEST =="
echo "api_base_url=$API_BASE_URL"
echo "beneficiary=$MAIN_PLAN_BENEFICIARY"
echo "pool_date=$MAIN_PLAN_POOL_DATE"
echo "date_from=$DATE_FROM"
echo "date_to=$DATE_TO"
echo "seed_tree=$REAL_TEST_SEED_TREE"
echo

if [[ "$REAL_TEST_SEED_TREE" == "1" ]]; then
  echo "-- Seeding binary tree members"
  DATABASE_URL="$DATABASE_URL" \
  BINARY_TREE_DEPTH="$BINARY_TREE_DEPTH" \
  BINARY_TREE_ROOT_CODE="$BINARY_TREE_ROOT_CODE" \
  BINARY_TREE_MEMBER_PASSWORD="$BINARY_TREE_MEMBER_PASSWORD" \
  node scripts/seed_binary_tree_members.js
  echo
fi

echo "-- Seeding commission runtime scenario"
DATABASE_URL="$DATABASE_URL" \
API_BASE_URL="$API_BASE_URL" \
MAIN_PLAN_ADMIN_IDENTIFIER="$MAIN_PLAN_ADMIN_IDENTIFIER" \
MAIN_PLAN_ADMIN_PASSWORD="$MAIN_PLAN_ADMIN_PASSWORD" \
MAIN_PLAN_BENEFICIARY="$MAIN_PLAN_BENEFICIARY" \
MAIN_PLAN_POOL_DATE="$MAIN_PLAN_POOL_DATE" \
MAIN_PLAN_SOURCE_TAG="$MAIN_PLAN_SOURCE_TAG" \
MAIN_PLAN_SEED_COMPLETION="$MAIN_PLAN_SEED_COMPLETION" \
node scripts/seed_commission_main_plan_runtime.js
echo

echo "-- Querying beneficiary summary"
DATABASE_URL="$DATABASE_URL" \
MEMBER_CODE="$MEMBER_CODE" \
DATE_FROM="$DATE_FROM" \
DATE_TO="$DATE_TO" \
POOL_DATE="$MAIN_PLAN_POOL_DATE" \
LIMIT_ROWS="$LIMIT_ROWS" \
node scripts/query_commission_runtime_summary.js
echo

echo "-- Querying all-member weekly summary"
DATABASE_URL="$DATABASE_URL" \
DATE_FROM="$DATE_FROM" \
DATE_TO="$DATE_TO" \
POOL_DATE="$MAIN_PLAN_POOL_DATE" \
LIMIT_ROWS="$LIMIT_ROWS" \
node scripts/query_commission_runtime_summary.js
