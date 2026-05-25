const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const ADMIN_IDENTIFIER =
  process.env.MAIN_PLAN_ADMIN_IDENTIFIER || "TH0000013";
const ADMIN_PASSWORD = process.env.MAIN_PLAN_ADMIN_PASSWORD || "a1a1a1";
const BENEFICIARY_MEMBER_CODE =
  process.env.MAIN_PLAN_BENEFICIARY || "TH0000023";
const SOURCE_TAG =
  process.env.MAIN_PLAN_SOURCE_TAG || "commission-main-runtime";
const SHOULD_SEED_COMPLETION =
  process.env.MAIN_PLAN_SEED_COMPLETION !== "0";

function parseDecimal(value) {
  const parsed = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
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

function getDefaultPoolDate() {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const sunday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + ((7 - utcDay) % 7),
      0,
      0,
      0,
      0,
    ),
  );
  return sunday.toISOString().slice(0, 10);
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

async function ensureBeneficiaryBoardReady(beneficiaryUserId, completionAtIso) {
  const matrixCycle = await prisma.matrixCycle.findFirst({
    where: { userId: BigInt(beneficiaryUserId) },
    orderBy: [{ cycleNo: "desc" }, { id: "desc" }],
    include: {
      boards: {
        orderBy: [{ boardNo: "asc" }, { roundNo: "asc" }],
      },
    },
  });

  if (!matrixCycle) {
    throw new Error(
      `No matrix cycle found for beneficiary ${BENEFICIARY_MEMBER_CODE}.`,
    );
  }

  const boardOne = matrixCycle.boards.find(
    (board) => board.boardNo === 1 && board.roundNo === 1,
  );
  const boardTwo = matrixCycle.boards.find(
    (board) => board.boardNo === 2 && board.roundNo === 1,
  );

  if (!boardOne) {
    throw new Error(`B1R1 not found for ${BENEFICIARY_MEMBER_CODE}.`);
  }

  const before = {
    filledSlots: boardOne.filledSlots,
    slotCount: boardOne.slotCount,
    status: boardOne.status,
    completedAt: boardOne.completedAt ? boardOne.completedAt.toISOString() : null,
  };

  if (
    SHOULD_SEED_COMPLETION &&
    (boardOne.status !== "COMPLETED" || boardOne.filledSlots < boardOne.slotCount)
  ) {
    await prisma.matrixBoard.update({
      where: { id: boardOne.id },
      data: {
        filledSlots: boardOne.slotCount,
        status: "COMPLETED",
        completedAt: new Date(completionAtIso),
        openedAt: boardOne.openedAt || new Date(completionAtIso),
      },
    });

    if (boardTwo) {
      await prisma.matrixBoard.update({
        where: { id: boardTwo.id },
        data: {
          status: "OPEN",
          openedAt: boardTwo.openedAt || new Date(completionAtIso),
        },
      });
    }

    await prisma.matrixCycle.update({
      where: { id: matrixCycle.id },
      data: {
        currentBoardNo: 2,
        currentBoardRoundNo: 1,
        status: "ACTIVE",
      },
    });
  }

  const refreshed = await prisma.matrixBoard.findUnique({
    where: { id: boardOne.id },
    select: {
      filledSlots: true,
      slotCount: true,
      status: true,
      completedAt: true,
    },
  });

  return {
    before,
    after: {
      filledSlots: refreshed?.filledSlots ?? boardOne.filledSlots,
      slotCount: refreshed?.slotCount ?? boardOne.slotCount,
      status: refreshed?.status ?? boardOne.status,
      completedAt: refreshed?.completedAt
        ? refreshed.completedAt.toISOString()
        : null,
    },
  };
}

