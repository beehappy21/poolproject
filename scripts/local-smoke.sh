#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
ALLOW_DESTRUCTIVE_LOCAL_RESET="${ALLOW_DESTRUCTIVE_LOCAL_RESET:-0}"
RUN_SUFFIX="$(date +%s)"
PACKAGE_CODE="SMOKE${RUN_SUFFIX}"
MEMBER_CODE="SMOKEUSER${RUN_SUFFIX}"
MEMBER_EMAIL="smoke.${RUN_SUFFIX}@example.com"
MEMBER_PASSWORD="smokepass1234"
ORIGINAL_COMMISSION_SETTINGS_JSON=""
AUTH_HEADER=""

cd "$ROOT_DIR"

if [[ "$ALLOW_DESTRUCTIVE_LOCAL_RESET" != "1" ]]; then
  echo "Refusing to run destructive local smoke reset. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 to continue." >&2
  exit 1
fi

cleanup() {
  if [[ -n "${ORIGINAL_COMMISSION_SETTINGS_JSON:-}" && -n "${AUTH_HEADER:-}" ]]; then
    RESTORE_COMMISSION_SETTINGS="$(node -e '
const original = JSON.parse(process.argv[1]);
process.stdout.write(JSON.stringify({
  directLevelRates:
    original.directLevelRates && original.directLevelRates.length > 0
      ? original.directLevelRates
      : original.directRate
        ? [original.directRate]
        : ["0.2"],
  uniLevelRates: original.uniLevelRates,
  poolRate: original.poolRate,
}));
' "$ORIGINAL_COMMISSION_SETTINGS_JSON")"
    curl -s -X PUT "$API_BASE_URL/settings/commissions" \
      -H "$AUTH_HEADER" \
      -H 'content-type: application/json' \
      -d "$RESTORE_COMMISSION_SETTINGS" >/dev/null 2>&1 || true
  fi

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

rm -f "$ROOT_DIR/runtime/commission-settings.json"

docker compose up -d postgres >/dev/null
sleep 3
DATABASE_URL="$DATABASE_URL" npx prisma db push --schema prisma/schema.prisma --accept-data-loss >/dev/null
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
ACCESS_TOKEN="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.accessToken || ""));' "$AUTH_JSON")"
AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"
ORIGINAL_COMMISSION_SETTINGS_JSON="$(curl -s "$API_BASE_URL/settings/commissions" \
  -H "$AUTH_HEADER")"

SETTINGS_UPDATE_JSON="$(curl -s -X PUT "$API_BASE_URL/settings/commissions" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d '{"directLevelRates":["0.1","0.05"],"uniLevelRates":["0.05","0.04","0.03"],"poolRate":"0.4"}')"
SETTINGS_READ_JSON="$(curl -s "$API_BASE_URL/settings/commissions" \
  -H "$AUTH_HEADER")"

PACKAGE_JSON="$(curl -s -X POST "$API_BASE_URL/packages" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"code\":\"$PACKAGE_CODE\",\"name\":\"Smoke Package\",\"priceUsdt\":\"150\",\"pv\":\"150\",\"activeDays\":30,\"earningCapAmount\":\"450\"}")"
PACKAGE_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.packageId || ""));' "$PACKAGE_JSON")"
if [[ -z "$PACKAGE_ID" ]]; then
  echo "PACKAGE_JSON=$PACKAGE_JSON" >&2
  exit 1
fi

MEMBER_JSON="$(curl -s -X POST "$API_BASE_URL/members" \
  -H 'content-type: application/json' \
  -d "{\"memberCode\":\"$MEMBER_CODE\",\"name\":\"Smoke User\",\"email\":\"$MEMBER_EMAIL\",\"ref\":\"B2C3456\",\"password\":\"$MEMBER_PASSWORD\"}")"
MEMBER_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.memberId || ""));' "$MEMBER_JSON")"
if [[ -z "$MEMBER_ID" ]]; then
  echo "MEMBER_JSON=$MEMBER_JSON" >&2
  exit 1
fi

INVALID_SPONSOR_STATUS="$(curl -s -o /tmp/poolproject-invalid-sponsor.out -w "%{http_code}" -X POST "$API_BASE_URL/members" \
  -H 'content-type: application/json' \
  -d "{\"memberCode\":\"BADREF${RUN_SUFFIX}\",\"name\":\"Bad Ref\",\"ref\":\"missing-sponsor\",\"password\":\"$MEMBER_PASSWORD\"}")"

