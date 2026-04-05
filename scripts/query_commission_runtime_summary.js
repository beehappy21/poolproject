const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();

const MEMBER_CODE = process.env.MEMBER_CODE || "";
const DATE_FROM = process.env.DATE_FROM || "";
const DATE_TO = process.env.DATE_TO || "";
const POOL_DATE = process.env.POOL_DATE || "";
const LIMIT_ROWS = Number.parseInt(process.env.LIMIT_ROWS || "10", 10);
const OUTPUT = (process.env.OUTPUT || "text").toLowerCase();

function asDateRange(value, endOfDay = false) {
  if (!value) {
    return null;
  }

  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const parsed = new Date(`${value}${suffix}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function decimalToString(value) {
  if (value === null || value === undefined) {
    return "0";
  }

  return value.toString();
}

function buildCreatedAtFilter() {
  const gte = asDateRange(DATE_FROM, false);
  const lte = asDateRange(DATE_TO, true);

  if (!gte && !lte) {
    return undefined;
  }

  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte } : {}),
  };
}

function buildMemberRelationFilter(relationKey) {
  if (!MEMBER_CODE) {
    return {};
  }

  return {
    [relationKey]: {
      memberCode: MEMBER_CODE,
    },
  };
}

function formatLine(label, value) {
  return `${label}=${value}`;
}

async function main() {
  const createdAtFilter = buildCreatedAtFilter();
  const poolDateValue = asDateRange(POOL_DATE, false);

  const ledgerWhere = {
    commissionType: {
      in: ["DIRECT", "UNI", "CASHBACK"],
    },
    ...buildMemberRelationFilter("beneficiaryUser"),
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
  };

  const matrixWhere = {
    ...buildMemberRelationFilter("beneficiaryUser"),
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
  };

  const poolWhere = {
    ...buildMemberRelationFilter("user"),
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    ...(poolDateValue
      ? {
          cycle: { cycleDate: poolDateValue },
        }
      : {}),
  };

  const fallbackWhere = {
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
  };

  const [
    ledgerRows,
    ledgerCounted,
    ledgerFallback,
    ledgerLatest,
    recentLedgerRows,
    matrixRows,
    matrixCounted,
    matrixLatest,
    recentMatrixRows,
    poolRows,
    poolCounted,
    poolLatest,
    recentPoolRows,
    fallbackRows,
    fallbackTotal,
  ] = await Promise.all([
    prisma.commissionLedger.count({ where: ledgerWhere }),
    prisma.commissionLedger.aggregate({
      where: {
        ...ledgerWhere,
        status: {
          in: ["APPROVED", "HELD", "WITHDRAWABLE", "RESERVED_FOR_PAYOUT", "PAID_OUT"],
        },
      },
      _sum: { commissionAmount: true },
    }),
    prisma.commissionLedger.aggregate({
      where: {
        ...ledgerWhere,
        status: "FALLBACK",
      },
      _sum: { commissionAmount: true },
    }),
    prisma.commissionLedger.findFirst({
      where: ledgerWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { createdAt: true },
    }),
    prisma.commissionLedger.findMany({
      where: ledgerWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: LIMIT_ROWS,
      select: {
        commissionType: true,
        status: true,
        commissionAmount: true,
        createdAt: true,
        beneficiaryUser: {
          select: { memberCode: true },
        },
      },
    }),
    prisma.matrixPayout.count({ where: matrixWhere }),
    prisma.matrixPayout.aggregate({
      where: {
        ...matrixWhere,
        status: {
          in: ["PENDING", "APPROVED", "PAID"],
        },
      },
      _sum: { payoutAmount: true },
    }),
    prisma.matrixPayout.findFirst({
      where: matrixWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { createdAt: true },
    }),
    prisma.matrixPayout.findMany({
      where: matrixWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: LIMIT_ROWS,
      select: {
        boardNo: true,
        roundNo: true,
        levelNo: true,
        status: true,
        payoutAmount: true,
        createdAt: true,
        beneficiaryUser: {
          select: { memberCode: true },
        },
      },
    }),
    prisma.dailyPoolPayout.count({ where: poolWhere }),
    prisma.dailyPoolPayout.aggregate({
      where: {
        ...poolWhere,
        status: {
          in: ["APPROVED", "HELD", "WITHDRAWABLE", "RESERVED_FOR_PAYOUT", "PAID_OUT"],
        },
      },
      _sum: { payoutAmount: true },
    }),
    prisma.dailyPoolPayout.findFirst({
      where: poolWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { createdAt: true },
    }),
    prisma.dailyPoolPayout.findMany({
      where: poolWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: LIMIT_ROWS,
      select: {
        payoutAmount: true,
        status: true,
        blockReason: true,
        createdAt: true,
        user: {
          select: { memberCode: true },
        },
        cycle: {
          select: { cycleDate: true },
        },
      },
    }),
    prisma.companyBonusLedger.count({ where: fallbackWhere }),
    prisma.companyBonusLedger.aggregate({
      where: fallbackWhere,
      _sum: { amount: true },
    }),
  ]);

  const summary = {
    memberCode: MEMBER_CODE || "ALL",
    dateFrom: DATE_FROM || null,
    dateTo: DATE_TO || null,
    poolDate: POOL_DATE || null,
    ledger: {
      rows: ledgerRows,
      countedAmount: decimalToString(ledgerCounted._sum.commissionAmount),
      fallbackAmount: decimalToString(ledgerFallback._sum.commissionAmount),
      latest: ledgerLatest?.createdAt?.toISOString() || null,
      recentRows: recentLedgerRows.map((row) => ({
        memberCode: row.beneficiaryUser?.memberCode || "-",
        commissionType: row.commissionType,
        status: row.status,
        commissionAmount: decimalToString(row.commissionAmount),
        createdAt: row.createdAt.toISOString(),
      })),
    },
    matrix: {
      rows: matrixRows,
      countedAmount: decimalToString(matrixCounted._sum.payoutAmount),
      latest: matrixLatest?.createdAt?.toISOString() || null,
      recentRows: recentMatrixRows.map((row) => ({
        memberCode: row.beneficiaryUser.memberCode,
        boardNo: row.boardNo,
        roundNo: row.roundNo,
        levelNo: row.levelNo,
        status: row.status,
        payoutAmount: decimalToString(row.payoutAmount),
        createdAt: row.createdAt.toISOString(),
      })),
    },
    pool: {
      rows: poolRows,
      countedAmount: decimalToString(poolCounted._sum.payoutAmount),
      latest: poolLatest?.createdAt?.toISOString() || null,
      recentRows: recentPoolRows.map((row) => ({
        memberCode: row.user.memberCode,
        cycleDate: row.cycle.cycleDate.toISOString().slice(0, 10),
        status: row.status,
        blockReason: row.blockReason,
        payoutAmount: decimalToString(row.payoutAmount),
        createdAt: row.createdAt.toISOString(),
      })),
    },
    companyFallback: {
      rows: fallbackRows,
      amount: decimalToString(fallbackTotal._sum.amount),
    },
  };

  if (OUTPUT === "json") {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log("== COMMISSION RUNTIME SUMMARY ==");
  console.log(formatLine("member_code", summary.memberCode));
  console.log(formatLine("date_from", summary.dateFrom || "ANY"));
  console.log(formatLine("date_to", summary.dateTo || "ANY"));
  console.log(formatLine("pool_date", summary.poolDate || "ANY"));
  console.log("");
  console.log("-- Ledger summary");
  console.log(formatLine("rows", summary.ledger.rows));
  console.log(formatLine("counted_amount", summary.ledger.countedAmount));
  console.log(formatLine("fallback_amount", summary.ledger.fallbackAmount));
  console.log(formatLine("latest", summary.ledger.latest || "-"));
  console.log("");
  console.log("-- Matrix summary");
  console.log(formatLine("rows", summary.matrix.rows));
  console.log(formatLine("counted_amount", summary.matrix.countedAmount));
  console.log(formatLine("latest", summary.matrix.latest || "-"));
  console.log("");
  console.log("-- Pool summary");
  console.log(formatLine("rows", summary.pool.rows));
  console.log(formatLine("counted_amount", summary.pool.countedAmount));
  console.log(formatLine("latest", summary.pool.latest || "-"));
  console.log("");
  console.log("-- Company fallback summary");
  console.log(formatLine("rows", summary.companyFallback.rows));
  console.log(formatLine("amount", summary.companyFallback.amount));
  console.log("");
  console.log("-- Recent ledger rows");
  for (const row of summary.ledger.recentRows) {
    console.log(
      [
        row.memberCode,
        row.commissionType,
        row.status,
        row.commissionAmount,
        row.createdAt,
      ].join("|"),
    );
  }
  console.log("");
  console.log("-- Recent matrix payouts");
  for (const row of summary.matrix.recentRows) {
    console.log(
      [
        row.memberCode,
        row.boardNo,
        row.roundNo,
        row.levelNo,
        row.status,
        row.payoutAmount,
        row.createdAt,
      ].join("|"),
    );
  }
  console.log("");
  console.log("-- Recent pool payouts");
  for (const row of summary.pool.recentRows) {
    console.log(
      [
        row.memberCode,
        row.cycleDate,
        row.status,
        row.payoutAmount,
        row.blockReason || "-",
        row.createdAt,
      ].join("|"),
    );
  }
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
