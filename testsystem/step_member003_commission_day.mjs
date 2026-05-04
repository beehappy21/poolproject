import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { execFileSync } from "node:child_process";

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const POSTGRES_CONTAINER =
  process.env.POSTGRES_DOCKER_CONTAINER || "poolproject-postgres";
const POSTGRES_DB = process.env.POSTGRES_DB || "poolproject";
const POSTGRES_USER = process.env.POSTGRES_USER || "postgres";
const ADMIN_IDENTIFIER =
  process.env.BASELINE_ADMIN_IDENTIFIER || "dev-admin@example.com";
const ADMIN_PASSWORD = process.env.BASELINE_ADMIN_PASSWORD || "472121";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const RUNTIME_DIR = path.join(ROOT, "runtime", "testsystem");
const STATE_PATH = path.join(RUNTIME_DIR, "member003-commission-step-state.json");
const HISTORY_PATH = path.join(
  RUNTIME_DIR,
  "member003-commission-step-history.json",
);
const SOURCE_TAG =
  process.env.BASELINE_SOURCE_TAG || "commission-test-stepper";
const PRODUCT_DETAIL_CODE = "COMMTEST1000";
const PACKAGE_CODE = "COMMTESTPKG1000";
const PRODUCT_NAME = "test";
const PRODUCT_PRICE = "1000";
const PRODUCT_PV = "350";
const APPLY = process.argv.includes("--apply");
const RESET_STATE = process.argv.includes("--reset-state");

function ensureRuntimeDir() {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureRuntimeDir();
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function runPsql(sql) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      POSTGRES_CONTAINER,
      "psql",
      "-U",
      POSTGRES_USER,
      "-d",
      POSTGRES_DB,
      "-Atqc",
      sql,
    ],
    {
      encoding: "utf8",
      cwd: ROOT,
    },
  ).trim();
}

function fetchSingleValue(sql) {
  const raw = runPsql(sql);
  return raw ? raw.split("\n")[0] : "";
}

function request(requestPath, options = {}) {
  const target = new URL(`${API_BASE_URL}${requestPath}`);
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

async function expectOk(requestPath, options = {}) {
  const response = await request(requestPath, options);
  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.body;
  }
  throw new Error(
    `${options.method || "GET"} ${requestPath} failed with ${response.statusCode}: ${JSON.stringify(response.body)}`,
  );
}

async function loginAdmin() {
  const response = await expectOk("/auth/login", {
    method: "POST",
    body: {
      identifier: ADMIN_IDENTIFIER,
      password: ADMIN_PASSWORD,
    },
  });
  return response.accessToken;
}

function parseMemberRows(raw) {
  if (!raw) {
    return [];
  }

  return raw
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
      const [userId, memberCode, name, signupDate] = line.split("|");
      return {
        sequence: index + 1,
        userId,
        memberCode,
        name,
        signupDate,
      };
    });
}

function loadMembers() {
  return parseMemberRows(
    runPsql(`
      select
        u.id::text,
        u."memberCode",
        coalesce(u."name", ''),
        to_char(u."createdAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD')
      from "User" u
      where u."isAdmin" = false
      order by
        to_char(u."createdAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') asc,
        u."memberCode" asc,
        u.id asc;
    `),
  );
}

function buildDailyBatches(rows) {
  const batches = [];
  let current = null;

  for (const row of rows) {
    if (!current || current.signupDate !== row.signupDate) {
      current = {
        signupDate: row.signupDate,
        memberCount: 0,
        firstMemberCode: row.memberCode,
        lastMemberCode: row.memberCode,
        members: [],
      };
      batches.push(current);
    }

    current.memberCount += 1;
    current.lastMemberCode = row.memberCode;
    current.members.push(row);
  }

  return batches;
}

function toBangkokNoonIso(dateOnly) {
  const [year, month, day] = dateOnly
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  return new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0)).toISOString();
}

