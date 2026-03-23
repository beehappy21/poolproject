#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
RUN_SUFFIX="$(date +%s)"
COMM_PACKAGE_CODE="WALLETCOMM${RUN_SUFFIX}"
BUY_PACKAGE_CODE="WALLETBUY${RUN_SUFFIX}"
AUTH_HEADER=""
ORIGINAL_COMMISSION_SETTINGS_JSON=""
ORIGINAL_WALLET_SETTINGS_JSON=""

cd "$ROOT_DIR"

cleanup() {
  if [[ -n "${ORIGINAL_COMMISSION_SETTINGS_JSON:-}" && -n "${AUTH_HEADER:-}" ]]; then
    curl -s -X PUT "$API_BASE_URL/settings/commissions" \
      -H "$AUTH_HEADER" \
      -H 'content-type: application/json' \
      -d "$ORIGINAL_COMMISSION_SETTINGS_JSON" >/dev/null 2>&1 || true
  fi

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

rm -f "$ROOT_DIR/runtime/commission-settings.json" "$ROOT_DIR/runtime/wallet-settings.json"

docker compose up -d postgres >/dev/null
sleep 3
DATABASE_URL="$DATABASE_URL" npx prisma db push --schema prisma/schema.prisma --accept-data-loss >/dev/null
DATABASE_URL="$DATABASE_URL" npm run db:seed >/dev/null

DATABASE_URL="$DATABASE_URL" npm run start:api >/tmp/poolproject-wallet-api.log 2>&1 &
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
ORIGINAL_COMMISSION_SETTINGS_JSON="$(curl -s "$API_BASE_URL/settings/commissions" -H "$AUTH_HEADER")"
ORIGINAL_WALLET_SETTINGS_JSON="$(curl -s "$API_BASE_URL/settings/wallets" -H "$AUTH_HEADER")"

curl -s -X PUT "$API_BASE_URL/settings/commissions" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d '{"directLevelRates":["0.2"],"uniLevelRates":["0"],"poolRate":"0","cashbackRate":"0"}' >/dev/null

WALLET_SETTINGS_JSON="$(curl -s -X PUT "$API_BASE_URL/settings/wallets" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d '{"commissionToShoppingEnabled":true,"commissionToShoppingFeeRate":"0.1","walletTransferEnabled":true,"walletTransferFeeRate":"0.05","walletTopupEnabled":true,"shoppingWalletSpendEnabled":true,"orderCashPaymentMethods":["bank_transfer","promptpay_qr","cash"],"walletTopupPaymentMethods":["manual_bank","promptpay_qr","cash"]}')"

ALICE_JSON="$(curl -s "$API_BASE_URL/members/by-code/ALICE" -H "$AUTH_HEADER")"
BOB_JSON="$(curl -s "$API_BASE_URL/members/by-code/BOB" -H "$AUTH_HEADER")"
DAVE_JSON="$(curl -s "$API_BASE_URL/members/by-code/DAVE" -H "$AUTH_HEADER")"
ALICE_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.memberId || ""));' "$ALICE_JSON")"
BOB_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.memberId || ""));' "$BOB_JSON")"
DAVE_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.memberId || ""));' "$DAVE_JSON")"

COMM_PACKAGE_JSON="$(curl -s -X POST "$API_BASE_URL/packages" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"code\":\"$COMM_PACKAGE_CODE\",\"name\":\"Wallet Commission Package\",\"priceUsdt\":\"100\",\"pv\":\"100\",\"activeDays\":30,\"earningCapAmount\":\"300\"}")"
COMM_PACKAGE_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.packageId || ""));' "$COMM_PACKAGE_JSON")"

BUY_PACKAGE_JSON="$(curl -s -X POST "$API_BASE_URL/packages" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"code\":\"$BUY_PACKAGE_CODE\",\"name\":\"Wallet Buy Package\",\"priceUsdt\":\"120\",\"pv\":\"120\",\"activeDays\":30,\"earningCapAmount\":\"360\"}")"
BUY_PACKAGE_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.packageId || ""));' "$BUY_PACKAGE_JSON")"

COMM_ORDER_JSON="$(curl -s -X POST "$API_BASE_URL/orders" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$BOB_ID\",\"packageId\":\"$COMM_PACKAGE_ID\"}")"
COMM_ORDER_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.orderId || ""));' "$COMM_ORDER_JSON")"

ALICE_WALLET_BEFORE="$(curl -s "$API_BASE_URL/auth/dashboard" -H "$AUTH_HEADER")"
DAVE_WALLET_BEFORE="$(curl -s "$API_BASE_URL/wallets/$DAVE_ID" -H "$AUTH_HEADER")"
curl -s -X POST "$API_BASE_URL/orders/$COMM_ORDER_ID/approve" -H "$AUTH_HEADER" >/dev/null
PROCESS_JSON="$(curl -s -X POST "$API_BASE_URL/orders/$COMM_ORDER_ID/process-approved" -H "$AUTH_HEADER")"

