const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");

const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/poolproject?schema=public";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const ADMIN_IDENTIFIER =
  process.env.TIMELINE_TEST_ADMIN_IDENTIFIER || "TH0000013";
const ADMIN_PASSWORD =
  process.env.TIMELINE_TEST_ADMIN_PASSWORD || "a1a1a1";
const PRODUCT_DETAIL_ID =
  process.env.TIMELINE_TEST_PRODUCT_DETAIL_ID || "58";
const PRODUCT_CODE = process.env.TIMELINE_TEST_PRODUCT_CODE || "TEST1000";
const SOURCE_TAG =
  process.env.TIMELINE_TEST_SOURCE_TAG || "timeline-test-product-2026-05-02";
const LIMIT = Number.parseInt(process.env.TIMELINE_TEST_LIMIT || "0", 10) || 0;
const OFFSET = Number.parseInt(process.env.TIMELINE_TEST_OFFSET || "0", 10) || 0;
const STEP_DELAY_MS =
  Number.parseInt(process.env.TIMELINE_TEST_STEP_DELAY_MS || "300", 10) || 300;
const COMMISSION_SETTINGS_PATH =
  process.env.TIMELINE_TEST_COMMISSION_SETTINGS_PATH ||
  "runtime/commission-settings.json";
const MATRIX_SETTINGS_PATH =
  process.env.TIMELINE_TEST_MATRIX_SETTINGS_PATH ||
  "runtime/matrix-settings.json";

function request(path, options = {}) {
  const target = new URL(`${API_BASE_URL}${path}`);
  const transport = target.protocol === "https:" ? https : http;
  const payload = options.body ? JSON.stringify(options.body) : null;

  return new Promise((resolve, reject) => {
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
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function expectOk(path, options = {}, retry = 0) {
  const response = await request(path, options);
  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.body;
  }

  if (response.statusCode === 429 && retry < 15) {
    await sleep(1000 * (retry + 1));
    return expectOk(path, options, retry + 1);
  }

  throw new Error(
    `${options.method || "GET"} ${path} failed with ${response.statusCode}: ${JSON.stringify(response.body)}`,
  );
}

async function login() {
  return expectOk("/auth/login", {
    method: "POST",
    body: {
      identifier: ADMIN_IDENTIFIER,
      password: ADMIN_PASSWORD,
    },
  });
}

function loadRuntimeSnapshots() {
  return {
    commissionSettingsSnapshot: fs.readFileSync(
      COMMISSION_SETTINGS_PATH,
      "utf8",
    ).trim(),
    matrixSettingsSnapshot: fs.readFileSync(MATRIX_SETTINGS_PATH, "utf8").trim(),
  };
}

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function toBangkokDateOnly(value) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function toBangkokNoonIso(dateOnly) {
  const [year, month, day] = dateOnly
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  return new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0)).toISOString();
}

async function loadProduct() {
  const product = await prisma.productDetail.findFirst({
    where: {
      id: BigInt(PRODUCT_DETAIL_ID),
      code: PRODUCT_CODE,
      status: "ACTIVE",
    },
    select: {
      id: true,
      code: true,
      name: true,
      memberPriceUsdt: true,
      pv: true,
    },
  });

  if (!product) {
    throw new Error(
      `Active product detail ${PRODUCT_DETAIL_ID}/${PRODUCT_CODE} not found.`,
    );
  }

  return {
    id: product.id.toString(),
    code: product.code,
    name: product.name,
    memberPriceUsdt: product.memberPriceUsdt.toString(),
    pv: product.pv.toString(),
  };
}

async function loadExistingTaggedOrderUsers() {
  const rows = await prisma.order.findMany({
    where: {
      shippingAddressNote: {
        contains: SOURCE_TAG,
      },
    },
    select: {
      userId: true,
    },
  });

  return new Set(rows.map((row) => row.userId.toString()));
}

async function loadTimelineMembers() {
  const taggedUsers = await loadExistingTaggedOrderUsers();
  const users = await prisma.user.findMany({
    where: {
      isAdmin: false,
    },
    orderBy: [{ createdAt: "asc" }, { memberCode: "asc" }],
    select: {
      id: true,
      memberCode: true,
      createdAt: true,
      orders: {
        where: {
          approvalStatus: "APPROVED",
          orderSourceType: "NORMAL",
        },
        select: {
          id: true,
          shippingAddressNote: true,
        },
      },
    },
  });

  const remaining = users
    .filter((user) => !taggedUsers.has(user.id.toString()))
    .filter((user) => user.orders.length === 0);

  return OFFSET > 0 || LIMIT > 0
    ? remaining.slice(OFFSET, LIMIT > 0 ? OFFSET + LIMIT : undefined)
    : remaining;
}

