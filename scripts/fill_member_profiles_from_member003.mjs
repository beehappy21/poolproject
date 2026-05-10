import { execFileSync, spawnSync } from "node:child_process";

const xlsxPath = process.argv[2] ?? "member003.xlsx";
const apply = process.argv.includes("--apply");
const sqlOnly = process.argv.includes("--sql-only");
const allowDestructiveReset = process.env.ALLOW_DESTRUCTIVE_LOCAL_RESET === "1";
const container = process.env.POSTGRES_DOCKER_CONTAINER || "poolproject-postgres";
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/poolproject";

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function parseWorkbookRows(filePath) {
  const python = `
import json, zipfile, xml.etree.ElementTree as ET, sys
path = sys.argv[1]
ns = {'a':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(path) as z:
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall('a:si', ns):
            shared.append(''.join(t.text or '' for t in si.findall('.//a:t', ns)))
    sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows = []
    for row in sheet.findall('.//a:row', ns):
        vals = []
        for c in row.findall('a:c', ns):
            t = c.attrib.get('t')
            if t == 'inlineStr':
                vals.append(''.join(text.text or '' for text in c.findall('.//a:t', ns)))
                continue
            v = c.find('a:v', ns)
            val = ''
            if v is not None and v.text is not None:
                val = shared[int(v.text)] if t == 's' else v.text
            vals.append(val)
        rows.append(vals)
headers = rows[0]
items = []
for row in rows[1:]:
    if not any((cell or '').strip() for cell in row):
        continue
    item = {headers[i]: row[i] if i < len(row) else '' for i in range(len(headers))}
    items.append(item)
print(json.dumps(items, ensure_ascii=False))
`;
  const output = execFileSync("python3", ["-", filePath], {
    input: python,
    encoding: "utf8",
  });
  return JSON.parse(output);
}

function clean(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeSide(value) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "") {
    return null;
  }
  if (raw === "L" || raw === "LEFT" || raw === "ซ้าย") {
    return "LEFT";
  }
  if (raw === "M" || raw === "MID" || raw === "MIDDLE" || raw === "กลาง") {
    return "MIDDLE";
  }
  if (raw === "R" || raw === "RIGHT" || raw === "ขวา") {
    return "RIGHT";
  }
  return null;
}

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

