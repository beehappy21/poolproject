#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"

cd "$ROOT_DIR"

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

docker compose up -d postgres >/dev/null
sleep 3
DATABASE_URL="$DATABASE_URL" npm run prisma:push >/dev/null
DATABASE_URL="$DATABASE_URL" npm run db:seed >/dev/null

DATABASE_URL="$DATABASE_URL" npm run start:api >/tmp/poolproject-api.log 2>&1 &
API_PID=$!
sleep 5

PACKAGE_JSON="$(curl -s -X POST "$API_BASE_URL/packages" \
  -H 'content-type: application/json' \
  -d '{"code":"SMOKE1","name":"Smoke Package","priceUsdt":"150","pv":"150","activeDays":30,"earningCapAmount":"450"}')"
PACKAGE_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.packageId);' "$PACKAGE_JSON")"

MEMBER_JSON="$(curl -s -X POST "$API_BASE_URL/members" \
  -H 'content-type: application/json' \
  -d '{"memberCode":"SMOKEUSER","name":"Smoke User","email":"smoke@example.com","ref":"BOB"}')"
MEMBER_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.memberId);' "$MEMBER_JSON")"

curl -s -X POST "$API_BASE_URL/members/$MEMBER_ID/activate-package" \
  -H 'content-type: application/json' \
  -d "{\"packageId\":\"$PACKAGE_ID\"}" >/dev/null

ORDER_JSON="$(curl -s -X POST "$API_BASE_URL/orders" \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$MEMBER_ID\",\"packageId\":\"$PACKAGE_ID\"}")"
ORDER_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.orderId);' "$ORDER_JSON")"

curl -s -X POST "$API_BASE_URL/orders/$ORDER_ID/approve" >/dev/null
PROCESS_JSON="$(curl -s -X POST "$API_BASE_URL/orders/$ORDER_ID/process-approved")"
POOL_JSON="$(curl -s -X POST "$API_BASE_URL/pool/$(date +%F)/close")"
REFERRAL_JSON="$(curl -s "$API_BASE_URL/members/by-code/BOB/referral-link?baseUrl=$API_BASE_URL")"

node -e '
const processResult = JSON.parse(process.argv[1]);
const poolResult = JSON.parse(process.argv[2]);
const referralResult = JSON.parse(process.argv[3]);
if (!processResult.orderId) throw new Error("process-approved failed");
if (!poolResult.poolDate) throw new Error("pool close failed");
if (!referralResult.referralLink) throw new Error("referral link failed");
console.log(JSON.stringify({
  orderId: processResult.orderId,
  directStatus: processResult.commissionDrafts.directStatus,
  uniCount: processResult.commissionDrafts.uniCount,
  poolDate: poolResult.poolDate,
  eligibleMemberCount: poolResult.eligibleMemberCount,
  referralLink: referralResult.referralLink
}, null, 2));
' "$PROCESS_JSON" "$POOL_JSON" "$REFERRAL_JSON"
