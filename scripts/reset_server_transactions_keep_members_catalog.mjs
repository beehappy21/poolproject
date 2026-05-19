import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const sqlOnly = args.has("--sql-only");
const help = args.has("--help") || args.has("-h");
const allowDestructive =
  process.env.ALLOW_DESTRUCTIVE_UAT_RESET === "1" ||
  process.env.ALLOW_DESTRUCTIVE_SERVER_RESET === "1";

const databaseUrl = process.env.DATABASE_URL || "";
const postgresContainer =
  process.env.POSTGRES_DOCKER_CONTAINER ||
  process.env.POSTGRES_CONTAINER ||
  "poolproject-postgres";
const postgresDb = process.env.POSTGRES_DB || "poolproject";
const postgresUser = process.env.POSTGRES_USER || "postgres";

function usage() {
  process.stdout.write(`Usage:
  node scripts/reset_server_transactions_keep_members_catalog.mjs
  node scripts/reset_server_transactions_keep_members_catalog.mjs --sql-only
  ALLOW_DESTRUCTIVE_UAT_RESET=1 node scripts/reset_server_transactions_keep_members_catalog.mjs --apply

What it keeps:
  - User / MemberProfile / LineBinding / member tree
  - ProductCategory / Product / ProductDetail / Package / PackageItem
  - member shipping addresses

What it clears:
  - orders and order items
  - commissions, company bonus, CAP, pool, team settlement, buyback, matrix runtime
  - wallet transactions, topup requests, withdraw requests
  - payout batches and related runtime rows
  - wallet balances are reset to zero, but wallet rows are preserved

Database access:
  1. If DATABASE_URL is set, the script uses local psql against that URL.
  2. Otherwise it uses docker exec against POSTGRES_CONTAINER/POSTGRES_DB/POSTGRES_USER.

Safety:
  - dry-run is the default
  - destructive apply requires both --apply and ALLOW_DESTRUCTIVE_UAT_RESET=1
`);
}

function runCommand(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    input: options.input,
    stdio: "pipe",
    env: options.env || process.env,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} failed`);
  }

  return (result.stdout || "").trim();
}

function runSql(sql, extraArgs = []) {
  if (databaseUrl) {
    return runCommand("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", ...extraArgs], {
      input: sql,
    });
  }

  return runCommand(
    "docker",
    [
      "exec",
      "-i",
      postgresContainer,
      "psql",
      "-U",
      postgresUser,
      "-d",
      postgresDb,
      "-v",
      "ON_ERROR_STOP=1",
      ...extraArgs,
    ],
    { input: sql },
  );
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
select 'member_package_cycles_total', count(*)::text from public."MemberPackageCycle"
union all
select 'special_commission_cycle_grant_total', count(*)::text from public."SpecialCommissionCycleGrant"
union all
select 'commission_ledger_total', count(*)::text from public."CommissionLedger"
union all
select 'company_bonus_total', count(*)::text from public."CompanyBonusLedger"
union all
select 'daily_pool_payout_total', count(*)::text from public."DailyPoolPayout"
union all
select 'team_settlement_batch_total', count(*)::text from public."TeamSettlementBatch"
union all
select 'pool_settlement_batch_total', count(*)::text from public."PoolSettlementBatch"
union all
select 'wallet_rows_total', count(*)::text from public."Wallet"
union all
select 'wallet_nonzero_total', count(*)::text
from public."Wallet"
where coalesce("approvedBalance", 0) <> 0
   or coalesce("heldBalance", 0) <> 0
   or coalesce("withdrawableBalance", 0) <> 0
   or coalesce("shoppingBalance", 0) <> 0
   or coalesce("discountBalance", 0) <> 0
   or coalesce("firmBalance", 0) <> 0
   or coalesce("paidOutBalance", 0) <> 0
   or coalesce("negativeOffsetBalance", 0) <> 0
union all
select 'wallet_tx_total', count(*)::text from public."WalletTransaction"
union all
select 'wallet_topup_total', count(*)::text from public."WalletTopupRequest"
union all
select 'withdraw_request_total', count(*)::text from public."WithdrawRequest"
union all
select 'cap_bucket_total', count(*)::text from public."CapBucket"
union all
select 'cap_ledger_total', count(*)::text from public."CapLedger"
union all
select 'buyback_event_total', count(*)::text from public."BuybackEvent"
union all
select 'user_buyback_progress_total', count(*)::text from public."UserBuybackProgress"
union all
select 'matrix_cycle_total', count(*)::text from public."MatrixCycle"
union all
select 'matrix_board_total', count(*)::text from public."MatrixBoard"
union all
select 'matrix_position_total', count(*)::text from public."MatrixPosition"
union all
select 'matrix_payout_total', count(*)::text from public."MatrixPayout"
union all
select 'payout_batch_total', count(*)::text from public."PayoutBatch"
union all
select 'payout_batch_item_total', count(*)::text from public."PayoutBatchItem"
order by metric asc;
`.trim();
}

