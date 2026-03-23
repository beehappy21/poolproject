#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
BAO_BASE_URL="${BAO_BASE_URL:-http://127.0.0.1:8001}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
COOKIE_JAR="${COOKIE_JAR:-/tmp/stephub-order-shipment.cookies}"
RUN_SUFFIX="${RUN_SUFFIX:-$(date +%s)}"
BAO_ADMIN_PASSWORD_HASH="${BAO_ADMIN_PASSWORD_HASH:-\$2y\$12\$Jw9OKLQV2/ItEnM3DXnyYO/Pm8x5.W7d1Mrpz5R9mduWWwyvRCdNW}"
SLIP_URL="${SLIP_URL:-https://example.com/transfer-slip-${RUN_SUFFIX}.jpg}"
SLIP_NOTE="Stephub shipment smoke transfer slip ${RUN_SUFFIX}"
TRACKING_NO="TRACK-${RUN_SUFFIX}-SMOKE"
CARRIER_NAME="Stephub Express"
SHIPPED_NOTE="Packed and shipped in shipment smoke ${RUN_SUFFIX}"
DELIVERED_NOTE="Delivered to customer in shipment smoke ${RUN_SUFFIX}"

API_PID=""
BAO_PID=""

cleanup() {
  if [[ -n "$API_PID" ]]; then
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "$BAO_PID" ]]; then
    kill "$BAO_PID" >/dev/null 2>&1 || true
    wait "$BAO_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

extract_token() {
  perl -ne 'if(/name="_token" value="([^"]+)"/){print $1; exit}' "$1"
}

assert_contains() {
  local needle="$1"
  local file="$2"

  if ! rg -q --fixed-strings "$needle" "$file"; then
    echo "Expected to find '$needle' in $file" >&2
    exit 1
  fi
}

assert_not_contains() {
  local needle="$1"
  local file="$2"

  if rg -q --fixed-strings "$needle" "$file"; then
    echo "Did not expect to find '$needle' in $file" >&2
    exit 1
  fi
}

wait_for_http() {
  local url="$1"

  for _ in $(seq 1 40); do
    if curl -s "$url" >/dev/null 2>&1; then
      return 0
    fi

    sleep 1
  done

  echo "Timed out waiting for $url" >&2
  exit 1
}

login_bao() {
  local login_page token password header_file
  login_page="$(mktemp)"
  header_file="$(mktemp)"

  curl -s -c "$COOKIE_JAR" "$BAO_BASE_URL/admin/login" -o "$login_page"
  token="$(extract_token "$login_page")"

  for password in "${ADMIN_PASSWORD:-Admin123}" "Admin1234!"; do
    local post_body
    post_body="$(mktemp)"

    curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BAO_BASE_URL/admin/login" \
      --data-urlencode "_token=$token" \
      --data-urlencode "email=${ADMIN_EMAIL:-admin@stephub.local}" \
      --data-urlencode "password=$password" \
      --data-urlencode "remember=true" \
      -D "$header_file" \
      -o "$post_body" >/dev/null

    if awk 'BEGIN{IGNORECASE=1} /^location:/ {found=1} END {exit found ? 0 : 1}' "$header_file"; then
      return 0
    fi
  done

  echo "Failed to log in to BAO admin at $BAO_BASE_URL" >&2
  exit 1
}

fetch_seed_ids() {
  docker exec -i poolproject-postgres psql -U postgres -d poolproject -Atqc \
    "select u.id || '|' || p.id from \"User\" u cross join \"Package\" p where u.\"memberCode\" = 'DAVE' and p.code = 'STARTER' limit 1"
}

