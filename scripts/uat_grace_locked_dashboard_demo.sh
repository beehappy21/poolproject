#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TOKEN="$(grep '^INTERNAL_RECEIPT_TOKEN=' deploy/compose/api.env | tail -1 | cut -d= -f2-)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-poolproject-uat-postgres-1}"
POSTGRES_DB="${POSTGRES_DB:-poolproject}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
API_CONTAINER="${API_CONTAINER:-poolproject-uat-api-1}"

if [[ -z "$TOKEN" ]]; then
  echo "Missing INTERNAL_RECEIPT_TOKEN in deploy/compose/api.env" >&2
  exit 1
fi

RUN_TAG="${RUN_TAG:-grace-locked-dashboard-uat-$(date +%Y%m%d-%H%M%S)}"
REPORT_FILE="runtime/${RUN_TAG}.log"
mkdir -p runtime

psqlq() {
  docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "$1"
}

json_field() {
  local field_name="$1"
  sed -n "s/.*\"${field_name}\":\"\\([^\"]*\\)\".*/\\1/p"
}

create_test_member() {
  local member_code="$1"
  local referral_code="$2"
  local display_name="$3"
  local sponsor_member_code="${4:-TH0000001}"

  docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<SQL >/dev/null
DO \$\$
DECLARE
  sponsor_id bigint;
  sponsor_hash text;
  member_id bigint;
BEGIN
  SELECT id, "passwordHash"
  INTO sponsor_id, sponsor_hash
  FROM "User"
  WHERE "memberCode" = '${sponsor_member_code}'
  LIMIT 1;

  IF sponsor_id IS NULL THEN
    RAISE EXCEPTION 'Sponsor % not found', '${sponsor_member_code}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "User" WHERE "memberCode" = '${member_code}'
  ) THEN
    INSERT INTO "User" (
      "memberCode",
      "referralCode",
      "name",
      "passwordHash",
      "sponsorId",
      "status",
      "riskLevel",
      "payoutStatus",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      '${member_code}',
      '${referral_code}',
      '${display_name}',
      sponsor_hash,
      sponsor_id,
      'ACTIVE',
      'NORMAL',
      'ACTIVE',
      now(),
      now()
    );
  END IF;

  SELECT id INTO member_id
  FROM "User"
  WHERE "memberCode" = '${member_code}'
  LIMIT 1;

  INSERT INTO "MemberProfile" (
    "userId",
    "uplineUserId",
    "placementSide",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    member_id,
    sponsor_id,
    'RIGHT',
    now(),
    now()
  )
  ON CONFLICT ("userId") DO UPDATE
  SET "uplineUserId" = EXCLUDED."uplineUserId",
      "placementSide" = EXCLUDED."placementSide",
      "updatedAt" = now();

  INSERT INTO "Wallet" (
    "userId",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    member_id,
    now(),
    now()
  )
  ON CONFLICT ("userId") DO NOTHING;
END
\$\$;
SQL
}

prepare_order_for_processing() {
  local order_id="$1"
  local approved_at="$2"
  docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<SQL >/dev/null
update "Order"
set "createdAt" = '${approved_at}'::timestamptz,
    "updatedAt" = '${approved_at}'::timestamptz,
    "status" = 'APPROVED',
    "approvalStatus" = 'APPROVED',
    "paidAt" = coalesce("paidAt", '${approved_at}'::timestamptz),
    "approvedAt" = '${approved_at}'::timestamptz
where id = ${order_id}::bigint;

update "OrderItem"
set "createdAt" = '${approved_at}'::timestamptz,
    "updatedAt" = '${approved_at}'::timestamptz
where "orderId" = ${order_id}::bigint;
SQL
}

create_and_process_order() {
  local member_code="$1"
  local product_code="$2"
  local scenario_tag="$3"
  local approved_at="$4"
  local quantity="${5:-1}"

  local user_id
  local product_detail_id
  local payload
  local create_response
  local order_id
  local order_no
  local process_response

  user_id="$(psqlq "select id::text from \"User\" where \"memberCode\" = '${member_code}' limit 1;")"
  product_detail_id="$(psqlq "select id::text from \"ProductDetail\" where code = '${product_code}' limit 1;")"

  payload="$(cat <<JSON
{"userId":"${user_id}","productDetailId":"${product_detail_id}","quantity":"${quantity}","fulfillmentMethod":"branch_pickup","pickupBranchName":"Grace Locked Dashboard UAT","pickupBranchNote":"${RUN_TAG}|${scenario_tag}|${member_code}|${product_code}|qty=${quantity}","pickupRecipientName":"${member_code}","pickupPhone":"0800000000","cashPaymentMethod":"bank_transfer"}
JSON
)"

  create_response="$(curl -sS -H "x-internal-bao-token: ${TOKEN}" -H "Content-Type: application/json" -X POST "${API_BASE_URL}/internal/bao/orders" -d "${payload}")"
  order_id="$(printf '%s' "$create_response" | json_field orderId)"
  order_no="$(printf '%s' "$create_response" | json_field orderNo)"

  if [[ -z "$order_id" ]]; then
    echo "Failed to create order for ${member_code}: ${create_response}" >&2
    exit 1
  fi

  prepare_order_for_processing "$order_id" "$approved_at"
  process_response="$(curl -sS -H "x-internal-bao-token: ${TOKEN}" -X POST "${API_BASE_URL}/internal/bao/orders/${order_id}/process-approved")"

  {
    echo
    echo "=== ${scenario_tag} | ${member_code} | ${product_code} | qty ${quantity} | order ${order_no} (${order_id}) ==="
    echo "approvedAt=${approved_at}"
    echo "createResponse=${create_response}"
    echo "processResponse=${process_response}"
  } | tee -a "$REPORT_FILE"
}

