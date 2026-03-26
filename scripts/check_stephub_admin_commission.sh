#!/usr/bin/env bash

set -uo pipefail

BASE_URL="${1:-http://127.0.0.1:8001}"
COOKIE_JAR="/tmp/stephub-commission.cookies"
LOGIN_PAGE="$(mktemp)"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@stephub.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123}"
FAILED=0

extract_token() {
  perl -0ne 'if(/name="_token" value="([^"]+)"/){print $1; exit} if(/meta name="csrf_token" content="([^"]+)"/){print $1; exit}' "$1"
}

curl -s -c "$COOKIE_JAR" "$BASE_URL/admin/login" -o "$LOGIN_PAGE"
TOKEN="$(extract_token "$LOGIN_PAGE")"

if [[ -z "${TOKEN:-}" ]]; then
  echo "Failed to extract BAO login token from $BASE_URL/admin/login" >&2
  exit 1
fi

curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/admin/login" \
  --data-urlencode "_token=$TOKEN" \
  --data-urlencode "email=$ADMIN_EMAIL" \
  --data-urlencode "password=$ADMIN_PASSWORD" \
  --data-urlencode "remember=true" \
  -o /tmp/stephub-commission-login-post.html \
  -D /tmp/stephub-commission-login-post.headers >/dev/null

for path in \
  /admin/commission/settings \
  /admin/commission/report \
  /admin/commission/report/direct \
  /admin/commission/report/unilevel \
  /admin/commission/report/matrix \
  /admin/commission/report/pool
do
  page_file="$(mktemp)"
  if status="$(curl -sS -b "$COOKIE_JAR" -o "$page_file" -w '%{http_code}' "$BASE_URL$path" 2>/tmp/commission-page.err)"; then
    :
  else
    status="curl_error"
  fi

  case "$path" in
    /admin/commission/settings)
      marker="$(grep -o 'Commission Setting' "$page_file" | head -n 1 || true)"
      ;;
    /admin/commission/report)
      marker="$(grep -o 'โบนัสแนะนำ\|จำนวนรวม\|CSV\|Excel\|PDF' "$page_file" | tr '\n' ',' | sed 's/,$//' || true)"
      ;;
    /admin/commission/report/direct|/admin/commission/report/unilevel)
      marker="$(grep -o 'ลำดับชั้น\|เปอร์เซ็นต์\|จำนวน' "$page_file" | tr '\n' ',' | sed 's/,$//' || true)"
      ;;
    /admin/commission/report/matrix)
      marker="$(grep -o 'Board\|บอร์ด\|ลำดับชั้น\|จำนวน' "$page_file" | tr '\n' ',' | sed 's/,$//' || true)"
      ;;
    /admin/commission/report/pool)
      marker="$(grep -o 'เปอร์เซ็นต์\|จำนวน\|eligible\|พูล' "$page_file" | tr '\n' ',' | sed 's/,$//' || true)"
      ;;
    *)
      marker="unknown"
      ;;
  esac

  if [ -z "${marker:-}" ] && grep -q 'Sign in to your account' "$page_file"; then
    marker="login-page"
  fi

  if [ -z "${marker:-}" ]; then
    marker="unknown"
  fi

  echo "PAGE path=$path status=$status marker=$marker"
  if [[ "$status" != "200" ]]; then
    FAILED=1
  fi
done

for fmt in csv xlsx pdf
do
  header_file="$(mktemp)"
  body_file="$(mktemp)"
  if status="$(curl -sS -b "$COOKIE_JAR" -D "$header_file" -o "$body_file" -w '%{http_code}' "$BASE_URL/admin/commission/report/export/overview?format=$fmt" 2>/tmp/commission-export.err)"; then
    :
  else
    status="curl_error"
  fi
  content_type="$(awk 'BEGIN{IGNORECASE=1} /^Content-Type:/ {gsub(/\r/, ""); print $2}' "$header_file" | tail -n 1)"
  content_disposition="$(awk 'BEGIN{IGNORECASE=1} /^Content-Disposition:/ {gsub(/\r/, ""); sub(/^Content-Disposition: /, ""); print}' "$header_file" | tail -n 1)"
  size="$(wc -c < "$body_file" | tr -d ' ')"

  echo "EXPORT format=$fmt status=$status type=${content_type:-n/a} size=$size disposition=${content_disposition:-n/a}"
  if [[ "$status" != "200" || "$size" == "0" ]]; then
    FAILED=1
  fi
done

exit "$FAILED"