function readUsers() {
  const sql = `
select u."id"::text, u."memberCode", coalesce(u."sponsorId"::text, '')
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

function buildAssignments(rows, users) {
  const rowByMemberCode = new Map();
  for (const row of rows) {
    const memberCode = clean(row["รหัสสมาชิก"]);
    if (!memberCode) continue;
    rowByMemberCode.set(memberCode, {
      memberCode,
      uplineCode: clean(row["อัพไลน์"]),
      sponsorCode: clean(row["รหัสผู้แนะนำ"]),
      side: normalizeSide(row["ด้าน"]),
      nationalId: clean(row["เลขบัตรประชาชน"]),
      rankCode: clean(row["ตำแหน่ง"]),
      honorTitle: clean(row["เกียรติยศ"]),
      mobileCenterCode: clean(row["โมบายเซ็นเตอร์"]),
      joinedAtOverride: clean(row["วันที่สมัคร"]),
    });
  }

  const userByCode = new Map(users.map((u) => [u.memberCode, u]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const root = users[0] ?? null;
  const sideCycle = ["LEFT", "MIDDLE", "RIGHT"];
  const sideCursor = new Map();

  const assignments = [];
  let fallbackToSponsor = 0;
  let fallbackToRoot = 0;
  let sideAutoAssigned = 0;
  let sideFromSheet = 0;

  for (const user of users) {
    const row = rowByMemberCode.get(user.memberCode) ?? {
      memberCode: user.memberCode,
      uplineCode: null,
      sponsorCode: null,
      side: null,
      nationalId: null,
      rankCode: null,
      honorTitle: null,
      mobileCenterCode: null,
      joinedAtOverride: null,
    };

    let uplineId = null;
    if (row.uplineCode && userByCode.has(row.uplineCode)) {
      uplineId = userByCode.get(row.uplineCode).id;
    } else if (row.sponsorCode && userByCode.has(row.sponsorCode)) {
      uplineId = userByCode.get(row.sponsorCode).id;
      fallbackToSponsor += 1;
    } else if (user.sponsorId && userById.has(user.sponsorId)) {
      uplineId = user.sponsorId;
      fallbackToSponsor += 1;
    } else if (root && root.id !== user.id) {
      uplineId = root.id;
      fallbackToRoot += 1;
    }

    if (uplineId === user.id) {
      uplineId = null;
    }

    let side = row.side;
    if (uplineId) {
      if (!side) {
        const cursor = sideCursor.get(uplineId) ?? 0;
        side = sideCycle[cursor % sideCycle.length];
        sideCursor.set(uplineId, cursor + 1);
        sideAutoAssigned += 1;
      } else {
        sideFromSheet += 1;
      }
    } else {
      side = null;
    }

    assignments.push({
      userId: user.id,
      memberCode: user.memberCode,
      uplineUserId: uplineId,
      placementSide: side,
      nationalId: row.nationalId,
      rankCode: row.rankCode,
      honorTitle: row.honorTitle,
      mobileCenterCode: row.mobileCenterCode,
      joinedAtOverride: row.joinedAtOverride,
    });
  }

  return {
    assignments,
    stats: {
      usersSeen: users.length,
      fallbackToSponsor,
      fallbackToRoot,
      sideFromSheet,
      sideAutoAssigned,
    },
  };
}

function buildSql(assignments) {
  const statements = ["begin;"];
  for (const row of assignments) {
    statements.push(`
insert into public."MemberProfile" (
  "userId",
  "nationalId",
  "uplineUserId",
  "placementSide",
  "rankCode",
  "honorTitle",
  "mobileCenterCode",
  "joinedAtOverride",
  "updatedAt"
)
values (
  ${row.userId},
  ${sqlLiteral(row.nationalId)},
  ${row.uplineUserId === null ? "NULL" : row.uplineUserId},
  ${row.placementSide ? `${sqlLiteral(row.placementSide)}::public."PlacementSide"` : "NULL"},
  ${sqlLiteral(row.rankCode)},
  ${sqlLiteral(row.honorTitle)},
  ${sqlLiteral(row.mobileCenterCode)},
  ${
    row.joinedAtOverride && /^\d{4}-\d{2}-\d{2}$/.test(row.joinedAtOverride)
      ? `${sqlLiteral(row.joinedAtOverride)}::date`
      : "NULL"
  },
  now()
)
on conflict ("userId") do update
set
  "nationalId" = excluded."nationalId",
  "uplineUserId" = excluded."uplineUserId",
  "placementSide" = excluded."placementSide",
  "rankCode" = excluded."rankCode",
  "honorTitle" = excluded."honorTitle",
  "mobileCenterCode" = excluded."mobileCenterCode",
  "joinedAtOverride" = excluded."joinedAtOverride",
  "updatedAt" = now();
`.trim());
  }
  statements.push("commit;");
  return statements.join("\n\n") + "\n";
}

function applySql(sql) {
  runPsql(["-v", "ON_ERROR_STOP=1"], sql);
}

function main() {
  const rows = parseWorkbookRows(xlsxPath);
  const users = readUsers();
  const { assignments, stats } = buildAssignments(rows, users);
  const sql = buildSql(assignments);

  console.log(`users_seen=${stats.usersSeen}`);
  console.log(`fallback_to_sponsor=${stats.fallbackToSponsor}`);
  console.log(`fallback_to_root=${stats.fallbackToRoot}`);
  console.log(`side_from_sheet=${stats.sideFromSheet}`);
  console.log(`side_auto_assigned=${stats.sideAutoAssigned}`);

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
      "Refusing to apply profile fill. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 and rerun with --apply.",
    );
  }

  applySql(sql);
  console.log("apply=ok");
}

main();
