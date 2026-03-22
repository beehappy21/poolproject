const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/poolproject?schema=public";

const prisma = new PrismaClient();

function parseArgs(argv) {
  const options = {
    apply: false,
    prefix: "CASHSMK",
    memberCodes: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--prefix") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--prefix requires a value");
      }
      options.prefix = value;
      index += 1;
      continue;
    }

    if (arg === "--member-code") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--member-code requires a value");
      }
      options.memberCodes.push(value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function escapeSqlLiteral(value) {
  return value.replace(/'/g, "''");
}

function toIdList(values) {
  const normalized = Array.from(
    new Set(
      values
        .map((value) => value?.toString())
        .filter((value) => typeof value === "string" && /^\d+$/.test(value)),
    ),
  );

  return normalized;
}

function idIn(values) {
  const normalized = toIdList(values);
  if (normalized.length === 0) {
    return null;
  }

  return normalized.join(",");
}

async function loadUsers(options) {
  if (options.memberCodes.length > 0) {
    const inClause = options.memberCodes
      .map((value) => `'${escapeSqlLiteral(value)}'`)
      .join(",");

    return prisma.$queryRawUnsafe(
      `
        select
          u.id::text as "userId",
          u."memberCode" as "memberCode",
          coalesce(u.email, '') as "email"
        from "User" u
        where u."memberCode" in (${inClause})
        order by u.id asc
      `,
    );
  }

  return prisma.$queryRawUnsafe(
    `
      select
        u.id::text as "userId",
        u."memberCode" as "memberCode",
        coalesce(u.email, '') as "email"
      from "User" u
      where u."memberCode" like '${escapeSqlLiteral(options.prefix)}%'
      order by u.id asc
    `,
  );
}

async function loadIds(table, column, whereSql) {
  const rows = await prisma.$queryRawUnsafe(
    `
      select ${column}::text as id
      from ${table}
      ${whereSql}
      order by ${column} asc
    `,
  );

  return rows.map((row) => row.id);
}

async function loadTargets(users) {
  const userIds = toIdList(users.map((user) => user.userId));

  if (userIds.length === 0) {
    return {
      userIds,
      orderIds: [],
      orderItemIds: [],
      commissionIds: [],
      walletTransactionIds: [],
      companyBonusIds: [],
      memberProfileIds: [],
      walletIds: [],
      memberPackageCycleIds: [],
      matrixCycleIds: [],
      matrixBoardIds: [],
      matrixPositionIds: [],
      matrixPayoutIds: [],
      matrixAccumulationEventIds: [],
      impactedBoardIds: [],
      impactedCycleIds: [],
    };
  }

  const userIn = idIn(userIds);
  const orderIds = await loadIds(
    '"Order"',
    "id",
    `where "userId" in (${userIn})`,
  );
  const orderIn = idIn(orderIds);

  const memberProfileIds = await loadIds(
    '"MemberProfile"',
    "id",
    `where "userId" in (${userIn})`,
  );
  const walletIds = await loadIds(
    '"Wallet"',
    "id",
    `where "userId" in (${userIn})`,
  );
  const memberPackageCycleIds = await loadIds(
    '"MemberPackageCycle"',
    "id",
    `where "userId" in (${userIn})`,
  );
  const matrixCycleIds = await loadIds(
    '"MatrixCycle"',
    "id",
    `where "userId" in (${userIn})`,
  );
  const matrixCycleIn = idIn(matrixCycleIds);
  const matrixBoardIds = matrixCycleIn
    ? await loadIds(
        '"MatrixBoard"',
        "id",
        `where "cycleId" in (${matrixCycleIn})`,
      )
    : [];

  const commissionWhere = orderIn
    ? `where "sourceUserId" in (${userIn})
        or "beneficiaryUserId" in (${userIn})
        or "orderId" in (${orderIn})
        or "beneficiaryCycleId" in (${idIn(memberPackageCycleIds) || "null"})`
    : `where "sourceUserId" in (${userIn})
        or "beneficiaryUserId" in (${userIn})
        or "beneficiaryCycleId" in (${idIn(memberPackageCycleIds) || "null"})`;
  const commissionIds = await loadIds(
    '"CommissionLedger"',
    "id",
    commissionWhere,
  );
  const commissionIn = idIn(commissionIds);

  const matrixPositionWhereParts = [
    `"sourceUserId" in (${userIn})`,
    orderIn ? `"sourceOrderId" in (${orderIn})` : null,
    matrixBoardIds.length > 0 ? `"boardId" in (${idIn(matrixBoardIds)})` : null,
  ].filter(Boolean);
  const matrixPositionIds = await loadIds(
    '"MatrixPosition"',
    "id",
    `where ${matrixPositionWhereParts.join(" or ")}`,
  );

  const matrixPayoutWhereParts = [
    `"sourceUserId" in (${userIn})`,
    `"beneficiaryUserId" in (${userIn})`,
    orderIn ? `"sourceOrderId" in (${orderIn})` : null,
    matrixCycleIds.length > 0 ? `"cycleId" in (${idIn(matrixCycleIds)})` : null,
    matrixBoardIds.length > 0 ? `"boardId" in (${idIn(matrixBoardIds)})` : null,
  ].filter(Boolean);
  const matrixPayoutIds = await loadIds(
    '"MatrixPayout"',
    "id",
    `where ${matrixPayoutWhereParts.join(" or ")}`,
  );

  const matrixAccumulationWhereParts = [
    `"sourceUserId" in (${userIn})`,
    orderIn ? `"sourceOrderId" in (${orderIn})` : null,
    matrixCycleIds.length > 0 ? `"cycleId" in (${idIn(matrixCycleIds)})` : null,
    matrixBoardIds.length > 0 ? `"boardId" in (${idIn(matrixBoardIds)})` : null,
  ].filter(Boolean);
  const matrixAccumulationEventIds = await loadIds(
    '"MatrixAccumulationEvent"',
    "id",
    `where ${matrixAccumulationWhereParts.join(" or ")}`,
  );

  const impactedBoards = await prisma.$queryRawUnsafe(
    `
      select distinct "boardId"::text as id
      from (
        select "boardId" from "MatrixPosition" where id in (${idIn(matrixPositionIds) || "null"})
        union
        select "boardId" from "MatrixPayout" where id in (${idIn(matrixPayoutIds) || "null"})
        union
        select "boardId" from "MatrixAccumulationEvent" where id in (${idIn(matrixAccumulationEventIds) || "null"})
      ) impacted
      where "boardId" is not null
      order by id asc
    `,
  );
  const impactedCycles = await prisma.$queryRawUnsafe(
    `
      select distinct "cycleId"::text as id
      from (
        select "cycleId" from "MatrixPayout" where id in (${idIn(matrixPayoutIds) || "null"})
        union
        select "cycleId" from "MatrixAccumulationEvent" where id in (${idIn(matrixAccumulationEventIds) || "null"})
        union
        select "cycleId" from "MatrixBoard" where id in (${idIn(impactedBoards.map((row) => row.id)) || "null"})
      ) impacted
      where "cycleId" is not null
      order by id asc
    `,
  );

  const walletTransactionIds = await loadIds(
    '"WalletTransaction"',
    "id",
    `where "userId" in (${userIn})
      ${commissionIn ? `or ("refType" = 'COMMISSION' and "refId" in (${commissionIn}))` : ""}
      ${matrixPayoutIds.length > 0 ? `or ("refType" = 'MATRIX_PAYOUT' and "refId" in (${idIn(matrixPayoutIds)}))` : ""}`,
  );

  const companyBonusIds = orderIn
    ? await loadIds(
        '"CompanyBonusLedger"',
        "id",
        `where "sourceRefId" in (${orderIn})`,
      )
    : [];

  const orderItemIds = orderIn
    ? await loadIds(
        '"OrderItem"',
        "id",
        `where "orderId" in (${orderIn})`,
      )
    : [];

  return {
    userIds,
    orderIds,
    orderItemIds,
    commissionIds,
    walletTransactionIds,
    companyBonusIds,
    memberProfileIds,
    walletIds,
    memberPackageCycleIds,
    matrixCycleIds,
    matrixBoardIds,
    matrixPositionIds,
    matrixPayoutIds,
    matrixAccumulationEventIds,
    impactedBoardIds: impactedBoards.map((row) => row.id),
    impactedCycleIds: impactedCycles.map((row) => row.id),
  };
}

function printSummary(users, targets, apply) {
  process.stdout.write(
    `${apply ? "Apply" : "Dry run"} cashback smoke cleanup\n`,
  );
  process.stdout.write(`Users: ${users.length}\n`);
  process.stdout.write(`Orders: ${targets.orderIds.length}\n`);
  process.stdout.write(`Order items: ${targets.orderItemIds.length}\n`);
  process.stdout.write(`Commission rows: ${targets.commissionIds.length}\n`);
  process.stdout.write(`Wallet transactions: ${targets.walletTransactionIds.length}\n`);
  process.stdout.write(`Company bonus rows: ${targets.companyBonusIds.length}\n`);
  process.stdout.write(`Member package cycles: ${targets.memberPackageCycleIds.length}\n`);
  process.stdout.write(`Wallets: ${targets.walletIds.length}\n`);
  process.stdout.write(`Matrix positions: ${targets.matrixPositionIds.length}\n`);
  process.stdout.write(`Matrix payouts: ${targets.matrixPayoutIds.length}\n`);
  process.stdout.write(
    `Matrix accumulation events: ${targets.matrixAccumulationEventIds.length}\n`,
  );
  process.stdout.write(`Impacted matrix boards: ${targets.impactedBoardIds.length}\n`);
  process.stdout.write(`Impacted matrix cycles: ${targets.impactedCycleIds.length}\n`);

  if (users.length > 0) {
    const preview = users
      .slice(0, 10)
      .map((user) => `- userId=${user.userId} memberCode=${user.memberCode}`)
      .join("\n");
    process.stdout.write(`${preview}\n`);
  }
}

async function deleteIds(tx, table, ids) {
  const inClause = idIn(ids);
  if (!inClause) {
    return;
  }

  await tx.$executeRawUnsafe(`delete from ${table} where id in (${inClause})`);
}

async function repairMatrixAggregates(tx, boardIds, cycleIds) {
  const boardIn = idIn(boardIds);
  const cycleIn = idIn(cycleIds);

  if (boardIn) {
    await tx.$executeRawUnsafe(`
      update "MatrixBoard" board
      set
        "accumulatedPv" = coalesce((
          select sum(event."creditedPv")
          from "MatrixAccumulationEvent" event
          where event."boardId" = board.id
        ), 0),
        "filledSlots" = coalesce((
          select count(*)
          from "MatrixPosition" position
          where position."boardId" = board.id
            and position."resetAt" is null
        ), 0)
      where board.id in (${boardIn})
    `);
  }

  if (cycleIn) {
    await tx.$executeRawUnsafe(`
      update "MatrixCycle" cycle
      set "totalAccumulatedPv" = coalesce((
        select sum(event."creditedPv")
        from "MatrixAccumulationEvent" event
        where event."cycleId" = cycle.id
      ), 0)
      where cycle.id in (${cycleIn})
    `);
  }
}

async function applyCleanup(targets) {
  const survivingBoardIds = targets.impactedBoardIds.filter(
    (id) => !targets.matrixBoardIds.includes(id),
  );
  const survivingCycleIds = targets.impactedCycleIds.filter(
    (id) => !targets.matrixCycleIds.includes(id),
  );

  await prisma.$transaction(async (tx) => {
    await deleteIds(tx, '"WalletTransaction"', targets.walletTransactionIds);
    await deleteIds(tx, '"CompanyBonusLedger"', targets.companyBonusIds);
    await deleteIds(tx, '"MatrixPayout"', targets.matrixPayoutIds);
    await deleteIds(tx, '"MatrixAccumulationEvent"', targets.matrixAccumulationEventIds);
    await deleteIds(tx, '"MatrixPosition"', targets.matrixPositionIds);
    await deleteIds(tx, '"CommissionLedger"', targets.commissionIds);
    await deleteIds(tx, '"OrderItem"', targets.orderItemIds);
    await deleteIds(tx, '"Order"', targets.orderIds);
    await deleteIds(tx, '"MatrixBoard"', targets.matrixBoardIds);
    await deleteIds(tx, '"MatrixCycle"', targets.matrixCycleIds);
    await deleteIds(tx, '"MemberPackageCycle"', targets.memberPackageCycleIds);
    await deleteIds(tx, '"Wallet"', targets.walletIds);
    await deleteIds(tx, '"MemberProfile"', targets.memberProfileIds);
    await deleteIds(tx, '"User"', targets.userIds);

    await repairMatrixAggregates(tx, survivingBoardIds, survivingCycleIds);
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const users = await loadUsers(options);
  const targets = await loadTargets(users);

  printSummary(users, targets, options.apply);

  if (!options.apply || users.length === 0) {
    if (!options.apply) {
      process.stdout.write("No changes applied. Re-run with --apply to delete.\n");
    }
    return;
  }

  await applyCleanup(targets);
  process.stdout.write("Cleanup complete.\n");
}

main()
  .catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
