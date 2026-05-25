#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://127.0.0.1:${APP_PORT:-3000}}"
METRICS_PATH="${METRICS_PATH:-metrics}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local headers_file="${TMP_DIR}/headers.$RANDOM"
  local body_file="${TMP_DIR}/body.$RANDOM"
  local status

  if [ -n "$body" ]; then
    status="$(curl -sS -o "$body_file" -D "$headers_file" -w "%{http_code}" -X "$method" \
      -H "content-type: application/json" \
      --data "$body" \
      "${BASE_URL}${path}")"
  else
    status="$(curl -sS -o "$body_file" -D "$headers_file" -w "%{http_code}" -X "$method" \
      "${BASE_URL}${path}")"
  fi

  printf '%s %s %s %s %s\n' "$status" "$headers_file" "$body_file" "$method" "$path"
}

require_2xx() {
  local path="$1"
  local result status
  result="$(request GET "$path")"
  status="$(printf '%s' "$result" | awk '{print $1}')"
  if [ "$status" -lt 200 ] || [ "$status" -gt 299 ]; then
    printf 'FAIL %s returned HTTP %s\n' "$path" "$status" >&2
    return 1
  fi
  printf 'ok %s\n' "$path"
}

optional_2xx() {
  local path="$1"
  local result status
  result="$(request GET "$path")"
  status="$(printf '%s' "$result" | awk '{print $1}')"
  if [ "$status" -lt 200 ] || [ "$status" -gt 299 ]; then
    printf 'warn %s returned HTTP %s\n' "$path" "$status" >&2
    return 0
  fi
  printf 'ok %s\n' "$path"
}

check_security_headers() {
  local result headers_file
  result="$(request GET "/health")"
  headers_file="$(printf '%s' "$result" | awk '{print $2}')"

  grep -qi '^x-content-type-options:' "$headers_file"
  grep -qi '^x-frame-options:' "$headers_file"
  printf 'ok security headers\n'
}

check_login_reaches_handler() {
  local result status
  result="$(request POST "/auth/login" '{"identifier":"smoke-check@example.invalid","password":"not-a-real-password"}')"
  status="$(printf '%s' "$result" | awk '{print $1}')"

  case "$status" in
    200|201|400|401|403|429)
      printf 'ok /auth/login reached auth surface with HTTP %s\n' "$status"
      ;;
    *)
      printf 'FAIL /auth/login unexpected HTTP %s\n' "$status" >&2
      return 1
      ;;
  esac
}

check_cors_if_configured() {
  if [ -z "${SMOKE_ALLOWED_ORIGIN:-}" ]; then
    printf 'skip CORS check, SMOKE_ALLOWED_ORIGIN not set\n'
    return 0
  fi

  local headers_file status
  headers_file="${TMP_DIR}/cors.headers"
  status="$(curl -sS -o /dev/null -D "$headers_file" -w "%{http_code}" \
    -H "origin: ${SMOKE_ALLOWED_ORIGIN}" \
    "${BASE_URL}/health")"

  if [ "$status" -lt 200 ] || [ "$status" -gt 299 ]; then
    printf 'FAIL CORS probe returned HTTP %s\n' "$status" >&2
    return 1
  fi

  tr -d '\r' < "$headers_file" | grep -Fqi "access-control-allow-origin: ${SMOKE_ALLOWED_ORIGIN}"
  printf 'ok CORS allowed origin\n'
}

require_2xx "/health"
require_2xx "/health/live"
require_2xx "/health/ready"

if [ "${METRICS_ENABLED:-true}" != "false" ]; then
  require_2xx "/${METRICS_PATH}"
fi

optional_2xx "/packages"
optional_2xx "/packages/storefront-products"
optional_2xx "/products"

check_login_reaches_handler
check_security_headers
check_cors_if_configured

printf 'production smoke checks passed for %s\n' "$BASE_URL"
