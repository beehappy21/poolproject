#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
ALLOW_DESTRUCTIVE_LOCAL_RESET="${ALLOW_DESTRUCTIVE_LOCAL_RESET:-0}"
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

if [[ "$ALLOW_DESTRUCTIVE_LOCAL_RESET" != "1" ]]; then
  echo "Refusing to run destructive pool all-commissions smoke reset. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 to continue." >&2
  exit 1
fi

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
DATABASE_URL="$DATABASE_URL" node <<'JS' >/dev/null
const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("node:crypto");
const prisma = new PrismaClient();
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}
async function main() {
  const alice = await prisma.user.findUnique({ where: { memberCode: "ALICE" }, select: { id: true } });
  const bob = await prisma.user.findUnique({ where: { memberCode: "BOB" }, select: { id: true } });
  const seedOrder = await prisma.order.findFirst({ where: { orderNo: "ORD-DEV-001" }, select: { id: true } });
  await prisma.user.upsert({
    where: { email: "dev-admin@example.com" },
    update: {
      memberCode: "ADMINLOCAL001",
      referralCode: "ADMINLOCAL001",
      passwordHash: hashPassword("472121"),
      isAdmin: true,
      adminRole: "SUPER_ADMIN",
      status: "ACTIVE",
      payoutStatus: "ACTIVE",
    },
    create: {
      memberCode: "ADMINLOCAL001",
      referralCode: "ADMINLOCAL001",
      name: "Dev Admin",
      email: "dev-admin@example.com",
      passwordHash: hashPassword("472121"),
      isAdmin: true,
      adminRole: "SUPER_ADMIN",
      status: "ACTIVE",
      payoutStatus: "ACTIVE",
      riskLevel: "NORMAL",
    },
  });
  await prisma.memberPackageCycle.updateMany({
    where: { user: { memberCode: { in: ["ALICE", "BOB"] } } },
    data: { purchaseBase: "10000" },
  });
  for (const user of [alice, bob]) {
    await prisma.userBuybackProgress.upsert({
      where: { userId: user.id },
      update: {
        status: "CLEAR",
        currentBuybackCycleId: `qualified:${seedOrder.id.toString()}`,
        lastQualifyingOrderId: seedOrder.id,
      },
      create: {
        userId: user.id,
        accumulatedAmount: "0",
        status: "CLEAR",
        currentBuybackCycleId: `qualified:${seedOrder.id.toString()}`,
        lastQualifyingOrderId: seedOrder.id,
      },
    });
  }
}
main().finally(async () => prisma.$disconnect());
JS

npm run build >/tmp/poolproject-pool-all-comm-build.log 2>&1
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
  -d '{"identifier":"dev-admin@example.com","password":"472121"}')"
ACCESS_TOKEN="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.accessToken || ""));' "$AUTH_JSON")"
AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"
ORIGINAL_COMMISSION_SETTINGS_JSON="$(curl -s "$API_BASE_URL/settings/commissions" \
  -H "$AUTH_HEADER")"

curl -s -X PUT "$API_BASE_URL/settings/commissions" \
  -H "$AUTH_HEADER" \
  -H 'content-type: application/json' \
  -d '{"directLevelRates":["2.5"],"uniLevelRates":["0"],"poolRate":"0.5","cashbackRate":"0"}' >/dev/null

DATABASE_URL="$DATABASE_URL" DATE_COMM="$DATE_COMM" DATE_POOL="$DATE_POOL" RUN_SUFFIX="$RUN_SUFFIX" node <<'JS'
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const starter = await prisma.package.findUnique({
    where: { code: "STARTER" },
    select: { id: true },
  });
  if (!starter) {
    throw new Error("STARTER package not found");
  }
  await prisma.package.update({
    where: { id: starter.id },
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
        uniLevelRates: ["0"],
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
            poolRateMode: "DEFAULT_50_PERCENT",
            unitPoolRate: "0",
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
        uniLevelRates: ["0"],
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
            poolRateMode: "DEFAULT_50_PERCENT",
            unitPoolRate: "0",
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
    cycleTotals.ALICE === "200" &&
    cycleTotals.BOB === "300" &&
    poolResult.poolFund === "400" &&
    poolResult.payoutPerMember === "200" &&
    poolResult.companyFallbackAmount === "150" &&
    approvedPayouts.length === 2 &&
    approvedPayouts.some((row) => row.user.memberCode === "ALICE" && row.payoutAmount.toString() === "200") &&
    approvedPayouts.some((row) => row.user.memberCode === "BOB" && row.payoutAmount.toString() === "50");

  console.log(JSON.stringify({
    scenario: "pool_all_commissions_e2e_smoke",
    pass,
    expected: {
      commissionAccumulation:
        "process-approved should accumulate 250 direct to BOB before pool close, with no unilevel contribution in this project",
      poolClose:
        "next-day pool should request 200 each, pay 200 to ALICE and 50 to BOB, and fallback the remaining 150 because BOB reaches the all-commissions cap first",
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
