import { spawnSync } from "node:child_process";

const apply = process.argv.includes("--apply");
const sqlOnly = process.argv.includes("--sql-only");
const allowDestructiveReset = process.env.ALLOW_DESTRUCTIVE_LOCAL_RESET === "1";
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/poolproject?schema=public";
const dockerContainer =
  process.env.POSTGRES_DOCKER_CONTAINER || "poolproject-postgres";
const parsedDatabaseUrl = new URL(databaseUrl);
const psqlDatabaseName =
  parsedDatabaseUrl.pathname.replace(/^\//, "") || "poolproject";
const psqlUser = parsedDatabaseUrl.username || "postgres";
const preferredPsqlMode = process.env.TESTSYSTEM_PSQL_MODE || "auto";

const clearTables = [
  "DailyPoolPayout",
  "DailyPoolEligibilitySnapshot",
  "DailyPoolCycle",
  "PoolSettlementBatchItem",
  "PoolSettlementBatch",
  "TeamSettlementBatchItem",
  "TeamSettlementBatch",
  "DailyCommissionCapUsage",
  "BuybackEvent",
  "UserBuybackProgress",
  "CapLedger",
  "CapBucket",
  "CompanyBonusLedger",
  "CommissionLedger",
  "WalletTransaction",
  "OrderItem",
  "Order",
  "MemberPackageCycle",
];

const keepTables = [
  "User",
  "MemberProfile",
  "MemberShippingAddress",
  "Supplier",
  "ProductCategory",
  "Product",
  "ProductDetail",
  "Package",
  "PackageItem",
  "WalletTopupRequest",
  "WithdrawRequest",
];

function buildSequenceResetSql(tableName) {
  return `
do $$
begin
  if to_regclass('public."${tableName}"') is not null then
    perform setval(pg_get_serial_sequence('public."${tableName}"', 'id'), 1, false);
  end if;
end $$;`.trim();
}

function buildConditionalDeleteSql(tableName) {
  return `
do $$
begin
  if to_regclass('public."${tableName}"') is not null then
    execute 'delete from public."${tableName}"';
  end if;
end $$;`.trim();
}

function buildSql() {
  const deleteSql = clearTables.map(buildConditionalDeleteSql).join("\n");
  const sequenceSql = clearTables.map(buildSequenceResetSql).join("\n");

  return `
begin;

${deleteSql}

update public."Wallet"
set
  "approvedBalance" = 0,
  "heldBalance" = 0,
  "withdrawableBalance" = 0,
  "shoppingBalance" = 0,
  "discountBalance" = 0,
  "paidOutBalance" = 0,
  "negativeOffsetBalance" = 0,
  "payoutLockStatus" = 'UNLOCKED',
  "payoutLockReason" = null,
  "updatedAt" = now();

${sequenceSql}

commit;
`.trimStart();
}

function buildPreflightSql() {
  return `
select 'users_total' as metric, count(*)::text as value from public."User"
union all
select 'products_total', count(*)::text from public."Product"
union all
select 'product_details_total', count(*)::text from public."ProductDetail"
union all
select 'packages_total', count(*)::text from public."Package"
union all
select 'orders_total', count(*)::text from public."Order"
union all
select 'order_items_total', count(*)::text from public."OrderItem"
union all
select 'commission_ledger_total', count(*)::text from public."CommissionLedger"
union all
select 'company_bonus_total', count(*)::text from public."CompanyBonusLedger"
union all
select 'daily_pool_payout_total', count(*)::text from public."DailyPoolPayout"
union all
select 'wallet_tx_total', count(*)::text from public."WalletTransaction"
union all
select 'member_cycles_total', count(*)::text from public."MemberPackageCycle";
`.trim();
}

function runDockerPsql(sql, options = {}) {
  return spawnSync(
    "docker",
    [
      "exec",
      "-i",
      dockerContainer,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      psqlUser,
      "-d",
      psqlDatabaseName,
      ...(options.atOnly ? ["-At"] : []),
    ],
    {
      input: sql,
      encoding: "utf8",
    },
  );
}

function runDirectPsql(sql, options = {}) {
  return spawnSync(
    "psql",
    [
      databaseUrl,
      "-v",
      "ON_ERROR_STOP=1",
      ...(options.atOnly ? ["-At"] : []),
    ],
    {
      input: sql,
      encoding: "utf8",
    },
  );
}

function formatFailure(result) {
  return result.stderr || result.stdout || "psql execution failed.";
}

function runSql(sql, options = {}) {
  const attempts = [];

  if (preferredPsqlMode === "docker") {
    attempts.push(() => runDockerPsql(sql, options));
  } else if (preferredPsqlMode === "direct") {
    attempts.push(() => runDirectPsql(sql, options));
  } else {
    attempts.push(() => runDockerPsql(sql, options));
    attempts.push(() => runDirectPsql(sql, options));
  }

  const failures = [];
  for (const attempt of attempts) {
    const result = attempt();
    if (result.status === 0) {
      return result.stdout || "";
    }
    failures.push(formatFailure(result));
  }

  throw new Error(
    `Failed to reset sales/commission runtime state.\n\n${failures.join("\n---\n")}`,
  );
}

const sql = buildSql();
const preflightSql = buildPreflightSql();

process.stdout.write("reset_scope=testsystem_sales_commission_runtime\n");
process.stdout.write(`database=${databaseUrl}\n`);
process.stdout.write(`docker_container=${dockerContainer}\n`);
process.stdout.write(`psql_user=${psqlUser}\n`);
process.stdout.write(`psql_database=${psqlDatabaseName}\n`);
process.stdout.write(`psql_mode=${preferredPsqlMode}\n`);
process.stdout.write(`keep_tables=${keepTables.join(",")}\n`);
process.stdout.write(`clear_tables=${clearTables.join(",")}\n`);
process.stdout.write("preflight_before\n");
process.stdout.write(runSql(preflightSql, { atOnly: true }));

if (sqlOnly) {
  process.stdout.write(sql);
  process.stdout.write("\n");
  process.exit(0);
}

if (apply) {
  if (!allowDestructiveReset) {
    throw new Error(
      "Refusing destructive reset. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 to continue.",
    );
  }

  runSql(sql);
  process.stdout.write("apply=ok\n");
  process.stdout.write("preflight_after\n");
  process.stdout.write(runSql(preflightSql, { atOnly: true }));
  process.exit(0);
}

process.stdout.write("dry_run=yes\n");
process.stdout.write(
  "tip=rerun with --sql-only to inspect SQL, or use npm run testsystem:reset:sales-commissions:apply when ready\n",
);
