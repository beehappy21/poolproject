#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
ALLOW_DESTRUCTIVE_LOCAL_RESET="${ALLOW_DESTRUCTIVE_LOCAL_RESET:-0}"
RUN_SUFFIX="$(date +%s)"
DATE_ONE="${DATE_ONE:-$(date -u -v+2d +%F 2>/dev/null || python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc).date() + timedelta(days=2)).isoformat())
PY
)}"
DATE_TWO="${DATE_TWO:-$(date -u -v+3d +%F 2>/dev/null || python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc).date() + timedelta(days=3)).isoformat())
PY
)}"

cd "$ROOT_DIR"

if [[ "$ALLOW_DESTRUCTIVE_LOCAL_RESET" != "1" ]]; then
  echo "Refusing to run destructive pool-cap smoke reset. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 to continue." >&2
  exit 1
fi

cleanup() {
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
    where: { memberCode: "TH0000013" },
    update: {
      passwordHash: hashPassword("a1a1a1"),
      isAdmin: true,
      adminRole: "SUPER_ADMIN",
      status: "ACTIVE",
      payoutStatus: "ACTIVE",
    },
    create: {
      memberCode: "TH0000013",
      referralCode: "T130000",
      name: "Dev Admin",
      email: "dev-admin@example.com",
      passwordHash: hashPassword("a1a1a1"),
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

npm run build >/tmp/poolproject-pool-cap-build.log 2>&1
DATABASE_URL="$DATABASE_URL" npm run start:api >/tmp/poolproject-pool-cap-api.log 2>&1 &
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
  -d '{"identifier":"TH0000013","password":"a1a1a1"}')"
ACCESS_TOKEN="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.accessToken || ""));' "$AUTH_JSON")"
AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"

DATABASE_URL="$DATABASE_URL" DATE_ONE="$DATE_ONE" DATE_TWO="$DATE_TWO" RUN_SUFFIX="$RUN_SUFFIX" node <<'JS'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const runSuffix = process.env.RUN_SUFFIX;
  const dateOne = process.env.DATE_ONE;
  const dateTwo = process.env.DATE_TWO;
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
      poolCapMultiple: "1.5",
      commissionCapScope: "POOL_ONLY",
      commissionCapMultiple: "0",
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
      orderNo: `ORD-POOLCAP-${runSuffix}-1`,
      userId: dave.id,
      subtotalUsdt: "400",
      totalUsdt: "400",
      totalPv: "400",
      paidAt: new Date(`${dateOne}T08:00:00.000Z`),
      approvedAt: new Date(`${dateOne}T08:30:00.000Z`),
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
            unitPoolRate: "1",
            lineTotalUsdt: "400",
            lineTotalPv: "400",
          },
        ],
      },
    },
  });
  await prisma.order.create({
    data: {
      orderNo: `ORD-POOLCAP-${runSuffix}-2`,
      userId: dave.id,
      subtotalUsdt: "400",
      totalUsdt: "400",
      totalPv: "400",
      paidAt: new Date(`${dateTwo}T08:00:00.000Z`),
      approvedAt: new Date(`${dateTwo}T08:30:00.000Z`),
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
            unitPoolRate: "1",
            lineTotalUsdt: "400",
            lineTotalPv: "400",
          },
        ],
      },
    },
  });

  console.log(JSON.stringify({ starterPackageId: starter.id.toString(), dateOne, dateTwo }, null, 2));
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

POOL_ONE_JSON="$(curl -s -X POST "$API_BASE_URL/pool/$DATE_ONE/close" -H "$AUTH_HEADER")"
POOL_TWO_JSON="$(curl -s -X POST "$API_BASE_URL/pool/$DATE_TWO/close" -H "$AUTH_HEADER")"

DATABASE_URL="$DATABASE_URL" POOL_ONE_JSON="$POOL_ONE_JSON" POOL_TWO_JSON="$POOL_TWO_JSON" DATE_ONE="$DATE_ONE" DATE_TWO="$DATE_TWO" node <<'JS'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const poolOne = JSON.parse(process.env.POOL_ONE_JSON);
  const poolTwo = JSON.parse(process.env.POOL_TWO_JSON);
  const dateOne = process.env.DATE_ONE;
  const dateTwo = process.env.DATE_TWO;

  const payoutsOne = await prisma.dailyPoolPayout.findMany({
    where: { cycle: { cycleDate: new Date(`${dateOne}T00:00:00.000Z`) } },
    orderBy: [{ id: "asc" }],
    select: { payoutAmount: true, status: true, blockReason: true, userId: true },
  });
  const payoutsTwo = await prisma.dailyPoolPayout.findMany({
    where: { cycle: { cycleDate: new Date(`${dateTwo}T00:00:00.000Z`) } },
    orderBy: [{ id: "asc" }],
    select: { payoutAmount: true, status: true, blockReason: true, userId: true },
  });

  const approvedOne = payoutsOne.filter((row) => row.status === "APPROVED");
  const approvedTwo = payoutsTwo.filter((row) => row.status === "APPROVED");

  const pass =
    Number(poolOne.eligibleMemberCount) === 2 &&
    poolOne.payoutPerMember === "200" &&
    approvedOne.length === 2 &&
    approvedOne.every((row) => row.payoutAmount.toString() === "200") &&
    Number(poolTwo.eligibleMemberCount) === 2 &&
    poolTwo.payoutPerMember === "200" &&
    poolTwo.companyFallbackAmount === "200" &&
    approvedTwo.length === 2 &&
    approvedTwo.every((row) => row.payoutAmount.toString() === "100");

  console.log(JSON.stringify({
    scenario: "pool_cap_local_smoke",
    pass,
    expected: "with full-PV funding, day one pays 200 each and day two is capped by remaining cycle earning room so only 100 each is approved and the remaining 200 falls back",
    actual: {
      dateOne,
      dateTwo,
      poolOne,
      poolTwo,
      dayOnePayouts: payoutsOne.map((row) => ({
        userId: row.userId.toString(),
        payoutAmount: row.payoutAmount.toString(),
        status: row.status,
        blockReason: row.blockReason,
      })),
      dayTwoPayouts: payoutsTwo.map((row) => ({
        userId: row.userId.toString(),
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
