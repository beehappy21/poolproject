const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/poolproject?schema=public";

const prisma = new PrismaClient();

const SOURCE_TAG =
  process.env.BASELINE_SOURCE_TAG || "commission-test-baseline";

function parseArgs(argv) {
  const options = {
    apply: false,
    allowOtherOrders: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--allow-other-orders") {
      options.allowOtherOrders = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function toIdList(values) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.toString())
        .filter((value) => typeof value === "string" && /^\d+$/.test(value)),
    ),
  );
}

function idIn(values) {
  const normalized = toIdList(values);
  if (normalized.length === 0) {
    return null;
  }

  return normalized.join(",");
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

async function loadBaselineOrders() {
  return prisma.$queryRawUnsafe(
    `
      select
        o.id::text as "orderId",
        o."userId"::text as "userId",
        o."orderNo" as "orderNo",
        to_char(o."approvedAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as "approvedDate"
      from "Order" o
      where o."shippingAddressNote" like '${SOURCE_TAG}|%'
      order by o.id asc
    `,
  );
}

async function loadTargets(baselineOrders) {
  const baselineOrderIds = toIdList(baselineOrders.map((row) => row.orderId));
  const userIds = toIdList(baselineOrders.map((row) => row.userId));
  const approvedDates = Array.from(
    new Set(baselineOrders.map((row) => row.approvedDate).filter(Boolean)),
  );

  if (userIds.length === 0) {
    return {
      baselineOrderIds,
      userIds,
      approvedDates,
      nonBaselineOrderIds: [],
      orderIds: [],
      orderItemIds: [],
      memberPackageCycleIds: [],
      commissionIds: [],
      companyBonusIds: [],
      walletTransactionIds: [],
      walletIds: [],
      capBucketIds: [],
      capLedgerIds: [],
      buybackEventIds: [],
      userBuybackProgressIds: [],
      dailyPoolCycleIds: [],
      dailyPoolEligibilitySnapshotIds: [],
      dailyPoolPayoutIds: [],
      dailyCommissionCapUsageIds: [],
      teamSettlementBatchIds: [],
      teamSettlementBatchItemIds: [],
      poolSettlementBatchIds: [],
      poolSettlementBatchItemIds: [],
      matrixCycleIds: [],
      matrixBoardIds: [],
      matrixPositionIds: [],
      matrixPayoutIds: [],
      matrixAccumulationEventIds: [],
      matrixHoldbackAccountIds: [],
      matrixReorderIds: [],
      impactedBoardIds: [],
      impactedCycleIds: [],
    };
  }

  const userIn = idIn(userIds);

  const allOrderIds = await loadIds(
    '"Order"',
    "id",
    `where "userId" in (${userIn})`,
  );
  const baselineOrderIn = idIn(baselineOrderIds);
  const allOrderIn = idIn(allOrderIds);

  const nonBaselineOrderIds = allOrderIds.filter(
    (id) => !baselineOrderIds.includes(id),
  );

  const orderItemIds = allOrderIn
    ? await loadIds(
        '"OrderItem"',
        "id",
        `where "orderId" in (${allOrderIn})`,
      )
    : [];

  const memberPackageCycleIds = await loadIds(
    '"MemberPackageCycle"',
    "id",
    `where "userId" in (${userIn})`,
  );
  const memberPackageCycleIn = idIn(memberPackageCycleIds);

  const commissionIds = await loadIds(
    '"CommissionLedger"',
    "id",
    `where "sourceUserId" in (${userIn})
      or "beneficiaryUserId" in (${userIn})
      or ${allOrderIn ? `"orderId" in (${allOrderIn})` : "false"}
      or ${memberPackageCycleIn ? `"beneficiaryCycleId" in (${memberPackageCycleIn})` : "false"}`,
  );
  const commissionIn = idIn(commissionIds);

  const companyBonusIds = allOrderIn
    ? await loadIds(
        '"CompanyBonusLedger"',
        "id",
        `where "sourceRefId" in (${allOrderIn})`,
      )
    : [];

  const walletTransactionIds = await loadIds(
    '"WalletTransaction"',
    "id",
    `where "userId" in (${userIn})
      ${commissionIn ? `or ("refType" = 'COMMISSION' and "refId" in (${commissionIn}))` : ""}
      ${allOrderIn ? `or ("refType" = 'ORDER' and "refId" in (${allOrderIn}))` : ""}
      ${allOrderIn ? `or ("refType" = 'order' and "refId" in (${allOrderIn}))` : ""}`,
  );

  const walletIds = await loadIds(
    '"Wallet"',
    "id",
    `where "userId" in (${userIn})`,
  );

  const capBucketIds = await loadIds(
    '"CapBucket"',
    "id",
    `where "userId" in (${userIn})
      or ${allOrderIn ? `"sourceOrderId" in (${allOrderIn})` : "false"}
      or ${memberPackageCycleIn ? `"memberPackageCycleId" in (${memberPackageCycleIn})` : "false"}`,
  );
  const capBucketIn = idIn(capBucketIds);

  const capLedgerIds = await loadIds(
    '"CapLedger"',
    "id",
    `where "userId" in (${userIn})
      or ${capBucketIn ? `"bucketId" in (${capBucketIn})` : "false"}
      or ${allOrderIn ? `"sourceOrderId" in (${allOrderIn})` : "false"}
      or ${allOrderIn ? `"relatedOrderId" in (${allOrderIn})` : "false"}
      or ${commissionIn ? `"relatedCommissionLedgerId" in (${commissionIn})` : "false"}
      or ${memberPackageCycleIn ? `"memberPackageCycleId" in (${memberPackageCycleIn})` : "false"}`,
  );

  const buybackEventIds = await loadIds(
    '"BuybackEvent"',
    "id",
    `where "userId" in (${userIn})
      or ${allOrderIn ? `"orderId" in (${allOrderIn})` : "false"}`,
  );

  const userBuybackProgressIds = await loadIds(
    '"UserBuybackProgress"',
    "id",
    `where "userId" in (${userIn})`,
  );

  const approvedDateSql =
    approvedDates.length > 0
      ? approvedDates.map((value) => `'${value}'`).join(",")
      : null;

  const dailyPoolCycleIds = approvedDateSql
    ? await loadIds(
        '"DailyPoolCycle"',
        "id",
        `where to_char("cycleDate" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') in (${approvedDateSql})`,
      )
    : [];
  const dailyPoolCycleIn = idIn(dailyPoolCycleIds);

  const dailyPoolEligibilitySnapshotIds = dailyPoolCycleIn
    ? await loadIds(
        '"DailyPoolEligibilitySnapshot"',
        "id",
        `where "cycleId" in (${dailyPoolCycleIn})`,
      )
    : [];

  const dailyPoolPayoutIds = await loadIds(
    '"DailyPoolPayout"',
    "id",
    `where ${dailyPoolCycleIn ? `"cycleId" in (${dailyPoolCycleIn})` : "false"}
      or ${commissionIn ? `"commissionLedgerId" in (${commissionIn})` : "false"}
      or ${memberPackageCycleIn ? `"beneficiaryCycleId" in (${memberPackageCycleIn})` : "false"}
      or "userId" in (${userIn})`,
  );

  const dailyCommissionCapUsageIds = approvedDateSql
    ? await loadIds(
        '"DailyCommissionCapUsage"',
        "id",
        `where "userId" in (${userIn})
          and to_char("capDate" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') in (${approvedDateSql})`,
      )
    : [];

  const teamSettlementBatchIds = approvedDateSql
    ? await loadIds(
        '"TeamSettlementBatch"',
        "id",
        `where to_char("settlementDate" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') in (${approvedDateSql})`,
      )
    : [];
  const teamSettlementBatchIn = idIn(teamSettlementBatchIds);

  const teamSettlementBatchItemIds = teamSettlementBatchIn
    ? await loadIds(
        '"TeamSettlementBatchItem"',
        "id",
        `where "batchId" in (${teamSettlementBatchIn}) or "userId" in (${userIn})`,
      )
    : [];

  const poolSettlementBatchIds = approvedDateSql
    ? await loadIds(
        '"PoolSettlementBatch"',
        "id",
        `where to_char("settlementDate" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') in (${approvedDateSql})`,
      )
    : [];
  const poolSettlementBatchIn = idIn(poolSettlementBatchIds);

  const poolSettlementBatchItemIds = poolSettlementBatchIn
    ? await loadIds(
        '"PoolSettlementBatchItem"',
        "id",
        `where "batchId" in (${poolSettlementBatchIn}) or "userId" in (${userIn})`,
      )
    : [];

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
  const matrixBoardIn = idIn(matrixBoardIds);

  const matrixPositionIds = await loadIds(
    '"MatrixPosition"',
    "id",
    `where "sourceUserId" in (${userIn})
      or ${allOrderIn ? `"sourceOrderId" in (${allOrderIn})` : "false"}
      or ${matrixBoardIn ? `"boardId" in (${matrixBoardIn})` : "false"}`,
  );

  const matrixPayoutIds = await loadIds(
    '"MatrixPayout"',
    "id",
    `where "sourceUserId" in (${userIn})
      or "beneficiaryUserId" in (${userIn})
      or ${allOrderIn ? `"sourceOrderId" in (${allOrderIn})` : "false"}
      or ${matrixCycleIn ? `"cycleId" in (${matrixCycleIn})` : "false"}
      or ${matrixBoardIn ? `"boardId" in (${matrixBoardIn})` : "false"}`,
  );

  const matrixAccumulationEventIds = await loadIds(
    '"MatrixAccumulationEvent"',
    "id",
    `where "sourceUserId" in (${userIn})
      or ${allOrderIn ? `"sourceOrderId" in (${allOrderIn})` : "false"}
      or ${matrixCycleIn ? `"cycleId" in (${matrixCycleIn})` : "false"}
      or ${matrixBoardIn ? `"boardId" in (${matrixBoardIn})` : "false"}`,
  );

  const matrixHoldbackAccountIds = await loadIds(
    '"MatrixHoldbackAccount"',
    "id",
    `where "userId" in (${userIn})`,
  );
  const matrixHoldbackAccountIn = idIn(matrixHoldbackAccountIds);

  const matrixReorderIds = await loadIds(
    '"MatrixReorder"',
    "id",
    `where "userId" in (${userIn})
      or ${matrixBoardIn ? `"triggerBoardId" in (${matrixBoardIn})` : "false"}
      or ${matrixHoldbackAccountIn ? `"holdbackAccountId" in (${matrixHoldbackAccountIn})` : "false"}
      or ${allOrderIn ? `"generatedOrderId" in (${allOrderIn})` : "false"}`,
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

  return {
    baselineOrderIds,
    userIds,
    approvedDates,
    nonBaselineOrderIds,
    orderIds: allOrderIds,
    orderItemIds,
    memberPackageCycleIds,
    commissionIds,
    companyBonusIds,
    walletTransactionIds,
    walletIds,
    capBucketIds,
    capLedgerIds,
    buybackEventIds,
    userBuybackProgressIds,
    dailyPoolCycleIds,
    dailyPoolEligibilitySnapshotIds,
    dailyPoolPayoutIds,
    dailyCommissionCapUsageIds,
    teamSettlementBatchIds,
    teamSettlementBatchItemIds,
    poolSettlementBatchIds,
    poolSettlementBatchItemIds,
    matrixCycleIds,
    matrixBoardIds,
    matrixPositionIds,
    matrixPayoutIds,
    matrixAccumulationEventIds,
    matrixHoldbackAccountIds,
    matrixReorderIds,
    impactedBoardIds: impactedBoards.map((row) => row.id),
    impactedCycleIds: impactedCycles.map((row) => row.id),
  };
}

function printSummary(targets, options) {
  process.stdout.write(
    `${options.apply ? "Apply" : "Dry run"} commission baseline runtime cleanup\n`,
  );
  process.stdout.write(`Source tag: ${SOURCE_TAG}\n`);
  process.stdout.write(`Affected users: ${targets.userIds.length}\n`);
  process.stdout.write(`Baseline-tagged orders: ${targets.baselineOrderIds.length}\n`);
  process.stdout.write(`All orders for affected users: ${targets.orderIds.length}\n`);
  process.stdout.write(`Non-baseline orders for affected users: ${targets.nonBaselineOrderIds.length}\n`);
  process.stdout.write(`Order items: ${targets.orderItemIds.length}\n`);
  process.stdout.write(`Commission rows: ${targets.commissionIds.length}\n`);
  process.stdout.write(`Company bonus rows: ${targets.companyBonusIds.length}\n`);
  process.stdout.write(`Wallet transactions: ${targets.walletTransactionIds.length}\n`);
  process.stdout.write(`Wallets: ${targets.walletIds.length}\n`);
  process.stdout.write(`Member package cycles: ${targets.memberPackageCycleIds.length}\n`);
  process.stdout.write(`Cap buckets: ${targets.capBucketIds.length}\n`);
  process.stdout.write(`Cap ledgers: ${targets.capLedgerIds.length}\n`);
  process.stdout.write(`Buyback events: ${targets.buybackEventIds.length}\n`);
  process.stdout.write(`Buyback progress rows: ${targets.userBuybackProgressIds.length}\n`);
  process.stdout.write(`Daily pool cycles: ${targets.dailyPoolCycleIds.length}\n`);
  process.stdout.write(`Daily pool eligibility snapshots: ${targets.dailyPoolEligibilitySnapshotIds.length}\n`);
  process.stdout.write(`Daily pool payouts: ${targets.dailyPoolPayoutIds.length}\n`);
  process.stdout.write(`Daily commission cap rows: ${targets.dailyCommissionCapUsageIds.length}\n`);
  process.stdout.write(`Team settlement batches: ${targets.teamSettlementBatchIds.length}\n`);
  process.stdout.write(`Team settlement batch items: ${targets.teamSettlementBatchItemIds.length}\n`);
  process.stdout.write(`Pool settlement batches: ${targets.poolSettlementBatchIds.length}\n`);
  process.stdout.write(`Pool settlement batch items: ${targets.poolSettlementBatchItemIds.length}\n`);
  process.stdout.write(`Matrix cycles: ${targets.matrixCycleIds.length}\n`);
  process.stdout.write(`Matrix boards: ${targets.matrixBoardIds.length}\n`);
  process.stdout.write(`Matrix positions: ${targets.matrixPositionIds.length}\n`);
  process.stdout.write(`Matrix payouts: ${targets.matrixPayoutIds.length}\n`);
  process.stdout.write(`Matrix accumulation events: ${targets.matrixAccumulationEventIds.length}\n`);
  process.stdout.write(`Matrix holdback accounts: ${targets.matrixHoldbackAccountIds.length}\n`);
  process.stdout.write(`Matrix reorders: ${targets.matrixReorderIds.length}\n`);
  process.stdout.write(`Approved dates: ${targets.approvedDates.join(", ") || "(none)"}\n`);
}

async function deleteIds(tx, table, ids) {
  const inClause = idIn(ids);
  if (!inClause) {
    return;
  }

  await tx.$executeRawUnsafe(`delete from ${table} where id in (${inClause})`);
}

async function applyCleanup(targets) {
  const survivingBoardIds = targets.impactedBoardIds.filter(
    (id) => !targets.matrixBoardIds.includes(id),
  );
  const survivingCycleIds = targets.impactedCycleIds.filter(
    (id) => !targets.matrixCycleIds.includes(id),
  );

  await prisma.$transaction(async (tx) => {
    await deleteIds(tx, '"DailyPoolPayout"', targets.dailyPoolPayoutIds);
    await deleteIds(
      tx,
      '"DailyPoolEligibilitySnapshot"',
      targets.dailyPoolEligibilitySnapshotIds,
    );
    await deleteIds(tx, '"DailyPoolCycle"', targets.dailyPoolCycleIds);
    await deleteIds(tx, '"PoolSettlementBatchItem"', targets.poolSettlementBatchItemIds);
    await deleteIds(tx, '"PoolSettlementBatch"', targets.poolSettlementBatchIds);
    await deleteIds(tx, '"TeamSettlementBatchItem"', targets.teamSettlementBatchItemIds);
    await deleteIds(tx, '"TeamSettlementBatch"', targets.teamSettlementBatchIds);
    await deleteIds(tx, '"DailyCommissionCapUsage"', targets.dailyCommissionCapUsageIds);

    await deleteIds(tx, '"CapLedger"', targets.capLedgerIds);
    await deleteIds(tx, '"CapBucket"', targets.capBucketIds);
    await deleteIds(tx, '"WalletTransaction"', targets.walletTransactionIds);
    await deleteIds(tx, '"CompanyBonusLedger"', targets.companyBonusIds);
    await deleteIds(tx, '"BuybackEvent"', targets.buybackEventIds);
    await deleteIds(tx, '"UserBuybackProgress"', targets.userBuybackProgressIds);

    await deleteIds(tx, '"MatrixReorder"', targets.matrixReorderIds);
    await deleteIds(tx, '"MatrixPayout"', targets.matrixPayoutIds);
    await deleteIds(tx, '"MatrixAccumulationEvent"', targets.matrixAccumulationEventIds);
    await deleteIds(tx, '"MatrixPosition"', targets.matrixPositionIds);
    await deleteIds(tx, '"MatrixBoard"', targets.matrixBoardIds);
    await deleteIds(tx, '"MatrixHoldbackAccount"', targets.matrixHoldbackAccountIds);
    await deleteIds(tx, '"MatrixCycle"', targets.matrixCycleIds);

    await deleteIds(tx, '"CommissionLedger"', targets.commissionIds);
    await deleteIds(tx, '"OrderItem"', targets.orderItemIds);
    await deleteIds(tx, '"Order"', targets.orderIds);
    await deleteIds(tx, '"MemberPackageCycle"', targets.memberPackageCycleIds);
    await deleteIds(tx, '"Wallet"', targets.walletIds);

    const userIn = idIn(targets.userIds);
    if (userIn) {
      await tx.$executeRawUnsafe(`
        update "User"
        set "matrixPersonalPv" = 0
        where id in (${userIn})
      `);
    }

    const boardIn = idIn(survivingBoardIds);
    const cycleIn = idIn(survivingCycleIds);

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
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const baselineOrders = await loadBaselineOrders();
  const targets = await loadTargets(baselineOrders);

  printSummary(targets, options);

  if (targets.userIds.length === 0) {
    process.stdout.write("No baseline-tagged orders found. Nothing to clean.\n");
    return;
  }

  if (
    targets.nonBaselineOrderIds.length > 0 &&
    !options.allowOtherOrders
  ) {
    process.stdout.write(
      "Guard: found non-baseline orders for affected users. Re-run with --allow-other-orders if you want a full runtime reset for those users.\n",
    );
    return;
  }

  if (!options.apply) {
    process.stdout.write("No changes applied. Re-run with --apply to delete.\n");
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
