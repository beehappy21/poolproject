#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
BAO_BASE_URL="${BAO_BASE_URL:-http://127.0.0.1:8001}"
RUN_SUFFIX="${RUN_SUFFIX:-$(date +%s)}"
COOKIE_JAR="${COOKIE_JAR:-/tmp/stephub-withdraw-kyc.cookies}"
ADMIN_EMAIL="${ADMIN_EMAIL:-superadmin@blifehealthy.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-472121}"
ADMIN_IDENTIFIER="${ADMIN_IDENTIFIER:-dev-admin@example.com}"
ADMIN_API_PASSWORD="${ADMIN_API_PASSWORD:-472121}"
MEMBER_IDENTIFIER="${MEMBER_IDENTIFIER:-TH0000001}"
MEMBER_PASSWORD="${MEMBER_PASSWORD:-a1a1a1}"
MEMBER_CODE_EXPECTED="${MEMBER_CODE_EXPECTED:-TH0000001}"
KYC_APPROVE_NOTE="codex kyc approve smoke ${RUN_SUFFIX}"
KYC_REJECT_NOTE="codex kyc reject smoke ${RUN_SUFFIX}"
KYC_REJECT_REASON="codex reject smoke ${RUN_SUFFIX}"
WITHDRAW_NOTE="codex withdraw smoke ${RUN_SUFFIX}"
WITHDRAW_REJECT_REASON="codex withdraw reject smoke ${RUN_SUFFIX}"

LOGIN_PAGE="$(mktemp)"
LOGIN_HEADERS="$(mktemp)"
DELIVERED_PAGE="$(mktemp)"
KYC_LIST_PAGE="$(mktemp)"
WITHDRAW_LIST_PAGE="$(mktemp)"
KYC_DETAIL_PAGE="$(mktemp)"
WITHDRAW_DETAIL_PAGE="$(mktemp)"

extract_token() {
  perl -0ne 'if(/name="_token" value="([^"]+)"/){print $1; exit} if(/meta name="csrf_token" content="([^"]+)"/){print $1; exit}' "$1"
}

assert_contains() {
  local needle="$1"
  local file="$2"

  if ! rg -q --fixed-strings "$needle" "$file"; then
    echo "Expected to find '$needle' in $file" >&2
    exit 1
  fi
}

wait_for_http() {
  local url="$1"
  local status

  for _ in $(seq 1 40); do
    status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url" || true)"
    if [[ "$status" == "200" || "$status" == "302" || "$status" == "401" || "$status" == "400" ]]; then
      return 0
    fi

    sleep 1
  done

  echo "Timed out waiting for $url" >&2
  exit 1
}

json_field() {
  local json="$1"
  local expr="$2"
  node -e '
const data = JSON.parse(process.argv[1]);
const expr = process.argv[2].split(".");
let cursor = data;
for (const key of expr) {
  cursor = cursor?.[key];
}
process.stdout.write(cursor == null ? "" : String(cursor));
' "$json" "$expr"
}

query_pg() {
  docker exec -i poolproject-postgres psql -U postgres -d poolproject -Atqc "$1"
}

login_bao() {
  curl -s -c "$COOKIE_JAR" "$BAO_BASE_URL/admin/login" -o "$LOGIN_PAGE"
  local token
  token="$(extract_token "$LOGIN_PAGE")"

  curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BAO_BASE_URL/admin/login" \
    --data-urlencode "_token=$token" \
    --data-urlencode "email=$ADMIN_EMAIL" \
    --data-urlencode "password=$ADMIN_PASSWORD" \
    --data-urlencode "remember=true" \
    -D "$LOGIN_HEADERS" \
    -o /tmp/stephub-withdraw-kyc-login.html >/dev/null

  if ! awk 'BEGIN{IGNORECASE=1} /^location:/ {found=1} END {exit found ? 0 : 1}' "$LOGIN_HEADERS"; then
    echo "Failed to log in to BAO at $BAO_BASE_URL" >&2
    exit 1
  fi
}

