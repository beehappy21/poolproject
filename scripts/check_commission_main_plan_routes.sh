#!/usr/bin/env zsh

set -uo pipefail

BASE_URL="${1:-http://127.0.0.1:8001}"
WAP_URL="${2:-http://127.0.0.1:3001}"
FAILED=0
CURL_BIN="${CURL_BIN:-/usr/bin/curl}"
AWK_BIN="${AWK_BIN:-/usr/bin/awk}"
TAIL_BIN="${TAIL_BIN:-/usr/bin/tail}"

for path in \
  /admin/commission-main-plan/report
do
  header_file="$(/usr/bin/mktemp)"
  http_code="$("$CURL_BIN" -sS -I -D "$header_file" -o /dev/null -w '%{http_code}' "$BASE_URL$path" 2>/tmp/commission-main-plan-page.err || echo curl_error)"
  location_header="$("$AWK_BIN" 'BEGIN{IGNORECASE=1} /^Location:/ {gsub(/\r/, ""); sub(/^Location: /, ""); print}' "$header_file" | "$TAIL_BIN" -n 1)"
  marker="head-ok"
  if [[ "$http_code" == "302" && "$location_header" == *"/admin/login"* ]]; then
    marker="login-redirect-ok"
  fi
  echo "BAO_MAIN_PLAN path=$path status=$http_code marker=$marker location=${location_header:-n/a}"
  if [[ "$http_code" != "200" && ! ( "$http_code" == "302" && "$location_header" == *"/admin/login"* ) ]]; then
    FAILED=1
  fi
done

wap_http_code="$("$CURL_BIN" -sS -I -o /dev/null -w '%{http_code}' "$WAP_URL/CommissionMainPlan" 2>/tmp/commission-main-plan-wap.err || echo curl_error)"
wap_marker="head-ok"
echo "WAP_MAIN_PLAN path=/CommissionMainPlan status=$wap_http_code marker=$wap_marker"
if [[ "$wap_http_code" != "200" ]]; then
  FAILED=1
fi

exit "$FAILED"
