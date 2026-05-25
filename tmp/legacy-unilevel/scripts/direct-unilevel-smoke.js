// Historical only: legacy unilevel sandbox script.
// Not part of the active commission-calculation scope.
// Active scope only:
// - direct
// - team_2leg / team_3leg
// - matching
// - pool
// Do not use this script for active implementation or verification unless a
// later approved decision explicitly restores it.

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
const ORDER_NO = `ORD-DIRECT-UNI-${RUN_SUFFIX}`;
const ROOT_CODE = `DUSR${RUN_SUFFIX}A`;
const MIDDLE_CODE = `DUSR${RUN_SUFFIX}B`;
const BUYER_CODE = `DUSR${RUN_SUFFIX}C`;
const ROOT_EMAIL = `direct.root.${RUN_SUFFIX}@example.com`;
const MIDDLE_EMAIL = `direct.middle.${RUN_SUFFIX}@example.com`;
const BUYER_EMAIL = `direct.buyer.${RUN_SUFFIX}@example.com`;
const MEMBER_PASSWORD = "smokepass1234";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
          ...(options.token
            ? { Authorization: `Bearer ${options.token}` }
            : {}),
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

async function getActivePackage() {
  const starter = await prisma.package.findUnique({
    where: { code: "STARTER" },
    select: { id: true, status: true, pv: true },
  });

  if (starter?.status === "ACTIVE") {
    return {
      packageId: starter.id.toString(),
      pv: starter.pv.toString(),
    };
  }

  const pkg = await prisma.package.findFirst({
    where: { status: "ACTIVE" },
    orderBy: [{ id: "asc" }],
    select: { id: true, pv: true },
  });

  if (!pkg) {
    throw new Error("No active package found for direct/unilevel smoke test.");
  }

  return {
    packageId: pkg.id.toString(),
    pv: pkg.pv.toString(),
  };
}

async function waitForWalletRows(commissionIds) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const walletRows = await prisma.walletTransaction.findMany({
      where: {
        refType: "COMMISSION",
        refId: { in: commissionIds },
      },
      orderBy: [{ id: "asc" }],
      select: {
        id: true,
        txType: true,
        amount: true,
        refId: true,
        user: {
          select: {
            memberCode: true,
          },
        },
      },
    });

    if (walletRows.length >= commissionIds.length) {
      return walletRows;
    }

    await sleep(500);
  }

  return [];
}

