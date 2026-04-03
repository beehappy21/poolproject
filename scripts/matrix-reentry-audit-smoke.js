const { PrismaClient } = require("@prisma/client");
const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { randomBytes, scryptSync } = require("node:crypto");
const http = require("node:http");
const https = require("node:https");
const { join } = require("node:path");
const { URL } = require("node:url");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const RUN_SUFFIX = Date.now().toString().slice(-8);
const ADMIN_IDENTIFIER = process.env.REENTRY_SMOKE_ADMIN || "TH0000013";
const ADMIN_PASSWORD = process.env.REENTRY_SMOKE_ADMIN_PASSWORD || "005613";
const SPONSOR_CODE = process.env.REENTRY_SMOKE_SPONSOR || "TH0000013";
const TARGET_CODE = `RGT${RUN_SUFFIX}`;
const SOURCE_CODE = `RGS${RUN_SUFFIX}`;
const MATRIX_SETTINGS_PATH = join(process.cwd(), "runtime", "matrix-settings.json");
const LEVEL_RATES = ["0.1", "0.05", "0.03"];
const BOARD_LEVEL_RATES = [
  [...LEVEL_RATES],
  [...LEVEL_RATES],
  [...LEVEL_RATES],
];
const BOARD_OPEN_PV_THRESHOLDS = ["700", "700", "700"];
const MATRIX_SETTINGS_PAYLOAD = {
  boardWidth: 2,
  boardDepth: 3,
  boardCount: 3,
  organizationPvRate: "700",
  cwReentryAmount: "700",
  reentryFirmAmount: "700",
  reentryPvAmount: "700",
  levelRates: LEVEL_RATES,
  boardLevelRates: BOARD_LEVEL_RATES,
  boardOpenPvThresholds: BOARD_OPEN_PV_THRESHOLDS,
};

function readMatrixSettingsFile() {
  if (!existsSync(MATRIX_SETTINGS_PATH)) {
    return null;
  }

  return JSON.parse(readFileSync(MATRIX_SETTINGS_PATH, "utf8"));
}

