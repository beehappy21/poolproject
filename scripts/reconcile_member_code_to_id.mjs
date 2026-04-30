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

function buildSql() {
  return `
begin;

update public."User"
set
  "memberCode" = "id"::text,
  "updatedAt" = now()
where coalesce("isAdmin", false) = false
  and "memberCode" is distinct from "id"::text;

update public."User"
set
  "referralCode" = "memberCode",
  "updatedAt" = now()
where coalesce("isAdmin", false) = false
  and ("referralCode" is null or "referralCode" is distinct from "memberCode");

commit;
`.trimStart();
}

function verificationSql() {
  return `
select count(*)::text as mismatch_count
from public."User"
where coalesce("isAdmin", false) = false
  and "memberCode" is distinct from "id"::text;
`.trim();
}

function main() {
  const sql = buildSql();

  process.stdout.write(`container=${container}\n`);
  process.stdout.write(`database_url=${databaseUrl}\n`);

  if (sqlOnly) {
    process.stdout.write(sql + "\n");
    return;
  }

  if (!apply) {
    process.stdout.write("dry_run=yes\n");
    process.stdout.write("tip=rerun with --apply (requires ALLOW_DESTRUCTIVE_LOCAL_RESET=1)\n");
    return;
  }

  if (!allowDestructiveReset) {
    throw new Error(
      "Refusing update. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 and rerun with --apply.",
    );
  }

  runPsql(["-v", "ON_ERROR_STOP=1"], sql);
  const verify = runPsql(["-At", "-c", verificationSql()]);
  process.stdout.write("apply=ok\n");
  process.stdout.write(`mismatch_count=${verify}\n`);
}

main();
