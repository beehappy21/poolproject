const { PrismaClient } = require("@prisma/client");
const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const RUN_SUFFIX = Date.now().toString().slice(-8);
const MEMBER_PASSWORD = "smokepass1234";
const UPLINE_CODE = `MSUP${RUN_SUFFIX}`;
const MID_CODE = `MMID${RUN_SUFFIX}`;
const SOURCE_CODE = `MSRC${RUN_SUFFIX}`;
const LEVEL_RATES = JSON.stringify([
  ["0.1", "0.05", "0.03"],
  ["0.1", "0.05", "0.03"],
  ["0.1", "0.05", "0.03"],
]);

async function request(path, options = {}) {
  const target = new URL(`${API_BASE_URL}${path}`);
  const transport = target.protocol === "https:" ? https : http;
  const payload = options.body ? JSON.stringify(options.body) : null;

  const response = await new Promise((resolve, reject) => {
    const req = transport.request(
      target,
      {
        method: options.method || "GET",
        headers: {
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...(payload
            ? {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 500,
            body: raw,
          });
        });
      },
    );

    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });

  const parsed = response.body ? JSON.parse(response.body) : null;
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(parsed?.message || `${response.statusCode} request failed for ${path}`);
  }

  return parsed;
}

async function loginAdmin() {
  const session = await request("/auth/login", {
    method: "POST",
    body: {
      identifier: "ALICE",
      password: "dev-password",
    },
  });

  return session.accessToken;
}

async function getActivePackageId() {
  const starter = await prisma.package.findUnique({
    where: { code: "STARTER" },
    select: { id: true, status: true },
  });

  if (starter?.status === "ACTIVE") {
    return starter.id.toString();
  }

  const pkg = await prisma.package.findFirst({
    where: { status: "ACTIVE" },
    orderBy: [{ id: "asc" }],
    select: { id: true },
  });

  if (!pkg) {
    throw new Error("No active package found for matrix spill smoke test.");
  }

  return pkg.id.toString();
}

function zeroRateArray(source, fallbackLength) {
  if (Array.isArray(source) && source.length > 0) {
    return source.map(() => "0");
  }

  return Array.from({ length: fallbackLength }, () => "0");
}

async function createMember(input) {
  return request("/members", {
    method: "POST",
    body: input,
  });
}

async function activatePackage(memberId, packageId, token) {
  return request(`/members/${memberId}/activate-package`, {
    method: "POST",
    token,
    body: { packageId },
  });
}

async function seedCycle(userId, input) {
  return prisma.matrixCycle.create({
    data: {
      userId: BigInt(userId),
      cycleNo: 1,
      boardWidth: 2,
      boardDepth: 3,
      boardCount: 3,
      organizationPvRate: "900",
      cwReentryAmount: "650",
      personalCarryPv: "0",
      totalAccumulatedPv: input.totalAccumulatedPv || "0",
      currentBoardNo: input.currentBoardNo,
      currentBoardRoundNo: input.currentBoardRoundNo,
      levelRatesSnapshot: LEVEL_RATES,
      boards: {
        create: input.boards.map((board) => ({
          boardNo: board.boardNo,
          roundNo: board.roundNo,
          slotCount: 14,
          openThresholdPv: "700",
          accumulatedPv: board.accumulatedPv || "0",
          filledSlots: board.filledSlots,
          status: board.status,
          openedAt: board.openedAt || new Date(),
          completedAt: board.completedAt || null,
        })),
      },
    },
    include: {
      boards: true,
    },
  });
}

