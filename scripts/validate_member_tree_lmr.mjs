import { spawnSync } from "node:child_process";

const container = process.env.POSTGRES_DOCKER_CONTAINER || "poolproject-postgres";
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/poolproject";

function runQuery(sql) {
  const result = spawnSync(
    "docker",
    ["exec", "-i", container, "psql", "-At", databaseUrl, "-c", sql],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "query failed");
  }

  return (result.stdout || "").trim();
}

function readCount(name, sql) {
  const output = runQuery(sql);
  const count = Number(output || "0");
  if (!Number.isFinite(count)) {
    throw new Error(`invalid count for ${name}: ${output}`);
  }
  return { name, count };
}

function main() {
  const checks = [
    readCount(
      "non_admin_users",
      `select count(*) from public."User" where coalesce("isAdmin", false) = false;`,
    ),
    readCount(
      "missing_member_profile",
      `select count(*) from public."User" u
       left join public."MemberProfile" mp on mp."userId" = u."id"
       where coalesce(u."isAdmin", false) = false
         and mp."id" is null;`,
    ),
    readCount(
      "upline_not_found",
      `select count(*) from public."MemberProfile" mp
       left join public."User" up on up."id" = mp."uplineUserId"
       where mp."uplineUserId" is not null
         and up."id" is null;`,
    ),
    readCount(
      "self_upline",
      `select count(*) from public."MemberProfile"
       where "uplineUserId" is not null
         and "uplineUserId" = "userId";`,
    ),
    readCount(
      "upline_with_null_side",
      `select count(*) from public."MemberProfile"
       where "uplineUserId" is not null
         and "placementSide" is null;`,
    ),
    readCount(
      "side_without_upline",
      `select count(*) from public."MemberProfile"
       where "uplineUserId" is null
         and "placementSide" is not null;`,
    ),
    readCount(
      "duplicate_upline_side_slots",
      `select count(*) from (
         select "uplineUserId", "placementSide", count(*) as c
         from public."MemberProfile"
         where "uplineUserId" is not null
           and "placementSide" is not null
         group by "uplineUserId", "placementSide"
         having count(*) > 1
       ) t;`,
    ),
    readCount(
      "user_sponsor_self",
      `select count(*) from public."User"
       where coalesce("isAdmin", false) = false
         and "sponsorId" = "id";`,
    ),
    readCount(
      "user_sponsor_cycle",
      `with recursive walk as (
         select u."id" as start_id, u."sponsorId" as next_id, 1 as depth
         from public."User" u
         where coalesce(u."isAdmin", false) = false
           and u."sponsorId" is not null
         union all
         select walk.start_id, u."sponsorId", walk.depth + 1
         from walk
         join public."User" u on u."id" = walk.next_id
         where walk.next_id is not null
           and walk.depth < 500
       )
       select count(distinct start_id)
       from walk
       where next_id = start_id;`,
    ),
    readCount(
      "memberprofile_upline_cycle",
      `with recursive walk as (
         select mp."userId" as start_id, mp."uplineUserId" as next_id, 1 as depth
         from public."MemberProfile" mp
         where mp."uplineUserId" is not null
         union all
         select walk.start_id, mp."uplineUserId", walk.depth + 1
         from walk
         join public."MemberProfile" mp on mp."userId" = walk.next_id
         where walk.next_id is not null
           and walk.depth < 500
       )
       select count(distinct start_id)
       from walk
       where next_id = start_id;`,
    ),
  ];

  console.log(`container=${container}`);
  console.log(`database_url=${databaseUrl}`);
  for (const item of checks) {
    console.log(`${item.name}=${item.count}`);
  }

  const errorChecks = checks.filter(
    (item) => item.name !== "non_admin_users" && item.count > 0,
  );

  if (errorChecks.length > 0) {
    console.error("result=fail");
    process.exit(1);
  }

  console.log("result=ok");
}

main();
