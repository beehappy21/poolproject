import { spawnSync } from "node:child_process";

const apply = process.argv.includes("--apply");
const sqlOnly = process.argv.includes("--sql-only");
const allowDestructiveReset = process.env.ALLOW_DESTRUCTIVE_LOCAL_RESET === "1";
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/poolproject?schema=public";
const dockerContainer = process.env.POSTGRES_DOCKER_CONTAINER || "poolproject-postgres";
const parsedDatabaseUrl = new URL(databaseUrl);
const psqlDatabaseName = parsedDatabaseUrl.pathname.replace(/^\//, "") || "poolproject";
const psqlUser = parsedDatabaseUrl.username || "postgres";

const clearTables = [
  "PayoutBatchItem",
  "PayoutBatch",
  "MatrixReorder",
  "MatrixHoldbackAccount",
  "MatrixAccumulationEvent",
  "MatrixPayout",
  "MatrixPosition",
  "MatrixBoard",
  "MatrixCycle",
  "DailyPoolPayout",
  "DailyPoolEligibilitySnapshot",
  "DailyPoolCycle",
  "CompanyBonusLedger",
  "CommissionLedger",
  "OrderItem",
  "Order",
  "MemberPackageCycle",
  "WalletTransaction",
  "WalletTopupRequest",
  "WithdrawRequest",
  "ProductReview",
  "PayoutHold",
  "ManualReviewCase",
];

const keepTables = [
  "User",
  "MemberProfile",
  "MemberShippingAddress",
  "LineBinding",
  "Supplier",
  "ProductCategory",
  "Product",
  "ProductDetail",
  "Package",
  "PackageItem",
];

const resetEntities = [
  "Wallet balances and payout lock state",
  "User.matrixPersonalPv",
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
  const deleteSql = clearTables
    .map(buildConditionalDeleteSql)
    .join("\n");
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
  "firmBalance" = 0,
  "paidOutBalance" = 0,
  "negativeOffsetBalance" = 0,
  "payoutLockStatus" = 'UNLOCKED',
  "payoutLockReason" = null,
  "updatedAt" = now();

update public."User"
set
  "matrixPersonalPv" = 0,
  "updatedAt" = now();

${sequenceSql}

commit;
`.trimStart();
}

function runSql(sql) {
  const result = spawnSync(
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
    ],
    {
      input: sql,
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to reset retest runtime state.");
  }

  return result.stdout || "";
}

const sql = buildSql();

process.stdout.write("reset_scope=retest_runtime\n");
process.stdout.write(`database=${databaseUrl}\n`);
process.stdout.write(`docker_container=${dockerContainer}\n`);
process.stdout.write(`psql_user=${psqlUser}\n`);
process.stdout.write(`psql_database=${psqlDatabaseName}\n`);
process.stdout.write(`keep_tables=${keepTables.join(",")}\n`);
process.stdout.write(`reset_entities=${resetEntities.join(",")}\n`);
process.stdout.write(`clear_tables=${clearTables.join(",")}\n`);

if (sqlOnly) {
  process.stdout.write(sql);
  process.stdout.write("\n");
  process.exit(0);
}

if (apply) {
  if (!allowDestructiveReset) {
    throw new Error(
      "Refusing to apply destructive runtime reset. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 to continue.",
    );
  }

  runSql(sql);
  process.stdout.write("apply=ok\n");
  process.exit(0);
}

process.stdout.write("dry_run=yes\n");