function writeMatrixSettingsFile(settings) {
  writeFileSync(MATRIX_SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

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
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = raw;
          }
          resolve({
            statusCode: res.statusCode || 500,
            body: parsed,
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

  return response;
}

async function expectOk(path, options = {}) {
  const response = await request(path, options);

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(
      `${options.method || "GET"} ${path} failed with ${response.statusCode}: ${JSON.stringify(response.body)}`,
    );
  }

  return response.body;
}

async function login(identifier, password) {
  const session = await expectOk("/auth/login", {
    method: "POST",
    body: {
      identifier,
      password,
    },
  });

  return session.accessToken;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function createMemberRecord(input) {
  return prisma.user.create({
    data: {
      memberCode: input.memberCode,
      referralCode: input.referralCode,
      name: input.name,
      email: input.email,
      passwordHash: hashPassword(input.password),
      sponsorId: input.sponsorId ? BigInt(input.sponsorId) : null,
      status: "ACTIVE",
      payoutStatus: "ACTIVE",
      riskLevel: "NORMAL",
    },
    select: {
      id: true,
      memberCode: true,
      name: true,
      email: true,
    },
  });
}

async function createSmokePackage() {
  const supplier = await prisma.supplier.create({
    data: {
      code: `RGSUP${RUN_SUFFIX}`,
      name: `Reentry Smoke Supplier ${RUN_SUFFIX}`,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const category = await prisma.productCategory.create({
    data: {
      supplierId: supplier.id,
      code: `reentry-${RUN_SUFFIX}`,
      name: `Reentry Smoke ${RUN_SUFFIX}`,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const product = await prisma.product.create({
    data: {
      supplierId: supplier.id,
      categoryId: category.id,
      code: `RGPROD${RUN_SUFFIX}`,
      name: `Reentry Smoke Product ${RUN_SUFFIX}`,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const detail = await prisma.productDetail.create({
    data: {
      productId: product.id,
      code: `RGDET${RUN_SUFFIX}`,
      name: `Reentry Smoke Detail ${RUN_SUFFIX}`,
      costPriceUsdt: "100",
      memberPriceUsdt: "700",
      retailPriceUsdt: "700",
      pv: "700",
      poolRateMode: "DISABLED",
      poolRate: "0",
      poolCapMultiple: "0",
      commissionCapScope: "POOL_ONLY",
      commissionCapMultiple: "0",
      dcwSpendEnabled: false,
      dcwUsageAmount: "0",
      dcwCashRewardRate: "0",
      dcwShoppingRewardRate: "0",
      firmEnabled: false,
      firmDcwRewardAmount: "0",
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const pkg = await prisma.package.create({
    data: {
      code: `RGPKG${RUN_SUFFIX}`,
      name: `Reentry Smoke Package ${RUN_SUFFIX}`,
      costPriceUsdt: "100",
      memberPriceUsdt: "700",
      retailPriceUsdt: "700",
      priceUsdt: "700",
      pv: "700",
      poolRateMode: "DISABLED",
      poolRate: "0",
      poolCapMultiple: "0",
      commissionCapScope: "POOL_ONLY",
      commissionCapMultiple: "0",
      dcwSpendEnabled: false,
      dcwUsageAmount: "0",
      dcwUsageAmountOverridden: false,
      dcwCashRewardRate: "0",
      dcwShoppingRewardRate: "0",
      activeDays: 30,
      earningCapType: "FIXED_AMOUNT",
      earningCapAmount: "700",
      status: "ACTIVE",
      packageItems: {
        create: [
          {
            productDetailId: detail.id,
            qty: 1,
            unitCostPriceUsdt: "100",
            unitMemberPriceUsdt: "700",
            unitRetailPriceUsdt: "700",
            unitPv: "700",
            lineCostPriceUsdt: "100",
            lineMemberPriceUsdt: "700",
            lineRetailPriceUsdt: "700",
            linePv: "700",
          },
        ],
      },
    },
    select: { id: true },
  });

  return pkg.id.toString();
}

async function seedTargetCycle(targetUserId) {
  return prisma.matrixCycle.create({
    data: {
      userId: BigInt(targetUserId),
      cycleNo: 1,
      boardWidth: 2,
      boardDepth: 3,
      boardCount: 3,
      organizationPvRate: "700",
      cwReentryAmount: "700",
      personalCarryPv: "700",
      totalAccumulatedPv: "700",
      currentBoardNo: 2,
      currentBoardRoundNo: 1,
      levelRatesSnapshot: JSON.stringify(BOARD_LEVEL_RATES),
      boards: {
        create: [
          {
            boardNo: 1,
            roundNo: 1,
            slotCount: 14,
            openThresholdPv: "700",
            accumulatedPv: "700",
            filledSlots: 14,
            status: "COMPLETED",
            openedAt: new Date(),
            completedAt: new Date(),
          },
          {
            boardNo: 2,
            roundNo: 1,
            slotCount: 14,
            openThresholdPv: "700",
            accumulatedPv: "0",
            filledSlots: 0,
            status: "OPEN",
            openedAt: new Date(),
          },
          {
            boardNo: 3,
            roundNo: 1,
            slotCount: 14,
            openThresholdPv: "700",
            accumulatedPv: "0",
            filledSlots: 0,
            status: "LOCKED",
          },
        ],
      },
    },
    include: {
      boards: true,
    },
  });
}

async function main() {
  await expectOk("/health");
  const token = await login(ADMIN_IDENTIFIER, ADMIN_PASSWORD);
  const originalMatrixSettings = readMatrixSettingsFile();
  let createdOrderId = null;

  try {
    writeMatrixSettingsFile(MATRIX_SETTINGS_PAYLOAD);

    const packageId = await createSmokePackage();
    const sponsor = await prisma.user.findUnique({
      where: { memberCode: SPONSOR_CODE },
      select: { id: true },
    });
    if (!sponsor) {
      throw new Error(`Sponsor ${SPONSOR_CODE} not found.`);
    }

    const target = await createMemberRecord({
      memberCode: TARGET_CODE,
      referralCode: `RGTREF${RUN_SUFFIX}`.slice(0, 20),
      name: `Reentry Target ${RUN_SUFFIX}`,
      email: `reentry.target.${RUN_SUFFIX}@example.com`,
      sponsorId: sponsor.id.toString(),
      password: "smokepass1234",
    });
    const source = await createMemberRecord({
      memberCode: SOURCE_CODE,
      referralCode: `RGSREF${RUN_SUFFIX}`.slice(0, 20),
      name: `Reentry Source ${RUN_SUFFIX}`,
      email: `reentry.source.${RUN_SUFFIX}@example.com`,
      sponsorId: target.id.toString(),
      password: "smokepass1234",
    });

    await prisma.wallet.upsert({
      where: { userId: target.id },
      update: {
        withdrawableBalance: "0",
        firmBalance: "0",
        discountBalance: "0",
        shoppingBalance: "0",
      },
      create: {
        userId: target.id,
        withdrawableBalance: "0",
        firmBalance: "0",
        discountBalance: "0",
        shoppingBalance: "0",
      },
    });

    const seededCycle = await seedTargetCycle(target.id.toString());
    const boardOneRoundOne = seededCycle.boards.find(
      (board) => board.boardNo === 1 && board.roundNo === 1,
    );
    if (!boardOneRoundOne) {
      throw new Error("Failed to seed target board 1 round 1.");
    }

    const createdOrder = await expectOk("/orders", {
      method: "POST",
      token,
      body: {
        userId: source.id.toString(),
        packageId,
      },
    });
    createdOrderId = createdOrder.orderId;

    const approval = await expectOk(`/orders/${createdOrderId}/approve`, {
      method: "POST",
      token,
    });

    const cycleAfterApprove = await prisma.matrixCycle.findFirst({
      where: { userId: target.id, status: "ACTIVE" },
      orderBy: [{ cycleNo: "desc" }],
      include: {
        boards: {
          orderBy: [{ boardNo: "asc" }, { roundNo: "asc" }],
        },
      },
    });

    if (!cycleAfterApprove) {
      throw new Error("Target cycle not found after order approval.");
    }

    const boardOneRoundTwo = cycleAfterApprove.boards.find(
      (board) => board.boardNo === 1 && board.roundNo === 2,
    );
    if (!boardOneRoundTwo || boardOneRoundTwo.status !== "OPEN") {
      throw new Error("Expected board 1 round 2 to open for the target member.");
    }

    if (
      cycleAfterApprove.currentBoardNo !== 1 ||
      cycleAfterApprove.currentBoardRoundNo !== 2
    ) {
      throw new Error(
        `Expected current board to move to 1/2, found ${cycleAfterApprove.currentBoardNo}/${cycleAfterApprove.currentBoardRoundNo}.`,
      );
    }

    const targetWallet = await prisma.wallet.findUnique({
      where: { userId: target.id },
      select: { firmBalance: true },
    });
    if (!targetWallet || targetWallet.firmBalance.toString() !== "700") {
      throw new Error(
        `Expected target firm balance to become 700, found ${targetWallet?.firmBalance?.toString() ?? "missing"}.`,
      );
    }

    const reentryEvents = await prisma.matrixAccumulationEvent.findMany({
      where: {
        cycleId: seededCycle.id,
        sourceUserId: target.id,
        sourceType: "REENTRY",
        boardId: boardOneRoundTwo.id,
      },
      orderBy: [{ id: "asc" }],
      select: {
        id: true,
        creditedPv: true,
        sourcePv: true,
      },
    });

    if (reentryEvents.length !== 1) {
      throw new Error(`Expected exactly one REENTRY event, found ${reentryEvents.length}.`);
    }

    const reentryOrdersAfterApprove = await prisma.order.findMany({
      where: {
        userId: target.id,
        orderSourceType: "MATRIX_REENTRY",
      },
      orderBy: [{ id: "asc" }],
      select: {
        id: true,
        orderNo: true,
        orderSourceType: true,
        approvalBatchRef: true,
        approvalStatus: true,
        status: true,
      },
    });

    if (reentryOrdersAfterApprove.length !== 1) {
      throw new Error(
        `Expected exactly one reentry audit order after approve, found ${reentryOrdersAfterApprove.length}.`,
      );
    }

    const reentryOrder = reentryOrdersAfterApprove[0];
    if (!reentryOrder.approvalBatchRef?.endsWith(reentryEvents[0].id.toString())) {
      throw new Error(
        `Expected reentry audit order marker to include matrix event ${reentryEvents[0].id.toString()}, found ${reentryOrder.approvalBatchRef ?? "missing"}.`,
      );
    }

    const processApprovedAgain = await expectOk(`/orders/${createdOrderId}/process-approved`, {
      method: "POST",
      token,
    });

    const reentryOrderCountAfterReprocess = await prisma.order.count({
      where: {
        userId: target.id,
        orderSourceType: "MATRIX_REENTRY",
      },
    });

    if (reentryOrderCountAfterReprocess !== 1) {
      throw new Error(
        `Expected reentry audit order dedupe to keep count at 1, found ${reentryOrderCountAfterReprocess}.`,
      );
    }

    const cancelResponse = await request(`/orders/${reentryOrder.id.toString()}/cancel`, {
      method: "POST",
      token,
    });

    if (cancelResponse.statusCode !== 400) {
      throw new Error(
        `Expected cancelling reentry audit order to return 400, found ${cancelResponse.statusCode}.`,
      );
    }

    const cancelMessage =
      typeof cancelResponse.body?.message === "string"
        ? cancelResponse.body.message
        : "";
    if (cancelMessage !== "Matrix reentry audit orders cannot be cancelled.") {
      throw new Error(
        `Unexpected cancel message: ${JSON.stringify(cancelResponse.body)}`,
      );
    }

    const snapshot = await expectOk(`/orders/${reentryOrder.id.toString()}/snapshot`, {
      method: "GET",
      token,
    });

    if (snapshot.order?.orderSourceType !== "matrix_reentry") {
      throw new Error(
        `Expected snapshot orderSourceType=matrix_reentry, found ${snapshot.order?.orderSourceType ?? "missing"}.`,
      );
    }

    console.log(
      JSON.stringify(
        {
          scenario: "matrix_reentry_audit_smoke",
          pass: true,
          sourceOrderId: createdOrderId,
          sourceOrderNo: createdOrder.orderNo,
          targetMemberCode: target.memberCode,
          sourceMemberCode: source.memberCode,
          seededBoardOneRoundOneId: boardOneRoundOne.id.toString(),
          approval: {
            affectedMemberCount: approval.matrixProcessing?.affectedMemberCount ?? 0,
            openedReentryCount: approval.matrixProcessing?.openedReentryCount ?? 0,
          },
          reprocess: {
            skipped: processApprovedAgain.matrixProcessing?.skipped ?? null,
            openedReentryCount:
              processApprovedAgain.matrixProcessing?.openedReentryCount ?? 0,
          },
          boardOneRoundTwo: {
            boardId: boardOneRoundTwo.id.toString(),
            status: boardOneRoundTwo.status,
            filledSlots: boardOneRoundTwo.filledSlots,
          },
          firmBalance: targetWallet.firmBalance.toString(),
          reentryEventId: reentryEvents[0].id.toString(),
          reentryOrderId: reentryOrder.id.toString(),
          reentryOrderNo: reentryOrder.orderNo,
          cancelStatusCode: cancelResponse.statusCode,
          cancelMessage,
        },
        null,
        2,
      ),
    );
  } finally {
    if (originalMatrixSettings) {
      writeMatrixSettingsFile(originalMatrixSettings);
    }

    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error.message || error);
  await prisma.$disconnect();
  process.exit(1);
});
