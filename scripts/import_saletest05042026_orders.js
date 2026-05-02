const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const WORKBOOK_PATH = process.env.SALETEST_WORKBOOK || "saletest05042026.xlsx";
const ADMIN_IDENTIFIER = process.env.SALETEST_ADMIN_IDENTIFIER || "dev-admin@example.com";
const ADMIN_PASSWORD = process.env.SALETEST_ADMIN_PASSWORD || "472121";
const SOURCE_TAG = process.env.SALETEST_SOURCE_TAG || "saletest05042026";
const PRODUCT_CODE = process.env.SALETEST_PRODUCT_CODE || "LON001";
const LIMIT = Number.parseInt(process.env.SALETEST_LIMIT || "0", 10) || 0;
const START_SEQUENCE =
  Number.parseInt(process.env.SALETEST_START_SEQUENCE || "1", 10) || 1;
const SKIP_INVOICE_SET = new Set(
  String(process.env.SALETEST_SKIP_INVOICES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const APPLY = process.argv.includes("--apply");
const POSTGRES_CONTAINER =
  process.env.SALETEST_POSTGRES_CONTAINER || "poolproject-postgres";
const TARGET_DB_NAME = process.env.SALETEST_TARGET_DB_NAME || "poolproject";
const COMMISSION_SETTINGS_PATH =
  process.env.SALETEST_COMMISSION_SETTINGS_PATH ||
  "runtime/commission-settings.json";
const MATRIX_SETTINGS_PATH =
  process.env.SALETEST_MATRIX_SETTINGS_PATH || "runtime/matrix-settings.json";

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
    rows = sheet.find('a:sheetData', ns)
    result = []
    for row in list(rows)[1:]:
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
        result.append({
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
        })
print(json.dumps(result, ensure_ascii=False))
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

function loadRuntimeSnapshots() {
  return {
    commissionSettingsSnapshot: readFileSync(COMMISSION_SETTINGS_PATH, "utf8").trim(),
    matrixSettingsSnapshot: readFileSync(MATRIX_SETTINGS_PATH, "utf8").trim(),
  };
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

function normalizeMemberCode(memberCode) {
  const trimmed = String(memberCode || "").trim();
  if (/^CT\d{7}$/.test(trimmed)) {
    return `TH${trimmed.slice(2)}`;
  }
  return trimmed;
}

function toIsoFromThaiDate(raw) {
  const [day, month, year] = String(raw)
    .split("/")
    .map((value) => Number.parseInt(value, 10));
  return new Date(Date.UTC(year - 543, month - 1, day, 5, 0, 0)).toISOString();
}

function runPsql(query) {
  return execFileSync(
    "docker",
    [
      "exec",
      POSTGRES_CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      TARGET_DB_NAME,
      "-At",
      "-F",
      "\t",
      "-c",
      query,
    ],
    { encoding: "utf8" },
  ).trim();
}

function parseTableRows(raw) {
  if (!raw) {
    return [];
  }
  return raw
    .split("\n")
    .map((line) => line.split("\t"))
    .filter((parts) => parts.length > 0 && parts[0] !== "");
}

function loadImportProduct() {
  const rows = parseTableRows(
    runPsql(
      `select id, code, name, "memberPriceUsdt"::text, pv::text
       from "ProductDetail"
       where status = 'ACTIVE'
         and code = ${sqlLiteral(PRODUCT_CODE)}
       order by id asc
       limit 1;`,
    ),
  );
  if (rows.length === 0) {
    throw new Error(`Active product detail ${PRODUCT_CODE} not found.`);
  }
  const [id, code, name, memberPriceUsdt, pv] = rows[0];
  return {
    id,
    code,
    name,
    memberPriceUsdt,
    pv,
  };
}

function loadMemberMap(memberCodes) {
  const normalizedCodes = Array.from(new Set(memberCodes.map(normalizeMemberCode)));
  if (normalizedCodes.length === 0) {
    return new Map();
  }

  const codeList = normalizedCodes.map((code) => sqlLiteral(code)).join(",");
  const rows = parseTableRows(
    runPsql(
      `select id, "memberCode" from "User" where "memberCode" in (${codeList}) order by "memberCode";`,
    ),
  );

  return new Map(rows.map(([id, memberCode]) => [memberCode, id]));
}

function loadExistingImportRows(sourceTag) {
  const rows = parseTableRows(
    runPsql(
      `select id, "userId", "shippingAddressNote", "approvalStatus", "orderNo"
       from "Order"
       where "shippingAddressNote" like ${sqlLiteral(`%${sourceTag}|invoice=%`)}
       order by id asc;`,
    ),
  );

  return new Map(
    rows.map(([id, userId, shippingAddressNote, approvalStatus, orderNo]) => [
      shippingAddressNote,
      { id, userId, shippingAddressNote, approvalStatus, orderNo },
    ]),
  );
}

function loadOrdersByRange(startOrderNo, endOrderNo) {
  if (endOrderNo < startOrderNo) {
    return [];
  }

  const rows = parseTableRows(
    runPsql(
      `select id, "orderNo", "orderSourceType", "userId", "approvalBatchRef"
       from "Order"
       where "orderNo" ~ '^[0-9]+$'
         and cast("orderNo" as integer) between ${startOrderNo} and ${endOrderNo}
       order by cast("orderNo" as integer) asc;`,
    ),
  );

  return rows.map(([id, orderNo, orderSourceType, userId, approvalBatchRef]) => ({
    id,
    orderNo,
    orderSourceType,
    userId,
    approvalBatchRef,
  }));
}

function extractMatrixReentryOrders(orders, sourceOrderNo) {
  return orders
    .filter((order) => order.orderSourceType === "MATRIX_REENTRY")
    .map((order) => ({
      runtimeOrderId: order.id,
      runtimeOrderNo: order.orderNo,
      orderSourceType: "matrix_reentry",
      triggeredAfterSourceOrderNo: sourceOrderNo,
    }));
}

async function backfillOrderDates(orderId, approvedAtIso) {
  const quoted = sqlLiteral(approvedAtIso);
  runPsql(`
    update "Order"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz,
        "paidAt" = coalesce("paidAt", ${quoted}::timestamptz),
        "approvedAt" = ${quoted}::timestamptz
    where "id" = ${sqlLiteral(orderId)}::bigint;
  `);
  runPsql(`
    update "OrderItem"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "orderId" = ${sqlLiteral(orderId)}::bigint;
  `);
  runPsql(`
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
    where "orderId" = ${sqlLiteral(orderId)}::bigint;
  `);
  runPsql(`
    update "CompanyBonusLedger"
    set "createdAt" = ${quoted}::timestamptz
    where "sourceRefId" = ${sqlLiteral(orderId)}::bigint;
  `);
  runPsql(`
    update "WalletTransaction"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where ("refType" = 'COMMISSION' and "refId" in (
      select "id" from "CommissionLedger" where "orderId" = ${sqlLiteral(orderId)}::bigint
    ))
       or ("refType" = 'ORDER' and "refId" = ${sqlLiteral(orderId)}::bigint)
       or ("refType" = 'matrix' and "refId" in (
         select cast(replace("approvalBatchRef", 'matrix:auto-order:', '') as bigint)
         from "Order"
         where "id" = ${sqlLiteral(orderId)}::bigint
           and "approvalBatchRef" like 'matrix:auto-order:%'
       ));
  `);
  runPsql(`
    update "MatrixAccumulationEvent"
    set "createdAt" = ${quoted}::timestamptz
    where "sourceOrderId" = ${sqlLiteral(orderId)}::bigint;
  `);
  runPsql(`
    update "MatrixPayout"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "sourceOrderId" = ${sqlLiteral(orderId)}::bigint;
  `);
}

function markOrderApprovedForRuntime(input) {
  const approvedAtQuoted = sqlLiteral(input.approvedAtIso);
  const commissionSnapshotQuoted = sqlLiteral(input.commissionSettingsSnapshot);
  const matrixSnapshotQuoted = sqlLiteral(input.matrixSettingsSnapshot);

  runPsql(`
    update "Order"
    set "paidAt" = ${approvedAtQuoted}::timestamptz,
        "approvedAt" = ${approvedAtQuoted}::timestamptz,
        "commissionSettingsSnapshot" = ${commissionSnapshotQuoted},
        "matrixSettingsSnapshot" = ${matrixSnapshotQuoted},
        "approvalStatus" = 'APPROVED',
        "status" = 'APPROVED',
        "updatedAt" = ${approvedAtQuoted}::timestamptz
    where "id" = ${sqlLiteral(input.orderId)}::bigint;
  `);
}

async function main() {
  await expectOk("/health");

  const rows = parseWorkbookRows(WORKBOOK_PATH)
    .filter((row) => row.status === "อนุมัติ")
    .filter((row) => !SKIP_INVOICE_SET.has(String(row.invoiceNo || "").trim()))
    .filter((row) => {
      const sequenceNo = Number.parseInt(String(row.sequenceNo || "0"), 10) || 0;
      return sequenceNo >= START_SEQUENCE;
    })
    .sort((left, right) => {
      const dateCompare = toIsoFromThaiDate(left.invoiceDate).localeCompare(
        toIsoFromThaiDate(right.invoiceDate),
      );
      if (dateCompare !== 0) {
        return dateCompare;
      }
      const leftSequence = Number.parseInt(String(left.sequenceNo || "0"), 10) || 0;
      const rightSequence = Number.parseInt(String(right.sequenceNo || "0"), 10) || 0;
      return leftSequence - rightSequence;
    })
    .slice(0, LIMIT > 0 ? LIMIT : undefined);

  const runtimeSnapshots = loadRuntimeSnapshots();
  const activeProduct = loadImportProduct();
  const productPv = parseDecimal(activeProduct.pv);
  if (productPv <= 0) {
    throw new Error("Active product PV must be greater than zero.");
  }

  const memberMap = loadMemberMap(rows.map((row) => row.memberCode));
  const existingByTag = loadExistingImportRows(SOURCE_TAG);

  const memberCheck = rows.reduce(
    (acc, row) => {
      const normalizedMemberCode = normalizeMemberCode(row.memberCode);
      if (memberMap.has(normalizedMemberCode)) {
        acc.found += 1;
      } else {
        acc.missing.push({
          sourceMemberCode: row.memberCode,
          normalizedMemberCode,
          invoiceNo: row.invoiceNo,
        });
      }
      return acc;
    },
    { found: 0, missing: [] },
  );

  const adminSession = await login(ADMIN_IDENTIFIER, ADMIN_PASSWORD);
  const results = [];

  for (const row of rows) {
    const normalizedMemberCode = normalizeMemberCode(row.memberCode);
    const userId = memberMap.get(normalizedMemberCode);
    const importTag = `${SOURCE_TAG}|invoice=${row.invoiceNo}`;

    if (!userId) {
      results.push({
        sourceInvoiceNo: row.invoiceNo,
        sourceSequenceNo: row.sequenceNo,
        sourceMemberCode: row.memberCode,
        normalizedMemberCode,
        status: "missing_member",
      });
      continue;
    }

    if (existingByTag.has(importTag)) {
      const existing = existingByTag.get(importTag);
      results.push({
        sourceInvoiceNo: row.invoiceNo,
        sourceSequenceNo: row.sequenceNo,
        sourceMemberCode: row.memberCode,
        normalizedMemberCode,
        status: "skipped_existing",
        runtimeOrderId: existing.id,
        runtimeOrderNo: existing.orderNo,
      });
      continue;
    }

    const pv = parseDecimal(row.pv);
    const quantity = pv / productPv;

    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      results.push({
        sourceInvoiceNo: row.invoiceNo,
        sourceSequenceNo: row.sequenceNo,
        sourceMemberCode: row.memberCode,
        normalizedMemberCode,
        status: "invalid_quantity",
        pv: row.pv,
        productPv: activeProduct.pv,
        productCode: activeProduct.code,
      });
      continue;
    }

    if (!APPLY) {
      results.push({
        sourceInvoiceNo: row.invoiceNo,
        sourceSequenceNo: row.sequenceNo,
        sourceMemberCode: row.memberCode,
        normalizedMemberCode,
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
        items: [{ productDetailId: activeProduct.id, quantity: String(quantity) }],
        fulfillmentMethod: "branch_pickup",
        pickupBranchName: "Sale Test Import",
        pickupBranchNote: importTag,
        pickupRecipientName: "Sale Test Import",
        pickupPhone: "0800000000",
        discountWalletAmount: "0",
        shoppingWalletAmount: "0",
        firmWalletAmount: "0",
        cashPaymentMethod: "bank_transfer",
      },
    });

    const approvedAtIso = toIsoFromThaiDate(row.invoiceDate);
    markOrderApprovedForRuntime({
      orderId: createdOrder.orderId,
      approvedAtIso,
      commissionSettingsSnapshot: runtimeSnapshots.commissionSettingsSnapshot,
      matrixSettingsSnapshot: runtimeSnapshots.matrixSettingsSnapshot,
    });

    const approved = await expectOk(
      `/orders/${createdOrder.orderId}/process-approved`,
      {
        method: "POST",
        token: adminSession.accessToken,
      },
    );

    await backfillOrderDates(createdOrder.orderId, approvedAtIso);

    const sourceRuntimeOrderNo = Number.parseInt(String(createdOrder.orderNo || "0"), 10) || 0;
    const openedAutoOrderCount = Number(
      approved?.matrixProcessing?.openedAutoOrderCount || 0,
    );
    const ordersInRange = loadOrdersByRange(
      sourceRuntimeOrderNo,
      sourceRuntimeOrderNo + openedAutoOrderCount,
    );
    const generatedAutoOrders = extractMatrixReentryOrders(
      ordersInRange,
      sourceRuntimeOrderNo,
    );
    for (const generatedAutoOrder of generatedAutoOrders) {
      await backfillOrderDates(generatedAutoOrder.runtimeOrderId, approvedAtIso);
    }

    results.push({
      sourceInvoiceNo: row.invoiceNo,
      sourceSequenceNo: row.sequenceNo,
      sourceMemberCode: row.memberCode,
      normalizedMemberCode,
      status: "imported",
      runtimeOrderId: createdOrder.orderId,
      runtimeOrderNo: createdOrder.orderNo,
      totalPv: createdOrder.totalPv,
      openedAutoOrderCount,
      generatedAutoOrders,
      runtimeSequenceSpan: {
        sourceOrderNo: createdOrder.orderNo,
        throughOrderNo:
          openedAutoOrderCount > 0
            ? String(sourceRuntimeOrderNo + openedAutoOrderCount).padStart(7, "0")
            : createdOrder.orderNo,
      },
    });
  }

  const summary = results.reduce(
    (acc, row) => {
      acc.total += 1;
      acc[row.status] = (acc[row.status] || 0) + 1;
      if (row.openedAutoOrderCount) {
        acc.openedAutoOrderCount =
          (acc.openedAutoOrderCount || 0) + row.openedAutoOrderCount;
      }
      return acc;
    },
    { total: 0, openedAutoOrderCount: 0 },
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        workbookPath: WORKBOOK_PATH,
        sourceTag: SOURCE_TAG,
        apply: APPLY,
        startSequence: START_SEQUENCE,
        skippedInvoices: Array.from(SKIP_INVOICE_SET.values()),
        memberCheck: {
          totalRows: rows.length,
          foundCount: memberCheck.found,
          missingCount: memberCheck.missing.length,
          missingSample: memberCheck.missing.slice(0, 20),
        },
        activeProduct,
        summary,
        sample: results.slice(0, 30),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
