const { PrismaClient } = require("@prisma/client");
const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const RUN_SUFFIX = Date.now().toString().slice(-8);

async function request(path, options = {}) {
  const target = new URL(`${API_BASE_URL}${path}`);
  const transport = target.protocol === "https:" ? https : http;

  const payload = options.body ? JSON.stringify(options.body) : null;
  const data = await new Promise((resolve, reject) => {
    const requestHandle = transport.request(
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
      (response) => {
        let raw = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode || 500,
            body: raw,
          });
        });
      },
    );

    requestHandle.on("error", reject);

    if (payload) {
      requestHandle.write(payload);
    }

    requestHandle.end();
  });
  const parsed = data.body ? JSON.parse(data.body) : null;

  if (data.statusCode < 200 || data.statusCode >= 300) {
    throw new Error(parsed?.message || `${data.statusCode} request failed`);
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

async function getPackageIdByCode(code) {
  const pkg = await prisma.package.findUnique({
    where: { code },
    select: { id: true },
  });

  if (!pkg) {
    throw new Error(`Package ${code} not found.`);
  }

  return pkg.id.toString();
}

async function getUserIdByCode(memberCode) {
  const user = await prisma.user.findUnique({
    where: { memberCode },
    select: { id: true },
  });

  if (!user) {
    throw new Error(`User ${memberCode} not found.`);
  }

  return user.id.toString();
}

async function createMember(input) {
  return request("/members", {
    method: "POST",
    body: input,
  });
}

async function activatePackage(memberId, packageId, adminToken) {
  return request(`/members/${memberId}/activate-package`, {
    method: "POST",
    token: adminToken,
    body: { packageId },
  });
}

async function createOrder(memberId, packageId, adminToken) {
  return request("/orders", {
    method: "POST",
    token: adminToken,
    body: { userId: memberId, packageId },
  });
}

async function approveOrder(orderId, adminToken) {
  return request(`/orders/${orderId}/approve`, {
    method: "POST",
    token: adminToken,
  });
}

async function processOrder(orderId, adminToken) {
  return request(`/orders/${orderId}/process-approved`, {
    method: "POST",
    token: adminToken,
  });
}

async function createProcessedOrder(memberId, packageId, adminToken) {
  await activatePackage(memberId, packageId, adminToken);
  const order = await createOrder(memberId, packageId, adminToken);
  await approveOrder(order.orderId, adminToken);
  await processOrder(order.orderId, adminToken);
  return order.orderId;
}

function toDateOnly(offsetDays) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

async function scenarioDirectNormal(adminToken, packageId) {
  const buyer = await createMember({
    memberCode: `SCN1B${RUN_SUFFIX}`,
    name: "Scenario Direct Buyer",
    email: `scn1.${RUN_SUFFIX}@example.com`,
    ref: "BOB",
  });
  const orderId = await createProcessedOrder(buyer.memberId, packageId, adminToken);
  const direct = await prisma.commissionLedger.findFirst({
    where: {
      orderId: BigInt(orderId),
      commissionType: "DIRECT",
    },
    select: {
      status: true,
      commissionAmount: true,
      beneficiaryUser: {
        select: {
          memberCode: true,
        },
      },
    },
  });

  const pass =
    direct?.status === "APPROVED" &&
    direct?.beneficiaryUser?.memberCode === "BOB";

  return {
    scenario: "direct_normal",
    pass,
    expected: "direct commission approved to BOB",
    actual: {
      orderId,
      status: direct?.status || null,
      beneficiary: direct?.beneficiaryUser?.memberCode || null,
      amount: direct?.commissionAmount?.toString() || null,
    },
  };
}

async function scenarioUniCompression(adminToken, packageId) {
  const root = await createMember({
    memberCode: `SCN2R${RUN_SUFFIX}`,
    name: "Scenario Uni Root",
    email: `scn2.root.${RUN_SUFFIX}@example.com`,
    sponsorCode: "ALICE",
  });
  await activatePackage(root.memberId, packageId, adminToken);

  const middle = await createMember({
    memberCode: `SCN2M${RUN_SUFFIX}`,
    name: "Scenario Uni Inactive Middle",
    email: `scn2.middle.${RUN_SUFFIX}@example.com`,
    sponsorCode: root.memberCode,
  });

  const buyer = await createMember({
    memberCode: `SCN2B${RUN_SUFFIX}`,
    name: "Scenario Uni Buyer",
    email: `scn2.buyer.${RUN_SUFFIX}@example.com`,
    sponsorCode: middle.memberCode,
  });
  const orderId = await createProcessedOrder(buyer.memberId, packageId, adminToken);

  const uniEntries = await prisma.commissionLedger.findMany({
    where: {
      orderId: BigInt(orderId),
      commissionType: "UNI",
    },
    orderBy: [{ levelNo: "asc" }],
    select: {
      levelNo: true,
      status: true,
      beneficiaryUser: {
        select: {
          memberCode: true,
        },
      },
      companyFallbackReason: true,
    },
  });

  const levelOne = uniEntries.find((entry) => entry.levelNo === 1);
  const pass =
    levelOne?.status === "APPROVED" &&
    levelOne?.beneficiaryUser?.memberCode === root.memberCode;

  return {
    scenario: "uni_compression",
    pass,
    expected: "level 1 uni skips inactive middle and pays active root",
    actual: {
      orderId,
      levelOneBeneficiary: levelOne?.beneficiaryUser?.memberCode || null,
      levelOneStatus: levelOne?.status || null,
      levels: uniEntries.map((entry) => ({
        level: entry.levelNo,
        beneficiary: entry.beneficiaryUser?.memberCode || null,
        status: entry.status,
        fallbackReason: entry.companyFallbackReason,
      })),
    },
  };
}

async function scenarioCapFallback(adminToken, packageId) {
  const sponsor = await createMember({
    memberCode: `SCN3S${RUN_SUFFIX}`,
    name: "Scenario Cap Sponsor",
    email: `scn3.sponsor.${RUN_SUFFIX}@example.com`,
    sponsorCode: "ALICE",
  });
  await activatePackage(sponsor.memberId, packageId, adminToken);

  const sponsorCycle = await prisma.memberPackageCycle.findFirst({
    where: { userId: BigInt(sponsor.memberId) },
    orderBy: [{ cycleNo: "desc" }],
    select: {
      id: true,
      earningCap: true,
    },
  });

  await prisma.memberPackageCycle.update({
    where: { id: sponsorCycle.id },
    data: {
      earnedTotalInCycle: sponsorCycle.earningCap,
    },
  });

  const buyer = await createMember({
    memberCode: `SCN3B${RUN_SUFFIX}`,
    name: "Scenario Cap Buyer",
    email: `scn3.buyer.${RUN_SUFFIX}@example.com`,
    sponsorCode: sponsor.memberCode,
  });
  const orderId = await createProcessedOrder(buyer.memberId, packageId, adminToken);

  const direct = await prisma.commissionLedger.findFirst({
    where: {
      orderId: BigInt(orderId),
      commissionType: "DIRECT",
    },
    select: {
      status: true,
      companyFallbackReason: true,
    },
  });
  const fallback = await prisma.companyBonusLedger.findFirst({
    where: {
      sourceType: "DIRECT",
      sourceRefId: BigInt(orderId),
    },
    select: {
      reason: true,
      amount: true,
    },
  });

  const pass =
    direct?.status === "FALLBACK" &&
    direct?.companyFallbackReason === "cap_blocked_all_receivable_cycles" &&
    fallback?.reason === "cap_blocked_all_receivable_cycles";

  return {
    scenario: "cap_fallback",
    pass,
    expected: "direct commission falls back to company when sponsor cycle is capped",
    actual: {
      orderId,
      directStatus: direct?.status || null,
      directReason: direct?.companyFallbackReason || null,
      companyFallbackReason: fallback?.reason || null,
      companyFallbackAmount: fallback?.amount?.toString() || null,
    },
  };
}

async function scenarioPoolPositive(adminToken) {
  const poolDate = toDateOnly(0);
  const closeResult = await request(`/pool/${poolDate}/close`, {
    method: "POST",
    token: adminToken,
  });
  const cycle = await prisma.dailyPoolCycle.findFirst({
    where: { cycleDate: new Date(`${poolDate}T00:00:00.000Z`) },
    select: {
      eligibleMemberCount: true,
      payoutPerMember: true,
      companyFallbackAmount: true,
    },
  });
  const payouts = await prisma.dailyPoolPayout.findMany({
    where: {
      cycle: {
        cycleDate: new Date(`${poolDate}T00:00:00.000Z`),
      },
    },
    select: {
      payoutAmount: true,
      status: true,
    },
  });

  const pass =
    Number(closeResult.eligibleMemberCount) > 0 &&
    payouts.length > 0 &&
    cycle?.eligibleMemberCount > 0;

  return {
    scenario: "pool_positive",
    pass,
    expected: "pool closes with eligible recipients and payout rows",
    actual: {
      poolDate,
      eligibleMemberCount: closeResult.eligibleMemberCount,
      payoutPerMember: closeResult.payoutPerMember,
      payoutRows: payouts.length,
      companyFallbackAmount: cycle?.companyFallbackAmount?.toString() || null,
    },
  };
}

async function scenarioPoolNoEligible(adminToken) {
  const poolDate = toDateOnly(70);
  const daveId = await getUserIdByCode("DAVE");

  await prisma.order.create({
    data: {
      orderNo: `ORD-SCN5-${RUN_SUFFIX}`,
      userId: BigInt(daveId),
      subtotalUsdt: "100",
      totalUsdt: "100",
      totalPv: "100",
      paidAt: new Date(`${poolDate}T08:00:00.000Z`),
      approvedAt: new Date(`${poolDate}T08:30:00.000Z`),
      approvalStatus: "APPROVED",
      status: "APPROVED",
    },
  });

  const result = await request(`/pool/${poolDate}/close`, {
    method: "POST",
    token: adminToken,
  });

  const pass =
    Number(result.eligibleMemberCount) === 0 &&
    result.companyFallbackAmount === result.poolFund;

  return {
    scenario: "pool_no_eligible",
    pass,
    expected: "pool fully falls back to company when no eligible members exist",
    actual: {
      poolDate,
      eligibleMemberCount: result.eligibleMemberCount,
      poolFund: result.poolFund,
      companyFallbackAmount: result.companyFallbackAmount,
    },
  };
}

async function main() {
  const adminToken = await loginAdmin();
  const packageId = await getPackageIdByCode("STARTER");

  const results = [];
  results.push(await scenarioDirectNormal(adminToken, packageId));
  results.push(await scenarioUniCompression(adminToken, packageId));
  results.push(await scenarioCapFallback(adminToken, packageId));
  results.push(await scenarioPoolPositive(adminToken));
  results.push(await scenarioPoolNoEligible(adminToken));

  const passed = results.filter((result) => result.pass).length;

  process.stdout.write(
    `${JSON.stringify(
      {
        passed,
        total: results.length,
        results,
      },
      null,
      2,
    )}\n`,
  );
}

main()
  .catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
