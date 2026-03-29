#!/usr/bin/env bash
set -euo pipefail

PUBLIC_WAP_ORIGIN="${PUBLIC_WAP_ORIGIN:-https://wap.blifehealthy.com}"
PUBLIC_API_BASE_URL="${PUBLIC_API_BASE_URL:-https://api.blifehealthy.com}"
TEST_MEMBER_IDENTIFIER="${TEST_MEMBER_IDENTIFIER:-TH0000001}"
TEST_MEMBER_PASSWORD="${TEST_MEMBER_PASSWORD:-a1a1a1}"

LOGIN_URL="${PUBLIC_API_BASE_URL%/}/auth/login"
HEALTH_URL="${PUBLIC_API_BASE_URL%/}/health"

check_header() {
  local headers="$1"
  local expected="$2"

  if ! printf '%s' "$headers" | grep -Fiq "$expected"; then
    echo "[fail] missing response header: $expected" >&2
    return 1
  fi
}

echo "[info] checking public API health: $HEALTH_URL"
curl -fsSIL --retry 10 --retry-delay 1 --max-time 10 "$HEALTH_URL" >/dev/null
echo "[ok] public API health responds"

echo "[info] checking CORS preflight for $PUBLIC_WAP_ORIGIN"
preflight_headers="$(
  curl -sS -D - -o /dev/null -X OPTIONS "$LOGIN_URL" \
    -H "Origin: $PUBLIC_WAP_ORIGIN" \
    -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: content-type'
)"

check_header "$preflight_headers" "HTTP/2 204" || check_header "$preflight_headers" "HTTP/1.1 204"
check_header "$preflight_headers" "access-control-allow-origin: $PUBLIC_WAP_ORIGIN"
check_header "$preflight_headers" "access-control-allow-credentials: true"
echo "[ok] public auth preflight allows $PUBLIC_WAP_ORIGIN"

echo "[info] checking public auth login for $TEST_MEMBER_IDENTIFIER"
login_response="$(
  curl -sS -D - -X POST "$LOGIN_URL" \
    -H "Origin: $PUBLIC_WAP_ORIGIN" \
    -H 'Content-Type: application/json' \
    --data "{\"identifier\":\"$TEST_MEMBER_IDENTIFIER\",\"password\":\"$TEST_MEMBER_PASSWORD\"}"
)"

check_header "$login_response" "HTTP/2 201" || check_header "$login_response" "HTTP/1.1 201"
check_header "$login_response" "access-control-allow-origin: $PUBLIC_WAP_ORIGIN"
check_header "$login_response" "access-control-allow-credentials: true"

if ! printf '%s' "$login_response" | grep -Fq "\"memberCode\":\"$TEST_MEMBER_IDENTIFIER\""; then
  echo "[fail] login response did not contain member code $TEST_MEMBER_IDENTIFIER" >&2
  exit 1
fi

echo "[ok] public auth login works from $PUBLIC_WAP_ORIGIN"
