#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TOKEN="$(grep '^INTERNAL_RECEIPT_TOKEN=' deploy/compose/api.env | tail -1 | cut -d= -f2-)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-poolproject-uat-postgres-1}"
POSTGRES_DB="${POSTGRES_DB:-poolproject}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

if [[ -z "$TOKEN" ]]; then
  echo "Missing INTERNAL_RECEIPT_TOKEN in deploy/compose/api.env" >&2
  exit 1
fi

RUN_TAG="${RUN_TAG:-pv-cycle-cap-uat-$(date +%Y%m%d-%H%M%S)}"
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
{"userId":"${user_id}","productDetailId":"${product_detail_id}","quantity":"${quantity}","fulfillmentMethod":"branch_pickup","pickupBranchName":"PV Cycle Cap UAT Test","pickupBranchNote":"${RUN_TAG}|${scenario_tag}|${member_code}|${product_code}|qty=${quantity}","pickupRecipientName":"${member_code}","pickupPhone":"0800000000","cashPaymentMethod":"bank_transfer"}
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
    echo "--- cycles ---"
    psqlq "
      select
        \"cycleNo\"::text || '|' ||
        \"accumulatedPv\"::text || '|' ||
        \"cycleCapTier\"::text || '|' ||
        \"earningCap\"::text || '|' ||
        \"isReceivable\"::text || '|' ||
        \"earningStatus\"::text || '|' ||
        \"earnedTotalInCycle\"::text || '|' ||
        \"carryOverPvIn\"::text || '|' ||
        \"carryOverPvOut\"::text || '|' ||
        coalesce(to_char(\"queuedAt\", 'YYYY-MM-DD HH24:MI:SS'), '-') || '|' ||
        coalesce(to_char(\"readyToReceiveAt\", 'YYYY-MM-DD HH24:MI:SS'), '-') || '|' ||
        coalesce(to_char(\"cappedAt\", 'YYYY-MM-DD HH24:MI:SS'), '-')
      from \"MemberPackageCycle\"
      where \"userId\" = ${user_id}::bigint
      order by \"cycleNo\" asc;
    "
    echo "--- orders ---"
    psqlq "
      select id::text || '|' || \"orderNo\" || '|' || coalesce(\"shippingAddressNote\", '') || '|' || \"totalPv\"::text || '|' || coalesce(to_char(\"approvedAt\", 'YYYY-MM-DD HH24:MI:SS'), '-')
      from \"Order\"
      where \"userId\" = ${user_id}::bigint
      order by id asc;
    "
  } | tee -a "$REPORT_FILE"
}

append_member_snapshot() {
  local member_code="$1"
  local label="$2"
  local user_id
  user_id="$(psqlq "select id::text from \"User\" where \"memberCode\" = '${member_code}' limit 1;")"

  {
    echo
    echo "=== snapshot | ${label} | ${member_code} ==="
    psqlq "
      select
        \"cycleNo\"::text || '|' ||
        \"accumulatedPv\"::text || '|' ||
        \"cycleCapTier\"::text || '|' ||
        \"earningCap\"::text || '|' ||
        \"isReceivable\"::text || '|' ||
        \"earningStatus\"::text || '|' ||
        \"earnedTotalInCycle\"::text || '|' ||
        \"carryOverPvIn\"::text || '|' ||
        \"carryOverPvOut\"::text || '|' ||
        coalesce(to_char(\"queuedAt\", 'YYYY-MM-DD HH24:MI:SS'), '-') || '|' ||
        coalesce(to_char(\"readyToReceiveAt\", 'YYYY-MM-DD HH24:MI:SS'), '-') || '|' ||
        coalesce(to_char(\"cappedAt\", 'YYYY-MM-DD HH24:MI:SS'), '-')
      from \"MemberPackageCycle\"
      where \"userId\" = ${user_id}::bigint
      order by \"cycleNo\" asc;
    "
    echo "--- commissions ---"
    psqlq "
      select
        coalesce(sum(case when \"beneficiaryUserId\" = ${user_id}::bigint and \"status\" in ('APPROVED','HELD','WITHDRAWABLE') then \"finalPayableAmount\" else 0 end), 0)::text || '|' ||
        coalesce(sum(case when \"beneficiaryUserId\" = ${user_id}::bigint and \"status\" in ('APPROVED','HELD','WITHDRAWABLE') and \"beneficiaryCycleId\" is not null then \"finalPayableAmount\" else 0 end), 0)::text
      from \"CommissionLedger\";
    "
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
  } | tee -a "$REPORT_FILE"
}

DATE_ONLY="${TEST_DATE_ONLY:-$(date +%F)}"
NEXT_DATE_ONLY="$(date -d "${DATE_ONLY} +1 day" +%F)"

MEMBER_A="UTPV100A-$(date +%H%M%S)"
MEMBER_B="UTPV200A-$(date +%H%M%S)"
MEMBER_C="UTPV2X100-$(date +%H%M%S)"
MEMBER_D="UTPV200P100-$(date +%H%M%S)"
MEMBER_E="UTPVPROMO-$(date +%H%M%S)"
MEMBER_E_CHILD="UTPVPCHD-$(date +%H%M%S)"
MEMBER_F="UTPVRE100-$(date +%H%M%S)"
MEMBER_F_CHILD="UTPVRC100-$(date +%H%M%S)"
MEMBER_G="UTPVRE200-$(date +%H%M%S)"
MEMBER_G_CHILD="UTPVRC200-$(date +%H%M%S)"

create_test_member "$MEMBER_A" "R$(date +%H%M%S)A" "UAT PV 100 A"
create_test_member "$MEMBER_B" "R$(date +%H%M%S)B" "UAT PV 200 A"
create_test_member "$MEMBER_C" "R$(date +%H%M%S)C" "UAT PV 2X100"
create_test_member "$MEMBER_D" "R$(date +%H%M%S)D" "UAT PV 200+100"
create_test_member "$MEMBER_E" "R$(date +%H%M%S)E" "UAT PV Promotion Parent"
create_test_member "$MEMBER_E_CHILD" "R$(date +%H%M%S)F" "UAT PV Promotion Child" "$MEMBER_E"
create_test_member "$MEMBER_F" "R$(date +%H%M%S)G" "UAT Reopen 100 Parent"
create_test_member "$MEMBER_F_CHILD" "R$(date +%H%M%S)H" "UAT Reopen 100 Child" "$MEMBER_F"
create_test_member "$MEMBER_G" "R$(date +%H%M%S)I" "UAT Reopen 200 Parent"
create_test_member "$MEMBER_G_CHILD" "R$(date +%H%M%S)J" "UAT Reopen 200 Child" "$MEMBER_G"

{
  echo "RUN_TAG=${RUN_TAG}"
  echo "DATE_ONLY=${DATE_ONLY}"
  echo "MEMBER_A=${MEMBER_A}"
  echo "MEMBER_B=${MEMBER_B}"
  echo "MEMBER_C=${MEMBER_C}"
  echo "MEMBER_D=${MEMBER_D}"
  echo "MEMBER_E=${MEMBER_E}"
  echo "MEMBER_E_CHILD=${MEMBER_E_CHILD}"
  echo "MEMBER_F=${MEMBER_F}"
  echo "MEMBER_F_CHILD=${MEMBER_F_CHILD}"
  echo "MEMBER_G=${MEMBER_G}"
  echo "MEMBER_G_CHILD=${MEMBER_G_CHILD}"
} | tee "$REPORT_FILE"

create_and_process_order "$MEMBER_A" "COMMTEST650" "scenario-100pv-single" "${DATE_ONLY}T10:01:00+07:00"
create_and_process_order "$MEMBER_B" "COMMTEST1000" "scenario-200pv-single" "${DATE_ONLY}T10:02:00+07:00"
create_and_process_order "$MEMBER_C" "COMMTEST650" "scenario-100pv-step1" "${DATE_ONLY}T10:03:00+07:00"
create_and_process_order "$MEMBER_C" "COMMTEST650" "scenario-100pv-step2" "${DATE_ONLY}T10:04:00+07:00"
create_and_process_order "$MEMBER_D" "COMMTEST1000" "scenario-200-then-100-step1" "${DATE_ONLY}T10:05:00+07:00"
create_and_process_order "$MEMBER_D" "COMMTEST650" "scenario-200-then-100-step2" "${DATE_ONLY}T10:06:00+07:00"
create_and_process_order "$MEMBER_E" "COMMTEST1000" "scenario-promote-seed-step1" "${DATE_ONLY}T10:07:00+07:00"
create_and_process_order "$MEMBER_E" "COMMTEST650" "scenario-promote-seed-step2" "${DATE_ONLY}T10:08:00+07:00"
append_member_snapshot "$MEMBER_E" "promotion-before-downline-orders"
create_and_process_order "$MEMBER_E_CHILD" "COMMTEST1000" "scenario-promote-direct-step1" "${DATE_ONLY}T10:09:00+07:00" "50"
append_member_snapshot "$MEMBER_E" "promotion-after-downline-step1"
create_and_process_order "$MEMBER_E_CHILD" "COMMTEST1000" "scenario-promote-direct-step2" "${NEXT_DATE_ONLY}T10:09:00+07:00" "50"
append_member_snapshot "$MEMBER_E" "promotion-after-downline-step2"

create_and_process_order "$MEMBER_F" "COMMTEST1000" "scenario-reopen100-seed-step1" "${DATE_ONLY}T10:10:00+07:00"
create_and_process_order "$MEMBER_F_CHILD" "COMMTEST1000" "scenario-reopen100-direct-step1" "${DATE_ONLY}T10:11:00+07:00" "50"
append_member_snapshot "$MEMBER_F" "reopen100-after-day1"
create_and_process_order "$MEMBER_F_CHILD" "COMMTEST1000" "scenario-reopen100-direct-step2" "${NEXT_DATE_ONLY}T10:11:00+07:00" "50"
append_member_snapshot "$MEMBER_F" "reopen100-after-threshold"
create_and_process_order "$MEMBER_F" "COMMTEST650" "scenario-reopen100-repurchase" "${NEXT_DATE_ONLY}T10:12:00+07:00"
append_member_snapshot "$MEMBER_F" "reopen100-after-repurchase"

create_and_process_order "$MEMBER_G" "COMMTEST1000" "scenario-reopen200-seed-step1" "${DATE_ONLY}T10:13:00+07:00"
create_and_process_order "$MEMBER_G_CHILD" "COMMTEST1000" "scenario-reopen200-direct-step1" "${DATE_ONLY}T10:14:00+07:00" "50"
append_member_snapshot "$MEMBER_G" "reopen200-after-day1"
create_and_process_order "$MEMBER_G_CHILD" "COMMTEST1000" "scenario-reopen200-direct-step2" "${NEXT_DATE_ONLY}T10:14:00+07:00" "50"
append_member_snapshot "$MEMBER_G" "reopen200-after-threshold"
create_and_process_order "$MEMBER_G" "COMMTEST1000" "scenario-reopen200-repurchase" "${NEXT_DATE_ONLY}T10:15:00+07:00"
append_member_snapshot "$MEMBER_G" "reopen200-after-repurchase"

echo
echo "Report written to ${REPORT_FILE}"
