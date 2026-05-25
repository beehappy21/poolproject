#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/poolproject?schema=public}"
ALLOW_DESTRUCTIVE_LOCAL_RESET="${ALLOW_DESTRUCTIVE_LOCAL_RESET:-0}"
RUN_SUFFIX="$(date +%s)"

DATE_SUNDAY="${DATE_SUNDAY:-$(node -e '
const now = new Date();
const day = now.getUTCDay();
const sunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + ((7 - day) % 7)));
process.stdout.write(sunday.toISOString().slice(0, 10));
')}"
DATE_WEDNESDAY="${DATE_WEDNESDAY:-$(node -e '
const sunday = new Date(process.argv[1] + "T00:00:00.000Z");
const wednesday = new Date(sunday.getTime() - 4 * 24 * 60 * 60 * 1000);
process.stdout.write(wednesday.toISOString().slice(0, 10));
' "$DATE_SUNDAY")}"
DATE_MONDAY="${DATE_MONDAY:-$(node -e '
const sunday = new Date(process.argv[1] + "T00:00:00.000Z");
const monday = new Date(sunday.getTime() - 6 * 24 * 60 * 60 * 1000);
process.stdout.write(monday.toISOString().slice(0, 10));
' "$DATE_SUNDAY")}"

cd "$ROOT_DIR"

if [[ "$ALLOW_DESTRUCTIVE_LOCAL_RESET" != "1" ]]; then
  echo "Refusing to run destructive weekly pool smoke reset. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 to continue." >&2
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

DATABASE_URL="$DATABASE_URL" npm run build >/tmp/poolproject-pool-weekly-build.log 2>&1
DATABASE_URL="$DATABASE_URL" node dist/apps/api/apps/api/src/main.js >/tmp/poolproject-pool-weekly-api.log 2>&1 &
API_PID=$!

for _ in $(seq 1 20); do
  if curl -s "$API_BASE_URL/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -s "$API_BASE_URL/health" >/dev/null

DATABASE_URL="$DATABASE_URL" DATE_SUNDAY="$DATE_SUNDAY" DATE_WEDNESDAY="$DATE_WEDNESDAY" DATE_MONDAY="$DATE_MONDAY" RUN_SUFFIX="$RUN_SUFFIX" node <<'JS'
const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("node:crypto");
const prisma = new PrismaClient();

function atUtc(dateOnly, hh, mm = 0, ss = 0) {
  return new Date(`${dateOnly}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.000Z`);
}

