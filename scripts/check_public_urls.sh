#!/usr/bin/env bash

set -euo pipefail

API_URL="${API_URL:-https://api.blifehealthy.com/health}"
BAO_URL="${BAO_URL:-https://bao.blifehealthy.com/admin/login}"
WAP_URL="${WAP_URL:-https://wap.blifehealthy.com}"
LIFF_URL="${LIFF_URL:-https://wap.blifehealthy.com/line/liff/signin}"

echo "[public-check] api health: $API_URL"
curl --fail --silent --show-error "$API_URL"
echo

echo "[public-check] bao login: $BAO_URL"
curl --fail --silent --show-error --head "$BAO_URL"

echo "[public-check] wap home: $WAP_URL"
curl --fail --silent --show-error --head "$WAP_URL"

echo "[public-check] liff signin: $LIFF_URL"
curl --fail --silent --show-error --head "$LIFF_URL"

echo
echo "[public-check] done"
