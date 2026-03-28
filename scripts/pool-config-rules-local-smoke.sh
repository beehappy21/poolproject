#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-poolproject}"
ALLOW_DESTRUCTIVE_LOCAL_RESET="${ALLOW_DESTRUCTIVE_LOCAL_RESET:-0}"
RUN_SUFFIX="$(date +%s)"
DATE_CUSTOM="${DATE_CUSTOM:-$(date -u -v+4d +%F 2>/dev/null || python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc).date() + timedelta(days=4)).isoformat())
PY
)}"
DATE_DISABLED="${DATE_DISABLED:-$(date -u -v+5d +%F 2>/dev/null || python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc).date() + timedelta(days=5)).isoformat())
PY
)}"
DATE_ALL_COMM="${DATE_ALL_COMM:-$(date -u -v+6d +%F 2>/dev/null || python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc).date() + timedelta(days=6)).isoformat())
PY
)}"

cd "$ROOT_DIR"

if [[ "$ALLOW_DESTRUCTIVE_LOCAL_RESET" != "1" ]]; then
  echo "Refusing to run destructive pool-config smoke reset. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 to continue." >&2
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

DATABASE_URL="$DATABASE_URL" npm run start:api >/tmp/poolproject-pool-config-api.log 2>&1 &
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

DATABASE_URL="$DATABASE_URL" DATE_CUSTOM="$DATE_CUSTOM" DATE_DISABLED="$DATE_DISABLED" DATE_ALL_COMM="$DATE_ALL_COMM" node <<'JS'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const dateCustom = process.env.DATE_CUSTOM;
  const dateDisabled = process.env.DATE_DISABLED;
  const dateAllComm = process.env.DATE_ALL_COMM;
  const starter = await prisma.package.findUnique({
    where: { code: "STARTER" },
    select: { id: true },
  });
  const dave = await prisma.user.findUnique({
    where: { memberCode: "DAVE" },
    select: { id: true },
  });
  const alice = await prisma.user.findUnique({
    where: { memberCode: "ALICE" },
    select: { id: true },
  });
  const bob = await prisma.user.findUnique({
    where: { memberCode: "BOB" },
    select: { id: true },
  });

  if (!starter || !dave || !alice || !bob) {
    throw new Error("missing seed data");
  }

  await prisma.package.update({
    where: { id: starter.id },
    data: {
      priceUsdt: "100",
      memberPriceUsdt: "100",
      retailPriceUsdt: "100",
      pv: "100",
      earningCapAmount: "1000",
    },
  });

  console.log(JSON.stringify({
    starterPackageId: starter.id.toString(),
    daveUserId: dave.id.toString(),
    aliceUserId: alice.id.toString(),
    bobUserId: bob.id.toString(),
    dates: {
      customRate: dateCustom,
      disabled: dateDisabled,
      allCommissions: dateAllComm,
    },
  }, null, 2));
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

DATABASE_URL="$DATABASE_URL" RUN_SUFFIX="$RUN_SUFFIX" DATE="$DATE_CUSTOM" node <<'JS'
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const dave = await prisma.user.findUnique({ where: { memberCode: "DAVE" }, select: { id: true } });
  const starter = await prisma.package.findUnique({ where: { code: "STARTER" }, select: { id: true } });
  await prisma.package.update({
    where: { id: starter.id },
    data: {
      poolRateMode: "CUSTOM_RATE",
      poolRate: "0.25",
      poolCapMultiple: "0",
      commissionCapScope: "POOL_ONLY",
      commissionCapMultiple: "0",
    },
  });
  await prisma.order.create({
    data: {
      orderNo: `ORD-POOLRULE-${process.env.RUN_SUFFIX}-CUSTOM`,
      userId: dave.id,
      subtotalUsdt: "400",
      totalUsdt: "400",
      totalPv: "400",
      paidAt: new Date(`${process.env.DATE}T08:00:00.000Z`),
      approvedAt: new Date(`${process.env.DATE}T08:30:00.000Z`),
      approvalStatus: "APPROVED",
      status: "APPROVED",
      orderItems: { create: [{ packageId: starter.id, qty: 1, unitPriceUsdt: "400", unitPv: "400", poolRateMode: "CUSTOM_RATE", unitPoolRate: "0.25", lineTotalUsdt: "400", lineTotalPv: "400" }] },
    },
  });
}
main().finally(async () => prisma.$disconnect());
JS
POOL_CUSTOM_JSON="$(curl -s -X POST "$API_BASE_URL/pool/$DATE_CUSTOM/close" -H "$AUTH_HEADER")"
POOL_CUSTOM_RERUN_JSON="$(curl -s -X POST "$API_BASE_URL/pool/$DATE_CUSTOM/close" -H "$AUTH_HEADER")"

