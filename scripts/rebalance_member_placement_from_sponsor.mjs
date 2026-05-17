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

  function getBinaryChildren(parentId) {
    const kids = placementChildren.get(parentId) ?? [];
    const leftChild = kids.find(
      (childId) => assignments.get(childId)?.placementSide === "LEFT",
    );
    const rightChild = kids.find(
      (childId) => assignments.get(childId)?.placementSide === "RIGHT",
    );

    return {
      leftChild: leftChild ?? null,
      rightChild: rightChild ?? null,
    };
  }

  function findNextBinaryPlacement(branchRootId) {
    const queue = [{ parentId: branchRootId, path: [] }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }

      const { leftChild, rightChild } = getBinaryChildren(current.parentId);

      if (!leftChild) {
        return {
          parentId: current.parentId,
          placementSide: "LEFT",
          path: [...current.path, 0],
        };
      }

      if (!rightChild) {
        return {
          parentId: current.parentId,
          placementSide: "RIGHT",
          path: [...current.path, 1],
        };
      }

      queue.push({ parentId: leftChild, path: [...current.path, 0] });
      queue.push({ parentId: rightChild, path: [...current.path, 1] });
    }

    return {
      parentId: branchRootId,
      placementSide: "LEFT",
      path: [0],
    };
  }

  function compareAutoCandidates(a, b) {
    if (a.path.length !== b.path.length) {
      return a.path.length - b.path.length;
    }

    for (let index = 0; index < Math.max(a.path.length, b.path.length); index += 1) {
      const aValue = a.path[index] ?? -1;
      const bValue = b.path[index] ?? -1;
      if (aValue !== bValue) {
        return aValue - bValue;
      }
    }

    const branchOrder = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };
    return branchOrder[a.branchSide] - branchOrder[b.branchSide];
  }

  for (const user of users) {
    if (!user.sponsorId || !byId.has(user.sponsorId)) {
      assignments.set(user.id, { uplineUserId: null, placementSide: null });
      rootOrNoSponsor += 1;
    }
  }

  for (const [sponsorId, directChildren] of childrenBySponsor.entries()) {
    const sides = ["LEFT", "MIDDLE", "RIGHT"];
    const branchRoots = new Map();

    for (let i = 0; i < Math.min(directChildren.length, 3); i += 1) {
      const chosen = sides[i];
      const child = directChildren[i];
      markPlacement(sponsorId, chosen, child.id);
      branchRoots.set(chosen, child.id);
      directPlaced += 1;
    }

    const extra = directChildren.slice(3);
    for (const child of extra) {
      const candidates = sides
        .map((side) => {
          const branchRootId = branchRoots.get(side);
          if (!branchRootId) {
            return null;
          }

          return {
            branchSide: side,
            ...findNextBinaryPlacement(branchRootId),
          };
        })
        .filter(Boolean);

      if (candidates.length === 0) {
        const sponsorSlots = usedSlots.get(sponsorId) ?? new Set();
        const fallbackSide = sponsorSlots.has("RIGHT") ? "LEFT" : "RIGHT";
        markPlacement(sponsorId, fallbackSide, child.id);
      } else {
        candidates.sort(compareAutoCandidates);
        markPlacement(
          candidates[0].parentId,
          candidates[0].placementSide,
          child.id,
        );
      }
      spilloverPlaced += 1;
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
