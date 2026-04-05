const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");
const { randomBytes, scryptSync } = require("node:crypto");

const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const SOURCE_TAG = process.env.FULL_SYSTEM_SOURCE_TAG || "full-system-ready";
const HELPER_CODE = process.env.FULL_SYSTEM_HELPER_CODE || "TH0000013";
const ROOT_CODE = process.env.FULL_SYSTEM_ROOT_CODE || "B30001";
const MEMBER_PASSWORD =
  process.env.FULL_SYSTEM_MEMBER_PASSWORD || "a1a1a1";
const MAX_LEVEL = Number.parseInt(
  process.env.FULL_SYSTEM_TREE_DEPTH || "7",
  10,
);
const POOL_DATE = process.env.FULL_SYSTEM_POOL_DATE || "2026-04-05";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

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
  return expectOk("/auth/login", {
    method: "POST",
    body: { identifier, password },
  });
}

function code(n) {
  return `B3${String(n).padStart(4, "0")}`;
}

function addDays(dateOnly, days) {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toBangkokNoonIso(dateOnly) {
  const [year, month, day] = dateOnly
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  return new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0)).toISOString();
}

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
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
    update "MatrixAccumulationEvent"
    set "createdAt" = ${quoted}::timestamptz
    where "sourceOrderId" = ${sqlLiteral(orderId)}::bigint
  `);
  await prisma.$executeRawUnsafe(`
    update "MatrixPayout"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "sourceOrderId" = ${sqlLiteral(orderId)}::bigint
  `);
}

function buildTreeMembers() {
  const rows = [];
  let nextId = 1;
  rows.push({
    seq: nextId,
    memberCode: code(nextId),
    sponsorCode: HELPER_CODE,
    level: 0,
    role: "root_target",
  });
  let current = [1];

  for (let level = 1; level <= MAX_LEVEL; level += 1) {
    const next = [];
    for (const parentId of current) {
      for (let i = 0; i < 2; i += 1) {
        nextId += 1;
        rows.push({
          seq: nextId,
          memberCode: code(nextId),
          sponsorCode: code(parentId),
          level,
          role:
            level <= 3
              ? "feeds_root_b1"
              : level <= 5
                ? "feeds_root_b2"
                : "feeds_root_b3",
        });
        next.push(nextId);
      }
    }
    current = next;
  }

  return rows;
}

async function upsertUser(input) {
  return prisma.user.upsert({
    where: { memberCode: input.memberCode },
    update: {
      referralCode: input.referralCode,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      sponsorId: input.sponsorId,
      status: "ACTIVE",
      payoutStatus: "ACTIVE",
      riskLevel: "NORMAL",
      matrixPersonalPv: "0",
    },
    create: {
      memberCode: input.memberCode,
      referralCode: input.referralCode,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      sponsorId: input.sponsorId,
      status: "ACTIVE",
      payoutStatus: "ACTIVE",
      riskLevel: "NORMAL",
      matrixPersonalPv: "0",
    },
  });
}

async function ensureWallet(userId) {
  await prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      approvedBalance: "0",
      heldBalance: "0",
      withdrawableBalance: "0",
      shoppingBalance: "0",
      discountBalance: "0",
      firmBalance: "0",
      paidOutBalance: "0",
      negativeOffsetBalance: "0",
      payoutLockStatus: "UNLOCKED",
    },
  });
}

async function ensurePackageCycle(userId, packageId, cycleNo = 1) {
  const activatedAt = new Date("2026-04-01T00:00:00.000Z");
  const activeUntil = new Date("2027-04-01T00:00:00.000Z");
  await prisma.memberPackageCycle.upsert({
    where: {
      userId_cycleNo: {
        userId,
        cycleNo,
      },
    },
    update: {
      packageId,
      purchaseBase: "500",
      poolRateMode: "DEFAULT_50_PERCENT",
      poolRate: "0",
      poolCapMultiple: "99",
      commissionCapScope: "POOL_ONLY",
      commissionCapMultiple: "99",
      activatedAt,
      activeUntil,
      earningCap: "999999",
      earnedTotalInCycle: "0",
      earningStatus: "ACTIVE",
      isReceivable: true,
      status: "ACTIVE",
    },
    create: {
      userId,
      packageId,
      cycleNo,
      purchaseBase: "500",
      poolRateMode: "DEFAULT_50_PERCENT",
      poolRate: "0",
      poolCapMultiple: "99",
      commissionCapScope: "POOL_ONLY",
      commissionCapMultiple: "99",
      activatedAt,
      activeUntil,
      earningCap: "999999",
      earnedTotalInCycle: "0",
      earningStatus: "ACTIVE",
      isReceivable: true,
      status: "ACTIVE",
    },
  });
}

async function main() {
  await expectOk("/health");

  const packageRecord = await prisma.package.upsert({
    where: { code: "STARTER" },
    update: {
      name: "Starter Package",
      priceUsdt: "100",
      memberPriceUsdt: "100",
      retailPriceUsdt: "100",
      pv: "100",
      activeDays: 365,
      earningCapType: "FIXED_AMOUNT",
      earningCapAmount: "999999",
      status: "ACTIVE",
    },
    create: {
      code: "STARTER",
      name: "Starter Package",
      priceUsdt: "100",
      memberPriceUsdt: "100",
      retailPriceUsdt: "100",
      pv: "100",
      activeDays: 365,
      earningCapType: "FIXED_AMOUNT",
      earningCapAmount: "999999",
      status: "ACTIVE",
    },
    select: { id: true, pv: true },
  });

  const passwordHash = hashPassword(MEMBER_PASSWORD);
  const helper = await upsertUser({
    memberCode: HELPER_CODE,
    referralCode: `${HELPER_CODE}REF`,
    name: "Full System Helper",
    email: `${HELPER_CODE.toLowerCase()}@example.com`,
    passwordHash,
    sponsorId: null,
  });
  await ensureWallet(helper.id);
  await ensurePackageCycle(helper.id, packageRecord.id, 1);
  const adminSession = await login(HELPER_CODE, MEMBER_PASSWORD);

  const treeMembers = buildTreeMembers();
  const createdUsers = new Map([[HELPER_CODE, helper]]);

  for (const row of treeMembers) {
    const sponsor = createdUsers.get(row.sponsorCode);
    if (!sponsor) {
      throw new Error(`Sponsor ${row.sponsorCode} not found for ${row.memberCode}`);
    }
    const user = await upsertUser({
      memberCode: row.memberCode,
      referralCode: `${row.memberCode}REF`,
      name: row.memberCode,
      email: `${row.memberCode.toLowerCase()}@example.com`,
      passwordHash,
      sponsorId: sponsor.id,
    });
    createdUsers.set(row.memberCode, user);
    await ensureWallet(user.id);
    await ensurePackageCycle(user.id, packageRecord.id, 1);
  }

  const quantity = String(500 / Number(packageRecord.pv));
  const orderDatePlan = [
    addDays(POOL_DATE, -6),
    addDays(POOL_DATE, -5),
    addDays(POOL_DATE, -4),
    addDays(POOL_DATE, -3),
    addDays(POOL_DATE, -2),
    addDays(POOL_DATE, -1),
    POOL_DATE,
  ];

  const createdOrders = [];
  const allOrderTargets = [...treeMembers];
  const extraReentryTargets = [ROOT_CODE, "B30002"];

  for (const [index, row] of allOrderTargets.entries()) {
    const user = createdUsers.get(row.memberCode);
    const order = await expectOk("/orders", {
      method: "POST",
      token: adminSession.accessToken,
      body: {
        userId: user.id.toString(),
        items: [{ packageId: packageRecord.id.toString(), quantity }],
        fulfillmentMethod: "branch_pickup",
        pickupBranchName: "Full System Ready",
        pickupBranchNote: `${SOURCE_TAG}|member=${row.memberCode}|seq=${index + 1}`,
        pickupRecipientName: row.memberCode,
        pickupPhone: "0800000000",
        cashPaymentMethod: "bank_transfer",
      },
    });
    await expectOk(`/orders/${order.orderId}/approve`, {
      method: "POST",
      token: adminSession.accessToken,
    });
    const approvedAtIso = toBangkokNoonIso(
      orderDatePlan[index % orderDatePlan.length],
    );
    await backfillOrderDates(order.orderId, approvedAtIso);
    createdOrders.push({
      memberCode: row.memberCode,
      orderId: order.orderId,
      orderNo: order.orderNo,
      approvedAtIso,
      kind: "base",
    });
  }

  for (const [index, memberCode] of extraReentryTargets.entries()) {
    const user = createdUsers.get(memberCode);
    const order = await expectOk("/orders", {
      method: "POST",
      token: adminSession.accessToken,
      body: {
        userId: user.id.toString(),
        items: [{ packageId: packageRecord.id.toString(), quantity }],
        fulfillmentMethod: "branch_pickup",
        pickupBranchName: "Full System Ready",
        pickupBranchNote: `${SOURCE_TAG}|reentry-carry|member=${memberCode}|seq=${index + 1}`,
        pickupRecipientName: memberCode,
        pickupPhone: "0800000000",
        cashPaymentMethod: "bank_transfer",
      },
    });
    await expectOk(`/orders/${order.orderId}/approve`, {
      method: "POST",
      token: adminSession.accessToken,
    });
    const approvedAtIso = toBangkokNoonIso(addDays(POOL_DATE, -1));
    await backfillOrderDates(order.orderId, approvedAtIso);
    createdOrders.push({
      memberCode,
      orderId: order.orderId,
      orderNo: order.orderNo,
      approvedAtIso,
      kind: "reentry_carry",
    });
  }

  const poolClose = await expectOk(`/pool/${POOL_DATE}/close`, {
    method: "POST",
    token: adminSession.accessToken,
  });

  const rootMatrix = await prisma.matrixCycle.findFirst({
    where: { user: { memberCode: ROOT_CODE } },
    orderBy: [{ cycleNo: "desc" }, { id: "desc" }],
    include: {
      boards: {
        orderBy: [{ boardNo: "asc" }, { roundNo: "asc" }],
      },
    },
  });

  const rootDirect = await prisma.commissionLedger.aggregate({
    where: {
      beneficiaryUser: { memberCode: ROOT_CODE },
    },
    _count: { id: true },
    _sum: { commissionAmount: true },
  });
  const rootMatrixPayout = await prisma.matrixPayout.aggregate({
    where: {
      beneficiaryUser: { memberCode: ROOT_CODE },
    },
    _count: { id: true },
    _sum: { payoutAmount: true },
  });
  const rootPool = await prisma.dailyPoolPayout.aggregate({
    where: {
      user: { memberCode: ROOT_CODE },
    },
    _count: { id: true },
    _sum: { payoutAmount: true },
  });
  const reentryEvents = await prisma.matrixAccumulationEvent.findMany({
    where: { sourceType: "REENTRY" },
    orderBy: [{ id: "asc" }],
    select: {
      cycle: {
        select: {
          user: {
            select: { memberCode: true },
          },
        },
      },
      sourceRoundNo: true,
      creditedPv: true,
      createdAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        helperLogin: { memberCode: HELPER_CODE, password: MEMBER_PASSWORD },
        rootLogin: { memberCode: ROOT_CODE, password: MEMBER_PASSWORD },
        totals: {
          treeMembers: treeMembers.length,
          allMembersIncludingHelper: treeMembers.length + 1,
          ordersCreated: createdOrders.length,
        },
        poolClose,
        rootSummary: {
          directCount: rootDirect._count.id,
          directAmount: rootDirect._sum.commissionAmount?.toString() ?? "0",
          matrixCount: rootMatrixPayout._count.id,
          matrixAmount: rootMatrixPayout._sum.payoutAmount?.toString() ?? "0",
          poolCount: rootPool._count.id,
          poolAmount: rootPool._sum.payoutAmount?.toString() ?? "0",
          boards:
            rootMatrix?.boards.map((board) => ({
              boardNo: board.boardNo,
              roundNo: board.roundNo,
              status: board.status,
              filledSlots: board.filledSlots,
              slotCount: board.slotCount,
            })) ?? [],
        },
        reentryEvents: reentryEvents.map((event) => ({
          memberCode: event.cycle.user.memberCode,
          sourceRoundNo: event.sourceRoundNo,
          creditedPv: event.creditedPv.toString(),
          createdAt: event.createdAt.toISOString(),
        })),
        sampleOrders: createdOrders.slice(0, 12),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