async function main() {
  const alice = await prisma.user.findUnique({ where: { memberCode: "ALICE" }, select: { id: true } });
  const dave = await prisma.user.findUnique({ where: { memberCode: "DAVE" }, select: { id: true } });
  const starter = await prisma.package.findUnique({ where: { code: "STARTER" }, select: { id: true } });
  const sunday = process.env.DATE_SUNDAY;
  const wednesday = process.env.DATE_WEDNESDAY;
  const monday = process.env.DATE_MONDAY;
  const runSuffix = process.env.RUN_SUFFIX;
  const lastPackageCycle = await prisma.memberPackageCycle.findFirst({
    where: { userId: alice.id },
    orderBy: [{ cycleNo: "desc" }],
    select: { cycleNo: true },
  });
  const lastMatrixCycle = await prisma.matrixCycle.findFirst({
    where: { userId: alice.id },
    orderBy: [{ cycleNo: "desc" }],
    select: { cycleNo: true },
  });

  function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `scrypt$${salt}$${hash}`;
  }

  await prisma.user.upsert({
    where: { email: "dev-admin@example.com" },
    update: {
      memberCode: "ADMINLOCAL001",
      referralCode: "ADMINLOCAL001",
      passwordHash: hashPassword("472121"),
      name: "Dev Admin",
      email: "dev-admin@example.com",
      sponsorId: null,
      status: "ACTIVE",
      payoutStatus: "ACTIVE",
    },
    create: {
      memberCode: "ADMINLOCAL001",
      referralCode: "ADMINLOCAL001",
      name: "Dev Admin",
      email: "dev-admin@example.com",
      passwordHash: hashPassword("472121"),
      sponsorId: null,
      status: "ACTIVE",
      payoutStatus: "ACTIVE",
    },
  });

  await prisma.memberPackageCycle.create({
    data: {
      userId: alice.id,
      packageId: starter.id,
      cycleNo: (lastPackageCycle?.cycleNo || 0) + 1,
      purchaseBase: "1000",
      poolRateMode: "DEFAULT_50_PERCENT",
      poolRate: "0",
      poolCapMultiple: "0",
      commissionCapScope: "POOL_ONLY",
      commissionCapMultiple: "0",
      activatedAt: atUtc(monday, 0),
      activeUntil: atUtc(sunday, 23, 59, 59),
      earningCap: "10000",
      earnedTotalInCycle: "0",
      earningStatus: "ACTIVE",
      isReceivable: true,
      status: "ACTIVE",
    },
  });

  const cycle = await prisma.matrixCycle.create({
    data: {
      userId: alice.id,
      cycleNo: (lastMatrixCycle?.cycleNo || 0) + 1,
      boardWidth: 2,
      boardDepth: 3,
      boardCount: 3,
      organizationPvRate: "500",
      cwReentryAmount: "500",
      personalCarryPv: "0",
      levelRatesSnapshot: JSON.stringify([["0.15", "0.15", "0.15"], ["0.1", "0.1"], ["0.2", "0.2"]]),
      totalAccumulatedPv: "500",
      currentBoardNo: 2,
      currentBoardRoundNo: 1,
      status: "ACTIVE",
      startedAt: atUtc(monday, 1),
    },
    select: { id: true },
  });

  await prisma.matrixBoard.createMany({
    data: [
      {
        cycleId: cycle.id,
        boardNo: 1,
        roundNo: 1,
        slotCount: 14,
        openThresholdPv: "500",
        accumulatedPv: "500",
        filledSlots: 14,
        status: "COMPLETED",
        openedAt: atUtc(monday, 1),
        completedAt: atUtc(wednesday, 12),
      },
      {
        cycleId: cycle.id,
        boardNo: 2,
        roundNo: 1,
        slotCount: 6,
        openThresholdPv: "500",
        accumulatedPv: "0",
        filledSlots: 0,
        status: "OPEN",
        openedAt: atUtc(wednesday, 12, 1),
      },
      {
        cycleId: cycle.id,
        boardNo: 3,
        roundNo: 1,
        slotCount: 6,
        openThresholdPv: "500",
        accumulatedPv: "0",
        filledSlots: 0,
        status: "LOCKED",
      },
    ],
  });

  await prisma.order.createMany({
    data: [
      {
        orderNo: `ORD-WPOOL-${runSuffix}-MON`,
        userId: dave.id,
        subtotalUsdt: "100",
        totalUsdt: "100",
        totalPv: "100",
        paidAt: atUtc(monday, 2),
        approvedAt: atUtc(monday, 2, 30),
        approvalStatus: "APPROVED",
        status: "APPROVED",
      },
      {
        orderNo: `ORD-WPOOL-${runSuffix}-WED`,
        userId: dave.id,
        subtotalUsdt: "200",
        totalUsdt: "200",
        totalPv: "200",
        paidAt: atUtc(wednesday, 3),
        approvedAt: atUtc(wednesday, 3, 30),
        approvalStatus: "APPROVED",
        status: "APPROVED",
      },
      {
        orderNo: `ORD-WPOOL-${runSuffix}-SUN`,
        userId: dave.id,
        subtotalUsdt: "300",
        totalUsdt: "300",
        totalPv: "300",
        paidAt: atUtc(sunday, 4),
        approvedAt: atUtc(sunday, 4, 30),
        approvalStatus: "APPROVED",
        status: "APPROVED",
      },
    ],
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
JS

AUTH_JSON="$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H 'content-type: application/json' \
  -d '{"identifier":"dev-admin@example.com","password":"472121"}')"
ACCESS_TOKEN="$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data.accessToken || ""));' "$AUTH_JSON")"
AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"

WED_BODY="/tmp/pool-weekly-wed-body.json"
WED_STATUS="$(curl -s -o "$WED_BODY" -w '%{http_code}' -X POST "$API_BASE_URL/pool/$DATE_WEDNESDAY/close" -H "$AUTH_HEADER")"
SUN_BODY="/tmp/pool-weekly-sun-body.json"
SUN_STATUS="$(curl -s -o "$SUN_BODY" -w '%{http_code}' -X POST "$API_BASE_URL/pool/$DATE_SUNDAY/close" -H "$AUTH_HEADER")"

DATABASE_URL="$DATABASE_URL" \
WED_STATUS="$WED_STATUS" \
SUN_STATUS="$SUN_STATUS" \
WED_BODY_PATH="$WED_BODY" \
SUN_BODY_PATH="$SUN_BODY" \
DATE_SUNDAY="$DATE_SUNDAY" \
DATE_WEDNESDAY="$DATE_WEDNESDAY" \
DATE_MONDAY="$DATE_MONDAY" node <<'JS'
const fs = require("node:fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const wedStatus = process.env.WED_STATUS;
  const sunStatus = process.env.SUN_STATUS;
  const wedBody = JSON.parse(fs.readFileSync(process.env.WED_BODY_PATH, "utf8") || "{}");
  const sunBody = JSON.parse(fs.readFileSync(process.env.SUN_BODY_PATH, "utf8") || "{}");
  const sunday = process.env.DATE_SUNDAY;

  const cycle = await prisma.dailyPoolCycle.findUnique({
    where: { cycleDate: new Date(`${sunday}T00:00:00.000Z`) },
    select: {
      fundingTotalApprovedPv: true,
      poolFund: true,
      eligibleMemberCount: true,
      payoutPerMember: true,
      companyFallbackAmount: true,
    },
  });

  const payouts = await prisma.dailyPoolPayout.findMany({
    where: { cycle: { cycleDate: new Date(`${sunday}T00:00:00.000Z`) } },
    orderBy: [{ id: "asc" }],
    select: {
      user: { select: { memberCode: true } },
      payoutAmount: true,
      status: true,
      blockReason: true,
    },
  });

  const pass =
    wedStatus === "400" &&
    String(wedBody.message || "").includes("Sunday") &&
    (sunStatus === "201" || sunStatus === "200") &&
    cycle &&
    cycle.fundingTotalApprovedPv.toString() === "600" &&
    cycle.poolFund.toString() === "180" &&
    cycle.eligibleMemberCount === 1 &&
    cycle.payoutPerMember.toString() === "180" &&
    cycle.companyFallbackAmount.toString() === "0" &&
    payouts.length === 1 &&
    payouts[0].user.memberCode === "ALICE" &&
    payouts[0].payoutAmount.toString() === "180" &&
    payouts[0].status === "APPROVED";

  console.log(JSON.stringify({
    scenario: "pool_weekly_local_smoke",
    pass,
    expected: "weekday close is rejected, Sunday close aggregates the full week, pool fund is 30% of 600 PV, and ALICE receives the full payout after direct-2 plus recent B1 completion",
    actual: {
      wedStatus,
      wedBody,
      sunStatus,
      sunBody,
      cycle: cycle
        ? {
            fundingTotalApprovedPv: cycle.fundingTotalApprovedPv.toString(),
            poolFund: cycle.poolFund.toString(),
            eligibleMemberCount: cycle.eligibleMemberCount,
            payoutPerMember: cycle.payoutPerMember.toString(),
            companyFallbackAmount: cycle.companyFallbackAmount.toString(),
          }
        : null,
      payouts: payouts.map((row) => ({
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
JS