function markOrderApprovedForRuntime(input) {
  const approvedAtQuoted = sqlLiteral(input.approvedAtIso);
  const commissionSnapshotQuoted = sqlLiteral(input.commissionSettingsSnapshot);
  const matrixSnapshotQuoted = sqlLiteral(input.matrixSettingsSnapshot);

  return prisma.$executeRawUnsafe(`
    update "Order"
    set "paidAt" = ${approvedAtQuoted}::timestamptz,
        "approvedAt" = ${approvedAtQuoted}::timestamptz,
        "commissionSettingsSnapshot" = ${commissionSnapshotQuoted},
        "matrixSettingsSnapshot" = ${matrixSnapshotQuoted},
        "approvalStatus" = 'APPROVED',
        "status" = 'APPROVED',
        "updatedAt" = ${approvedAtQuoted}::timestamptz
    where "id" = ${sqlLiteral(input.orderId)}::bigint
  `);
}

async function backfillOrderDates(orderId, approvedAtIso) {
  const quoted = sqlLiteral(approvedAtIso);

  await prisma.$executeRawUnsafe(`
    update "Order"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz,
        "paidAt" = coalesce("paidAt", ${quoted}::timestamptz),
        "approvedAt" = ${quoted}::timestamptz
    where "id" = ${sqlLiteral(orderId)}::bigint
  `);

  await prisma.$executeRawUnsafe(`
    update "OrderItem"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "orderId" = ${sqlLiteral(orderId)}::bigint
  `);

  await prisma.$executeRawUnsafe(`
    update "CommissionLedger"
    set "evaluationAt" = ${quoted}::timestamptz,
        "finalizeCheckedAt" = ${quoted}::timestamptz,
        "finalizedAt" = ${quoted}::timestamptz,
        "releasedToWithdrawableAt" = case
          when "releasedToWithdrawableAt" is not null then ${quoted}::timestamptz
          else null
        end,
        "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "orderId" = ${sqlLiteral(orderId)}::bigint
  `);

  await prisma.$executeRawUnsafe(`
    update "CompanyBonusLedger"
    set "createdAt" = ${quoted}::timestamptz
    where "sourceRefId" = ${sqlLiteral(orderId)}::bigint
  `);

  await prisma.$executeRawUnsafe(`
    update "WalletTransaction"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where ("refType" = 'COMMISSION' and "refId" in (
      select "id" from "CommissionLedger" where "orderId" = ${sqlLiteral(orderId)}::bigint
    ))
       or ("refType" = 'ORDER' and "refId" = ${sqlLiteral(orderId)}::bigint)
  `);

  await prisma.$executeRawUnsafe(`
    update "MemberPackageCycle"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "userId" = (
      select "userId" from "Order" where "id" = ${sqlLiteral(orderId)}::bigint
    )
      and "activatedAt" = ${quoted}::timestamptz
  `);

  await prisma.$executeRawUnsafe(`
    update "CapBucket"
    set "sourceApprovedAt" = coalesce("sourceApprovedAt", ${quoted}::timestamptz),
        "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "sourceOrderId" = ${sqlLiteral(orderId)}::bigint
  `);

  await prisma.$executeRawUnsafe(`
    update "CapLedger"
    set "postedAt" = coalesce("postedAt", ${quoted}::timestamptz),
        "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "sourceOrderId" = ${sqlLiteral(orderId)}::bigint
       or "relatedOrderId" = ${sqlLiteral(orderId)}::bigint
  `);

  await prisma.$executeRawUnsafe(`
    update "BuybackEvent"
    set "createdAt" = ${quoted}::timestamptz
    where "referenceId" = ${sqlLiteral(orderId)}
  `);
}

async function createPendingOrder(input) {
  return expectOk("/orders", {
    method: "POST",
    token: input.token,
    body: {
      userId: input.userId,
      items: [{ productDetailId: PRODUCT_DETAIL_ID, quantity: "1" }],
      fulfillmentMethod: "branch_pickup",
      pickupBranchName: "Timeline Test Product",
      pickupBranchNote: `${SOURCE_TAG}|member=${input.memberCode}|date=${input.settlementDate}|seq=${input.sequenceNo}`,
      pickupRecipientName: input.memberCode,
      pickupPhone: "0800000000",
      discountWalletAmount: "0",
      shoppingWalletAmount: "0",
      firmWalletAmount: "0",
      cashPaymentMethod: "bank_transfer",
    },
  });
}