create_session_token() {
  local user_id="$1"
  docker exec -i "$API_CONTAINER" node -e '
    const fs = require("node:fs");
    const crypto = require("node:crypto");
    const userId = process.argv[1];
    const filePath = "/app/runtime/auth-sessions.json";
    let sessions = {};
    try {
      sessions = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {}
    const token = crypto.randomUUID();
    sessions[token] = String(userId);
    fs.mkdirSync("/app/runtime", {recursive: true});
    fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2), "utf8");
    process.stdout.write(token);
  ' "$user_id"
}

append_dashboard_snapshot() {
  local member_code="$1"
  local label="$2"
  local user_id
  local access_token
  local dashboard_response

  user_id="$(psqlq "select id::text from \"User\" where \"memberCode\" = '${member_code}' limit 1;")"
  access_token="$(create_session_token "$user_id")"
  dashboard_response="$(curl -sS -H "Authorization: Bearer ${access_token}" "${API_BASE_URL}/auth/dashboard")"

  {
    echo
    echo "=== dashboard | ${label} | ${member_code} ==="
    echo "$dashboard_response"
    echo "--- buyback progress ---"
    psqlq "
      select
        coalesce(status::text, '-') || '|' ||
        coalesce(\"accumulatedAmount\"::text, '-') || '|' ||
        coalesce(to_char(\"thresholdReachedAt\", 'YYYY-MM-DD HH24:MI:SS'), '-') || '|' ||
        coalesce(to_char(\"graceExpiresAt\", 'YYYY-MM-DD HH24:MI:SS'), '-') || '|' ||
        coalesce(\"lastQualifyingOrderId\"::text, '-')
      from \"UserBuybackProgress\"
      where \"userId\" = ${user_id}::bigint
      order by id desc
      limit 1;
    "
    echo "--- held commissions ---"
    psqlq "
      select
        coalesce(\"commissionType\"::text, '-') || '|' ||
        coalesce(status::text, '-') || '|' ||
        coalesce(\"releaseStatus\"::text, '-') || '|' ||
        coalesce(sum(\"finalPayableAmount\"), 0)::text
      from \"CommissionLedger\"
      where \"beneficiaryUserId\" = ${user_id}::bigint
        and status = 'HELD'
        and \"releaseStatus\" = 'HELD_PENDING_REPURCHASE'
      group by \"commissionType\", status, \"releaseStatus\"
      order by 1;
    "
    echo "--- ui preview ---"
    psqlq "
      select
        'ครบรอบแล้ว ซื้อซ้ำใน ' ||
        greatest(0, ceil(extract(epoch from (\"graceExpiresAt\" - now())) / 86400.0))::text ||
        ' วัน'
      from \"UserBuybackProgress\"
      where \"userId\" = ${user_id}::bigint
      order by id desc
      limit 1;
    "
    psqlq "
      select
        'ยอดล็อกระหว่างรอ ' ||
        coalesce(sum(\"finalPayableAmount\"), 0)::text ||
        ' บาท'
      from \"CommissionLedger\"
      where \"beneficiaryUserId\" = ${user_id}::bigint
        and status = 'HELD'
        and \"releaseStatus\" = 'HELD_PENDING_REPURCHASE';
    "
  } | tee -a "$REPORT_FILE"
}

DATE_DAY1="${TEST_DATE_DAY1:-$(date -d '2 days ago' +%F)}"
DATE_DAY2="${TEST_DATE_DAY2:-$(date -d '1 day ago' +%F)}"
DATE_DAY3="${TEST_DATE_DAY3:-$(date +%F)}"

PARENT_MEMBER="UTPVLOCK-$(date +%H%M%S)"
CHILD_MEMBER="UTPVLOCKC-$(date +%H%M%S)"

create_test_member "$PARENT_MEMBER" "R$(date +%H%M%S)K" "UAT Grace Locked Parent"
create_test_member "$CHILD_MEMBER" "R$(date +%H%M%S)L" "UAT Grace Locked Child" "$PARENT_MEMBER"

{
  echo "RUN_TAG=${RUN_TAG}"
  echo "DATE_DAY1=${DATE_DAY1}"
  echo "DATE_DAY2=${DATE_DAY2}"
  echo "DATE_DAY3=${DATE_DAY3}"
  echo "PARENT_MEMBER=${PARENT_MEMBER}"
  echo "CHILD_MEMBER=${CHILD_MEMBER}"
} | tee "$REPORT_FILE"

create_and_process_order "$PARENT_MEMBER" "COMMTEST1000" "seed-parent-cycle" "${DATE_DAY1}T10:10:00+07:00"
create_and_process_order "$CHILD_MEMBER" "COMMTEST1000" "reach-threshold-step1" "${DATE_DAY1}T10:11:00+07:00" "50"
create_and_process_order "$CHILD_MEMBER" "COMMTEST1000" "reach-threshold-step2" "${DATE_DAY2}T10:11:00+07:00" "50"
create_and_process_order "$CHILD_MEMBER" "COMMTEST1000" "grace-held-step3" "${DATE_DAY3}T10:11:00+07:00" "25"

append_dashboard_snapshot "$PARENT_MEMBER" "after-grace-held-commission"

echo
echo "Report written to ${REPORT_FILE}"
