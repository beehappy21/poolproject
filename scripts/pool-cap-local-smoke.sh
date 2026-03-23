#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
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
  -d '{"identifier":"ALICE","password":"dev-password"}')"
ACCESS_TOKEN="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.accessToken || ""));' "$AUTH_JSON")"
AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"

DATABASE_URL="$DATABASE_URL" DATE_ONE="$DATE_ONE" DATE_TWO="$DATE_TWO" RUN_SUFFIX="$RUN_SUFFIX" node <<'JS'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const runSuffix = process.env.RUN_SUFFIX;
  const dateOne = process.env.DATE_ONE;
  const dateTwo = process.env.DATE_TWO;
  const starter = await prisma.package.update({
    where: { code: "STARTER" },
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
    select: { id: true },
  });

  const dave = await prisma.user.findUnique({
    where: { memberCode: "DAVE" },
    select: { id: true },
  });

  if (!dave) {
    throw new Error("DAVE not found");
  }

  await prisma.order.createMany({
    data: [
      {
        orderNo: `ORD-POOLCAP-${runSuffix}-1`,
        userId: dave.id,
        subtotalUsdt: "400",
        totalUsdt: "400",
        totalPv: "400",
        paidAt: new Date(`${dateOne}T08:00:00.000Z`),
        approvedAt: new Date(`${dateOne}T08:30:00.000Z`),
        approvalStatus: "APPROVED",
        status: "APPROVED",
      },
      {
        orderNo: `ORD-POOLCAP-${runSuffix}-2`,
        userId: dave.id,
        subtotalUsdt: "400",
        totalUsdt: "400",
        totalPv: "400",
        paidAt: new Date(`${dateTwo}T08:00:00.000Z`),
        approvedAt: new Date(`${dateTwo}T08:30:00.000Z`),
        approvalStatus: "APPROVED",
        status: "APPROVED",
      },
    ],
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
    poolOne.payoutPerMember === "100" &&
    approvedOne.length === 2 &&
    Number(poolTwo.eligibleMemberCount) === 2 &&
    poolTwo.payoutPerMember === "100" &&
    poolTwo.companyFallbackAmount === "100" &&
    approvedTwo.length === 2 &&
    approvedTwo.every((row) => row.payoutAmount.toString() === "50");

  console.log(JSON.stringify({
    scenario: "pool_cap_local_smoke",
    pass,
    expected: "first pool day pays 2 eligible members, second pool day pays the remaining amount up to the 1.5x pool cap and falls back only the excess",
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