DATABASE_URL="$DATABASE_URL" RUN_SUFFIX="$RUN_SUFFIX" DATE="$DATE_DISABLED" node <<'JS'
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const dave = await prisma.user.findUnique({ where: { memberCode: "DAVE" }, select: { id: true } });
  const starter = await prisma.package.findUnique({ where: { code: "STARTER" }, select: { id: true } });
  await prisma.package.update({
    where: { id: starter.id },
    data: {
      poolRateMode: "DISABLED",
      poolRate: "0",
      poolCapMultiple: "0",
      commissionCapScope: "POOL_ONLY",
      commissionCapMultiple: "0",
    },
  });
  await prisma.order.create({
    data: {
      orderNo: `ORD-POOLRULE-${process.env.RUN_SUFFIX}-DISABLED`,
      userId: dave.id,
      subtotalUsdt: "400",
      totalUsdt: "400",
      totalPv: "400",
      paidAt: new Date(`${process.env.DATE}T08:00:00.000Z`),
      approvedAt: new Date(`${process.env.DATE}T08:30:00.000Z`),
      approvalStatus: "APPROVED",
      status: "APPROVED",
      orderItems: { create: [{ packageId: starter.id, qty: 1, unitPriceUsdt: "400", unitPv: "400", poolRateMode: "DISABLED", unitPoolRate: "0", lineTotalUsdt: "400", lineTotalPv: "400" }] },
    },
  });
}
main().finally(async () => prisma.$disconnect());
JS
POOL_DISABLED_JSON="$(curl -s -X POST "$API_BASE_URL/pool/$DATE_DISABLED/close" -H "$AUTH_HEADER")"
POOL_DISABLED_RERUN_JSON="$(curl -s -X POST "$API_BASE_URL/pool/$DATE_DISABLED/close" -H "$AUTH_HEADER")"

DATABASE_URL="$DATABASE_URL" RUN_SUFFIX="$RUN_SUFFIX" DATE="$DATE_ALL_COMM" node <<'JS'
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const dave = await prisma.user.findUnique({ where: { memberCode: "DAVE" }, select: { id: true } });
  const starter = await prisma.package.findUnique({ where: { code: "STARTER" }, select: { id: true } });
  const alice = await prisma.user.findUnique({ where: { memberCode: "ALICE" }, select: { id: true } });
  const bob = await prisma.user.findUnique({ where: { memberCode: "BOB" }, select: { id: true } });
  await prisma.memberPackageCycle.updateMany({
    where: { userId: { in: [alice.id, bob.id] } },
    data: { earnedTotalInCycle: "250" },
  });
  await prisma.package.update({
    where: { id: starter.id },
    data: {
      poolRateMode: "DEFAULT_50_PERCENT",
      poolRate: "0",
      poolCapMultiple: "3.0",
      commissionCapScope: "ALL_COMMISSIONS",
      commissionCapMultiple: "3.0",
    },
  });
  await prisma.order.create({
    data: {
      orderNo: `ORD-POOLRULE-${process.env.RUN_SUFFIX}-ALLCOMM`,
      userId: dave.id,
      subtotalUsdt: "400",
      totalUsdt: "400",
      totalPv: "400",
      paidAt: new Date(`${process.env.DATE}T08:00:00.000Z`),
      approvedAt: new Date(`${process.env.DATE}T08:30:00.000Z`),
      approvalStatus: "APPROVED",
      status: "APPROVED",
      orderItems: { create: [{ packageId: starter.id, qty: 1, unitPriceUsdt: "400", unitPv: "400", poolRateMode: "DEFAULT_50_PERCENT", unitPoolRate: "0", lineTotalUsdt: "400", lineTotalPv: "400" }] },
    },
  });
}
main().finally(async () => prisma.$disconnect());
JS
POOL_ALL_COMM_JSON="$(curl -s -X POST "$API_BASE_URL/pool/$DATE_ALL_COMM/close" -H "$AUTH_HEADER")"
POOL_ALL_COMM_RERUN_JSON="$(curl -s -X POST "$API_BASE_URL/pool/$DATE_ALL_COMM/close" -H "$AUTH_HEADER")"