ALICE_WALLET_AFTER_COMMISSION="$(curl -s "$API_BASE_URL/auth/dashboard" -H "$AUTH_HEADER")"
CONVERT_JSON="$(curl -s -X POST "$API_BASE_URL/auth/wallets/convert" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d '{"amount":"10"}')"
TRANSFER_JSON="$(curl -s -X POST "$API_BASE_URL/auth/wallets/transfer" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d '{"amount":"4","recipientMemberCode":"DAVE"}')"
TOPUP_JSON="$(curl -s -X POST "$API_BASE_URL/wallets/$ALICE_ID/topups" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"amount\":\"15\",\"paymentMethod\":\"manual_bank\",\"note\":\"wallet smoke top-up\",\"actorUserId\":\"$ALICE_ID\"}")"
ALICE_TRANSACTIONS_JSON="$(curl -s "$API_BASE_URL/auth/transactions" -H "$AUTH_HEADER")"
DAVE_WALLET_JSON="$(curl -s "$API_BASE_URL/wallets/$DAVE_ID" -H "$AUTH_HEADER")"
BUY_ORDER_JSON="$(curl -s -X POST "$API_BASE_URL/auth/orders" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"packageId\":\"$BUY_PACKAGE_ID\",\"shoppingWalletAmount\":\"20\",\"cashPaymentMethod\":\"promptpay_qr\"}")"
ALICE_WALLET_AFTER_BUY="$(curl -s "$API_BASE_URL/auth/dashboard" -H "$AUTH_HEADER")"

DAVE_AUTH_JSON="$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H 'content-type: application/json' \
  -d '{"identifier":"DAVE","password":"dev-password"}')"
DAVE_ACCESS_TOKEN="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.accessToken || ""));' "$DAVE_AUTH_JSON")"
DAVE_AUTH_HEADER="Authorization: Bearer $DAVE_ACCESS_TOKEN"
DAVE_TOPUP_REQUEST_JSON="$(curl -s -X POST "$API_BASE_URL/auth/wallets/topup-requests" \
  -H "$DAVE_AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d '{"amount":"7","paymentMethod":"promptpay_qr","transferSlipUrl":"https://example.com/slips/wallet-topup-smoke.png","note":"member top-up request smoke"}')"
DAVE_TOPUP_REQUEST_ID="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.requestId || ""));' "$DAVE_TOPUP_REQUEST_JSON")"
DAVE_TOPUP_LIST_JSON="$(curl -s "$API_BASE_URL/auth/wallets/topup-requests" -H "$DAVE_AUTH_HEADER")"
APPROVED_TOPUP_JSON="$(curl -s -X POST "$API_BASE_URL/wallets/topup-requests/$DAVE_TOPUP_REQUEST_ID/approve" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d "{\"actorUserId\":\"$ALICE_ID\"}")"
DAVE_WALLET_AFTER_TOPUP_REQUEST="$(curl -s "$API_BASE_URL/wallets/$DAVE_ID" -H "$AUTH_HEADER")"

node -e '
function toNumber(value) {
  return Number.parseFloat(String(value || "0"));
}

