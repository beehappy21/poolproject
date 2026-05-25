const { execFileSync } = require("node:child_process");
const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const WORKBOOK_PATH = process.env.ALLSALE_WORKBOOK || "allsaletest02042026.xlsx";
const ADMIN_IDENTIFIER =
  process.env.ALLSALE_ADMIN_IDENTIFIER || "dev-admin@example.com";
const ADMIN_PASSWORD = process.env.ALLSALE_ADMIN_PASSWORD || "472121";
const SOURCE_TAG = process.env.ALLSALE_SOURCE_TAG || "allsaletest02042026";
const LIMIT = Number.parseInt(process.env.ALLSALE_LIMIT || "0", 10) || 0;
const START_SEQUENCE =
  Number.parseInt(process.env.ALLSALE_START_SEQUENCE || "12", 10) || 12;
const INCLUDE_AUTO_BILLS = process.env.ALLSALE_INCLUDE_AUTO_BILLS === "1";
const APPLY = process.argv.includes("--apply");

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
    sheet_data = sheet.find('a:sheetData', ns)
    rows = []
    for row in list(sheet_data)[1:]:
        row_no = row.attrib.get('r')
        values = {}
        for c in row.findall('a:c', ns):
            ref = c.attrib.get('r', '')
            v = c.find('a:v', ns)
            val = ''
            if v is not None and v.text is not None:
                val = shared[int(v.text)] if c.attrib.get('t') == 's' else v.text
            values[ref] = val.strip()
        if not values.get(f'B{row_no}'):
            continue
        rows.append({
            'sequenceNo': values.get(f'A{row_no}', ''),
            'memberCode': values.get(f'B{row_no}', ''),
            'memberName': values.get(f'C{row_no}', ''),
            'billType': values.get(f'D{row_no}', ''),
            'invoiceNo': values.get(f'E{row_no}', ''),
            'invoiceDate': values.get(f'F{row_no}', ''),
            'pv': values.get(f'G{row_no}', ''),
            'amount': values.get(f'H{row_no}', ''),
            'note': values.get(f'I{row_no}', ''),
            'status': values.get(f'J{row_no}', ''),
            'action': values.get(f'K{row_no}', ''),
        })