function ensureCatalog() {
  const productDetailId = fetchSingleValue(
    `select id::text from "ProductDetail" where code = ${sqlLiteral(PRODUCT_DETAIL_CODE)} limit 1;`,
  );
  const packageId = fetchSingleValue(
    `select id::text from "Package" where code = ${sqlLiteral(PACKAGE_CODE)} limit 1;`,
  );

  if (!productDetailId || !packageId) {
    throw new Error(
      `Required test catalog is missing. Expected product ${PRODUCT_NAME} (${PRODUCT_PRICE} THB / ${PRODUCT_PV} PV) with detail code ${PRODUCT_DETAIL_CODE}.`,
    );
  }

  return {
    productDetailId,
    packageId,
  };
}

function loadExistingOrders() {
  const rows = runPsql(`
    select
      o.id::text,
      o."orderNo",
      coalesce(o."shippingAddressNote", '')
    from "Order" o
    where o."shippingAddressNote" like ${sqlLiteral(`${SOURCE_TAG}|%`)}
    order by o.id asc;
  `);

  const map = new Map();
  for (const line of rows.split("\n").filter(Boolean)) {
    const [orderId, orderNo, ...tagParts] = line.split("|");
    map.set(tagParts.join("|"), { orderId, orderNo });
  }
  return map;
}

function backfillOrderDates(orderId, userId, approvedAtIso) {
  const quoted = sqlLiteral(approvedAtIso);
  runPsql(`
    update "Order"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz,
        "paidAt" = coalesce("paidAt", ${quoted}::timestamptz),
        "approvedAt" = ${quoted}::timestamptz
    where id = ${sqlLiteral(orderId)}::bigint;

    update "OrderItem"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "orderId" = ${sqlLiteral(orderId)}::bigint;

    update "CommissionLedger"
    set "commissionDate" = date(${quoted}::timestamptz),
        "evaluationAt" = ${quoted}::timestamptz,
        "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "orderId" = ${sqlLiteral(orderId)}::bigint;

    update "CompanyBonusLedger"
    set "createdAt" = ${quoted}::timestamptz
    where "sourceRefId" = ${sqlLiteral(orderId)}::bigint;

    update "WalletTransaction"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where ("refType" = 'COMMISSION' and "refId" in (
      select id from "CommissionLedger" where "orderId" = ${sqlLiteral(orderId)}::bigint
    ))
       or ("refType" = 'ORDER' and "refId" = ${sqlLiteral(orderId)}::bigint);

    update "MemberPackageCycle"
    set "activatedAt" = ${quoted}::timestamptz,
        "activeUntil" = ${quoted}::timestamptz + ("activeUntil" - "activatedAt"),
        "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where id in (
      select mpc.id
      from "MemberPackageCycle" mpc
      where mpc."userId" = ${sqlLiteral(userId)}::bigint
      order by mpc.id desc
      limit 1
    );
  `);
}

async function seedBatchOrders({ batch, productDetailId, token }) {
  const existingOrders = loadExistingOrders();
  const results = [];

  for (const member of batch.members) {
    const tag = `${SOURCE_TAG}|member=${member.memberCode}|signupDate=${member.signupDate}|seq=${member.sequence}`;
    const approvedAtIso = toBangkokNoonIso(member.signupDate);
    const existing = existingOrders.get(tag);

    if (existing) {
      if (APPLY) {
        backfillOrderDates(existing.orderId, member.userId, approvedAtIso);
      }
      results.push({
        memberCode: member.memberCode,
        orderId: existing.orderId,
        orderNo: existing.orderNo,
        status: "existing",
      });
      continue;
    }

    if (!APPLY) {
      results.push({
        memberCode: member.memberCode,
        orderId: null,
        orderNo: null,
        status: "planned",
      });
      continue;
    }

    const created = await expectOk("/orders", {
      method: "POST",
      token,
      body: {
        userId: member.userId,
        productDetailId,
        quantity: "1",
        fulfillmentMethod: "branch_pickup",
        pickupBranchName: "Commission Test Stepper",
        pickupBranchNote: tag,
        pickupRecipientName: member.name || member.memberCode,
        pickupPhone: "0800000000",
        cashPaymentMethod: "bank_transfer",
      },
    });

    await expectOk(`/orders/${created.orderId}/approve`, {
      method: "POST",
      token,
    });
    await expectOk(`/orders/${created.orderId}/process-approved`, {
      method: "POST",
      token,
    });
    backfillOrderDates(created.orderId, member.userId, approvedAtIso);

    results.push({
      memberCode: member.memberCode,
      orderId: created.orderId,
      orderNo: created.orderNo,
      status: "created",
    });
  }

  return results;
}

