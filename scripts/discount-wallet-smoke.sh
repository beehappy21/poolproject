#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
ALLOW_DESTRUCTIVE_LOCAL_RESET="${ALLOW_DESTRUCTIVE_LOCAL_RESET:-0}"
RUN_SUFFIX="$(date +%s)"
BASE_PACKAGE_CODE="DCWBASE${RUN_SUFFIX}"
OVERRIDE_PACKAGE_CODE="DCWOVR${RUN_SUFFIX}"
AUTH_HEADER=""
ORIGINAL_WALLET_SETTINGS_JSON=""

cd "$ROOT_DIR"

if [[ "$ALLOW_DESTRUCTIVE_LOCAL_RESET" != "1" ]]; then
  echo "Refusing to run destructive discount-wallet smoke reset. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 to continue." >&2
  exit 1
fi

cleanup() {
  if [[ -n "${ORIGINAL_WALLET_SETTINGS_JSON:-}" && -n "${AUTH_HEADER:-}" ]]; then
    curl -s -X PUT "$API_BASE_URL/settings/wallets" \
      -H "$AUTH_HEADER" \
      -H 'content-type: application/json' \
      -d "$ORIGINAL_WALLET_SETTINGS_JSON" >/dev/null 2>&1 || true
  fi

  if [[ -n "${API_PID:-}" ]]; then
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

EXISTING_PIDS="$(lsof -ti tcp:3000 2>/dev/null || true)"
if [[ -n "$EXISTING_PIDS" ]]; then
  xargs kill <<<"$EXISTING_PIDS" >/dev/null 2>&1 || true
  sleep 1
fi

rm -f "$ROOT_DIR/runtime/wallet-settings.json"

docker compose up -d postgres >/dev/null
sleep 3
DATABASE_URL="$DATABASE_URL" npx prisma db push --schema prisma/schema.prisma --accept-data-loss >/dev/null
DATABASE_URL="$DATABASE_URL" npm run db:seed >/dev/null

DATABASE_URL="$DATABASE_URL" npm run start:api >/tmp/poolproject-dcw-api.log 2>&1 &
API_PID=$!

for _ in $(seq 1 20); do
  if curl -s "$API_BASE_URL/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -s "$API_BASE_URL/health" >/dev/null

AUTH_JSON="$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H 'content-type: application/json' \
  -d '{"identifier":"ALICE","password":"dev-password"}')"
ACCESS_TOKEN="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.accessToken || ""));' "$AUTH_JSON")"
AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"
ORIGINAL_WALLET_SETTINGS_JSON="$(curl -s "$API_BASE_URL/settings/wallets" -H "$AUTH_HEADER")"

WALLET_SETTINGS_JSON="$(curl -s -X PUT "$API_BASE_URL/settings/wallets" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d '{"commissionToShoppingEnabled":true,"commissionToShoppingFeeRate":"0","walletTransferEnabled":true,"walletTransferFeeRate":"0","walletTopupEnabled":true,"shoppingWalletSpendEnabled":true,"discountWalletSpendEnabled":true,"orderCashPaymentMethods":["bank_transfer","promptpay_qr","cash"],"walletTopupPaymentMethods":["manual_bank","promptpay_qr","cash"]}')"

ALICE_JSON="$(curl -s "$API_BASE_URL/members/by-code/ALICE" -H "$AUTH_HEADER")"
ALICE_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.memberId || ""));' "$ALICE_JSON")"

BASE_PACKAGE_JSON="$(curl -s -X POST "$API_BASE_URL/packages" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"code\":\"$BASE_PACKAGE_CODE\",\"name\":\"DCW Base Package\",\"priceUsdt\":\"100\",\"memberPriceUsdt\":\"100\",\"costPriceUsdt\":\"40\",\"pv\":\"100\",\"activeDays\":30,\"earningCapAmount\":\"300\",\"dcwSpendEnabled\":true,\"dcwRewardRate\":\"0.2\"}")"
BASE_PACKAGE_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.packageId || ""));' "$BASE_PACKAGE_JSON")"

OVERRIDE_PACKAGE_JSON="$(curl -s -X POST "$API_BASE_URL/packages" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"code\":\"$OVERRIDE_PACKAGE_CODE\",\"name\":\"DCW Override Package\",\"priceUsdt\":\"100\",\"memberPriceUsdt\":\"100\",\"costPriceUsdt\":\"40\",\"pv\":\"100\",\"activeDays\":30,\"earningCapAmount\":\"300\",\"dcwSpendEnabled\":true,\"dcwUsageAmount\":\"15\",\"dcwRewardRate\":\"0.2\"}")"
OVERRIDE_PACKAGE_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.packageId || ""));' "$OVERRIDE_PACKAGE_JSON")"

TOPUP_JSON="$(curl -s -X POST "$API_BASE_URL/wallets/$ALICE_ID/topups" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d '{"amount":"25","paymentMethod":"manual_bank","note":"dcw smoke shopping top-up"}')"

