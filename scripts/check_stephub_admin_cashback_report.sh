#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8001}"
COOKIE_JAR="/tmp/stephub-cashback-report.cookies"
LOGIN_PAGE="$(mktemp)"
LOGIN_POST_HEADERS="$(mktemp)"
SETTINGS_PAGE="$(mktemp)"
REPORT_PAGE="$(mktemp)"
CSV_HEADERS="$(mktemp)"
CSV_BODY="$(mktemp)"

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@stephub.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123}"

extract_token() {
  perl -0ne 'if(/name="_token" value="([^"]+)"/){print $1; exit} if(/meta name="csrf_token" content="([^"]+)"/){print $1; exit}' "$1"
}

query_pg() {
  docker exec -i poolproject-postgres psql -U postgres -d poolproject -Atqc "$1"
}

assert_contains() {
  local needle="$1"
  local file="$2"

  if ! rg -q --fixed-strings "$needle" "$file"; then
    echo "Expected to find '$needle' in $file" >&2
    exit 1
  fi
}

login() {
  curl -s -c "$COOKIE_JAR" "$BASE_URL/admin/login" -o "$LOGIN_PAGE"
  local token
  token="$(extract_token "$LOGIN_PAGE")"

  curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/admin/login" \
    --data-urlencode "_token=$token" \
    --data-urlencode "email=$ADMIN_EMAIL" \
    --data-urlencode "password=$ADMIN_PASSWORD" \
    --data-urlencode "remember=true" \
    -D "$LOGIN_POST_HEADERS" \
    -o /tmp/stephub-cashback-login-post.html >/dev/null

  if ! awk 'BEGIN{IGNORECASE=1} /^location:/ {exit 1}' "$LOGIN_POST_HEADERS"; then
    :
  fi
}

main() {
  local cashback_row member_code amount order_id

  cashback_row="$(query_pg "select u.\"memberCode\" || '|' || trim(to_char(cl.\"commissionAmount\", 'FM999999999999990.00')) || '|' || cl.\"orderId\" from \"CommissionLedger\" cl join \"User\" u on u.id = cl.\"beneficiaryUserId\" where cl.\"commissionType\" = 'CASHBACK' order by cl.id desc limit 1")"

  if [[ -z "$cashback_row" ]]; then
    echo "No CASHBACK commission row found in poolproject database" >&2
    exit 1
  fi

  IFS='|' read -r member_code amount order_id <<<"$cashback_row"

  login

  curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/commission/cashback" -o "$SETTINGS_PAGE"
  assert_contains 'cashbackRate' "$SETTINGS_PAGE"

  curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/commission/report/cashback" -o "$REPORT_PAGE"
  assert_contains "$member_code" "$REPORT_PAGE"
  assert_contains "$amount" "$REPORT_PAGE"

  local csv_status
  csv_status="$(curl -s -b "$COOKIE_JAR" -D "$CSV_HEADERS" -o "$CSV_BODY" -w '%{http_code}' "$BASE_URL/admin/commission/report/export/cashback?format=csv")"
  if [[ "$csv_status" != "200" ]]; then
    echo "Cashback CSV export failed with status $csv_status" >&2
    exit 1
  fi

  assert_contains "$member_code" "$CSV_BODY"

  for fmt in xlsx pdf; do
    local header_file body_file status size
    header_file="$(mktemp)"
    body_file="$(mktemp)"
    status="$(curl -s -b "$COOKIE_JAR" -D "$header_file" -o "$body_file" -w '%{http_code}' "$BASE_URL/admin/commission/report/export/cashback?format=$fmt")"
    size="$(wc -c < "$body_file" | tr -d ' ')"

    if [[ "$status" != "200" ]]; then
      echo "Cashback $fmt export failed with status $status" >&2
      exit 1
    fi

    if [[ "$size" == "0" ]]; then
      echo "Cashback $fmt export returned empty body" >&2
      exit 1
    fi

    echo "EXPORT format=$fmt status=$status size=$size"
  done

  echo "CASHBACK_REPORT memberCode=$member_code amount=$amount orderId=$order_id"
}

main "$@"