function expectAlmostEqual(actual, expected, label) {
  if (Math.abs(actual - expected) > 0.000001) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

const processResult = JSON.parse(process.argv[1]);
const walletBefore = JSON.parse(process.argv[2]);
const daveWalletBefore = JSON.parse(process.argv[3]);
const walletAfterCommission = JSON.parse(process.argv[4]);
const convertResult = JSON.parse(process.argv[5]);
const transferResult = JSON.parse(process.argv[6]);
const topupResult = JSON.parse(process.argv[7]);
const aliceTransactions = JSON.parse(process.argv[8]);
const daveWallet = JSON.parse(process.argv[9]);
const buyOrder = JSON.parse(process.argv[10]);
const walletAfterBuy = JSON.parse(process.argv[11]);
const walletSettings = JSON.parse(process.argv[12]);
const daveTopupRequest = JSON.parse(process.argv[13]);
const daveTopupList = JSON.parse(process.argv[14]);
const approvedTopup = JSON.parse(process.argv[15]);
const daveWalletAfterTopupRequest = JSON.parse(process.argv[16]);

const initialWithdrawable = toNumber(walletBefore.wallet.withdrawableBalance);
const initialShopping = toNumber(walletBefore.wallet.shoppingBalance);
const initialDaveShopping = toNumber(daveWalletBefore.shoppingBalance);
const afterCommissionWithdrawable = toNumber(walletAfterCommission.wallet.withdrawableBalance);

if (!processResult.orderId) throw new Error("process-approved failed");
expectAlmostEqual(afterCommissionWithdrawable, initialWithdrawable + 20, "withdrawable after commission");
if (convertResult.grossAmount !== "10" || convertResult.feeAmount !== "1" || convertResult.netShoppingAmount !== "9") {
  throw new Error(`unexpected convert result: ${JSON.stringify(convertResult)}`);
}
expectAlmostEqual(toNumber(convertResult.withdrawableBalance), initialWithdrawable + 10, "withdrawable after convert");
expectAlmostEqual(toNumber(convertResult.shoppingBalance), initialShopping + 9, "shopping after convert");
if (transferResult.grossAmount !== "4" || transferResult.feeAmount !== "0.2" || transferResult.netAmount !== "3.8") {
  throw new Error(`unexpected transfer result: ${JSON.stringify(transferResult)}`);
}
expectAlmostEqual(toNumber(transferResult.senderShoppingBalance), initialShopping + 5, "sender shopping after transfer");
expectAlmostEqual(toNumber(transferResult.recipientShoppingBalance), initialDaveShopping + 3.8, "recipient shopping after transfer");
expectAlmostEqual(toNumber(topupResult.shoppingBalance), initialShopping + 20, "shopping after top-up");
expectAlmostEqual(toNumber(daveWallet.shoppingBalance), initialDaveShopping + 3.8, "DAVE shopping wallet after transfer");
if (buyOrder.walletAppliedUsdt !== "20" || buyOrder.cashDueUsdt !== "100") {
  throw new Error(`unexpected mixed-payment order split: ${JSON.stringify(buyOrder)}`);
}
if (buyOrder.cashPaymentMethod !== "promptpay_qr") {
  throw new Error(`unexpected cash payment method: ${buyOrder.cashPaymentMethod}`);
}
expectAlmostEqual(toNumber(walletAfterBuy.wallet.shoppingBalance), initialShopping, "ALICE shopping after mixed payment");
if (daveTopupRequest.status !== "pending" || daveTopupRequest.paymentMethod !== "promptpay_qr") {
  throw new Error(`unexpected wallet top-up request: ${JSON.stringify(daveTopupRequest)}`);
}
if (!Array.isArray(daveTopupList) || daveTopupList.length === 0) {
  throw new Error("expected DAVE top-up requests to be listable");
}
if (approvedTopup.status !== "approved") {
  throw new Error(`expected approved top-up request, got ${JSON.stringify(approvedTopup)}`);
}
expectAlmostEqual(
  toNumber(daveWalletAfterTopupRequest.shoppingBalance),
  initialDaveShopping + 10.8,
  "DAVE shopping wallet after approved top-up request",
);

const txTypes = new Set((aliceTransactions || []).map((item) => item.txType));
for (const requiredType of [
  "commission_convert_out",
  "shopping_wallet_convert_in",
  "transfer_fee_debit",
  "wallet_transfer_out",
  "topup_credit",
  "order_purchase_debit",
]) {
  if (!txTypes.has(requiredType)) {
    throw new Error(`missing wallet transaction type ${requiredType}`);
  }
}

if (walletSettings.commissionToShoppingFeeRate !== "0.1") {
  throw new Error("wallet settings update failed");
}

console.log(JSON.stringify({
  processedOrderId: processResult.orderId,
  aliceBefore: walletBefore.wallet,
  aliceAfterCommission: walletAfterCommission.wallet,
  convertResult,
  transferResult,
  topupResult,
  daveWallet,
  daveTopupRequest,
  approvedTopup,
  daveWalletAfterTopupRequest,
  buyOrder,
  aliceAfterBuy: walletAfterBuy.wallet,
  walletTxTypes: Array.from(txTypes).sort(),
}, null, 2));
' \
  "$PROCESS_JSON" \
  "$ALICE_WALLET_BEFORE" \
  "$DAVE_WALLET_BEFORE" \
  "$ALICE_WALLET_AFTER_COMMISSION" \
  "$CONVERT_JSON" \
  "$TRANSFER_JSON" \
  "$TOPUP_JSON" \
  "$ALICE_TRANSACTIONS_JSON" \
  "$DAVE_WALLET_JSON" \
  "$BUY_ORDER_JSON" \
  "$ALICE_WALLET_AFTER_BUY" \
  "$WALLET_SETTINGS_JSON" \
  "$DAVE_TOPUP_REQUEST_JSON" \
  "$DAVE_TOPUP_LIST_JSON" \
  "$APPROVED_TOPUP_JSON" \
  "$DAVE_WALLET_AFTER_TOPUP_REQUEST"