INVALID_SPONSOR_ID_STATUS="$(curl -s -o /tmp/poolproject-invalid-sponsor-id.out -w "%{http_code}" -X POST "$API_BASE_URL/members" \
  -H 'content-type: application/json' \
  -d "{\"memberCode\":\"BADSponsor${RUN_SUFFIX}\",\"name\":\"Bad Sponsor Id\",\"sponsorId\":\"2\",\"password\":\"$MEMBER_PASSWORD\"}")"

curl -s -X POST "$API_BASE_URL/members/$MEMBER_ID/activate-package" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"packageId\":\"$PACKAGE_ID\"}" >/dev/null

ORDER_JSON="$(curl -s -X POST "$API_BASE_URL/orders" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$MEMBER_ID\",\"packageId\":\"$PACKAGE_ID\"}")"
ORDER_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.orderId || ""));' "$ORDER_JSON")"
if [[ -z "$ORDER_ID" ]]; then
  echo "ORDER_JSON=$ORDER_JSON" >&2
  exit 1
fi

curl -s -X POST "$API_BASE_URL/orders/$ORDER_ID/approve" \
  -H "$AUTH_HEADER" >/dev/null
PROCESS_JSON="$(curl -s -X POST "$API_BASE_URL/orders/$ORDER_ID/process-approved" \
  -H "$AUTH_HEADER")"
if [[ "$PROCESS_JSON" != *"orderId"* ]]; then
  echo "PROCESS_JSON=$PROCESS_JSON" >&2
fi
POOL_JSON="$(curl -s -X POST "$API_BASE_URL/pool/$(date +%F)/close" \
  -H "$AUTH_HEADER")"
REFERRAL_JSON="$(curl -s "$API_BASE_URL/members/by-code/BOB/referral-link?baseUrl=$API_BASE_URL")"
REFERRAL_CODE="$(node -e '
const data = JSON.parse(process.argv[1]);
const fromField = data.referralCode;
const fromLink = (() => {
  try {
    return new URL(data.referralLink).searchParams.get("ref");
  } catch {
    return null;
  }
})();
process.stdout.write(fromField || fromLink || "");
' "$REFERRAL_JSON")"

node -e '
const processResult = JSON.parse(process.argv[1]);
const poolResult = JSON.parse(process.argv[2]);
const referralResult = JSON.parse(process.argv[3]);
const settingsUpdate = JSON.parse(process.argv[4]);
const settingsRead = JSON.parse(process.argv[5]);
const invalidSponsorStatus = process.argv[6];
const invalidSponsorIdStatus = process.argv[7];
const memberCreate = JSON.parse(process.argv[8]);
const referralCode = process.argv[9];
if (!processResult.orderId) throw new Error("process-approved failed");
if (!poolResult.poolDate) throw new Error("pool close failed");
if (!referralResult.referralLink) throw new Error("referral link failed");
if (!referralCode || !/^(?=(?:.*[A-Z]){2})(?=(?:.*\d){5})[A-Z0-9]{7}$/.test(referralCode)) {
  throw new Error("referral code format failed");
}
if (settingsUpdate.directLevels !== 2) throw new Error("settings update failed");
if (settingsRead.poolRate !== "0.4") throw new Error("settings read-back failed");
if (!memberCreate.sponsorId) {
  console.error(JSON.stringify({ memberCreate }, null, 2));
  throw new Error("lowercase referral sponsor assignment failed");
}
if (invalidSponsorStatus !== "400") throw new Error("missing sponsor should fail");
if (invalidSponsorIdStatus !== "400") throw new Error("public sponsorId should fail");
if ((settingsRead.directLevelRates || []).join(",") !== "0.1,0.05") {
  throw new Error("directLevelRates read-back failed");
}
console.log(JSON.stringify({
  orderId: processResult.orderId,
  directCount: processResult.commissionDrafts.directCount,
  directStatus: processResult.commissionDrafts.directStatus,
  uniCount: processResult.commissionDrafts.uniCount,
  poolDate: poolResult.poolDate,
  eligibleMemberCount: poolResult.eligibleMemberCount,
  referralLink: referralResult.referralLink,
  referralCode,
  referralSponsorId: memberCreate.sponsorId,
  settings: {
    directLevels: settingsRead.directLevels,
    uniLevels: settingsRead.uniLevels,
    poolRate: settingsRead.poolRate
  }
}, null, 2));
' "$PROCESS_JSON" "$POOL_JSON" "$REFERRAL_JSON" "$SETTINGS_UPDATE_JSON" "$SETTINGS_READ_JSON" "$INVALID_SPONSOR_STATUS" "$INVALID_SPONSOR_ID_STATUS" "$MEMBER_JSON" "$REFERRAL_CODE"