main() {
  local existing_api_pids existing_bao_pids auth_json access_token auth_header
  local ids_line user_id package_id order_json order_id order_no
  local transfer_review_page detail_page awaiting_shipment_page shipped_page delivered_page
  local api_order_json ship_json deliver_json

  cd "$ROOT_DIR"

  if [[ "${BOOTSTRAP_LOCAL_STACK:-1}" != "0" ]]; then
    existing_api_pids="$(lsof -ti tcp:3000 2>/dev/null || true)"
    if [[ -n "$existing_api_pids" ]]; then
      xargs kill <<<"$existing_api_pids" >/dev/null 2>&1 || true
      sleep 1
    fi

    existing_bao_pids="$(lsof -ti tcp:8001 2>/dev/null || true)"
    if [[ -n "$existing_bao_pids" ]]; then
      xargs kill <<<"$existing_bao_pids" >/dev/null 2>&1 || true
      sleep 1
    fi

    docker compose up -d postgres >/dev/null
    sleep 3

    DATABASE_URL="$DATABASE_URL" ./node_modules/.bin/prisma db push --schema prisma/schema.prisma --accept-data-loss >/dev/null
    DATABASE_URL="$DATABASE_URL" node scripts/seed-dev.js >/dev/null
    docker exec -i poolproject-postgres psql -U postgres -d poolproject < "$ROOT_DIR/scripts/migrations/create_stephub_compat_views.sql" >/dev/null
    sqlite3 "$BACKEND_DIR/database/database.sqlite" \
      "update users set password = '$BAO_ADMIN_PASSWORD_HASH' where email = 'admin@stephub.local';" >/dev/null

    DATABASE_URL="$DATABASE_URL" npm run start:api >/tmp/poolproject-stephub-order-api.log 2>&1 &
    API_PID=$!

    (
      cd "$BACKEND_DIR"
      php artisan serve --host=127.0.0.1 --port=8001 >/tmp/poolproject-stephub-bao.log 2>&1
    ) &
    BAO_PID=$!
  fi

  wait_for_http "$API_BASE_URL/health"
  wait_for_http "$BAO_BASE_URL/admin/login"

  auth_json="$(curl -s -X POST "$API_BASE_URL/auth/login" \
    -H 'content-type: application/json' \
    -d '{"identifier":"ALICE","password":"dev-password"}')"
  access_token="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.accessToken || ""));' "$auth_json")"

  if [[ -z "$access_token" ]]; then
    echo "API login failed: $auth_json" >&2
    exit 1
  fi

  auth_header="Authorization: Bearer $access_token"
  ids_line="$(fetch_seed_ids)"
  IFS='|' read -r user_id package_id <<<"$ids_line"

  if [[ -z "$user_id" || -z "$package_id" ]]; then
    echo "Could not locate seeded DAVE/STARTER ids" >&2
    exit 1
  fi

  order_json="$(curl -s -X POST "$API_BASE_URL/orders" \
    -H "$auth_header" \
    -H 'content-type: application/json' \
    -d "{\"userId\":\"$user_id\",\"packageId\":\"$package_id\"}")"
  order_id="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.orderId || ""));' "$order_json")"
  order_no="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.orderNo || ""));' "$order_json")"

  if [[ -z "$order_id" ]]; then
    echo "Order creation failed: $order_json" >&2
    exit 1
  fi

  curl -s -X POST "$API_BASE_URL/orders/$order_id/submit-transfer-slip" \
    -H "$auth_header" \
    -H 'content-type: application/json' \
    -d "{\"transferSlipUrl\":\"$SLIP_URL\",\"transferSlipNote\":\"$SLIP_NOTE\"}" >/dev/null

  if [[ "${SKIP_BAO_LOGIN:-0}" != "1" ]]; then
    login_bao
  fi

  transfer_review_page="$(mktemp)"
  detail_page="$(mktemp)"
  awaiting_shipment_page="$(mktemp)"
  shipped_page="$(mktemp)"
  delivered_page="$(mktemp)"

  curl -s -b "$COOKIE_JAR" "$BAO_BASE_URL/admin/order/list/transfer-review" -o "$transfer_review_page"
  assert_contains "$order_no" "$transfer_review_page"

  curl -s -b "$COOKIE_JAR" "$BAO_BASE_URL/admin/order/detail/$order_id" -o "$detail_page"
  assert_contains "$SLIP_NOTE" "$detail_page"
  assert_contains "$SLIP_URL" "$detail_page"
  assert_contains 'อนุมัติคำสั่งซื้อ' "$detail_page"

  curl -s -X POST "$API_BASE_URL/orders/$order_id/approve" -H "$auth_header" >/dev/null

  curl -s -b "$COOKIE_JAR" "$BAO_BASE_URL/admin/order/list/awaiting-shipment" -o "$awaiting_shipment_page"
  assert_contains "$order_no" "$awaiting_shipment_page"

  curl -s -b "$COOKIE_JAR" "$BAO_BASE_URL/admin/order/detail/$order_id" -o "$detail_page"
  assert_contains 'บันทึกว่าจัดส่งแล้ว' "$detail_page"
  assert_contains 'awaiting-shipment' "$detail_page"

  curl -s -X POST "$API_BASE_URL/orders/$order_id/ship" \
    -H "$auth_header" \
    -H 'content-type: application/json' \
    -d "{\"shipmentTrackingNo\":\"$TRACKING_NO\",\"shipmentCarrier\":\"$CARRIER_NAME\",\"shipmentNote\":\"$SHIPPED_NOTE\"}" >/dev/null

  curl -s -b "$COOKIE_JAR" "$BAO_BASE_URL/admin/order/list/shipped" -o "$shipped_page"
  assert_contains "$order_no" "$shipped_page"

  curl -s -b "$COOKIE_JAR" "$BAO_BASE_URL/admin/order/detail/$order_id" -o "$detail_page"
  assert_contains "$TRACKING_NO" "$detail_page"
  assert_contains "$CARRIER_NAME" "$detail_page"
  assert_contains "$SHIPPED_NOTE" "$detail_page"
  assert_contains 'บันทึกว่าส่งถึงแล้ว' "$detail_page"

  api_order_json="$(curl -s "$API_BASE_URL/orders/$order_id" -H "$auth_header")"
  node -e '
const data = JSON.parse(process.argv[1]);
if (!data.shippedAt) throw new Error("Expected shippedAt in API order detail");
if (data.shipmentTrackingNo !== process.argv[2]) throw new Error("Tracking number mismatch");
if (data.shipmentCarrier !== process.argv[3]) throw new Error("Carrier mismatch");
if (data.shipmentNote !== process.argv[4]) throw new Error("Shipment note mismatch");
' "$api_order_json" "$TRACKING_NO" "$CARRIER_NAME" "$SHIPPED_NOTE"

  curl -s -X POST "$API_BASE_URL/orders/$order_id/deliver" \
    -H "$auth_header" \
    -H 'content-type: application/json' \
    -d "{\"shipmentNote\":\"$DELIVERED_NOTE\"}" >/dev/null

  curl -s -b "$COOKIE_JAR" "$BAO_BASE_URL/admin/order/list/delivered" -o "$delivered_page"
  assert_contains "$order_no" "$delivered_page"

  curl -s -b "$COOKIE_JAR" "$BAO_BASE_URL/admin/order/list/shipped" -o "$shipped_page"
  assert_not_contains "$order_no" "$shipped_page"

  curl -s -b "$COOKIE_JAR" "$BAO_BASE_URL/admin/order/detail/$order_id" -o "$detail_page"
  assert_contains "$TRACKING_NO" "$detail_page"
  assert_contains "$CARRIER_NAME" "$detail_page"
  assert_contains "$DELIVERED_NOTE" "$detail_page"

  ship_json="$(docker exec -i poolproject-postgres psql -U postgres -d poolproject -Atqc \
    "select coalesce(to_char(\"shippedAt\", 'YYYY-MM-DD HH24:MI:SS'), ''), coalesce(\"shipmentTrackingNo\", ''), coalesce(\"shipmentCarrier\", ''), coalesce(\"shipmentNote\", '') from \"Order\" where id = ${order_id}")"
  deliver_json="$(docker exec -i poolproject-postgres psql -U postgres -d poolproject -Atqc \
    "select coalesce(to_char(\"deliveredAt\", 'YYYY-MM-DD HH24:MI:SS'), ''), coalesce(\"shipmentNote\", '') from \"Order\" where id = ${order_id}")"

  node -e '
const shipped = process.argv[1].split("|");
const delivered = process.argv[2].split("|");
if (!shipped[0]) throw new Error("Expected shippedAt in source order");
if (shipped[1] !== process.argv[3]) throw new Error("Source tracking number mismatch");
if (shipped[2] !== process.argv[4]) throw new Error("Source carrier mismatch");
if (!delivered[0]) throw new Error("Expected deliveredAt in source order");
if (delivered[1] !== process.argv[5]) throw new Error("Delivered note mismatch");
' "$ship_json" "$deliver_json" "$TRACKING_NO" "$CARRIER_NAME" "$DELIVERED_NOTE"

  api_order_json="$(curl -s "$API_BASE_URL/orders/$order_id" -H "$auth_header")"
  node -e '
const data = JSON.parse(process.argv[1]);
if (!data.deliveredAt) throw new Error("Expected deliveredAt in API order detail");
if (data.shipmentNote !== process.argv[2]) throw new Error("Expected delivered shipment note in API detail");
console.log(JSON.stringify({
  orderId: data.orderId,
  orderNo: data.orderNo,
  status: data.status,
  approvalStatus: data.approvalStatus,
  shippedAt: data.shippedAt,
  deliveredAt: data.deliveredAt,
  shipmentTrackingNo: data.shipmentTrackingNo,
  shipmentCarrier: data.shipmentCarrier,
  shipmentNote: data.shipmentNote
}, null, 2));
' "$api_order_json" "$DELIVERED_NOTE"
}

main "$@"