async function main() {
  await request("/health");
  const token = await loginAdmin();
  const packageId = await getActivePackageId();
  const originalSettings = await request("/settings/commissions", {
    method: "GET",
    token,
  });

  await request("/settings/commissions", {
    method: "PUT",
    token,
    body: {
      directLevelRates: zeroRateArray(originalSettings.directLevelRates, 3),
      uniLevelRates: zeroRateArray(originalSettings.uniLevelRates, 5),
      poolRate: "0",
      cashbackRate: "0",
    },
  });

  let sourceOrderId = null;

  try {
    const upline = await createMember({
      memberCode: UPLINE_CODE,
      name: `Matrix Spill Upline ${RUN_SUFFIX}`,
      email: `matrix.spill.upline.${RUN_SUFFIX}@example.com`,
      sponsorCode: "ALICE",
      password: MEMBER_PASSWORD,
    });
    await activatePackage(upline.memberId, packageId, token);

    const middle = await createMember({
      memberCode: MID_CODE,
      name: `Matrix Spill Middle ${RUN_SUFFIX}`,
      email: `matrix.spill.middle.${RUN_SUFFIX}@example.com`,
      sponsorCode: upline.memberCode,
      password: MEMBER_PASSWORD,
    });
    await activatePackage(middle.memberId, packageId, token);

    const source = await createMember({
      memberCode: SOURCE_CODE,
      name: `Matrix Spill Source ${RUN_SUFFIX}`,
      email: `matrix.spill.source.${RUN_SUFFIX}@example.com`,
      sponsorCode: middle.memberCode,
      password: MEMBER_PASSWORD,
    });
    await activatePackage(source.memberId, packageId, token);

    await seedCycle(upline.memberId, {
      currentBoardNo: 1,
      currentBoardRoundNo: 2,
      totalAccumulatedPv: "900",
      boards: [
        {
          boardNo: 1,
          roundNo: 1,
          status: "COMPLETED",
          filledSlots: 14,
          completedAt: new Date(),
        },
        {
          boardNo: 1,
          roundNo: 2,
          status: "OPEN",
          filledSlots: 0,
        },
        {
          boardNo: 2,
          roundNo: 1,
          status: "OPEN",
          filledSlots: 0,
        },
      ],
    });

    await seedCycle(middle.memberId, {
      currentBoardNo: 1,
      currentBoardRoundNo: 2,
      totalAccumulatedPv: "900",
      boards: [
        {
          boardNo: 1,
          roundNo: 1,
          status: "COMPLETED",
          filledSlots: 14,
          completedAt: new Date(),
        },
        {
          boardNo: 1,
          roundNo: 2,
          status: "OPEN",
          filledSlots: 13,
        },
        {
          boardNo: 2,
          roundNo: 1,
          status: "LOCKED",
          filledSlots: 0,
        },
      ],
    });

    await seedCycle(source.memberId, {
      currentBoardNo: 1,
      currentBoardRoundNo: 1,
      totalAccumulatedPv: "0",
      boards: [
        {
          boardNo: 1,
          roundNo: 1,
          status: "OPEN",
          filledSlots: 0,
        },
      ],
    });

    const order = await request("/orders", {
      method: "POST",
      token,
      body: {
        userId: source.memberId,
        packageId,
      },
    });
    sourceOrderId = order.orderId;

    await request(`/orders/${sourceOrderId}/approve`, {
      method: "POST",
      token,
    });
    const processed = await request(`/orders/${sourceOrderId}/process-approved`, {
      method: "POST",
      token,
    });

    const middleCycle = await prisma.matrixCycle.findFirst({
      where: { userId: BigInt(middle.memberId), status: "ACTIVE" },
      orderBy: [{ cycleNo: "desc" }],
      include: {
        boards: {
          orderBy: [{ boardNo: "asc" }, { roundNo: "asc" }],
        },
      },
    });
    const uplineCycle = await prisma.matrixCycle.findFirst({
      where: { userId: BigInt(upline.memberId), status: "ACTIVE" },
      orderBy: [{ cycleNo: "desc" }],
      include: {
        boards: {
          orderBy: [{ boardNo: "asc" }, { roundNo: "asc" }],
        },
      },
    });

    const middleRoundTwo = middleCycle.boards.find(
      (entry) => entry.boardNo === 1 && entry.roundNo === 2,
    );
    const uplineBoardOneRoundTwo = uplineCycle.boards.find(
      (entry) => entry.boardNo === 1 && entry.roundNo === 2,
    );
    const uplineBoardTwo = uplineCycle.boards.find(
      (entry) => entry.boardNo === 2 && entry.roundNo === 1,
    );

    const spillEvent = await prisma.matrixAccumulationEvent.findFirst({
      where: {
        cycleId: uplineCycle.id,
        boardId: uplineBoardTwo.id,
        sourceUserId: BigInt(middle.memberId),
        sourceOrderId: null,
        sourceType: "REENTRY",
      },
      orderBy: [{ id: "desc" }],
    });

    const spillPayout = await prisma.matrixPayout.findFirst({
      where: {
        cycleId: uplineCycle.id,
        boardId: uplineBoardTwo.id,
        sourceUserId: BigInt(middle.memberId),
        sourceOrderId: null,
        roundNo: 1,
      },
      orderBy: [{ id: "desc" }],
    });

    if (processed.matrixProcessing.affectedMemberCount < 2) {
      throw new Error(
        `Expected at least 2 affected matrix members, found ${processed.matrixProcessing.affectedMemberCount}.`,
      );
    }

    if (!middleRoundTwo || middleRoundTwo.status !== "COMPLETED" || middleRoundTwo.filledSlots !== 14) {
      throw new Error("Expected middle board 1 round 2 to complete at 14 slots.");
    }

    if (!uplineBoardOneRoundTwo || uplineBoardOneRoundTwo.filledSlots !== 1) {
      throw new Error("Expected upline board 1 round 2 to receive the normal order point.");
    }

    if (!uplineBoardTwo || uplineBoardTwo.filledSlots !== 1) {
      throw new Error("Expected upline board 2 round 1 to receive one spill point.");
    }

    if (!spillEvent) {
      throw new Error("Expected a synthetic REENTRY accumulation event on the upline board 2.");
    }

    if (!spillPayout) {
      throw new Error("Expected a spill payout row on the upline board 2.");
    }

    console.log(
      JSON.stringify(
        {
          scenario: "matrix_spill_smoke",
          pass: true,
          orderId: sourceOrderId,
          middleBoardOneRoundTwo: {
            status: middleRoundTwo.status,
            filledSlots: middleRoundTwo.filledSlots,
          },
          uplineBoardOneRoundTwo: {
            filledSlots: uplineBoardOneRoundTwo.filledSlots,
          },
          uplineBoardTwoRoundOne: {
            filledSlots: uplineBoardTwo.filledSlots,
          },
          spillEventId: spillEvent.id.toString(),
          spillPayoutId: spillPayout.id.toString(),
        },
        null,
        2,
      ),
    );
  } finally {
    await request("/settings/commissions", {
      method: "PUT",
      token,
      body: {
        directLevelRates: originalSettings.directLevelRates,
        uniLevelRates: originalSettings.uniLevelRates,
        poolRate: originalSettings.poolRate,
        cashbackRate: originalSettings.cashbackRate,
      },
    });
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