async function processHistoricalApprovedOrder(input) {
  await markOrderApprovedForRuntime({
    orderId: input.orderId,
    approvedAtIso: input.approvedAtIso,
    commissionSettingsSnapshot: input.runtimeSnapshots.commissionSettingsSnapshot,
    matrixSettingsSnapshot: input.runtimeSnapshots.matrixSettingsSnapshot,
  });

  const processed = await expectOk(`/orders/${input.orderId}/process-approved`, {
    method: "POST",
    token: input.token,
  });

  await backfillOrderDates(input.orderId, input.approvedAtIso);
  return processed;
}

async function processEndOfDay(settlementDate, token) {
  return expectOk(`/commissions/end-of-day/${settlementDate}/process`, {
    method: "POST",
    token,
  });
}

async function scaffoldTeamSettlement(settlementDate, token) {
  return expectOk(`/commissions/team-settlement-batches/${settlementDate}/scaffold`, {
    method: "POST",
    token,
  });
}

async function main() {
  await expectOk("/health");
  const product = await loadProduct();
  const members = await loadTimelineMembers();
  const runtimeSnapshots = loadRuntimeSnapshots();

  if (!APPLY) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          apply: false,
          sourceTag: SOURCE_TAG,
          product,
          memberCount: members.length,
          sample: members.slice(0, 30).map((member, index) => ({
            memberCode: member.memberCode,
            userId: member.id.toString(),
            signupDate: toBangkokDateOnly(member.createdAt),
            sequenceNo: index + 1,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  const session = await login();
  const orderResults = [];
  const dayCounts = new Map();

  for (const [index, member] of members.entries()) {
    const settlementDate = toBangkokDateOnly(member.createdAt);
    const approvedAtIso = toBangkokNoonIso(settlementDate);
    const createdOrder = await createPendingOrder({
      token: session.accessToken,
      userId: member.id.toString(),
      memberCode: member.memberCode,
      settlementDate,
      sequenceNo: index + 1,
    });
    const processed = await processHistoricalApprovedOrder({
      token: session.accessToken,
      orderId: createdOrder.orderId,
      approvedAtIso,
      runtimeSnapshots,
    });

    dayCounts.set(settlementDate, (dayCounts.get(settlementDate) ?? 0) + 1);
    orderResults.push({
      memberCode: member.memberCode,
      userId: member.id.toString(),
      signupDate: settlementDate,
      orderId: createdOrder.orderId,
      orderNo: createdOrder.orderNo,
      directStatus: processed.commissionDrafts?.directStatus ?? null,
      directCount: processed.commissionDrafts?.directCount ?? 0,
      hasFallback: processed.commissionDrafts?.hasFallback ?? false,
      walletPostingCount: processed.walletPostingInputs?.length ?? 0,
    });

    await sleep(STEP_DELAY_MS);
  }

  const settlementDates = Array.from(dayCounts.keys()).sort();
  const dayResults = [];

  for (const settlementDate of settlementDates) {
    const scaffold = await scaffoldTeamSettlement(
      settlementDate,
      session.accessToken,
    );
    const result = await processEndOfDay(settlementDate, session.accessToken);
    dayResults.push({
      settlementDate,
      orderCount: dayCounts.get(settlementDate) ?? 0,
      teamBatchStatus: scaffold.batchStatus ?? null,
      teamTotalUsers: scaffold.totalUsers ?? null,
      teamTotalPayablePv: scaffold.totalPayablePv ?? null,
      teamTotalBonusAmount: scaffold.totalBonusAmount ?? null,
      teamProcessedCount:
        result.teamSettlement?.processedItemCount ??
        result.teamSettlement?.processedCount ??
        null,
      poolEligibleMemberCount: result.pool?.eligibleMemberCount ?? null,
      poolPayoutPerMember: result.pool?.payoutPerMember ?? null,
      poolCompanyFallbackAmount: result.pool?.companyFallbackAmount ?? null,
      poolReprocessed: result.pool?.reprocessed ?? false,
    });
    await sleep(STEP_DELAY_MS);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        apply: true,
        sourceTag: SOURCE_TAG,
        product,
        memberCount: members.length,
        settlementDateCount: settlementDates.length,
        settlementDates,
        dayResults,
        orderSample: orderResults.slice(0, 50),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
