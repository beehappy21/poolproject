import { execFileSync, spawnSync } from "node:child_process";

const xlsxPath = process.argv[2] ?? "member003.xlsx";
const defaultPassword = process.argv[3] ?? "123456";
const apply = process.argv.includes("--apply");
const container = process.env.POSTGRES_DOCKER_CONTAINER || "poolproject-postgres";
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/poolproject";
const allowDestructiveReset = process.env.ALLOW_DESTRUCTIVE_LOCAL_RESET === "1";

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

function normalizeRows(rows) {
  return rows
    .map((row) => ({
      memberCode: clean(row["รหัสสมาชิก"]),
      joinedDate: clean(row["วันที่สมัคร"]),
      sponsorCode: clean(row["รหัสผู้แนะนำ"]),
      uplineCode: clean(row["อัพไลน์"]),
      nationalId: clean(row["เลขบัตรประชาชน"]),
      fullName: clean(row["ชื่อเต็ม"]),
      email: clean(row["อีเมล"]),
      phone: clean(row["มือถือ"]),
    }))
    .filter((row) => row.memberCode);
}

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      POSTGRES_DOCKER_CONTAINER: container,
      ...extraEnv,
    },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} ${args.join(" ")} failed`);
  }

  if (result.stdout?.trim()) {
    process.stdout.write(result.stdout.trim() + "\n");
  }
  if (result.stderr?.trim()) {
    process.stderr.write(result.stderr.trim() + "\n");
  }
}

function runPsql(sql) {
  const result = spawnSync(
    "docker",
    ["exec", "-i", container, "psql", "-At", databaseUrl, "-c", sql],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql query failed");
  }

  return (result.stdout || "").trim();
}

function fetchRuntimeMembers() {
  const sql = `
select
  u."id"::text,
  u."memberCode",
  coalesce(u."name", ''),
  coalesce(u."email", ''),
  coalesce(u."phone", ''),
  coalesce(mp."nationalId", ''),
  coalesce((u."createdAt" at time zone 'UTC')::date::text, ''),
  coalesce(mp."joinedAtOverride"::text, ''),
  coalesce(s."memberCode", ''),
  coalesce(uu."memberCode", ''),
  coalesce(u."isAdmin", false)::text
