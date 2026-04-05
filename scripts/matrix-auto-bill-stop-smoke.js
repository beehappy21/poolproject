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
const ADMIN_IDENTIFIER = process.env.AUTO_BILL_ADMIN || "ALICE";
const ADMIN_PASSWORD = process.env.AUTO_BILL_ADMIN_PASSWORD || "dev-password";
const SPONSOR_CODE = process.env.AUTO_BILL_SPONSOR || "ALICE";
const TARGET_CODE = process.env.AUTO_BILL_TARGET_CODE || `ABT${RUN_SUFFIX}`;
const SOURCE_CODE = process.env.AUTO_BILL_SOURCE_CODE || `ABS${RUN_SUFFIX}`;
const MEMBER_PASSWORD = process.env.AUTO_BILL_MEMBER_PASSWORD || "a1a1a1";
const MATRIX_SETTINGS_PATH = join(process.cwd(), "runtime", "matrix-settings.json");
const LEVEL_RATES = ["0.15", "0.15", "0.15"];
const BOARD_LEVEL_RATES = [
  [...LEVEL_RATES],
  ["0.10", "0.10", "0"],
  ["0.20", "0.20", "0"],
];
const MATRIX_SETTINGS_PAYLOAD = {
  boardWidth: 2,
  boardDepth: 3,
  boardCount: 3,
  organizationPvRate: "500",
  cwReentryAmount: "500",
  reentryFirmAmount: "500",
  reentryPvAmount: "500",
  levelRates: LEVEL_RATES,
  boardLevelRates: BOARD_LEVEL_RATES,
  boardOpenPvThresholds: ["500", "500", "500"],
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
      matrixReentryEnabled: true,
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
      code: `ABSUP${RUN_SUFFIX}`,
      name: `Auto Bill Stop Supplier ${RUN_SUFFIX}`,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const category = await prisma.productCategory.create({
    data: {
      supplierId: supplier.id,
      code: `autobill-${RUN_SUFFIX}`,
      name: `Auto Bill Stop ${RUN_SUFFIX}`,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const product = await prisma.product.create({
    data: {
      supplierId: supplier.id,
      categoryId: category.id,
      code: `ABPROD${RUN_SUFFIX}`,
      name: `Auto Bill Stop Product ${RUN_SUFFIX}`,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const detail = await prisma.productDetail.create({
    data: {
      productId: product.id,
      code: `ABDET${RUN_SUFFIX}`,
      name: `Auto Bill Stop Detail ${RUN_SUFFIX}`,
      costPriceUsdt: "100",
      memberPriceUsdt: "500",
      retailPriceUsdt: "500",
      pv: "500",
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
      code: `ABPKG${RUN_SUFFIX}`,
      name: `Auto Bill Stop Package ${RUN_SUFFIX}`,
      costPriceUsdt: "100",
      memberPriceUsdt: "500",
      retailPriceUsdt: "500",
      priceUsdt: "500",
      pv: "500",
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
      earningCapAmount: "500",
      status: "ACTIVE",
      packageItems: {
        create: [
          {
            productDetailId: detail.id,
            qty: 1,
            unitCostPriceUsdt: "100",
            unitMemberPriceUsdt: "500",
            unitRetailPriceUsdt: "500",
            unitPv: "500",
            lineCostPriceUsdt: "100",
            lineMemberPriceUsdt: "500",
            lineRetailPriceUsdt: "500",
            linePv: "500",
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
      organizationPvRate: "500",
      cwReentryAmount: "500",
      personalCarryPv: "500",
      totalAccumulatedPv: "500",
      currentBoardNo: 2,
      currentBoardRoundNo: 1,
      levelRatesSnapshot: JSON.stringify(BOARD_LEVEL_RATES),
      boards: {
        create: [
          {
            boardNo: 1,
            roundNo: 1,
            slotCount: 14,
            openThresholdPv: "500",
            accumulatedPv: "500",
            filledSlots: 14,
            status: "COMPLETED",
            openedAt: new Date(),
            completedAt: new Date(),
          },
          {
            boardNo: 2,
            roundNo: 1,
            slotCount: 14,
            openThresholdPv: "500",
            accumulatedPv: "0",
            filledSlots: 0,
            status: "OPEN",
            openedAt: new Date(),
          },
          {
            boardNo: 3,
            roundNo: 1,
            slotCount: 14,
            openThresholdPv: "500",
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
  const session = await expectOk("/auth/login", {
    method: "POST",
    body: {
      identifier: ADMIN_IDENTIFIER,
      password: ADMIN_PASSWORD,
    },
  });
  const token = session.accessToken;
  const originalMatrixSettings = readMatrixSettingsFile();

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
      referralCode: `ABTREF${RUN_SUFFIX}`.slice(0, 20),
      name: `Auto Bill Target ${RUN_SUFFIX}`,
      email: `auto.bill.target.${RUN_SUFFIX}@example.com`,
      sponsorId: sponsor.id.toString(),
      password: MEMBER_PASSWORD,
    });
    const source = await createMemberRecord({
      memberCode: SOURCE_CODE,
      referralCode: `ABSREF${RUN_SUFFIX}`.slice(0, 20),
      name: `Auto Bill Source ${RUN_SUFFIX}`,
      email: `auto.bill.source.${RUN_SUFFIX}@example.com`,
      sponsorId: target.id.toString(),
      password: MEMBER_PASSWORD,
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

    const createdOrder = await expectOk("/orders", {
      method: "POST",
      token,
      body: {
        userId: source.id.toString(),
        packageId,
      },
    });

    const approval = await expectOk(`/orders/${createdOrder.orderId}/approve`, {
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
      throw new Error("Target cycle not found after approval.");
    }

    const boardOneRoundTwo = cycleAfterApprove.boards.find(
      (board) => board.boardNo === 1 && board.roundNo === 2,
    );
    const reentryEvents = await prisma.matrixAccumulationEvent.findMany({
      where: {
        cycleId: seededCycle.id,
        sourceUserId: target.id,
        sourceType: "REENTRY",
      },
      orderBy: [{ id: "asc" }],
      select: {
        id: true,
        boardId: true,
        creditedPv: true,
        sourcePv: true,
        sourceRoundNo: true,
      },
    });
    const reentryOrders = await prisma.order.findMany({
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
        totalPv: true,
        totalUsdt: true,
      },
    });
    const targetWallet = await prisma.wallet.findUnique({
      where: { userId: target.id },
      select: { withdrawableBalance: true, firmBalance: true },
    });

    const autoBillCreated = reentryOrders.length > 0;
    const seededBoardOneCompleted = seededCycle.boards.some(
      (board) => board.boardNo === 1 && board.roundNo === 1 && board.status === "COMPLETED",
    );
    const seededCarryEnough =
      seededCycle.personalCarryPv &&
      Number(seededCycle.personalCarryPv.toString()) >= 500;
    const expectedAutoBill = seededBoardOneCompleted && seededCarryEnough;

    const result = {
      scenario: "matrix_auto_bill_stop_smoke",
      pass: autoBillCreated,
      outcome: autoBillCreated ? "auto_bill_created" : "should_create_but_missing",
      stopReason: autoBillCreated
        ? "system_created_matrix_reentry_order"
        : "rule_reached_but_no_matrix_reentry_order_found",
      admin: ADMIN_IDENTIFIER,
      targetMemberCode: target.memberCode,
      targetPassword: MEMBER_PASSWORD,
      sourceMemberCode: source.memberCode,
      sourcePassword: MEMBER_PASSWORD,
      sourceOrderId: createdOrder.orderId,
      sourceOrderNo: createdOrder.orderNo,
      matrixProcessing: approval.matrixProcessing ?? null,
      cycleAfterApprove: {
        currentBoardNo: cycleAfterApprove.currentBoardNo,
        currentBoardRoundNo: cycleAfterApprove.currentBoardRoundNo,
        boards: cycleAfterApprove.boards.map((board) => ({
          boardNo: board.boardNo,
          roundNo: board.roundNo,
          status: board.status,
          filledSlots: board.filledSlots,
          slotCount: board.slotCount,
        })),
      },
      boardOneRoundTwo: boardOneRoundTwo
        ? {
            boardId: boardOneRoundTwo.id.toString(),
            status: boardOneRoundTwo.status,
            filledSlots: boardOneRoundTwo.filledSlots,
            slotCount: boardOneRoundTwo.slotCount,
          }
        : null,
      reentryEvents: reentryEvents.map((event) => ({
        id: event.id.toString(),
        boardId: event.boardId ? event.boardId.toString() : null,
        sourceRoundNo: event.sourceRoundNo,
        sourcePv: event.sourcePv.toString(),
        creditedPv: event.creditedPv.toString(),
      })),
      reentryOrders: reentryOrders.map((order) => ({
        id: order.id.toString(),
        orderNo: order.orderNo,
        orderSourceType: order.orderSourceType,
        approvalBatchRef: order.approvalBatchRef,
        approvalStatus: order.approvalStatus,
        status: order.status,
        totalUsdt: order.totalUsdt.toString(),
        totalPv: order.totalPv.toString(),
      })),
      targetWallet: targetWallet
        ? {
            withdrawableBalance: targetWallet.withdrawableBalance.toString(),
            firmBalance: targetWallet.firmBalance.toString(),
          }
        : null,
      ruleReached: expectedAutoBill,
      seededPreconditions: {
        boardOneRoundOneCompleted: seededBoardOneCompleted,
        personalCarryPv: seededCycle.personalCarryPv.toString(),
        organizationPvRate: seededCycle.organizationPvRate.toString(),
        matrixReentryEnabled: true,
      },
    };

    console.log(JSON.stringify(result, null, 2));

    if (!autoBillCreated && expectedAutoBill) {
      process.exitCode = 2;
    }
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