async function main() {
  await expectOk("/health");

  const poolDate = process.env.MAIN_PLAN_POOL_DATE || getDefaultPoolDate();
  const monday = addDays(poolDate, -6);
  const wednesday = addDays(poolDate, -4);
  const friday = addDays(poolDate, -2);
  const sunday = poolDate;
  const completionDate = addDays(poolDate, -3);

  const adminSession = await login(ADMIN_IDENTIFIER, ADMIN_PASSWORD);
  const activePackage = await prisma.package.findFirst({
    where: { status: "ACTIVE" },
    orderBy: [{ id: "asc" }],
    select: { id: true, code: true, pv: true },
  });

  if (!activePackage) {
    throw new Error("No active package found.");
  }

  const packagePv = parseDecimal(activePackage.pv);
  if (packagePv <= 0) {
    throw new Error("Active package PV must be greater than zero.");
  }

  const beneficiary = await prisma.user.findUnique({
    where: { memberCode: BENEFICIARY_MEMBER_CODE },
    select: { id: true, memberCode: true },
  });
  if (!beneficiary) {
    throw new Error(`Beneficiary ${BENEFICIARY_MEMBER_CODE} not found.`);
  }

  const descendants = await prisma.$queryRawUnsafe(`
    with recursive tree as (
      select u.id, u."memberCode", u."sponsorId", 0 as depth
      from "User" u
      where u."memberCode" = ${sqlLiteral(BENEFICIARY_MEMBER_CODE)}
      union all
      select c.id, c."memberCode", c."sponsorId", tree.depth + 1
      from "User" c
      join tree on c."sponsorId" = tree.id
      where tree.depth < 4
    )
    select id::text as "userId", "memberCode", depth
    from tree
    where depth > 0
    order by depth asc, "memberCode" asc
    limit 8
  `);

  if (!Array.isArray(descendants) || descendants.length < 3) {
    throw new Error(
      `Not enough descendants found under ${BENEFICIARY_MEMBER_CODE} to fund pool scenario.`,
    );
  }

  const selectedFunders = descendants.slice(0, 8);
  const datePlan = [monday, monday, wednesday, wednesday, friday, friday, sunday, sunday];
  const existingOrders = await prisma.order.findMany({
    where: {
      shippingAddressNote: {
        contains: `${SOURCE_TAG}|poolDate=${poolDate}`,
      },
    },
    select: {
      id: true,
      orderNo: true,
      shippingAddressNote: true,
      user: { select: { memberCode: true } },
    },
  });
  const existingByTag = new Map(
    existingOrders
      .filter((row) => row.shippingAddressNote)
      .map((row) => [row.shippingAddressNote, row]),
  );

  const createdOrders = [];
  for (const [index, funder] of selectedFunders.entries()) {
    const importTag = `${SOURCE_TAG}|poolDate=${poolDate}|member=${funder.memberCode}|slot=${index + 1}`;
    const approvedAtIso = toBangkokNoonIso(datePlan[index] || sunday);

    if (existingByTag.has(importTag)) {
      const existing = existingByTag.get(importTag);
      createdOrders.push({
        memberCode: funder.memberCode,
        orderId: existing.id.toString(),
        orderNo: existing.orderNo,
        approvedAtIso,
        status: "existing",
      });
      continue;
    }

    const quantity = 500 / packagePv;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(
        `Unable to derive integer quantity for 500 PV using package PV ${activePackage.pv}.`,
      );
    }

    const createdOrder = await expectOk("/orders", {
      method: "POST",
      token: adminSession.accessToken,
      body: {
        userId: funder.userId,
        items: [{ packageId: activePackage.id.toString(), quantity: String(quantity) }],
        fulfillmentMethod: "branch_pickup",
        pickupBranchName: "Commission Main Runtime",
        pickupBranchNote: importTag,
        pickupRecipientName: "Commission Runtime",
        pickupPhone: "0800000000",
        cashPaymentMethod: "bank_transfer",
      },
    });

    await expectOk(`/orders/${createdOrder.orderId}/approve`, {
      method: "POST",
      token: adminSession.accessToken,
    });
    await backfillOrderDates(createdOrder.orderId, approvedAtIso);

    createdOrders.push({
      memberCode: funder.memberCode,
      orderId: createdOrder.orderId,
      orderNo: createdOrder.orderNo,
      approvedAtIso,
      status: "created",
    });
  }

  const boardState = await ensureBeneficiaryBoardReady(
    beneficiary.id.toString(),
    toBangkokNoonIso(completionDate),
  );

  const closeResult = await expectOk(`/pool/${poolDate}/close`, {
    method: "POST",
    token: adminSession.accessToken,
  });

  const payouts = await prisma.dailyPoolPayout.findMany({
    where: {
      cycle: {
        cycleDate: new Date(`${poolDate}T00:00:00.000Z`),
      },
    },
    orderBy: [{ id: "asc" }],
    select: {
      payoutAmount: true,
      status: true,
      blockReason: true,
      user: {
        select: {
          memberCode: true,
        },
      },
    },
  });

  const ledgerSummary = await prisma.commissionLedger.aggregate({
    where: {
      beneficiaryUser: { memberCode: BENEFICIARY_MEMBER_CODE },
    },
    _count: { id: true },
    _sum: { commissionAmount: true },
  });
  const matrixSummary = await prisma.matrixPayout.aggregate({
    where: {
      beneficiaryUser: { memberCode: BENEFICIARY_MEMBER_CODE },
    },
    _count: { id: true },
    _sum: { payoutAmount: true },
  });
  const poolSummary = await prisma.dailyPoolPayout.aggregate({
    where: {
      user: { memberCode: BENEFICIARY_MEMBER_CODE },
      cycle: { cycleDate: new Date(`${poolDate}T00:00:00.000Z`) },
    },
    _count: { id: true },
    _sum: { payoutAmount: true },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        beneficiary: BENEFICIARY_MEMBER_CODE,
        poolDate,
        fundingMembers: selectedFunders.map((row) => row.memberCode),
        createdOrders,
        boardState,
        poolClose: closeResult,
        poolPayouts: payouts.map((row) => ({
          memberCode: row.user.memberCode,
          payoutAmount: row.payoutAmount.toString(),
          status: row.status,
          blockReason: row.blockReason,
        })),
        beneficiarySummary: {
          ledgerCount: ledgerSummary._count.id,
          ledgerAmount: ledgerSummary._sum.commissionAmount?.toString() ?? "0",
          matrixCount: matrixSummary._count.id,
          matrixAmount: matrixSummary._sum.payoutAmount?.toString() ?? "0",
          poolCount: poolSummary._count.id,
          poolAmount: poolSummary._sum.payoutAmount?.toString() ?? "0",
        },
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