async function processEndOfDay(settlementDate, token) {
  if (!APPLY) {
    return { settlementDate, status: "planned" };
  }

  const result = await expectOk(`/commissions/end-of-day/${settlementDate}/process`, {
    method: "POST",
    token,
  });
  return { settlementDate, status: "processed", result };
}

function loadDailySummaryForDate(reportDate) {
  const rows = runPsql(`
    with order_daily as (
      select
        to_char(o."approvedAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as report_date,
        count(*) as order_count,
        count(distinct o."userId") as buyer_count,
        coalesce(sum(o."totalPv"), 0)::text as total_pv,
        coalesce(sum(o."totalUsdt"), 0)::text as total_amount
      from "Order" o
      where o."shippingAddressNote" like ${sqlLiteral(`${SOURCE_TAG}|%`)}
        and o."approvedAt" is not null
      group by 1
    ),
    commission_daily as (
      select
        to_char(cl."commissionDate", 'YYYY-MM-DD') as report_date,
        coalesce(sum(case when cl."commissionType" = 'DIRECT' then cl."commissionAmount" else 0 end), 0)::text as direct_amount,
        coalesce(sum(case when cl."commissionType" = 'TEAM_2LEG' then cl."commissionAmount" else 0 end), 0)::text as team_2leg_amount,
        coalesce(sum(case when cl."commissionType" = 'TEAM_3LEG' then cl."commissionAmount" else 0 end), 0)::text as team_3leg_amount,
        coalesce(sum(case when cl."commissionType" = 'MATCHING_L1' then cl."commissionAmount" else 0 end), 0)::text as matching_l1_amount,
        coalesce(sum(case when cl."commissionType" = 'MATCHING_L2' then cl."commissionAmount" else 0 end), 0)::text as matching_l2_amount,
        coalesce(sum(case when cl."commissionType" = 'POOL' then cl."commissionAmount" else 0 end), 0)::text as pool_ledger_amount
      from "CommissionLedger" cl
      where to_char(cl."commissionDate", 'YYYY-MM-DD') = ${sqlLiteral(reportDate)}
      group by 1
    ),
    fallback_daily as (
      select
        to_char(cbl."createdAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as report_date,
        coalesce(sum(cbl."amount"), 0)::text as company_fallback_amount
      from "CompanyBonusLedger" cbl
      where to_char(cbl."createdAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') = ${sqlLiteral(reportDate)}
      group by 1
    ),
    pool_daily as (
      select
        to_char(dpc."cycleDate" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as report_date,
        count(*)::text as pool_payout_count,
        count(*) filter (where dpp."commissionLedgerId" is not null)::text as linked_pool_payout_count,
        coalesce(sum(dpp."payoutAmount"), 0)::text as pool_payout_amount
      from "DailyPoolPayout" dpp
      join "DailyPoolCycle" dpc on dpc.id = dpp."cycleId"
      where to_char(dpc."cycleDate" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') = ${sqlLiteral(reportDate)}
      group by 1
    )
    select
      ${sqlLiteral(reportDate)},
      coalesce(od.order_count, 0)::text,
      coalesce(od.buyer_count, 0)::text,
      coalesce(od.total_pv, '0'),
      coalesce(od.total_amount, '0'),
      coalesce(cd.direct_amount, '0'),
      coalesce(cd.team_2leg_amount, '0'),
      coalesce(cd.team_3leg_amount, '0'),
      coalesce(cd.matching_l1_amount, '0'),
      coalesce(cd.matching_l2_amount, '0'),
      coalesce(cd.pool_ledger_amount, '0'),
      coalesce(fd.company_fallback_amount, '0'),
      coalesce(pd.pool_payout_count, '0'),
      coalesce(pd.linked_pool_payout_count, '0'),
      coalesce(pd.pool_payout_amount, '0')
    from (select 1) seed
    left join order_daily od on od.report_date = ${sqlLiteral(reportDate)}
    left join commission_daily cd on cd.report_date = ${sqlLiteral(reportDate)}
    left join fallback_daily fd on fd.report_date = ${sqlLiteral(reportDate)}
    left join pool_daily pd on pd.report_date = ${sqlLiteral(reportDate)};
  `);

  const [
    effectiveDate,
    orderCount,
    buyerCount,
    totalPv,
    totalAmount,
    directAmount,
    team2LegAmount,
    team3LegAmount,
    matchingL1Amount,
    matchingL2Amount,
    poolLedgerAmount,
    companyFallbackAmount,
    poolPayoutCount,
    linkedPoolPayoutCount,
    poolPayoutAmount,
  ] = rows.split("|");

  return {
    reportDate: effectiveDate,
    orderCount: Number(orderCount),
    buyerCount: Number(buyerCount),
    totalPv,
    totalAmount,
    directAmount,
    team2LegAmount,
    team3LegAmount,
    matchingL1Amount,
    matchingL2Amount,
    poolLedgerAmount,
    companyFallbackAmount,
    poolPayoutCount: Number(poolPayoutCount),
    linkedPoolPayoutCount: Number(linkedPoolPayoutCount),
    poolPayoutAmount,
  };
}

