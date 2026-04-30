import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const xlsxPath = process.argv[2] ?? "member003.xlsx";
const defaultPassword = process.argv[3] ?? "123456";
const apply = process.argv.includes("--apply");
const sqlOnly = process.argv.includes("--sql-only");
const container = process.env.POSTGRES_DOCKER_CONTAINER || "poolproject-postgres";
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/poolproject";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

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

function parseDate(value) {
  const trimmed = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function clean(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

function deriveMemberPassword(nationalId, fallbackPassword) {
  const digits = String(nationalId ?? "").replace(/\D/g, "");
  return digits.length >= 6 ? digits.slice(-6) : fallbackPassword;
}

function getReservedEmails(rows) {
  const workbookCounts = new Map();
  for (const row of rows) {
    const email = row.email?.toLowerCase();
    if (!email) {
      continue;
    }
    workbookCounts.set(email, (workbookCounts.get(email) ?? 0) + 1);
  }

  const workbookDuplicates = new Set(
    Array.from(workbookCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([email]) => email),
  );

  const workbookEmails = Array.from(workbookCounts.keys());
  if (workbookEmails.length === 0) {
    return {
      reservedEmails: workbookDuplicates,
      workbookDuplicateCount: workbookDuplicates.size,
      existingDbConflictCount: 0,
    };
  }

  const query = `
select lower("email")
from public."User"
where "email" is not null
  and lower("email") in (${workbookEmails.map((email) => sqlLiteral(email)).join(", ")});
`.trim();

  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-At",
      databaseUrl,
      "-c",
      query,
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "failed to inspect existing emails");
  }

  const existingEmails = new Set(
    result.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );

  const reservedEmails = new Set([...workbookDuplicates, ...existingEmails]);
  return {
    reservedEmails,
    workbookDuplicateCount: workbookDuplicates.size,
    existingDbConflictCount: existingEmails.size,
  };
}

function buildSql(rows, reservedEmails) {
  const statements = ["begin;"];
  let createCandidates = 0;
  let sponsorCandidates = 0;
  let emailSkipped = 0;
  let passwordFromNationalId = 0;
  let passwordFallbackCount = 0;

  for (const row of rows) {
    if (!row.memberCode) {
      continue;
    }
    createCandidates += 1;
    const password = deriveMemberPassword(row.nationalId, defaultPassword);
    const passwordHash = hashPassword(password);
    if (password === defaultPassword) {
      passwordFallbackCount += 1;
    } else {
      passwordFromNationalId += 1;
    }
    const normalizedEmail = row.email?.toLowerCase() ?? null;
    const safeEmail = normalizedEmail && !reservedEmails.has(normalizedEmail) ? row.email : null;
    if (normalizedEmail && !safeEmail) {
      emailSkipped += 1;
    }
    statements.push(`
insert into public."User" (
  "memberCode",
  "referralCode",
  "name",
  "email",
  "phone",
  "passwordHash",
  "sponsorId",
  "status",
  "riskLevel",
  "payoutStatus",
  "createdAt",
  "updatedAt"
)
select
  ${sqlLiteral(row.memberCode)},
  ${sqlLiteral(row.memberCode)},
  ${sqlLiteral(row.fullName ?? row.memberCode)},
  ${sqlLiteral(safeEmail)},
  ${sqlLiteral(row.phone)},
  ${sqlLiteral(passwordHash)},
  null,
  'ACTIVE',
  'NORMAL',
  'ACTIVE',
  coalesce(${sqlLiteral(row.joinedDate)}::timestamptz, now()),
  coalesce(${sqlLiteral(row.joinedDate)}::timestamptz, now())
where not exists (
  select 1 from public."User" u where u."memberCode" = ${sqlLiteral(row.memberCode)}
);`.trim());

    statements.push(`
update public."User"
set
  "passwordHash" = ${sqlLiteral(passwordHash)},
  "updatedAt" = now()
where "memberCode" = ${sqlLiteral(row.memberCode)};`.trim());
  }

  for (const row of rows) {
    if (!row.memberCode || !row.sponsorCode) {
      continue;
    }
    sponsorCandidates += 1;
    statements.push(`
update public."User" u
set "sponsorId" = s."id"
from public."User" s
where u."memberCode" = ${sqlLiteral(row.memberCode)}
  and s."memberCode" = ${sqlLiteral(row.sponsorCode)}
  and (u."sponsorId" is distinct from s."id");`.trim());
  }

  statements.push("commit;");
  return {
    sql: statements.join("\n\n") + "\n",
    createCandidates,
    sponsorCandidates,
    emailSkipped,
    passwordFromNationalId,
    passwordFallbackCount,
  };
}

function applySql(sql) {
  const tempPath = join(tmpdir(), `seed-members-${Date.now()}.sql`);
  writeFileSync(tempPath, sql);
  try {
    const result = spawnSync(
      "docker",
      [
        "exec",
        "-i",
        container,
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
      throw new Error(result.stderr || result.stdout || "psql apply failed");
    }
    if (result.stderr?.trim()) {
      console.error(result.stderr.trim());
    }
    if (result.stdout?.trim()) {
      console.log(result.stdout.trim());
    }
  } finally {
    unlinkSync(tempPath);
  }
}

function main() {
  const rows = parseWorkbookRows(xlsxPath)
    .map((row) => ({
      memberCode: clean(row["รหัสสมาชิก"]),
      joinedDate: parseDate(row["วันที่สมัคร"]),
      sponsorCode: clean(row["รหัสผู้แนะนำ"]),
      nationalId: clean(row["เลขบัตรประชาชน"]),
      fullName: clean(row["ชื่อเต็ม"]),
      email: clean(row["อีเมล"]),
      phone: clean(row["มือถือ"]),
    }))
    .filter((row) => row.memberCode);

  const { reservedEmails, workbookDuplicateCount, existingDbConflictCount } = getReservedEmails(rows);
  const {
    sql,
    createCandidates,
    sponsorCandidates,
    emailSkipped,
    passwordFromNationalId,
    passwordFallbackCount,
  } = buildSql(
    rows,
    reservedEmails,
  );

  if (sqlOnly) {
    console.log(sql);
    return;
  }

  console.log(`rows_seen=${rows.length}`);
  console.log(`members_considered=${createCandidates}`);
  console.log(`sponsor_links_considered=${sponsorCandidates}`);
  console.log(`email_skipped=${emailSkipped}`);
  console.log(`email_duplicates_in_workbook=${workbookDuplicateCount}`);
  console.log(`email_conflicts_in_db=${existingDbConflictCount}`);
  console.log(`password_from_national_id=${passwordFromNationalId}`);
  console.log(`password_fallback_default=${passwordFallbackCount}`);
  console.log(`fallback_password=${defaultPassword}`);
  console.log(`container=${container}`);
  console.log(`database_url=${databaseUrl}`);

  if (!apply) {
    console.log("dry_run=yes");
    console.log(sql.split("\n").slice(0, 24).join("\n"));
    return;
  }

  applySql(sql);
  console.log("apply=ok");
}

main();
