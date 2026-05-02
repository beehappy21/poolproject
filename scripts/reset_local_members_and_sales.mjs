import { spawnSync } from "node:child_process";

const apply = process.argv.includes("--apply");
const sqlOnly = process.argv.includes("--sql-only");
const allowDestructiveReset = process.env.ALLOW_DESTRUCTIVE_LOCAL_RESET === "1";
const container = process.env.POSTGRES_DOCKER_CONTAINER || "poolproject-postgres";
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/poolproject";

function runPsql(args, input) {
  const result = spawnSync("docker", ["exec", "-i", container, "psql", ...args, databaseUrl], {
    input,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql execution failed");
  }

  return (result.stdout || "").trim();
}

function preflightCounts() {
  const sql = `
select 'users_total' as metric, count(*)::text as value from public."User"
union all
select 'users_non_admin', count(*)::text from public."User" where coalesce("isAdmin", false) = false
union all
select 'orders_total', count(*)::text from public."Order"
union all
select 'order_items_total', count(*)::text from public."OrderItem"
union all
select 'wallet_tx_total', count(*)::text from public."WalletTransaction"
union all
select 'topup_total', count(*)::text from public."WalletTopupRequest"
union all
select 'withdraw_total', count(*)::text from public."WithdrawRequest"
union all
select 'line_bindings_total', count(*)::text from public."LineBinding";
`.trim();

  return runPsql(["-At", "-c", sql]);
}

function buildSql() {
  return `
begin;

-- 1) Purge transaction and workflow data.
delete from public."ManualReviewCase";
delete from public."PayoutHold";
delete from public."MemberRiskFlag";
delete from public."WalletBindingHistory";
delete from public."PayoutBatchItem";
delete from public."PayoutBatch";
delete from public."MatrixAccumulationEvent";
delete from public."MatrixReorder";
delete from public."MatrixHoldbackAccount";
delete from public."MatrixPayout";
delete from public."MatrixPosition";
delete from public."MatrixBoard";
delete from public."MatrixCycle";
delete from public."KycRequest";
delete from public."WithdrawRequest";
delete from public."WalletTopupRequest";
delete from public."WalletTransaction";
delete from public."Wallet";
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
delete from public."CapLedger";
delete from public."CapBucket";
delete from public."OrderItem";
delete from public."Order";
delete from public."ProductReview";
delete from public."MemberPackageCycle";
delete from public."MemberShippingAddress";

-- 2) Purge member-linked entities.
delete from public."LineBinding";
delete from public."MemberProfile";

-- 3) Delete non-admin users only (keep BAO admins).
update public."User"
set "sponsorId" = null,
    "updatedAt" = now()
where coalesce("isAdmin", false) = false;

delete from public."User"
where coalesce("isAdmin", false) = false;

-- 4) Reset identities for key tables.
alter sequence if exists public."User_id_seq" restart with 1;
alter sequence if exists public."Order_id_seq" restart with 1;
alter sequence if exists public."OrderItem_id_seq" restart with 1;
alter sequence if exists public."WalletTransaction_id_seq" restart with 1;
alter sequence if exists public."WalletTopupRequest_id_seq" restart with 1;
alter sequence if exists public."WithdrawRequest_id_seq" restart with 1;
alter sequence if exists public."MemberProfile_id_seq" restart with 1;
alter sequence if exists public."LineBinding_id_seq" restart with 1;
alter sequence if exists public."CapBucket_id_seq" restart with 1;
alter sequence if exists public."CapLedger_id_seq" restart with 1;

commit;
`.trimStart();
}

function applySql(sql) {
  runPsql(["-v", "ON_ERROR_STOP=1"], sql);
}

function main() {
  const before = preflightCounts();
  const sql = buildSql();

  process.stdout.write(`container=${container}\n`);
  process.stdout.write(`database_url=${databaseUrl}\n`);
  process.stdout.write("preflight_before\n");
  process.stdout.write(before + "\n");

  if (sqlOnly) {
    process.stdout.write(sql + "\n");
    return;
  }

  if (!apply) {
    process.stdout.write("dry_run=yes\n");
    process.stdout.write("tip=rerun with --sql-only to inspect SQL, or --apply with ALLOW_DESTRUCTIVE_LOCAL_RESET=1\n");
    return;
  }

  if (!allowDestructiveReset) {
    throw new Error(
      "Refusing destructive reset. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 and rerun with --apply.",
    );
  }

  applySql(sql);
  const after = preflightCounts();
  process.stdout.write("apply=ok\n");
  process.stdout.write("preflight_after\n");
  process.stdout.write(after + "\n");
}

main();