function readState() {
  return readJson(STATE_PATH, {
    nextBatchIndex: 0,
    totalProcessedDays: 0,
  });
}

async function main() {
  ensureRuntimeDir();

  if (RESET_STATE) {
    writeJson(STATE_PATH, {
      nextBatchIndex: 0,
      totalProcessedDays: 0,
    });
    writeJson(HISTORY_PATH, []);
    console.log(
      JSON.stringify(
        {
          ok: true,
          resetState: true,
          statePath: STATE_PATH,
          historyPath: HISTORY_PATH,
        },
        null,
        2,
      ),
    );
    return;
  }

  await expectOk("/health");

  const catalog = ensureCatalog();
  const members = loadMembers();
  const batches = buildDailyBatches(members);
  const state = readState();
  const history = readJson(HISTORY_PATH, []);
  const batch = batches[state.nextBatchIndex];

  if (!batch) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          completed: true,
          message: "All signup-day batches have already been processed.",
          totalProcessedDays: state.totalProcessedDays,
          totalAvailableDays: batches.length,
          statePath: STATE_PATH,
          historyPath: HISTORY_PATH,
        },
        null,
        2,
      ),
    );
    return;
  }

  const payload = {
    ok: true,
    apply: APPLY,
    sourceTag: SOURCE_TAG,
    product: {
      name: PRODUCT_NAME,
      price: PRODUCT_PRICE,
      pv: PRODUCT_PV,
      productDetailCode: PRODUCT_DETAIL_CODE,
      productDetailId: catalog.productDetailId,
      packageId: catalog.packageId,
    },
    batch: {
      batchIndex: state.nextBatchIndex,
      totalBatches: batches.length,
      signupDate: batch.signupDate,
      memberCount: batch.memberCount,
      firstMemberCode: batch.firstMemberCode,
      lastMemberCode: batch.lastMemberCode,
    },
  };

  if (!APPLY) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const token = await loginAdmin();
  const orders = await seedBatchOrders({
    batch,
    productDetailId: catalog.productDetailId,
    token,
  });
  const eod = await processEndOfDay(batch.signupDate, token);
  const dailySummary = loadDailySummaryForDate(batch.signupDate);

  const result = {
    ...payload,
    createdOrders: orders.filter((row) => row.status === "created").length,
    existingOrders: orders.filter((row) => row.status === "existing").length,
    endOfDay: eod,
    dailySummary,
  };

  history.push(result);
  writeJson(HISTORY_PATH, history);
  writeJson(STATE_PATH, {
    nextBatchIndex: state.nextBatchIndex + 1,
    totalProcessedDays: state.totalProcessedDays + 1,
    lastProcessedDate: batch.signupDate,
    lastProcessedMemberCount: batch.memberCount,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
