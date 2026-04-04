#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_PATH="${1:-$ROOT_DIR/runtime/allsaletest02042026-daily-report.json}"
SKIP_COUNT="${2:-0}"

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"

normalize_member_code() {
  local member_code="$1"
  if [[ "$member_code" =~ ^CT([0-9]{7})$ ]]; then
    printf 'TH%s\n' "${BASH_REMATCH[1]}"
    return 0
  fi

  printf '%s\n' "$member_code"
}

login_json="$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H 'content-type: application/json' \
  -d '{"identifier":"TH0000013","password":"a1a1a1"}')"
token="$(printf '%s' "$login_json" | jq -r '.accessToken // empty')"

if [[ -z "$token" ]]; then
  echo "FAIL login :: $login_json"
  exit 1
fi

jq -r '.days[] | .date as $d | (.normalOrders[] | [$d, .invoiceNo, .memberId] | @tsv)' "$REPORT_PATH" \
  | awk -v skip="$SKIP_COUNT" 'NR > skip' \
  | while IFS=$'\t' read -r date invoice member; do
    normalized_member="$(normalize_member_code "$member")"
    member_json="$(curl -s "$API_BASE_URL/members/by-code/$normalized_member")"
    member_id="$(printf '%s' "$member_json" | jq -r '.memberId // empty')"

    if [[ -z "$member_id" ]]; then
      echo "FAIL member $invoice $member normalized=$normalized_member :: $member_json"
      break
    fi

    create_json="$(curl -s -X POST "$API_BASE_URL/orders" \
      -H "Authorization: Bearer $token" \
      -H 'content-type: application/json' \
      -d "{\"userId\":\"$member_id\",\"productDetailId\":\"1\",\"fulfillmentMethod\":\"branch_pickup\",\"pickupBranchName\":\"Allsale Replay Branch\",\"pickupRecipientName\":\"Allsale Replay\",\"pickupPhone\":\"0800000000\",\"cashPaymentMethod\":\"bank_transfer\"}")"
    order_id="$(printf '%s' "$create_json" | jq -r '.orderId // empty')"
    order_no="$(printf '%s' "$create_json" | jq -r '.orderNo // empty')"

    if [[ -z "$order_id" ]]; then
      echo "FAIL create $invoice $member :: $create_json"
      break
    fi

    approve_body="$(curl -s -i -X POST "$API_BASE_URL/orders/$order_id/approve" \
      -H "Authorization: Bearer $token")"
    approve_status="$(printf '%s' "$approve_body" | sed -n '1s/HTTP\/1.1 \([0-9]*\).*/\1/p')"
    approve_json="$(printf '%s' "$approve_body" | sed '1,/^\r$/d')"

    if [[ "$approve_status" != "201" ]]; then
      echo "FAIL approve $invoice $member runtime=$order_no :: $approve_json"
      break
    fi

    process_body="$(curl -s -i -X POST "$API_BASE_URL/orders/$order_id/process-approved" \
      -H "Authorization: Bearer $token")"
    process_status="$(printf '%s' "$process_body" | sed -n '1s/HTTP\/1.1 \([0-9]*\).*/\1/p')"
    process_json="$(printf '%s' "$process_body" | sed '1,/^\r$/d')"

    if [[ "$process_status" != "201" ]]; then
      echo "FAIL process $invoice $member runtime=$order_no :: $process_json"
      break
    fi

    echo "OK $invoice $member runtime=$order_no"
  done
