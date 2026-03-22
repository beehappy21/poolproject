const { PrismaClient } = require("@prisma/client");
const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const CASHBACK_RATE = process.env.SMOKE_CASHBACK_RATE || "0.05";
const RUN_SUFFIX = Date.now().toString().slice(-8);
const MEMBER_CODE = `CASHSMK${RUN_SUFFIX}`;
const MEMBER_EMAIL = `cashback.${RUN_SUFFIX}@example.com`;
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
    throw new Error("No active package found for cashback smoke test.");
  }

  return pkg.id.toString();
}

async function waitForWalletRows(commissionIds) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
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
        userId: true,
      },
    });

    if (walletRows.length > 0) {
      return walletRows;
    }

    await sleep(200);
  }

  return [];
}

function zeroRateArray(source, fallbackLength) {
  if (Array.isArray(source) && source.length > 0) {
    return source.map(() => "0");
  }

  return Array.from({ length: fallbackLength }, () => "0");
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
      cashbackRate: CASHBACK_RATE,
    },
  });

  let createdMemberId = null;
  let orderId = null;

  try {
    const member = await request("/members", {
      method: "POST",
      body: {
        memberCode: MEMBER_CODE,
        name: `Cashback Smoke ${RUN_SUFFIX}`,
        email: MEMBER_EMAIL,
        sponsorCode: "ALICE",
        password: MEMBER_PASSWORD,
      },
    });
    createdMemberId = member.memberId;

    await request(`/members/${createdMemberId}/activate-package`, {
      method: "POST",
      token,
      body: { packageId },
    });

    const order = await request("/orders", {
      method: "POST",
      token,
      body: {
        userId: createdMemberId,
        packageId,
      },
    });
    orderId = order.orderId;

    const approved = await request(`/orders/${orderId}/approve`, {
      method: "POST",
      token,
    });
    const processed = await request(`/orders/${orderId}/process-approved`, {
      method: "POST",
      token,
    });
    const reprocessed = await request(`/orders/${orderId}/reprocess`, {
      method: "POST",
      token,
    });

    const ledgerRows = await prisma.commissionLedger.findMany({
      where: { orderId: BigInt(orderId) },
      orderBy: [{ id: "asc" }],
      select: {
        id: true,
        commissionType: true,
        status: true,
        beneficiaryUserId: true,
        rate: true,
        basePv: true,
        commissionAmount: true,
      },
    });

    const cashbackRows = ledgerRows.filter(
      (row) => row.commissionType === "CASHBACK",
    );
    const walletRows = cashbackRows.length
      ? await waitForWalletRows(cashbackRows.map((row) => row.id))
      : [];

    if (processed.commissionDrafts.cashbackCount !== 1) {
      throw new Error("Expected cashbackCount = 1.");
    }

    if (processed.commissionDrafts.directCount !== 0) {
      throw new Error("Expected directCount = 0.");
    }

    if (processed.commissionDrafts.uniCount !== 0) {
      throw new Error("Expected uniCount = 0.");
    }

    if (cashbackRows.length !== 1) {
      throw new Error(`Expected 1 cashback ledger row, found ${cashbackRows.length}.`);
    }

    if (walletRows.length !== 1) {
      throw new Error(`Expected 1 cashback wallet row, found ${walletRows.length}.`);
    }

    const cashbackRow = cashbackRows[0];
    const walletRow = walletRows[0];

    if (cashbackRow.status !== "APPROVED") {
      throw new Error(`Expected cashback ledger status APPROVED, found ${cashbackRow.status}.`);
    }

    if (walletRow.txType !== "CASHBACK_CREDIT") {
      throw new Error(`Expected CASHBACK_CREDIT wallet row, found ${walletRow.txType}.`);
    }

    process.stdout.write(
      JSON.stringify(
        {
          orderId,
          memberId: createdMemberId,
          approvedAt: approved.approvedAt,
          processed: {
            cashbackCount: processed.commissionDrafts.cashbackCount,
            directCount: processed.commissionDrafts.directCount,
            uniCount: processed.commissionDrafts.uniCount,
          },
          reprocessed: {
            cashbackCount: reprocessed.commissionDrafts.cashbackCount,
            directCount: reprocessed.commissionDrafts.directCount,
            uniCount: reprocessed.commissionDrafts.uniCount,
            walletPostingCount: reprocessed.walletPostingInputs.length,
          },
          cashbackLedger: {
            commissionId: cashbackRow.id.toString(),
            beneficiaryUserId: cashbackRow.beneficiaryUserId?.toString() || null,
            rate: cashbackRow.rate.toString(),
            basePv: cashbackRow.basePv.toString(),
            amount: cashbackRow.commissionAmount.toString(),
          },
          cashbackWallet: {
            walletTransactionId: walletRow.id.toString(),
            userId: walletRow.userId.toString(),
            txType: walletRow.txType,
            amount: walletRow.amount.toString(),
          },
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await request("/settings/commissions", {
      method: "PUT",
      token,
      body: {
        directLevelRates:
          originalSettings.directLevelRates && originalSettings.directLevelRates.length > 0
            ? originalSettings.directLevelRates
            : ["0.2"],
        uniLevelRates:
          originalSettings.uniLevelRates && originalSettings.uniLevelRates.length > 0
            ? originalSettings.uniLevelRates
            : ["0.05", "0.05", "0.05", "0.05", "0.05"],
        poolRate: originalSettings.poolRate || "0.5",
        cashbackRate: originalSettings.cashbackRate || "0",
      },
    });
  }
}

main()
  .catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