from public."User" u
left join public."MemberProfile" mp on mp."userId" = u."id"
left join public."User" s on s."id" = u."sponsorId"
left join public."User" uu on uu."id" = mp."uplineUserId"
order by u."id";
`.trim();

  const output = runPsql(sql);
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, memberCode, name, email, phone, nationalId, createdAtDate, joinedAtOverride, sponsorCode, uplineCode, isAdmin] =
        line.split("|");
      return {
        id: Number(id),
        memberCode,
        name,
        email,
        phone,
        nationalId,
        createdAtDate,
        joinedAtOverride,
        sponsorCode,
        uplineCode,
        isAdmin: isAdmin === "true",
      };
    });
}

function validateRows(expectedRows, runtimeRows) {
  const problems = [];
  const nonAdminRows = runtimeRows.filter((row) => !row.isAdmin);
  const adminRows = runtimeRows.filter((row) => row.isAdmin);
  const runtimeByCode = new Map(nonAdminRows.map((row) => [row.memberCode, row]));

  if (adminRows.length > 0) {
    problems.push(`expected_postgres_admin_rows=0 actual=${adminRows.length}`);
  }

  if (nonAdminRows.length !== expectedRows.length) {
    problems.push(`expected_member_count=${expectedRows.length} actual=${nonAdminRows.length}`);
  }

  for (const row of expectedRows) {
    const runtime = runtimeByCode.get(row.memberCode);
    if (!runtime) {
      problems.push(`missing_member=${row.memberCode}`);
      continue;
    }

    const expectedId = Number(row.memberCode.replace(/^TH/i, ""));
    if (runtime.id !== expectedId) {
      problems.push(`${row.memberCode}: id expected ${expectedId} actual ${runtime.id}`);
    }
    if (row.fullName && (runtime.name || "") !== row.fullName) {
      problems.push(`${row.memberCode}: name mismatch expected "${row.fullName ?? ""}" actual "${runtime.name}"`);
    }
    if (row.phone && (runtime.phone || "") !== row.phone) {
      problems.push(`${row.memberCode}: phone mismatch expected "${row.phone ?? ""}" actual "${runtime.phone}"`);
    }
    if (row.nationalId && (runtime.nationalId || "") !== row.nationalId) {
      problems.push(
        `${row.memberCode}: national_id mismatch expected "${row.nationalId ?? ""}" actual "${runtime.nationalId}"`,
      );
    }
    if (row.joinedDate && (runtime.createdAtDate || "") !== row.joinedDate) {
      problems.push(
        `${row.memberCode}: createdAt mismatch expected "${row.joinedDate ?? ""}" actual "${runtime.createdAtDate}"`,
      );
    }
    if (row.joinedDate && (runtime.joinedAtOverride || "") !== row.joinedDate) {
      problems.push(
        `${row.memberCode}: joinedAtOverride mismatch expected "${row.joinedDate ?? ""}" actual "${runtime.joinedAtOverride}"`,
      );
    }
    if (row.sponsorCode && /^TH/i.test(row.sponsorCode) && (runtime.sponsorCode || "") !== row.sponsorCode) {
      problems.push(
        `${row.memberCode}: sponsor mismatch expected "${row.sponsorCode ?? ""}" actual "${runtime.sponsorCode}"`,
      );
    }
    if (row.uplineCode && /^TH/i.test(row.uplineCode) && (runtime.uplineCode || "") !== row.uplineCode) {
      problems.push(
        `${row.memberCode}: upline mismatch expected "${row.uplineCode ?? ""}" actual "${runtime.uplineCode}"`,
      );
    }
  }

  const runtimeCodes = new Set(nonAdminRows.map((row) => row.memberCode));
  for (const code of runtimeCodes) {
    if (!expectedRows.find((row) => row.memberCode === code)) {
      problems.push(`unexpected_runtime_member=${code}`);
    }
  }

  return {
    problems,
    summary: {
      expectedRows: expectedRows.length,
      runtimeNonAdminRows: nonAdminRows.length,
      runtimeAdminRows: adminRows.length,
    },
  };
}

function main() {
  const expectedRows = normalizeRows(parseWorkbookRows(xlsxPath));
  if (expectedRows.length === 0) {
    throw new Error(`No member rows found in ${xlsxPath}`);
  }

  process.stdout.write(`xlsx_path=${xlsxPath}\n`);
  process.stdout.write(`expected_member_rows=${expectedRows.length}\n`);
  process.stdout.write(`first_member=${expectedRows[0].memberCode}\n`);
  process.stdout.write(`last_member=${expectedRows.at(-1)?.memberCode ?? ""}\n`);
  process.stdout.write(`container=${container}\n`);
  process.stdout.write(`database_url=${databaseUrl}\n`);

  if (!apply) {
    process.stdout.write("dry_run=yes\n");
    process.stdout.write(
      [
        "planned_steps:",
        "1. reset_local_members_and_sales --apply --drop-admin-users",
        `2. seed_members_from_xlsx.mjs ${xlsxPath} ${defaultPassword} --apply`,
        `3. import_member_profiles_from_xlsx.py ${xlsxPath} --apply`,
        "4. validate runtime rows against workbook",
      ].join("\n") + "\n",
    );
    return;
  }

  if (!allowDestructiveReset) {
    throw new Error(
      "Refusing destructive rebuild. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 and rerun with --apply.",
    );
  }

  run("node", ["scripts/reset_local_members_and_sales.mjs", "--apply", "--drop-admin-users"], {
    ALLOW_DESTRUCTIVE_LOCAL_RESET: "1",
  });
  run("node", ["scripts/seed_members_from_xlsx.mjs", xlsxPath, defaultPassword, "--apply"]);
  run("python3", ["scripts/import_member_profiles_from_xlsx.py", xlsxPath, "--apply"]);

  const runtimeRows = fetchRuntimeMembers();
  const validation = validateRows(expectedRows, runtimeRows);

  process.stdout.write(`runtime_non_admin_rows=${validation.summary.runtimeNonAdminRows}\n`);
  process.stdout.write(`runtime_admin_rows=${validation.summary.runtimeAdminRows}\n`);

  if (validation.problems.length > 0) {
    process.stdout.write(`validation_problems=${validation.problems.length}\n`);
    for (const problem of validation.problems.slice(0, 50)) {
      process.stdout.write(`problem=${problem}\n`);
    }
    throw new Error("member003 rebuild completed but validation failed");
  }

  process.stdout.write("validation_problems=0\n");
  process.stdout.write("apply=ok\n");
}

main();