function buildResetSql() {
  return `
begin;

delete from public."PayoutBatchItem";
delete from public."PayoutBatch";
delete from public."PayoutHold";

delete from public."DailyPoolPayout";
delete from public."DailyPoolEligibilitySnapshot";
delete from public."DailyPoolCycle";
delete from public."DailyCommissionCapUsage";
delete from public."PoolSettlementBatchItem";
delete from public."PoolSettlementBatch";
delete from public."TeamSettlementBatchItem";
delete from public."TeamSettlementBatch";

delete from public."CompanyBonusLedger";
delete from public."CommissionLedger";
delete from public."BuybackEvent";
delete from public."UserBuybackProgress";
delete from public."SpecialCommissionCycleGrant";
delete from public."CapLedger";
delete from public."CapBucket";

delete from public."MatrixAccumulationEvent";
delete from public."MatrixReorder";
delete from public."MatrixHoldbackAccount";
delete from public."MatrixPayout";
delete from public."MatrixPosition";
delete from public."MatrixBoard";
delete from public."MatrixCycle";

delete from public."WalletTopupRequest";
delete from public."WithdrawRequest";
delete from public."WalletTransaction";

delete from public."OrderItem";
delete from public."Order";
delete from public."MemberPackageCycle";

update public."Wallet"
set "approvedBalance" = 0,
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
set "matrixPersonalPv" = 0,
    "updatedAt" = now()
where coalesce("matrixPersonalPv", 0) <> 0;

alter sequence if exists public."Order_id_seq" restart with 1;
alter sequence if exists public."OrderItem_id_seq" restart with 1;
alter sequence if exists public."CommissionLedger_id_seq" restart with 1;
alter sequence if exists public."CompanyBonusLedger_id_seq" restart with 1;
alter sequence if exists public."DailyPoolPayout_id_seq" restart with 1;
alter sequence if exists public."DailyPoolEligibilitySnapshot_id_seq" restart with 1;
alter sequence if exists public."DailyPoolCycle_id_seq" restart with 1;
alter sequence if exists public."DailyCommissionCapUsage_id_seq" restart with 1;
alter sequence if exists public."PoolSettlementBatch_id_seq" restart with 1;
alter sequence if exists public."PoolSettlementBatchItem_id_seq" restart with 1;
alter sequence if exists public."TeamSettlementBatch_id_seq" restart with 1;
alter sequence if exists public."TeamSettlementBatchItem_id_seq" restart with 1;
alter sequence if exists public."WalletTransaction_id_seq" restart with 1;
alter sequence if exists public."WalletTopupRequest_id_seq" restart with 1;
alter sequence if exists public."WithdrawRequest_id_seq" restart with 1;
alter sequence if exists public."CapBucket_id_seq" restart with 1;
alter sequence if exists public."CapLedger_id_seq" restart with 1;
alter sequence if exists public."BuybackEvent_id_seq" restart with 1;
alter sequence if exists public."UserBuybackProgress_id_seq" restart with 1;
alter sequence if exists public."SpecialCommissionCycleGrant_id_seq" restart with 1;
alter sequence if exists public."MatrixCycle_id_seq" restart with 1;
alter sequence if exists public."MatrixBoard_id_seq" restart with 1;
alter sequence if exists public."MatrixPosition_id_seq" restart with 1;
alter sequence if exists public."MatrixPayout_id_seq" restart with 1;
alter sequence if exists public."MatrixHoldbackAccount_id_seq" restart with 1;
alter sequence if exists public."MatrixReorder_id_seq" restart with 1;
alter sequence if exists public."MatrixAccumulationEvent_id_seq" restart with 1;
alter sequence if exists public."PayoutBatch_id_seq" restart with 1;
alter sequence if exists public."PayoutBatchItem_id_seq" restart with 1;
alter sequence if exists public."PayoutHold_id_seq" restart with 1;
alter sequence if exists public."MemberPackageCycle_id_seq" restart with 1;

commit;
`.trimStart();
}

function main() {
  if (help) {
    usage();
    return;
  }

  const sql = buildResetSql();

  process.stdout.write(`database_mode=${databaseUrl ? "DATABASE_URL" : "docker"}\n`);
  if (databaseUrl) {
    process.stdout.write(`database_url=${databaseUrl}\n`);
  } else {
    process.stdout.write(`postgres_container=${postgresContainer}\n`);
    process.stdout.write(`postgres_db=${postgresDb}\n`);
    process.stdout.write(`postgres_user=${postgresUser}\n`);
  }

  if (sqlOnly) {
    process.stdout.write(sql + "\n");
    return;
  }

  const before = runSql(buildPreflightSql(), ["-At", "-f", "-"]);
  process.stdout.write("preflight_before\n");
  process.stdout.write(before + "\n");

  if (!apply) {
    process.stdout.write("dry_run=yes\n");
    process.stdout.write(
      "tip=rerun with --sql-only to inspect SQL, or with ALLOW_DESTRUCTIVE_UAT_RESET=1 --apply to execute\n",
    );
    return;
  }

  if (!allowDestructive) {
    throw new Error(
      "Refusing destructive reset. Set ALLOW_DESTRUCTIVE_UAT_RESET=1 and rerun with --apply.",
    );
  }

  runSql(sql, ["-f", "-"]);
  const after = runSql(buildPreflightSql(), ["-At", "-f", "-"]);
  process.stdout.write("apply=ok\n");
  process.stdout.write("preflight_after\n");
  process.stdout.write(after + "\n");
}

main();