async function main() {
  await request("/health");
  const token = await loginAdmin();
  const activePackage = await getActivePackage();
  const originalSettings = await request("/settings/commissions", {
    method: "GET",
    token,
  });

  await request("/settings/commissions", {
    method: "PUT",
    token,
    body: {
      directLevelRates: ["0.1"],
      uniLevelRates: ["0.05", "0.03"],
      poolRate: "0",
      cashbackRate: "0",
    },
  });

  let orderId = null;
  let rootMemberId = null;
  let middleMemberId = null;
  let buyerMemberId = null;

  try {
    const root = await request("/members", {
      method: "POST",
      body: {
        memberCode: ROOT_CODE,
        name: `Direct Root ${RUN_SUFFIX}`,
        email: ROOT_EMAIL,
        sponsorCode: "ALICE",
        password: MEMBER_PASSWORD,
      },
    });
    rootMemberId = root.memberId;

    const middle = await request("/members", {
      method: "POST",
      body: {
        memberCode: MIDDLE_CODE,
        name: `Direct Middle ${RUN_SUFFIX}`,
        email: MIDDLE_EMAIL,
        sponsorCode: ROOT_CODE,
        password: MEMBER_PASSWORD,
      },
    });
    middleMemberId = middle.memberId;

    const buyer = await request("/members", {
      method: "POST",
      body: {
        memberCode: BUYER_CODE,
        name: `Direct Buyer ${RUN_SUFFIX}`,
        email: BUYER_EMAIL,
        sponsorCode: MIDDLE_CODE,
        password: MEMBER_PASSWORD,
      },
    });
    buyerMemberId = buyer.memberId;

    await request(`/members/${rootMemberId}/activate-package`, {
      method: "POST",
      token,
      body: { packageId: activePackage.packageId },
    });

    await request(`/members/${middleMemberId}/activate-package`, {
      method: "POST",
      token,
      body: { packageId: activePackage.packageId },
    });

    const order = await prisma.order.create({
      data: {
        orderNo: ORDER_NO,
        userId: BigInt(buyerMemberId),
        subtotalUsdt: activePackage.pv,
        totalUsdt: activePackage.pv,
        totalPv: activePackage.pv,
        paidAt: new Date(),
        approvedAt: new Date(),
        commissionSettingsSnapshot: JSON.stringify({
          directLevelRates: ["0.1"],
          uniLevelRates: ["0.05", "0.03"],
          poolRate: "0",
          cashbackRate: "0",
        }),
        approvalStatus: "APPROVED",
        status: "APPROVED",
        orderItems: {
          create: [
            {
              packageId: BigInt(activePackage.packageId),
              qty: 1,
              unitPriceUsdt: activePackage.pv,
              unitPv: activePackage.pv,
              poolRateMode: "DEFAULT_50_PERCENT",
              unitPoolRate: "0",
              lineTotalUsdt: activePackage.pv,
              lineTotalPv: activePackage.pv,
            },
          ],
        },
      },
      select: {
        id: true,
      },
    });
    orderId = order.id.toString();

    const processed = await request(`/orders/${orderId}/process-approved`, {
      method: "POST",
      token,
    });

    const ledgerRows = await prisma.commissionLedger.findMany({
      where: {
        orderId: BigInt(orderId),
        commissionType: { in: ["DIRECT", "UNI"] },
      },
      orderBy: [{ commissionType: "asc" }, { levelNo: "asc" }],
      select: {
        id: true,
        commissionType: true,
        levelNo: true,
        rate: true,
        basePv: true,
        commissionAmount: true,
        status: true,
        beneficiaryUser: {
          select: {
            memberCode: true,
          },
        },
      },
    });

    const walletRows = ledgerRows.length
      ? await waitForWalletRows(ledgerRows.map((row) => row.id))
      : [];

    const directRows = ledgerRows.filter((row) => row.commissionType === "DIRECT");
    const uniRows = ledgerRows.filter((row) => row.commissionType === "UNI");
    const directRow = directRows[0];
    const uniLevelOne = uniRows.find((row) => row.levelNo === 1);
    const uniLevelTwo = uniRows.find((row) => row.levelNo === 2);

    const expectedDirectAmount = (
      Number(activePackage.pv) * 0.1
    ).toFixed(8).replace(/\.?0+$/, "");
    const expectedUniLevelOneAmount = (
      Number(activePackage.pv) * 0.05
    ).toFixed(8).replace(/\.?0+$/, "");
    const expectedUniLevelTwoAmount = (
      Number(activePackage.pv) * 0.03
    ).toFixed(8).replace(/\.?0+$/, "");

    if (processed.commissionDrafts.directCount !== 1) {
      throw new Error(`Expected directCount = 1, found ${processed.commissionDrafts.directCount}.`);
    }

    if (processed.commissionDrafts.uniCount !== 2) {
      throw new Error(`Expected uniCount = 2, found ${processed.commissionDrafts.uniCount}.`);
    }

    if (directRows.length !== 1) {
      throw new Error(`Expected 1 direct ledger row, found ${directRows.length}.`);
    }

    if (uniRows.length !== 2) {
      throw new Error(`Expected 2 uni ledger rows, found ${uniRows.length}.`);
    }

    if (walletRows.length !== 3) {
      throw new Error(`Expected 3 wallet rows, found ${walletRows.length}.`);
    }

    if (
      directRow?.status !== "APPROVED" ||
      directRow?.beneficiaryUser?.memberCode !== MIDDLE_CODE ||
      directRow?.commissionAmount?.toString() !== expectedDirectAmount
    ) {
      throw new Error("Direct commission verification failed.");
    }

    if (
      uniLevelOne?.status !== "APPROVED" ||
      uniLevelOne?.beneficiaryUser?.memberCode !== MIDDLE_CODE ||
      uniLevelOne?.commissionAmount?.toString() !== expectedUniLevelOneAmount
    ) {
      throw new Error("Unilevel level 1 verification failed.");
    }

    if (
      uniLevelTwo?.status !== "APPROVED" ||
      uniLevelTwo?.beneficiaryUser?.memberCode !== ROOT_CODE ||
      uniLevelTwo?.commissionAmount?.toString() !== expectedUniLevelTwoAmount
    ) {
      throw new Error("Unilevel level 2 verification failed.");
    }

    const walletSummary = walletRows.map((row) => ({
      memberCode: row.user.memberCode,
      txType: row.txType,
      amount: row.amount.toString(),
      refId: row.refId.toString(),
    }));

    console.log(
      JSON.stringify(
        {
          scenario: "direct_unilevel_runtime_smoke",
          pass: true,
          orderId,
          packagePv: activePackage.pv,
          expected: {
            direct: expectedDirectAmount,
            uniLevelOne: expectedUniLevelOneAmount,
            uniLevelTwo: expectedUniLevelTwoAmount,
          },
          actual: {
            processedCounts: {
              directCount: processed.commissionDrafts.directCount,
              uniCount: processed.commissionDrafts.uniCount,
            },
            ledgerRows: ledgerRows.map((row) => ({
              commissionType: row.commissionType,
              levelNo: row.levelNo,
              beneficiary: row.beneficiaryUser?.memberCode || null,
              rate: row.rate.toString(),
              basePv: row.basePv.toString(),
              amount: row.commissionAmount.toString(),
              status: row.status,
            })),
            walletRows: walletSummary,
          },
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
        directLevelRates:
          originalSettings.directLevelRates && originalSettings.directLevelRates.length > 0
            ? originalSettings.directLevelRates
            : originalSettings.directRate
              ? [originalSettings.directRate]
              : ["0.2"],
        uniLevelRates:
          originalSettings.uniLevelRates && originalSettings.uniLevelRates.length > 0
            ? originalSettings.uniLevelRates
            : ["0.05"],
        poolRate: originalSettings.poolRate || "0.5",
        cashbackRate: originalSettings.cashbackRate || "0",
      },
    }).catch(() => null);
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