ALICE_WALLET_BEFORE_FIRST_ORDER="$(curl -s "$API_BASE_URL/auth/dashboard" -H "$AUTH_HEADER")"
FIRST_ORDER_JSON="$(curl -s -X POST "$API_BASE_URL/auth/orders" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"packageId\":\"$BASE_PACKAGE_ID\",\"shoppingWalletAmount\":\"20\",\"cashPaymentMethod\":\"promptpay_qr\"}")"
FIRST_ORDER_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.orderId || ""));' "$FIRST_ORDER_JSON")"
curl -s -X POST "$API_BASE_URL/orders/$FIRST_ORDER_ID/approve" -H "$AUTH_HEADER" >/dev/null
FIRST_PROCESS_JSON="$(curl -s -X POST "$API_BASE_URL/orders/$FIRST_ORDER_ID/process-approved" -H "$AUTH_HEADER")"
ALICE_WALLET_AFTER_FIRST_ORDER="$(curl -s "$API_BASE_URL/auth/dashboard" -H "$AUTH_HEADER")"

SECOND_ORDER_JSON="$(curl -s -X POST "$API_BASE_URL/auth/orders" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"packageId\":\"$OVERRIDE_PACKAGE_ID\",\"discountWalletAmount\":\"20\",\"shoppingWalletAmount\":\"5\",\"cashPaymentMethod\":\"cash\"}")"
ALICE_TRANSACTIONS_JSON="$(curl -s "$API_BASE_URL/auth/transactions" -H "$AUTH_HEADER")"

node -e '
function toNumber(value) {
  return Number.parseFloat(String(value || "0"));
}

function expectAlmostEqual(actual, expected, label) {
  if (Math.abs(actual - expected) > 0.000001) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

const walletSettings = JSON.parse(process.argv[1]);
const basePackage = JSON.parse(process.argv[2]);
const overridePackage = JSON.parse(process.argv[3]);
const topup = JSON.parse(process.argv[4]);
const walletBefore = JSON.parse(process.argv[5]);
const firstOrder = JSON.parse(process.argv[6]);
const firstProcess = JSON.parse(process.argv[7]);
const walletAfterFirstOrder = JSON.parse(process.argv[8]);
const secondOrder = JSON.parse(process.argv[9]);
const aliceTransactions = JSON.parse(process.argv[10]);

if (walletSettings.discountWalletSpendEnabled !== true) {
  throw new Error("discount wallet spend setting was not enabled");
}
if (basePackage.dcwUsageAmount !== "72" || basePackage.dcwDefaultUsageAmount !== "72") {
  throw new Error(`unexpected default DCW amount: ${JSON.stringify(basePackage)}`);
}
if (basePackage.dcwUsageAmountOverridden !== false || basePackage.dcwConfigWarning !== null) {
  throw new Error(`unexpected base package DCW warning state: ${JSON.stringify(basePackage)}`);
}
if (overridePackage.dcwUsageAmount !== "15" || overridePackage.dcwDefaultUsageAmount !== "72") {
  throw new Error(`unexpected override DCW amount: ${JSON.stringify(overridePackage)}`);
}
if (overridePackage.dcwUsageAmountOverridden !== true || !overridePackage.dcwConfigWarning) {
  throw new Error(`expected override warning on package: ${JSON.stringify(overridePackage)}`);
}
if (topup.shoppingBalance !== "25") {
  throw new Error(`unexpected SW top-up result: ${JSON.stringify(topup)}`);
}
if (!firstProcess.orderId) {
  throw new Error("process-approved failed for first DCW order");
}
if (firstOrder.dcwAppliedUsdt !== "0" || firstOrder.walletAppliedUsdt !== "20" || firstOrder.cashDueUsdt !== "80") {
  throw new Error(`unexpected first order split: ${JSON.stringify(firstOrder)}`);
}

const beforeWallet = walletBefore.wallet;
const afterFirstWallet = walletAfterFirstOrder.wallet;
expectAlmostEqual(toNumber(beforeWallet.shoppingBalance), 25, "SW balance before first order");
expectAlmostEqual(toNumber(afterFirstWallet.shoppingBalance), 5, "SW balance after first order");
expectAlmostEqual(
  toNumber(afterFirstWallet.discountBalance) - toNumber(beforeWallet.discountBalance),
  20,
  "discount wallet increase after approved first order",
);

if (secondOrder.dcwAppliedUsdt !== "15" || secondOrder.walletAppliedUsdt !== "5" || secondOrder.cashDueUsdt !== "80") {
  throw new Error(`unexpected second order split: ${JSON.stringify(secondOrder)}`);
}

const txTypes = new Set((aliceTransactions || []).map((item) => item.txType));
for (const requiredType of ["topup_credit", "dcw_credit", "dcw_purchase_debit", "order_purchase_debit"]) {
  if (!txTypes.has(requiredType)) {
    throw new Error(`missing wallet transaction type ${requiredType}`);
  }
}

console.log(JSON.stringify({
  walletSettings,
  basePackage,
  overridePackage,
  topup,
  firstOrder,
  firstProcess,
  walletBefore: beforeWallet,
  walletAfterFirstOrder: afterFirstWallet,
  secondOrder,
  walletTxTypes: Array.from(txTypes).sort(),
}, null, 2));
' \
  "$WALLET_SETTINGS_JSON" \
  "$BASE_PACKAGE_JSON" \
  "$OVERRIDE_PACKAGE_JSON" \
  "$TOPUP_JSON" \
  "$ALICE_WALLET_BEFORE_FIRST_ORDER" \
  "$FIRST_ORDER_JSON" \
  "$FIRST_PROCESS_JSON" \
  "$ALICE_WALLET_AFTER_FIRST_ORDER" \
  "$SECOND_ORDER_JSON" \
  "$ALICE_TRANSACTIONS_JSON"
