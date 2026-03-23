#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
RUN_SUFFIX="$(date +%s)"
DATE_COMM="${DATE_COMM:-$(date -u -v+7d +%F 2>/dev/null || python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc).date() + timedelta(days=7)).isoformat())
PY
)}"
DATE_POOL="${DATE_POOL:-$(date -u -v+8d +%F 2>/dev/null || python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc).date() + timedelta(days=8)).isoformat())
PY
)}"
ORIGINAL_COMMISSION_SETTINGS_JSON=""
AUTH_HEADER=""

cd "$ROOT_DIR"

cleanup() {
  if [[ -n "${ORIGINAL_COMMISSION_SETTINGS_JSON:-}" && -n "${AUTH_HEADER:-}" ]]; then
    curl -s -X PUT "$API_BASE_URL/settings/commissions" \
      -H "$AUTH_HEADER" \
      -H 'content-type: application/json' \
      -d "$ORIGINAL_COMMISSION_SETTINGS_JSON" >/dev/null 2>&1 || true
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

docker compose up -d postgres >/dev/null
sleep 3
DATABASE_URL="$DATABASE_URL" ./node_modules/.bin/prisma db execute --schema prisma/schema.prisma --stdin >/dev/null <<'SQL'
drop schema if exists public cascade;
create schema public;
SQL
DATABASE_URL="$DATABASE_URL" ./node_modules/.bin/prisma db push --schema prisma/schema.prisma --accept-data-loss >/dev/null
DATABASE_URL="$DATABASE_URL" node scripts/seed-dev.js >/dev/null

DATABASE_URL="$DATABASE_URL" npm run start:api >/tmp/poolproject-pool-all-comm-api.log 2>&1 &
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
ORIGINAL_COMMISSION_SETTINGS_JSON="$(curl -s "$API_BASE_URL/settings/commissions" \
  -H "$AUTH_HEADER")"

curl -s -X PUT "$API_BASE_URL/settings/commissions" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d '{"directLevelRates":["2.5"],"uniLevelRates":["0","2.5"],"poolRate":"0.5","cashbackRate":"0"}' >/dev/null

DATABASE_URL="$DATABASE_URL" DATE_COMM="$DATE_COMM" DATE_POOL="$DATE_POOL" RUN_SUFFIX="$RUN_SUFFIX" node <<'JS'
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const starter = await prisma.package.update({
    where: { code: "STARTER" },
    data: {
      priceUsdt: "100",
      memberPriceUsdt: "100",
      retailPriceUsdt: "100",
      pv: "100",
      poolRateMode: "DEFAULT_50_PERCENT",
      poolRate: "0",
      poolCapMultiple: "3.0",
      commissionCapScope: "ALL_COMMISSIONS",
      commissionCapMultiple: "3.0",
      earningCapAmount: "1000",
    },
    select: { id: true },
  });
  const dave = await prisma.user.findUnique({
    where: { memberCode: "DAVE" },
    select: { id: true },
  });

  if (!dave) {
    throw new Error("DAVE not found");
  }

  await prisma.order.create({
    data: {
      orderNo: `ORD-ALLCOMM-COMM-${process.env.RUN_SUFFIX}`,
      userId: dave.id,
      subtotalUsdt: "100",
      totalUsdt: "100",
      totalPv: "100",
      paidAt: new Date(`${process.env.DATE_COMM}T08:00:00.000Z`),
      approvedAt: new Date(`${process.env.DATE_COMM}T08:30:00.000Z`),
      commissionSettingsSnapshot: JSON.stringify({
        directLevelRates: ["2.5"],
        uniLevelRates: ["0", "2.5"],
        poolRate: "0.5",
        cashbackRate: "0",
      }),
      approvalStatus: "APPROVED",
      status: "APPROVED",
      orderItems: {
        create: [
          {
            packageId: starter.id,
            qty: 1,
            unitPriceUsdt: "100",
            unitPv: "100",
            lineTotalUsdt: "100",
            lineTotalPv: "100",
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNo: `ORD-ALLCOMM-POOL-${process.env.RUN_SUFFIX}`,
      userId: dave.id,
      subtotalUsdt: "400",
      totalUsdt: "400",
      totalPv: "400",
      paidAt: new Date(`${process.env.DATE_POOL}T08:00:00.000Z`),
      approvedAt: new Date(`${process.env.DATE_POOL}T08:30:00.000Z`),
      commissionSettingsSnapshot: JSON.stringify({
        directLevelRates: ["2.5"],
        uniLevelRates: ["0", "2.5"],
        poolRate: "0.5",
        cashbackRate: "0",
      }),
      approvalStatus: "APPROVED",
      status: "APPROVED",
      orderItems: {
        create: [
          {
            packageId: starter.id,
            qty: 1,
            unitPriceUsdt: "400",
            unitPv: "400",
            lineTotalUsdt: "400",
            lineTotalPv: "400",
          },
        ],
      },
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
JS

COMM_ORDER_ID="$(DATABASE_URL="$DATABASE_URL" RUN_SUFFIX="$RUN_SUFFIX" node - <<'JS'
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const order = await prisma.order.findUnique({
    where: { orderNo: `ORD-ALLCOMM-COMM-${process.env.RUN_SUFFIX}` },
    select: { id: true },
  });
  process.stdout.write(order?.id.toString() || "");
  await prisma.$disconnect();
})().catch(async () => {
  await prisma.$disconnect();
  process.exit(1);
});
JS
)"

PROCESS_JSON="$(curl -s -X POST "$API_BASE_URL/orders/$COMM_ORDER_ID/process-approved" \
  -H "$AUTH_HEADER")"
POOL_JSON="$(curl -s -X POST "$API_BASE_URL/pool/$DATE_POOL/close" \
  -H "$AUTH_HEADER")"

DATABASE_URL="$DATABASE_URL" PROCESS_JSON="$PROCESS_JSON" POOL_JSON="$POOL_JSON" DATE_POOL="$DATE_POOL" RUN_SUFFIX="$RUN_SUFFIX" node <<'JS'
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const processResult = JSON.parse(process.env.PROCESS_JSON);
  const poolResult = JSON.parse(process.env.POOL_JSON);

  const cycles = await prisma.memberPackageCycle.findMany({
    where: {
      user: {
        memberCode: { in: ["ALICE", "BOB"] },
      },
    },
    orderBy: [{ userId: "asc" }, { cycleNo: "asc" }],
    select: {
      user: { select: { memberCode: true } },
      earnedTotalInCycle: true,
    },
  });

  const poolPayouts = await prisma.dailyPoolPayout.findMany({
    where: { cycle: { cycleDate: new Date(`${process.env.DATE_POOL}T00:00:00.000Z`) } },
    orderBy: [{ id: "asc" }],
    select: {
      userId: true,
      payoutAmount: true,
      status: true,
      blockReason: true,
      user: { select: { memberCode: true } },
    },
  });

  const cycleTotals = Object.fromEntries(
    cycles.map((cycle) => [cycle.user.memberCode, cycle.earnedTotalInCycle.toString()]),
  );

  const approvedPayouts = poolPayouts.filter((row) => row.status === "APPROVED");
  const pass =
    processResult.orderId &&
    cycleTotals.ALICE === "300" &&
    cycleTotals.BOB === "300" &&
    poolResult.poolFund === "200" &&
    poolResult.payoutPerMember === "100" &&
    poolResult.companyFallbackAmount === "100" &&
    approvedPayouts.length === 2 &&
    approvedPayouts.every((row) => row.payoutAmount.toString() === "50");

  console.log(JSON.stringify({
    scenario: "pool_all_commissions_e2e_smoke",
    pass,
    expected: {
      commissionAccumulation:
        "process-approved should accumulate 250 direct to BOB and 250 uni to ALICE before pool close",
      poolClose:
        "next-day pool should request 100 each, pay 50 each, and fallback the remaining 100 because combined earned total reaches 3.0x",
    },
    actual: {
      processResult,
      cycleTotals,
      poolResult,
      poolPayouts: poolPayouts.map((row) => ({
        memberCode: row.user.memberCode,
        payoutAmount: row.payoutAmount.toString(),
        status: row.status,
        blockReason: row.blockReason,
      })),
    },
  }, null, 2));

  if (!pass) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
JS