main() {
  local admin_auth_json admin_token member_auth_json member_token member_user_id
  local kyc_approve_json kyc_reject_json kyc_approve_id kyc_reject_id
  local withdraw_id withdraw_approve_json withdraw_paid_json
  local kyc_row_1 kyc_row_2 withdraw_row
  local delivered_status kyc_list_status withdraw_list_status kyc_detail_status withdraw_detail_status

  cd "$ROOT_DIR"

  wait_for_http "$API_BASE_URL/health"
  wait_for_http "$BAO_BASE_URL/admin/login"

  admin_auth_json="$(curl -s -X POST "$API_BASE_URL/auth/login" \
    -H 'content-type: application/json' \
    -d "{\"identifier\":\"$ADMIN_IDENTIFIER\",\"password\":\"$ADMIN_API_PASSWORD\"}")"
  admin_token="$(json_field "$admin_auth_json" "accessToken")"
  if [[ -z "$admin_token" ]]; then
    echo "Admin API login failed: $admin_auth_json" >&2
    exit 1
  fi

  member_auth_json="$(curl -s -X POST "$API_BASE_URL/auth/login" \
    -H 'content-type: application/json' \
    -d "{\"identifier\":\"$MEMBER_IDENTIFIER\",\"password\":\"$MEMBER_PASSWORD\"}")"
  member_token="$(json_field "$member_auth_json" "accessToken")"
  member_user_id="$(json_field "$member_auth_json" "user.userId")"
  if [[ -z "$member_token" || -z "$member_user_id" ]]; then
    echo "Member API login failed: $member_auth_json" >&2
    exit 1
  fi

  login_bao

  delivered_status="$(curl -s -b "$COOKIE_JAR" -o "$DELIVERED_PAGE" -w '%{http_code}' "$BAO_BASE_URL/admin/order/list/delivered")"
  if [[ "$delivered_status" != "200" ]]; then
    echo "Delivered page failed with status $delivered_status" >&2
    exit 1
  fi
  assert_contains 'Delivered Orders' "$DELIVERED_PAGE"
  assert_contains '/admin/order/list/delivered' "$DELIVERED_PAGE"

  kyc_list_status="$(curl -s -b "$COOKIE_JAR" -o "$KYC_LIST_PAGE" -w '%{http_code}' "$BAO_BASE_URL/admin/kyc/list")"
  if [[ "$kyc_list_status" != "200" ]]; then
    echo "KYC list page failed with status $kyc_list_status" >&2
    exit 1
  fi
  assert_contains 'คำขอ KYC' "$KYC_LIST_PAGE"

  withdraw_list_status="$(curl -s -b "$COOKIE_JAR" -o "$WITHDRAW_LIST_PAGE" -w '%{http_code}' "$BAO_BASE_URL/admin/withdraw/list")"
  if [[ "$withdraw_list_status" != "200" ]]; then
    echo "Withdraw list page failed with status $withdraw_list_status" >&2
    exit 1
  fi
  assert_contains 'รายงานแจ้งถอนเงิน' "$WITHDRAW_LIST_PAGE"

  kyc_approve_json="$(curl -s -X POST "$API_BASE_URL/auth/kyc-requests" \
    -H "Authorization: Bearer $member_token" \
    -H 'content-type: application/json' \
    -d "{\"nationalId\":\"1234567890123\",\"bankName\":\"Test Bank\",\"bankBranch\":\"Main\",\"bankAccountNumber\":\"1234567890\",\"bankAccountName\":\"Test User\",\"bankAccountType\":\"savings\",\"note\":\"$KYC_APPROVE_NOTE\"}")"
  kyc_approve_id="$(json_field "$kyc_approve_json" "requestId")"
  if [[ -z "$kyc_approve_id" ]]; then
    echo "Failed to create approvable KYC request: $kyc_approve_json" >&2
    exit 1
  fi

  kyc_reject_json="$(curl -s -X POST "$API_BASE_URL/auth/kyc-requests" \
    -H "Authorization: Bearer $member_token" \
    -H 'content-type: application/json' \
    -d "{\"nationalId\":\"9999999999999\",\"bankName\":\"Reject Bank\",\"bankBranch\":\"Main\",\"bankAccountNumber\":\"9999999999\",\"bankAccountName\":\"Reject User\",\"bankAccountType\":\"savings\",\"note\":\"$KYC_REJECT_NOTE\"}")"
  kyc_reject_id="$(json_field "$kyc_reject_json" "requestId")"
  if [[ -z "$kyc_reject_id" ]]; then
    echo "Failed to create rejectable KYC request: $kyc_reject_json" >&2
    exit 1
  fi

  curl -s -X POST "$API_BASE_URL/wallets/kyc-requests/$kyc_approve_id/approve" \
    -H "Authorization: Bearer $admin_token" >/dev/null
  curl -s -X POST "$API_BASE_URL/wallets/kyc-requests/$kyc_reject_id/reject" \
    -H "Authorization: Bearer $admin_token" \
    -H 'content-type: application/json' \
    -d "{\"rejectionReason\":\"$KYC_REJECT_REASON\"}" >/dev/null

  kyc_detail_status="$(curl -s -b "$COOKIE_JAR" -o "$KYC_DETAIL_PAGE" -w '%{http_code}' "$BAO_BASE_URL/admin/kyc/detail/$kyc_approve_id")"
  if [[ "$kyc_detail_status" != "200" ]]; then
    echo "KYC detail page failed with status $kyc_detail_status" >&2
    exit 1
  fi
  assert_contains 'รายละเอียด KYC #' "$KYC_DETAIL_PAGE"
  assert_contains "$MEMBER_CODE_EXPECTED" "$KYC_DETAIL_PAGE"
  assert_contains 'approved' "$KYC_DETAIL_PAGE"
  assert_contains 'Test Bank' "$KYC_DETAIL_PAGE"

  withdraw_id="$(query_pg "insert into \"WithdrawRequest\" (\"userId\",amount,\"bankName\",\"bankBranch\",\"accountNumber\",\"accountName\",\"accountType\",\"taxAmount\",\"autoSweepAmount\",\"feeAmount\",\"netBankAmount\",note,status,\"requestedAt\",\"createdAt\",\"updatedAt\") values (${member_user_id},100.00,'Test Bank','Main','1234567890','Test User','savings',3.00,0,2.00,95.00,'${WITHDRAW_NOTE}','PENDING',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) returning id")"
  if [[ -z "$withdraw_id" ]]; then
    echo "Failed to insert withdraw smoke row" >&2
    exit 1
  fi

  withdraw_approve_json="$(curl -s -X POST "$API_BASE_URL/wallets/withdraw-requests/$withdraw_id/approve" \
    -H "Authorization: Bearer $admin_token")"
  if [[ "$(json_field "$withdraw_approve_json" "status")" != "approved" ]]; then
    echo "Withdraw approve failed: $withdraw_approve_json" >&2
    exit 1
  fi

  withdraw_paid_json="$(curl -s -X POST "$API_BASE_URL/wallets/withdraw-requests/$withdraw_id/paid" \
    -H "Authorization: Bearer $admin_token")"
  if [[ "$(json_field "$withdraw_paid_json" "status")" != "paid" ]]; then
    echo "Withdraw paid failed: $withdraw_paid_json" >&2
    exit 1
  fi

  withdraw_detail_status="$(curl -s -b "$COOKIE_JAR" -o "$WITHDRAW_DETAIL_PAGE" -w '%{http_code}' "$BAO_BASE_URL/admin/withdraw/detail/$withdraw_id")"
  if [[ "$withdraw_detail_status" != "200" ]]; then
    echo "Withdraw detail page failed with status $withdraw_detail_status" >&2
    exit 1
  fi
  assert_contains 'รายละเอียดการแจ้งถอน #' "$WITHDRAW_DETAIL_PAGE"
  assert_contains "$MEMBER_CODE_EXPECTED" "$WITHDRAW_DETAIL_PAGE"
  assert_contains 'paid' "$WITHDRAW_DETAIL_PAGE"
  assert_contains '100.00' "$WITHDRAW_DETAIL_PAGE"
  assert_contains '95.00' "$WITHDRAW_DETAIL_PAGE"
  assert_contains 'Test Bank' "$WITHDRAW_DETAIL_PAGE"

  kyc_row_1="$(query_pg "select status,coalesce(\"approvedByUserId\"::text,''),coalesce(\"rejectionReason\",'') from \"KycRequest\" where id = ${kyc_approve_id}")"
  kyc_row_2="$(query_pg "select status,coalesce(\"approvedByUserId\"::text,''),coalesce(\"rejectionReason\",'') from \"KycRequest\" where id = ${kyc_reject_id}")"
  withdraw_row="$(query_pg "select status,coalesce(\"approvedByUserId\"::text,''),coalesce(to_char(\"paidAt\", 'YYYY-MM-DD HH24:MI:SS'),'') from \"WithdrawRequest\" where id = ${withdraw_id}")"

  node -e '
const approved = process.argv[1].split("|");
const rejected = process.argv[2].split("|");
const withdraw = process.argv[3].split("|");
if (approved[0] !== "APPROVED") throw new Error("Approved KYC row is not APPROVED");
if (!approved[1]) throw new Error("Approved KYC row is missing approvedByUserId");
if (rejected[0] !== "REJECTED") throw new Error("Rejected KYC row is not REJECTED");
if (rejected[2] !== process.argv[4]) throw new Error("Rejected KYC row reason mismatch");
if (withdraw[0] !== "PAID") throw new Error("Withdraw row is not PAID");
if (!withdraw[1]) throw new Error("Withdraw row is missing approvedByUserId");
if (!withdraw[2]) throw new Error("Withdraw row is missing paidAt");
' "$kyc_row_1" "$kyc_row_2" "$withdraw_row" "$KYC_REJECT_REASON"

  echo "BAO_WITHDRAW_KYC deliveredPage=ok kycApproveId=$kyc_approve_id kycRejectId=$kyc_reject_id withdrawId=$withdraw_id memberCode=$MEMBER_CODE_EXPECTED"
}

main "$@"
