import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const fixturePath = resolve(process.argv[2] ?? "scripts/member003-members.json");
const apply = process.argv.includes("--apply");
const sqlOnly = process.argv.includes("--sql-only");
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/poolproject";

function sqlLiteral(value) {
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function loadMemberCodes(path) {
  const payload = JSON.parse(readFileSync(path, "utf8"));
  const members = Array.isArray(payload?.members) ? payload.members : [];
  const codes = members
    .map((member) => String(member?.memberId ?? member?.memberCode ?? "").trim().toUpperCase())
    .filter(Boolean);

  return Array.from(new Set(codes)).sort();
}

function buildSql(memberCodes) {
  if (memberCodes.length === 0) {
    throw new Error(`No member codes found in ${fixturePath}`);
  }

  const keepList = memberCodes.map(sqlLiteral).join(", ");

  return `
begin;

delete from public."ManualReviewCase";
delete from public."PayoutHold";
delete from public."MemberRiskFlag";
delete from public."WalletBindingHistory";
delete from public."PayoutBatchItem";
delete from public."PayoutBatch";
delete from public."MatrixAccumulationEvent";
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
delete from public."CompanyBonusLedger";
delete from public."CommissionLedger";
delete from public."OrderItem";
delete from public."Order";
delete from public."MemberPackageCycle";
delete from public."MemberShippingAddress";

delete from public."MemberProfile"
where "userId" in (
  select "id"
  from public."User"
  where coalesce("isAdmin", false) = false
);

update public."User"
set
  "sponsorId" = null,
  "updatedAt" = now()
where coalesce("isAdmin", false) = false;

delete from public."User"
where coalesce("isAdmin", false) = false
  and upper("memberCode") not in (${keepList});

commit;
`.trimStart();
}

function applySql(sql) {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      "poolproject-postgres",
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      databaseUrl,
    ],
    {
      input: sql,
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to reset member003 baseline.");
  }
}

const memberCodes = loadMemberCodes(fixturePath);
const sql = buildSql(memberCodes);

process.stdout.write(`member003_count=${memberCodes.length}\n`);
process.stdout.write(`fixture=${fixturePath}\n`);

if (sqlOnly) {
  process.stdout.write(sql);
  process.stdout.write("\n");
  process.exit(0);
}

if (apply) {
  applySql(sql);
  process.stdout.write("apply=ok\n");
  process.exit(0);
}

process.stdout.write("dry_run=yes\n");