print(json.dumps(rows, ensure_ascii=False))
`;
  return JSON.parse(
    execFileSync("python3", ["-", filePath], {
      input: python,
      encoding: "utf8",
    }),
  );
}

function request(path, options = {}) {
  const target = new URL(`${API_BASE_URL}${path}`);
  const transport = target.protocol === "https:" ? https : http;
  const payload = options.body ? JSON.stringify(options.body) : null;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      target,
      {
        method: options.method || "GET",
        headers: {
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...(payload
            ? {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = raw;
          }
          resolve({
            statusCode: res.statusCode || 500,
            body: parsed,
          });
        });
      },
    );

    req.on("error", reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

async function expectOk(path, options = {}) {
  const response = await request(path, options);

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(
      `${options.method || "GET"} ${path} failed with ${response.statusCode}: ${JSON.stringify(response.body)}`,
    );
  }

  return response.body;
}

async function login(identifier, password) {
  return expectOk("/auth/login", {
    method: "POST",
    body: { identifier, password },
  });
}

function parseDecimal(value) {
  const parsed = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function toIsoFromThaiDate(raw) {
  const [day, month, year] = String(raw)
    .split("/")
    .map((value) => Number.parseInt(value, 10));

  const isoYear = year - 543;
  return new Date(Date.UTC(isoYear, month - 1, day, 5, 0, 0)).toISOString();
}

async function backfillOrderDates(orderId, approvedAtIso) {
  const quoted = sqlLiteral(approvedAtIso);
  await prisma.$executeRawUnsafe(`
    update "Order"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz,
        "paidAt" = coalesce("paidAt", ${quoted}::timestamptz),
        "approvedAt" = ${quoted}::timestamptz
    where "id" = ${sqlLiteral(orderId)}::bigint
  `);
  await prisma.$executeRawUnsafe(`
    update "OrderItem"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "orderId" = ${sqlLiteral(orderId)}::bigint
  `);
  await prisma.$executeRawUnsafe(`
    update "CommissionLedger"
    set "evaluationAt" = ${quoted}::timestamptz,
        "finalizeCheckedAt" = ${quoted}::timestamptz,
        "finalizedAt" = ${quoted}::timestamptz,
        "releasedToWithdrawableAt" = case
          when "releasedToWithdrawableAt" is not null then ${quoted}::timestamptz
          else null
        end,
        "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "orderId" = ${sqlLiteral(orderId)}::bigint
  `);
  await prisma.$executeRawUnsafe(`
    update "CompanyBonusLedger"
    set "createdAt" = ${quoted}::timestamptz
    where "sourceRefId" = ${sqlLiteral(orderId)}::bigint
  `);
  await prisma.$executeRawUnsafe(`
    update "WalletTransaction"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where ("refType" = 'COMMISSION' and "refId" in (
      select "id" from "CommissionLedger" where "orderId" = ${sqlLiteral(orderId)}::bigint
    ))
       or ("refType" = 'ORDER' and "refId" = ${sqlLiteral(orderId)}::bigint)
  `);
  await prisma.$executeRawUnsafe(`
    update "MatrixAccumulationEvent"
    set "createdAt" = ${quoted}::timestamptz
    where "sourceOrderId" = ${sqlLiteral(orderId)}::bigint
  `);
  await prisma.$executeRawUnsafe(`
    update "MatrixPayout"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "sourceOrderId" = ${sqlLiteral(orderId)}::bigint
  `);
}

async function main() {
  await expectOk("/health");

  const rows = parseWorkbookRows(WORKBOOK_PATH)
    .filter((row) => row.status === "อนุมัติ")
    .filter((row) => {
      const sequenceNo = Number.parseInt(String(row.sequenceNo || "0"), 10) || 0;
      return sequenceNo >= START_SEQUENCE;
    })
    .filter((row) =>
      INCLUDE_AUTO_BILLS ? true : row.billType !== "บิลอัตโนมัติ",
    )
    .slice(0, LIMIT > 0 ? LIMIT : undefined);

  const memberCodes = Array.from(new Set(rows.map((row) => row.memberCode)));
  const userRows = await prisma.user.findMany({
    where: { memberCode: { in: memberCodes } },
    select: { id: true, memberCode: true },
  });
  const userMap = new Map(
    userRows.map((row) => [row.memberCode, row.id.toString()]),
  );

  const activePackage = await prisma.package.findFirst({
    where: { status: "ACTIVE" },
    orderBy: [{ id: "asc" }],
    select: { id: true, code: true, pv: true },
  });

  if (!activePackage) {
    throw new Error("No active package found.");
  }

  const packagePv = parseDecimal(activePackage.pv);
  if (packagePv <= 0) {
    throw new Error("Active package PV must be greater than zero.");
  }

  const existingOrders = await prisma.order.findMany({
    where: {
      shippingAddressNote: {
        contains: `${SOURCE_TAG}|invoice=`,
      },
    },
    select: {
      id: true,
      userId: true,
      shippingAddressNote: true,
      approvalStatus: true,
      orderNo: true,
    },
  });
  const existingByTag = new Map(
    existingOrders
      .filter((row) => row.shippingAddressNote)
      .map((row) => [row.shippingAddressNote, row]),
  );

  const adminSession = await login(ADMIN_IDENTIFIER, ADMIN_PASSWORD);
  const results = [];

  for (const row of rows) {
    const userId = userMap.get(row.memberCode);
    const importTag = `${SOURCE_TAG}|invoice=${row.invoiceNo}`;

    if (!userId) {
      results.push({
        invoiceNo: row.invoiceNo,
        memberCode: row.memberCode,
        status: "missing_member",
      });
      continue;
    }

    if (existingByTag.has(importTag)) {
      const existing = existingByTag.get(importTag);
      results.push({
        invoiceNo: row.invoiceNo,
        memberCode: row.memberCode,
        status: "skipped_existing",
        orderId: existing.id.toString(),
        orderNo: existing.orderNo,
      });
      continue;
    }

    const pv = parseDecimal(row.pv);
    const quantity = pv / packagePv;

    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      results.push({
        invoiceNo: row.invoiceNo,
        memberCode: row.memberCode,
        status: "invalid_quantity",
        pv: row.pv,
        packagePv: activePackage.pv.toString(),
      });
      continue;
    }

    if (!APPLY) {
      results.push({
        invoiceNo: row.invoiceNo,
        memberCode: row.memberCode,
        status: "dry_run",
        quantity,
      });
      continue;
    }

    const createdOrder = await expectOk("/orders", {
      method: "POST",
      token: adminSession.accessToken,
      body: {
        userId,
        items: [{ packageId: activePackage.id.toString(), quantity: String(quantity) }],
        fulfillmentMethod: "branch_pickup",
        pickupBranchName: "Allsale Test Import",
        pickupBranchNote: importTag,
        pickupRecipientName: "Allsale Import",
        pickupPhone: "0800000000",
        cashPaymentMethod: "bank_transfer",
      },
    });

    await expectOk(`/orders/${createdOrder.orderId}/approve`, {
      method: "POST",
      token: adminSession.accessToken,
    });

    await backfillOrderDates(createdOrder.orderId, toIsoFromThaiDate(row.invoiceDate));

    results.push({
      invoiceNo: row.invoiceNo,
      memberCode: row.memberCode,
      status: "imported",
      orderId: createdOrder.orderId,
      orderNo: createdOrder.orderNo,
      totalPv: createdOrder.totalPv,
    });
  }

  const summary = results.reduce(
    (acc, row) => {
      acc.total += 1;
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    { total: 0 },
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        workbookPath: WORKBOOK_PATH,
        sourceTag: SOURCE_TAG,
        apply: APPLY,
        startSequence: START_SEQUENCE,
        includeAutoBills: INCLUDE_AUTO_BILLS,
        activePackage: {
          packageId: activePackage.id.toString(),
          code: activePackage.code,
          pv: activePackage.pv.toString(),
        },
        summary,
        sample: results.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
