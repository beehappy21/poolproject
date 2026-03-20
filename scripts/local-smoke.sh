#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
RUN_SUFFIX="$(date +%s)"
PACKAGE_CODE="SMOKE${RUN_SUFFIX}"
MEMBER_CODE="SMOKEUSER${RUN_SUFFIX}"
MEMBER_EMAIL="smoke.${RUN_SUFFIX}@example.com"

cd "$ROOT_DIR"

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

EXISTING_PIDS="$(lsof -ti tcp:3000 2>/dev/null || true)"
if [[ -n "$EXISTING_PIDS" ]]; then
  xargs kill <<<"$EXISTING_PIDS" >/dev/null 2>&1 || true
  sleep 1
fi

docker compose up -d postgres >/dev/null
sleep 3
DATABASE_URL="$DATABASE_URL" npm run prisma:push >/dev/null
DATABASE_URL="$DATABASE_URL" npm run db:seed >/dev/null

DATABASE_URL="$DATABASE_URL" npm run start:api >/tmp/poolproject-api.log 2>&1 &
API_PID=$!

for _ in $(seq 1 20); do
  if curl -s "$API_BASE_URL/health" >/dev/null 2>&1; then
    break
  fi

  sleep 1
done

curl -s "$API_BASE_URL/health" >/dev/null

AUTH_JSON="$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H 'content-type: application/json' \
  -d '{"identifier":"ALICE","password":"dev-password"}')"
ACCESS_TOKEN="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.accessToken);' "$AUTH_JSON")"
AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"

PACKAGE_JSON="$(curl -s -X POST "$API_BASE_URL/packages" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"code\":\"$PACKAGE_CODE\",\"name\":\"Smoke Package\",\"priceUsdt\":\"150\",\"pv\":\"150\",\"activeDays\":30,\"earningCapAmount\":\"450\"}")"
PACKAGE_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.packageId);' "$PACKAGE_JSON")"

MEMBER_JSON="$(curl -s -X POST "$API_BASE_URL/members" \
  -H 'content-type: application/json' \
  -d "{\"memberCode\":\"$MEMBER_CODE\",\"name\":\"Smoke User\",\"email\":\"$MEMBER_EMAIL\",\"ref\":\"BOB\"}")"
MEMBER_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.memberId);' "$MEMBER_JSON")"

curl -s -X POST "$API_BASE_URL/members/$MEMBER_ID/activate-package" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"packageId\":\"$PACKAGE_ID\"}" >/dev/null

ORDER_JSON="$(curl -s -X POST "$API_BASE_URL/orders" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$MEMBER_ID\",\"packageId\":\"$PACKAGE_ID\"}")"
ORDER_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(data.orderId);' "$ORDER_JSON")"

curl -s -X POST "$API_BASE_URL/orders/$ORDER_ID/approve" \
  -H "$AUTH_HEADER" >/dev/null
PROCESS_JSON="$(curl -s -X POST "$API_BASE_URL/orders/$ORDER_ID/process-approved" \
  -H "$AUTH_HEADER")"
POOL_JSON="$(curl -s -X POST "$API_BASE_URL/pool/$(date +%F)/close" \
  -H "$AUTH_HEADER")"
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