DATABASE_URL="$DATABASE_URL" \
POOL_CUSTOM_JSON="$POOL_CUSTOM_JSON" \
POOL_CUSTOM_RERUN_JSON="$POOL_CUSTOM_RERUN_JSON" \
POOL_DISABLED_JSON="$POOL_DISABLED_JSON" \
POOL_DISABLED_RERUN_JSON="$POOL_DISABLED_RERUN_JSON" \
POOL_ALL_COMM_JSON="$POOL_ALL_COMM_JSON" \
POOL_ALL_COMM_RERUN_JSON="$POOL_ALL_COMM_RERUN_JSON" \
DATE_CUSTOM="$DATE_CUSTOM" \
DATE_DISABLED="$DATE_DISABLED" \
DATE_ALL_COMM="$DATE_ALL_COMM" \
node <<'JS'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function readPayouts(date) {
  const rows = await prisma.dailyPoolPayout.findMany({
    where: { cycle: { cycleDate: new Date(`${date}T00:00:00.000Z`) } },
    orderBy: [{ id: "asc" }],
    select: { payoutAmount: true, status: true, blockReason: true, userId: true },
  });

  return rows.map((row) => ({
    userId: row.userId.toString(),
    payoutAmount: row.payoutAmount.toString(),
    status: row.status,
    blockReason: row.blockReason,
  }));
}

async function main() {
  const custom = JSON.parse(process.env.POOL_CUSTOM_JSON);
  const customRerun = JSON.parse(process.env.POOL_CUSTOM_RERUN_JSON);
  const disabled = JSON.parse(process.env.POOL_DISABLED_JSON);
  const disabledRerun = JSON.parse(process.env.POOL_DISABLED_RERUN_JSON);
  const allCommissions = JSON.parse(process.env.POOL_ALL_COMM_JSON);
  const allCommissionsRerun = JSON.parse(process.env.POOL_ALL_COMM_RERUN_JSON);
  const payoutsCustom = await readPayouts(process.env.DATE_CUSTOM);
  const payoutsDisabled = await readPayouts(process.env.DATE_DISABLED);
  const payoutsAllComm = await readPayouts(process.env.DATE_ALL_COMM);

  const approvedCustom = payoutsCustom.filter((row) => row.status === "APPROVED");
  const approvedDisabled = payoutsDisabled.filter((row) => row.status === "APPROVED");
  const approvedAllComm = payoutsAllComm.filter((row) => row.status === "APPROVED");

  const pass =
    custom.poolFund === "100" &&
    customRerun.poolFund === custom.poolFund &&
    custom.payoutPerMember === "50" &&
    customRerun.payoutPerMember === custom.payoutPerMember &&
    approvedCustom.length === 2 &&
    approvedCustom.every((row) => row.payoutAmount === "50") &&
    disabled.poolFund === "0" &&
    disabledRerun.poolFund === disabled.poolFund &&
    disabled.payoutPerMember === "0" &&
    disabledRerun.payoutPerMember === disabled.payoutPerMember &&
    disabled.companyFallbackAmount === "0" &&
    disabledRerun.companyFallbackAmount === disabled.companyFallbackAmount &&
    payoutsDisabled.length === 0 &&
    allCommissions.poolFund === "200" &&
    allCommissionsRerun.poolFund === allCommissions.poolFund &&
    allCommissions.payoutPerMember === "100" &&
    allCommissionsRerun.payoutPerMember === allCommissions.payoutPerMember &&
    allCommissions.companyFallbackAmount === "100" &&
    allCommissionsRerun.companyFallbackAmount === allCommissions.companyFallbackAmount &&
    approvedAllComm.length === 2 &&
    approvedAllComm.every((row) => row.payoutAmount === "50");

  console.log(JSON.stringify({
    scenario: "pool_config_rules_local_smoke",
    pass,
    expected: {
      customRate: "custom 25% of 400 PV => pool fund 100 => 2 recipients get 50 each",
      disabled: "disabled pool => pool fund 0 and no payout rows are created",
      allCommissions: "with earnedTotalInCycle preloaded to 250 on 3.0x cap, each recipient can receive only 50 more from a requested 100",
    },
    actual: {
      customRate: {
        result: custom,
        rerun: customRerun,
        payouts: payoutsCustom,
      },
      disabled: {
        result: disabled,
        rerun: disabledRerun,
        payouts: payoutsDisabled,
      },
      allCommissions: {
        result: allCommissions,
        rerun: allCommissionsRerun,
        payouts: payoutsAllComm,
      },
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
