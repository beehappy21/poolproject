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
    throw new Error(result.stderr || result.stdout || "psql failed");
  }
  return (result.stdout || "").trim();
}

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function normalizeMemberCode(code) {
  return String(code ?? "").trim().toUpperCase();
}

function memberCodeSort(a, b) {
  const aCode = normalizeMemberCode(a);
  const bCode = normalizeMemberCode(b);
  const aNum = Number((aCode.match(/\d+/)?.[0] ?? ""));
  const bNum = Number((bCode.match(/\d+/)?.[0] ?? ""));
  if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
    return aNum - bNum;
  }
  return aCode.localeCompare(bCode);
}

function readUsers() {
  const sql = `
select
  u."id"::text,
  u."memberCode",
  coalesce(u."sponsorId"::text, '')
from public."User" u
where coalesce(u."isAdmin", false) = false
order by u."id";
`.trim();

  const output = runPsql(["-At", "-c", sql]);
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, memberCode, sponsorId] = line.split("|");
      return {
        id: Number(id),
        memberCode,
        sponsorId: sponsorId ? Number(sponsorId) : null,
      };
    });
}

function buildAssignments(users) {
  const byId = new Map(users.map((u) => [u.id, u]));
  const childrenBySponsor = new Map();
  for (const user of users) {
    if (!user.sponsorId) {
      continue;
    }
    if (!byId.has(user.sponsorId)) {
      continue;
    }
    const list = childrenBySponsor.get(user.sponsorId) ?? [];
    list.push(user);
    childrenBySponsor.set(user.sponsorId, list);
  }

  for (const list of childrenBySponsor.values()) {
    list.sort((a, b) => memberCodeSort(a.memberCode, b.memberCode));
  }

  const assignments = new Map();
  const placementChildren = new Map(); // parent user id -> placed children user ids
  const usedSlots = new Map(); // parent user id -> set(side)
  let directPlaced = 0;
  let spilloverPlaced = 0;
  let rootOrNoSponsor = 0;

  function markPlacement(parentId, side, childId) {
    assignments.set(childId, { uplineUserId: parentId, placementSide: side });
    const slot = usedSlots.get(parentId) ?? new Set();
    slot.add(side);
    usedSlots.set(parentId, slot);

    const kids = placementChildren.get(parentId) ?? [];
    kids.push(childId);
    kids.sort((a, b) => memberCodeSort(byId.get(a)?.memberCode ?? "", byId.get(b)?.memberCode ?? ""));
    placementChildren.set(parentId, kids);
  }

  for (const user of users) {
    if (!user.sponsorId || !byId.has(user.sponsorId)) {
      assignments.set(user.id, { uplineUserId: null, placementSide: null });
      rootOrNoSponsor += 1;
    }
  }

  for (const [sponsorId, directChildren] of childrenBySponsor.entries()) {
    const firstThree = directChildren.slice(0, 3);
    const sides = ["LEFT", "MIDDLE", "RIGHT"];
    for (let i = 0; i < firstThree.length; i += 1) {
      const preferred = sides[i];
      const current = usedSlots.get(sponsorId) ?? new Set();
      let chosen = preferred;
      if (current.has(preferred)) {
        chosen = sides.find((side) => !current.has(side)) ?? null;
      }

      if (!chosen) {
        // If sponsor L/M/R are full already, place this direct under spillover tree as well.
        const queue = [...firstThree.map((u) => u.id).filter((id) => id !== firstThree[i].id)];
        const visited = new Set();
        let placed = false;
        while (queue.length > 0 && !placed) {
          const parentId = queue.shift();
          if (!parentId || visited.has(parentId)) {
            continue;
          }
          visited.add(parentId);

          const slot = usedSlots.get(parentId) ?? new Set();
          if (!slot.has("LEFT")) {
            markPlacement(parentId, "LEFT", firstThree[i].id);
            placed = true;
            break;
          }
          if (!slot.has("RIGHT")) {
            markPlacement(parentId, "RIGHT", firstThree[i].id);
            placed = true;
            break;
          }

          const kids = placementChildren.get(parentId) ?? [];
          for (const k of kids) {
            queue.push(k);
          }
        }

        if (placed) {
          spilloverPlaced += 1;
          continue;
        }

        // Last-resort fallback keeps data writable.
        chosen = "RIGHT";
      }

      markPlacement(sponsorId, chosen, firstThree[i].id);
      directPlaced += 1;
    }

    const extra = directChildren.slice(3);
    for (const child of extra) {
      const queue = [...firstThree.map((u) => u.id)];
      const visited = new Set();
      let placed = false;

      while (queue.length > 0 && !placed) {
        const parentId = queue.shift();
        if (!parentId || visited.has(parentId)) {
          continue;
        }
        visited.add(parentId);

        const slot = usedSlots.get(parentId) ?? new Set();
        if (!slot.has("LEFT")) {
          markPlacement(parentId, "LEFT", child.id);
          spilloverPlaced += 1;
          placed = true;
          break;
        }
        if (!slot.has("RIGHT")) {
          markPlacement(parentId, "RIGHT", child.id);
          spilloverPlaced += 1;
          placed = true;
          break;
        }

        const kids = placementChildren.get(parentId) ?? [];
        for (const k of kids) {
          queue.push(k);
        }
      }

      if (!placed) {
        // Safety fallback: place back on sponsor using RIGHT if somehow all queues were empty.
        const sponsorSlots = usedSlots.get(sponsorId) ?? new Set();
        const fallbackSide = sponsorSlots.has("RIGHT") ? "LEFT" : "RIGHT";
        markPlacement(sponsorId, fallbackSide, child.id);
        spilloverPlaced += 1;
      }
    }
  }

  const finalAssignments = users.map((u) => {
    const row = assignments.get(u.id) ?? { uplineUserId: null, placementSide: null };
    return { userId: u.id, ...row };
  });

  return {
    assignments: finalAssignments,
    stats: {
      usersSeen: users.length,
      directPlaced,
      spilloverPlaced,
      rootOrNoSponsor,
    },
  };
}

function buildSql(assignments) {
  const statements = ["begin;"];
  for (const row of assignments) {
    statements.push(`
insert into public."MemberProfile" ("userId", "uplineUserId", "placementSide", "updatedAt")
values (
  ${row.userId},
  ${row.uplineUserId === null ? "NULL" : row.uplineUserId},
  ${row.placementSide ? `${sqlLiteral(row.placementSide)}::public."PlacementSide"` : "NULL"},
  now()
)
on conflict ("userId") do update
set
  "uplineUserId" = excluded."uplineUserId",
  "placementSide" = excluded."placementSide",
  "updatedAt" = now();
`.trim());
  }
  statements.push("commit;");
  return statements.join("\n\n") + "\n";
}

function main() {
  const users = readUsers();
  const { assignments, stats } = buildAssignments(users);
  const sql = buildSql(assignments);

  console.log(`users_seen=${stats.usersSeen}`);
  console.log(`direct_placed=${stats.directPlaced}`);
  console.log(`spillover_placed=${stats.spilloverPlaced}`);
  console.log(`root_or_no_sponsor=${stats.rootOrNoSponsor}`);

  if (sqlOnly) {
    process.stdout.write(sql);
    return;
  }

  if (!apply) {
    console.log("dry_run=yes");
    console.log(sql.split("\n").slice(0, 40).join("\n"));
    return;
  }

  if (!allowDestructiveReset) {
    throw new Error(
      "Refusing to apply placement rebalance. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 and rerun with --apply.",
    );
  }

  runPsql(["-v", "ON_ERROR_STOP=1"], sql);
  console.log("apply=ok");
}

main();
