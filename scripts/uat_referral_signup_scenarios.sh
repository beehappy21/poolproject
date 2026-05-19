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

RUN_TAG="${RUN_TAG:-referral-signup-uat-$(date +%Y%m%d-%H%M%S)}"
REPORT_FILE="runtime/${RUN_TAG}.log"
mkdir -p runtime

psqlq() {
  docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "$1"
}

json_field() {
  local field_name="$1"
  sed -n "s/.*\"${field_name}\":\"\\([^\"]*\\)\".*/\\1/p"
}

create_member_via_runtime() {
  local member_code="$1"
  local sponsor_code="$2"
  local placement="$3"
  local display_name="$4"
  local line_user_id="$5"

  docker exec -i "$API_CONTAINER" node - "$member_code" "$sponsor_code" "$placement" "$display_name" "$line_user_id" <<'NODE'
const [memberCode, sponsorCode, placementPreference, displayName, lineUserId] =
  process.argv.slice(2);

const { PrismaService } = require("/app/dist/apps/api/packages/infrastructure/src/prisma/prisma.service.js");
const { PrismaMembersRepository } = require("/app/dist/apps/api/packages/modules/members/src/repositories/members.repository.js");

(async () => {
  const prisma = new PrismaService();
  await prisma.$connect();

  try {
    const repository = new PrismaMembersRepository(prisma);
    const result = await repository.createMember({
      memberCode,
      name: displayName,
      sponsorCode,
      ref: sponsorCode,
      placementPreference,
      password: "Pass1234",
      lineBinding: {
        lineUserId,
        displayName,
        source: "uat_referral_signup_scenarios",
      },
    });

    process.stdout.write(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
}

ensure_wallet() {
  local member_code="$1"
  docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<SQL >/dev/null
insert into "Wallet" ("userId", "createdAt", "updatedAt")
select u.id, now(), now()
from "User" u
where u."memberCode" = '${member_code}'
on conflict ("userId") do nothing;
SQL
}

get_top_branch_for_member() {
  local member_code="$1"
  local sponsor_code="$2"

  psqlq "
    with recursive walk as (
      select
        u.id as user_id,
        u.\"memberCode\" as member_code,
        mp.\"uplineUserId\" as upline_user_id,
        mp.\"placementSide\" as placement_side,
        0 as depth
      from \"User\" u
      left join \"MemberProfile\" mp on mp.\"userId\" = u.id
      where u.\"memberCode\" = '${member_code}'

      union all

      select
        parent.id as user_id,
        parent.\"memberCode\" as member_code,
        parent_mp.\"uplineUserId\" as upline_user_id,
        parent_mp.\"placementSide\" as placement_side,
        walk.depth + 1 as depth
      from walk
      inner join \"User\" parent on parent.id = walk.upline_user_id
      left join \"MemberProfile\" parent_mp on parent_mp.\"userId\" = parent.id
      where walk.upline_user_id is not null
    )
    select coalesce((
      select walk.placement_side::text
      from walk
      where walk.upline_user_id = (
        select id from \"User\" where \"memberCode\" = '${sponsor_code}' limit 1
      )
      order by walk.depth asc
      limit 1
    ), '-');
  "
}

append_member_snapshot() {
  local label="$1"
  local member_code="$2"
  local sponsor_code="$3"

  {
    echo
    echo "=== ${label} | ${member_code} ==="
    psqlq "
      select
        u.id::text || '|' ||
        u.\"memberCode\" || '|' ||
        coalesce(mp.\"uplineUserId\"::text, '-') || '|' ||
        coalesce(mp.\"placementSide\"::text, '-') || '|' ||
        coalesce(parent.\"memberCode\", '-') || '|' ||
        coalesce(parent_mp.\"placementSide\"::text, '-')
      from \"User\" u
      left join \"MemberProfile\" mp on mp.\"userId\" = u.id
      left join \"User\" parent on parent.id = mp.\"uplineUserId\"
      left join \"MemberProfile\" parent_mp on parent_mp.\"userId\" = parent.id
      where u.\"memberCode\" = '${member_code}'
      limit 1;
    "
    echo "--- top-branch ---"
    echo "$(get_top_branch_for_member "${member_code}" "${sponsor_code}")"
  } | tee -a "$REPORT_FILE"
}

append_direct_layout() {
  local label="$1"
  local sponsor_code="$2"

  {
    echo
    echo "=== direct-layout | ${label} | ${sponsor_code} ==="
    psqlq "
      select
        child.\"memberCode\" || '|' ||
        coalesce(mp.\"placementSide\"::text, '-') || '|' ||
        child.id::text
      from \"User\" sponsor
      inner join \"User\" child on child.\"sponsorId\" = sponsor.id
      left join \"MemberProfile\" mp on mp.\"userId\" = child.id
      where sponsor.\"memberCode\" = '${sponsor_code}'
      order by child.\"createdAt\" asc, child.id asc;
    "
    echo "--- top-branch-approved-pv ---"
    psqlq "
      with recursive directs as (
        select
          child.id as child_id,
          child.\"memberCode\" as child_code,
          mp.\"placementSide\" as top_side
        from \"User\" sponsor
        inner join \"User\" child on child.\"sponsorId\" = sponsor.id
        left join \"MemberProfile\" mp on mp.\"userId\" = child.id
        where sponsor.\"memberCode\" = '${sponsor_code}'
      ),
      branch_tree as (
        select
          d.top_side,
          d.child_id as user_id
        from directs d
        where d.top_side in ('LEFT', 'MIDDLE', 'RIGHT')

        union all

        select
          bt.top_side,
          child.\"userId\"
        from branch_tree bt
        inner join \"MemberProfile\" child on child.\"uplineUserId\" = bt.user_id
      )
      select
        bt.top_side::text || '|' ||
        coalesce(sum(case when o.status = 'APPROVED' and o.\"approvalStatus\" = 'APPROVED' then o.\"totalPv\" else 0 end), 0)::text
      from branch_tree bt
      left join \"Order\" o on o.\"userId\" = bt.user_id
      group by bt.top_side
      order by bt.top_side asc;
    "
  } | tee -a "$REPORT_FILE"
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
{"userId":"${user_id}","productDetailId":"${product_detail_id}","quantity":"${quantity}","fulfillmentMethod":"branch_pickup","pickupBranchName":"Referral Signup UAT Test","pickupBranchNote":"${RUN_TAG}|${scenario_tag}|${member_code}|${product_code}|qty=${quantity}","pickupRecipientName":"${member_code}","pickupPhone":"0800000000","cashPaymentMethod":"bank_transfer"}
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
    echo "=== order | ${scenario_tag} | ${member_code} | ${product_code} | order ${order_no} (${order_id}) ==="
    echo "approvedAt=${approved_at}"
    echo "createResponse=${create_response}"
    echo "processResponse=${process_response}"
  } | tee -a "$REPORT_FILE"
}

run_member_create() {
  local label="$1"
  local member_code="$2"
  local sponsor_code="$3"
  local placement="$4"
  local line_user_id="$5"

  local result
  result="$(create_member_via_runtime "$member_code" "$sponsor_code" "$placement" "$member_code" "$line_user_id")"
  ensure_wallet "$member_code"
  {
    echo
    echo "=== create-member | ${label} ==="
    echo "${result}"
  } | tee -a "$REPORT_FILE"
  append_member_snapshot "$label" "$member_code" "$sponsor_code"
}

main() {
  local sponsor_code="UTREFS${RUN_TAG##*-}"
  sponsor_code="${sponsor_code:0:12}"
  local root_sponsor="TH0000001"

  echo "Report: ${REPORT_FILE}" | tee "$REPORT_FILE"

  run_member_create "sponsor-root" "$sponsor_code" "$root_sponsor" "AUTO" "line_${sponsor_code}"

  run_member_create "bootstrap-request-right-1" "${sponsor_code}L1" "$sponsor_code" "RIGHT" "line_${sponsor_code}L1"
  run_member_create "bootstrap-request-right-2" "${sponsor_code}M1" "$sponsor_code" "RIGHT" "line_${sponsor_code}M1"
  run_member_create "bootstrap-request-left-3" "${sponsor_code}R1" "$sponsor_code" "LEFT" "line_${sponsor_code}R1"
  append_direct_layout "after-bootstrap" "$sponsor_code"

  create_and_process_order "${sponsor_code}L1" "COMMTEST1000" "seed-left-200pv" "2026-05-19T09:00:00+07:00"
  create_and_process_order "${sponsor_code}M1" "COMMTEST650" "seed-middle-100pv" "2026-05-19T09:10:00+07:00"
  append_direct_layout "after-seed-orders-left-middle" "$sponsor_code"

  run_member_create "explicit-left-after-unlock" "${sponsor_code}LX" "$sponsor_code" "LEFT" "line_${sponsor_code}LX"
  run_member_create "explicit-middle-after-unlock" "${sponsor_code}MX" "$sponsor_code" "MIDDLE" "line_${sponsor_code}MX"
  run_member_create "explicit-right-after-unlock" "${sponsor_code}RX" "$sponsor_code" "RIGHT" "line_${sponsor_code}RX"

  run_member_create "auto-prefers-no-score-right" "${sponsor_code}A0" "$sponsor_code" "AUTO" "line_${sponsor_code}A0"

  create_and_process_order "${sponsor_code}R1" "COMMTEST1000" "seed-right-200pv" "2026-05-19T09:20:00+07:00"
  append_direct_layout "after-seed-order-right" "$sponsor_code"

  run_member_create "auto-prefers-lowest-score-middle" "${sponsor_code}A1" "$sponsor_code" "AUTO" "line_${sponsor_code}A1"

  echo
  echo "Completed referral signup scenarios. Report: ${REPORT_FILE}" | tee -a "$REPORT_FILE"
}

main "$@"
