#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");
const { execFileSync } = require("node:child_process");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const POSTGRES_CONTAINER =
  process.env.POSTGRES_DOCKER_CONTAINER || "poolproject-postgres";
const POSTGRES_DB = process.env.POSTGRES_DB || "poolproject";
const POSTGRES_USER = process.env.POSTGRES_USER || "postgres";
const ADMIN_IDENTIFIER =
  process.env.BASELINE_ADMIN_IDENTIFIER || "dev-admin@example.com";
const ADMIN_PASSWORD = process.env.BASELINE_ADMIN_PASSWORD || "472121";
const INTERNAL_BAO_TOKEN = (process.env.INTERNAL_RECEIPT_TOKEN || "").trim();
const SOURCE_TAG =
  process.env.BASELINE_SOURCE_TAG || "commission-test-baseline";
const ROOT = path.resolve(__dirname, "..");
const RUNTIME_DIR = path.join(ROOT, "runtime");
const PRODUCT_DETAIL_CODE = "COMMTEST1000";
const MAX_RATE_LIMIT_RETRIES = Number.parseInt(
  process.env.BASELINE_MAX_RATE_LIMIT_RETRIES || "20",
  10,
);

function parseArgs(argv) {
  const options = {
    apply: false,
    reset: false,
    maxDays: Number.POSITIVE_INFINITY,
    maxOrders: Number.POSITIVE_INFINITY,
    stopOnPoolLedger: true,
    runAll: false,
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--reset") {
      options.reset = true;
      continue;
    }

    if (arg.startsWith("--max-days=")) {
      options.maxDays = Math.max(
        1,
        Number.parseInt(arg.slice("--max-days=".length), 10) || 1,
      );
      continue;
    }

    if (arg.startsWith("--max-orders=")) {
      options.maxOrders = Math.max(
        1,
        Number.parseInt(arg.slice("--max-orders=".length), 10) || 1,
      );
      continue;
    }

    if (arg === "--stop-on-linked-payout-only") {
      options.stopOnPoolLedger = false;
      continue;
    }

    if (arg === "--run-all") {
      options.runAll = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

const OPTIONS = parseArgs(process.argv.slice(2));

function ensureRuntimeDir() {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

function writeJson(fileName, value) {
  ensureRuntimeDir();
  fs.writeFileSync(
    path.join(RUNTIME_DIR, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function writeText(fileName, value) {
  ensureRuntimeDir();
  fs.writeFileSync(path.join(RUNTIME_DIR, fileName), value, "utf8");
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
          ...(options.internalBaoToken
            ? { "x-internal-bao-token": options.internalBaoToken }
            : {}),
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
            headers: res.headers,
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
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    const response = await request(requestPath, options);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.body;
    }

    if (response.statusCode === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const retryAfterHeader = Array.isArray(response.headers?.["retry-after"])
        ? response.headers?.["retry-after"]?.[0]
        : response.headers?.["retry-after"];
      const retryAfterSeconds = Number.parseInt(
        String(retryAfterHeader || "60"),
        10,
      );
      const delayMs = Math.max(
        Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 60,
        1,
      ) * 1000;
      console.log(
        `[baseline-until-pool] rate limited on ${options.method || "GET"} ${requestPath}; retrying in ${Math.round(delayMs / 1000)}s (${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})`,
      );
      await sleep(delayMs);
      continue;
    }

    throw new Error(
      `${options.method || "GET"} ${requestPath} failed with ${response.statusCode}: ${JSON.stringify(response.body)}`,
    );
  }

  throw new Error(
    `${options.method || "GET"} ${requestPath} exhausted retries after repeated rate limiting.`,
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

async function resolveApiAuth() {
  if (INTERNAL_BAO_TOKEN) {
    return {
      mode: "internal-bao-token",
      internalBaoToken: INTERNAL_BAO_TOKEN,
    };
  }

  return {
    mode: "bearer",
    token: await loginAdmin(),
  };
}

function parseMemberRows(raw) {
  if (!raw) {
    return [];
  }

  return raw
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
      const [userId, memberCode, name, signupDate, sponsorUserId] = line.split("|");
      return {
        originalOrder: index,
        userId,
        memberCode,
        name,
        originalSignupDate: signupDate,
        sponsorUserId: sponsorUserId || null,
      };
    });
}

function applyCommissionSequence(rows) {
  if (rows.length === 0) {
    return [];
  }

  const dateBuckets = {};
  const memberByUserId = new Map();
  const indegreeByUserId = new Map();
  const childrenByUserId = new Map();

  for (const row of rows) {
    dateBuckets[row.originalSignupDate] =
      (dateBuckets[row.originalSignupDate] || 0) + 1;
    memberByUserId.set(row.userId, row);
    indegreeByUserId.set(row.userId, 0);
    childrenByUserId.set(row.userId, []);
  }

  for (const row of rows) {
    if (!row.sponsorUserId || !memberByUserId.has(row.sponsorUserId)) {
      continue;
    }

    childrenByUserId.get(row.sponsorUserId).push(row.userId);
    indegreeByUserId.set(row.userId, (indegreeByUserId.get(row.userId) || 0) + 1);
  }

  const sortReady = (userIds) =>
    userIds.sort(
      (left, right) =>
        (memberByUserId.get(left)?.originalOrder || 0) -
        (memberByUserId.get(right)?.originalOrder || 0),
    );

  const readyUserIds = sortReady(
    rows
      .filter((row) => (indegreeByUserId.get(row.userId) || 0) === 0)
      .map((row) => row.userId),
  );

  const ordered = [];
  while (readyUserIds.length > 0) {
    const userId = readyUserIds.shift();
    const member = userId ? memberByUserId.get(userId) : null;
    if (!member) {
      continue;
    }

    ordered.push(member);
    for (const childUserId of childrenByUserId.get(userId) || []) {
      indegreeByUserId.set(childUserId, (indegreeByUserId.get(childUserId) || 0) - 1);
      if ((indegreeByUserId.get(childUserId) || 0) === 0) {
        readyUserIds.push(childUserId);
      }
    }
    sortReady(readyUserIds);
  }

  if (ordered.length < rows.length) {
    const orderedUserIds = new Set(ordered.map((row) => row.userId));
    for (const row of rows) {
      if (!orderedUserIds.has(row.userId)) {
        ordered.push(row);
      }
    }
  }

  const dateEntries = Object.entries(dateBuckets).map(([date, count]) => ({
    date,
    count,
  }));
  let dateIndex = 0;
  let slotUsage = 0;
  const daySequences = {};

  return ordered.map((row, index) => {
    while (dateEntries[dateIndex] && slotUsage >= dateEntries[dateIndex].count) {
      dateIndex += 1;
      slotUsage = 0;
    }

    const assignedDate = dateEntries[dateIndex]?.date || row.originalSignupDate;
    slotUsage += 1;
    daySequences[assignedDate] = (daySequences[assignedDate] || 0) + 1;

    return {
      ...row,
      sequence: index + 1,
      daySequence: daySequences[assignedDate],
      signupDate: assignedDate,
    };
  });
}

function loadMembers() {
  return applyCommissionSequence(
    parseMemberRows(
      runPsql(`
        select
          u.id::text,
          u."memberCode",
          coalesce(u."name", ''),
          to_char((u."createdAt" + interval '7 hour')::date, 'YYYY-MM-DD'),
          u."sponsorId"::text
        from "User" u
        where u."isAdmin" = false
        order by
          to_char((u."createdAt" + interval '7 hour')::date, 'YYYY-MM-DD') asc,
          u."memberCode" asc,
          u.id asc;
      `),
    ),
  );
}

function resolveProductDetailId() {
  const id = fetchSingleValue(
    `select id::text from "ProductDetail" where code = ${sqlLiteral(PRODUCT_DETAIL_CODE)} limit 1;`,
  );

  if (!id) {
    throw new Error(
      `Missing ProductDetail code ${PRODUCT_DETAIL_CODE}. Run scripts/seed_member003_test_baseline.js --apply once or seed the catalog baseline first.`,
    );
  }

  return id;
}

function memberTag(member) {
  return `${SOURCE_TAG}|member=${member.memberCode}|signupDate=${member.signupDate}|seq=${member.sequence}`;
}

function toBangkokSequencedIso(dateOnly, sequence = 1) {
  const minuteOffset = Math.max(0, Number(sequence || 1) - 1);
  const minute = String(minuteOffset % 60).padStart(2, "0");
  const hour = String(5 + Math.floor(minuteOffset / 60)).padStart(2, "0");
  return `${dateOnly}T${hour}:${minute}:00+07:00`;
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
    const [orderId, orderNo, tag] = line.split("|");
    map.set(tag, { orderId, orderNo });
  }

  return map;
}

function loadCommissionedOrderLookup(orderIds) {
  const uniqueOrderIds = Array.from(
    new Set(orderIds.filter((value) => typeof value === "string" && value !== "")),
  );
  if (uniqueOrderIds.length === 0) {
    return new Set();
  }

  const rows = runPsql(`
    select distinct "orderId"::text
    from "CommissionLedger"
    where "orderId" in (${uniqueOrderIds
      .map((value) => `${sqlLiteral(value)}::bigint`)
      .join(",")});
  `);

  return new Set(rows.split("\n").filter(Boolean));
}

function batchHasPendingMembers(batch, existingOrders) {
  const orderIds = batch.members
    .map((member) => existingOrders.get(memberTag(member))?.orderId || null)
    .filter(Boolean);
  const commissionedLookup = loadCommissionedOrderLookup(orderIds);

  return batch.members.some((member) => {
    const existing = existingOrders.get(memberTag(member));
    if (!existing) {
      return true;
    }

    return !commissionedLookup.has(existing.orderId);
  });
}

function prepareOrderForApprovedProcessing(orderId, approvedAtIso) {
  const quoted = sqlLiteral(approvedAtIso);
  runPsql(`
    update "Order"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz,
        "status" = 'APPROVED',
        "approvalStatus" = 'APPROVED',
        "paidAt" = coalesce("paidAt", ${quoted}::timestamptz),
        "approvedAt" = ${quoted}::timestamptz
    where id = ${sqlLiteral(orderId)}::bigint;

    update "OrderItem"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "orderId" = ${sqlLiteral(orderId)}::bigint;
  `);
}

function backfillOrderDates(orderId, userId, approvedAtIso) {
  const quoted = sqlLiteral(approvedAtIso);
  runPsql(`
    update "Order"
    set "updatedAt" = ${quoted}::timestamptz
    where id = ${sqlLiteral(orderId)}::bigint;

    update "OrderItem"
    set "updatedAt" = ${quoted}::timestamptz
    where "orderId" = ${sqlLiteral(orderId)}::bigint;

    update "CommissionLedger"
    set "commissionDate" = date(${quoted}::timestamptz at time zone 'Asia/Bangkok'),
        "evaluationAt" = ${quoted}::timestamptz,
        "finalizeCheckedAt" = coalesce("finalizeCheckedAt", ${quoted}::timestamptz),
        "finalizedAt" = coalesce("finalizedAt", ${quoted}::timestamptz),
        "releasedToWithdrawableAt" = case
          when "releasedToWithdrawableAt" is not null then ${quoted}::timestamptz
          else null
        end,
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

    update "MatrixPayout"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "sourceOrderId" = ${sqlLiteral(orderId)}::bigint;

    update "MatrixAccumulationEvent"
    set "createdAt" = ${quoted}::timestamptz
    where "sourceOrderId" = ${sqlLiteral(orderId)}::bigint;

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

function loadPoolProgress() {
  const raw = runPsql(`
    with baseline_orders as (
      select id, (("approvedAt" + interval '7 hour')::date) as settlement_date
      from "Order"
      where "shippingAddressNote" like ${sqlLiteral(`${SOURCE_TAG}|%`)}
        and "approvedAt" is not null
    ),
    pool_ledger as (
      select
        cl."commissionDate" as settlement_date,
        count(*)::int as row_count,
        coalesce(sum(cl."commissionAmount"), 0)::text as amount
      from "CommissionLedger" cl
      where cl."commissionType" = 'POOL'
        and cl."orderId" in (select id from baseline_orders)
      group by cl."commissionDate"
    ),
    pool_payout as (
      select
        dpc."cycleDate" as settlement_date,
        count(*)::int as payout_count,
        count(*) filter (where dpp."commissionLedgerId" is not null)::int as linked_payout_count,
        coalesce(sum(dpp."payoutAmount"), 0)::text as payout_amount
      from "DailyPoolPayout" dpp
      join "DailyPoolCycle" dpc on dpc.id = dpp."cycleId"
      where dpc."cycleDate" in (select settlement_date from baseline_orders)
      group by dpc."cycleDate"
    ),
    pool_cycle as (
      select
        dpc."cycleDate" as settlement_date,
        dpc."eligibleMemberCount"::int as eligible_member_count,
        coalesce(dpc."companyFallbackAmount", 0)::text as company_fallback_amount,
        coalesce(dpc."poolFund", 0)::text as pool_fund,
        dpc.status::text as cycle_status
      from "DailyPoolCycle" dpc
      where dpc."cycleDate" in (select settlement_date from baseline_orders)
    )
    select
      to_char(dates.settlement_date, 'YYYY-MM-DD'),
      coalesce(pc.eligible_member_count, 0)::text,
      coalesce(pc.company_fallback_amount, '0'),
      coalesce(pc.pool_fund, '0'),
      coalesce(pc.cycle_status, ''),
      coalesce(pl.row_count, 0)::text,
      coalesce(pl.amount, '0'),
      coalesce(pp.payout_count, 0)::text,
      coalesce(pp.linked_payout_count, 0)::text,
      coalesce(pp.payout_amount, '0')
    from (select distinct settlement_date from baseline_orders) dates
    left join pool_cycle pc on pc.settlement_date = dates.settlement_date
    left join pool_ledger pl on pl.settlement_date = dates.settlement_date
    left join pool_payout pp on pp.settlement_date = dates.settlement_date
    order by dates.settlement_date asc;
  `);

  const rows = raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [
        settlementDate,
        eligibleMemberCount,
        companyFallbackAmount,
        poolFund,
        cycleStatus,
        poolLedgerCount,
        poolLedgerAmount,
        poolPayoutCount,
        linkedPoolPayoutCount,
        poolPayoutAmount,
      ] = line.split("|");

      return {
        settlementDate,
        eligibleMemberCount: Number(eligibleMemberCount || "0"),
        companyFallbackAmount,
        poolFund,
        cycleStatus: cycleStatus || "",
        poolLedgerCount: Number(poolLedgerCount || "0"),
        poolLedgerAmount,
        poolPayoutCount: Number(poolPayoutCount || "0"),
        linkedPoolPayoutCount: Number(linkedPoolPayoutCount || "0"),
        poolPayoutAmount,
      };
    });

  const successRow = rows.find((row) =>
    OPTIONS.stopOnPoolLedger
      ? row.poolLedgerCount > 0 || row.linkedPoolPayoutCount > 0
      : row.linkedPoolPayoutCount > 0,
  );

  return {
    rows,
    success: successRow || null,
  };
}

function batchMembersByDate(members) {
  const grouped = new Map();
  for (const member of members) {
    const rows = grouped.get(member.signupDate) || [];
    rows.push(member);
    grouped.set(member.signupDate, rows);
  }
  return [...grouped.entries()].map(([settlementDate, rows]) => ({
    settlementDate,
    members: rows,
  }));
}

async function createOrProcessOrder({ member, auth, productDetailId, existingOrders }) {
  const tag = memberTag(member);
  const approvedAtIso = toBangkokSequencedIso(
    member.signupDate,
    member.daySequence || member.sequence,
  );
  const existing = existingOrders.get(tag);

  if (existing) {
    const commissionedLookup = loadCommissionedOrderLookup([existing.orderId]);
    if (commissionedLookup.has(existing.orderId)) {
      return {
        action: "skipped_commissioned",
        settlementDate: member.signupDate,
        memberCode: member.memberCode,
        orderId: existing.orderId,
        orderNo: existing.orderNo,
      };
    }

    prepareOrderForApprovedProcessing(existing.orderId, approvedAtIso);
    const processApprovedPath = auth.internalBaoToken
      ? `/internal/bao/orders/${existing.orderId}/process-approved`
      : `/orders/${existing.orderId}/process-approved`;
    await expectOk(processApprovedPath, {
      method: "POST",
      token: auth.token,
      internalBaoToken: auth.internalBaoToken,
    });
    backfillOrderDates(existing.orderId, member.userId, approvedAtIso);

    return {
      action: "processed_existing",
      settlementDate: member.signupDate,
      memberCode: member.memberCode,
      orderId: existing.orderId,
      orderNo: existing.orderNo,
    };
  }

  const orderCreatePath = auth.internalBaoToken ? "/internal/bao/orders" : "/orders";
  const created = await expectOk(orderCreatePath, {
    method: "POST",
    token: auth.token,
    internalBaoToken: auth.internalBaoToken,
    body: {
      userId: member.userId,
      productDetailId,
      quantity: "1",
      fulfillmentMethod: "branch_pickup",
      pickupBranchName: "Commission Test Baseline",
      pickupBranchNote: tag,
      pickupRecipientName: member.name || member.memberCode,
      pickupPhone: "0800000000",
      cashPaymentMethod: "bank_transfer",
    },
  });

  prepareOrderForApprovedProcessing(created.orderId, approvedAtIso);
  const processApprovedPath = auth.internalBaoToken
    ? `/internal/bao/orders/${created.orderId}/process-approved`
    : `/orders/${created.orderId}/process-approved`;
  await expectOk(processApprovedPath, {
    method: "POST",
    token: auth.token,
    internalBaoToken: auth.internalBaoToken,
  });
  backfillOrderDates(created.orderId, member.userId, approvedAtIso);
  existingOrders.set(tag, {
    orderId: created.orderId,
    orderNo: created.orderNo,
  });

  return {
    action: "created_order",
    settlementDate: member.signupDate,
    memberCode: member.memberCode,
    orderId: created.orderId,
    orderNo: created.orderNo,
  };
}

async function finalizeDay({ settlementDate, auth }) {
  const processPath = auth.internalBaoToken
    ? `/internal/bao/commissions/end-of-day/${settlementDate}/process`
    : `/commissions/end-of-day/${settlementDate}/process`;
  const result = await expectOk(processPath, {
    method: "POST",
    token: auth.token,
    internalBaoToken: auth.internalBaoToken,
  });

  return {
    settlementDate,
    result,
  };
}

function runResetIfRequested() {
  if (!OPTIONS.reset || !OPTIONS.apply) {
    return null;
  }

  execFileSync(
    "node",
    ["scripts/backfills/cleanup-commission-test-baseline-runtime.js", "--apply"],
    {
      cwd: ROOT,
      stdio: "inherit",
    },
  );

  return {
    applied: true,
    script: "scripts/backfills/cleanup-commission-test-baseline-runtime.js --apply",
  };
}

function buildMarkdownReport(payload) {
  const lines = [
    "# Commission Baseline Until Pool",
    "",
    `- apply: \`${payload.apply}\``,
    `- reset: \`${payload.reset}\``,
    `- maxDays: \`${payload.maxDays}\``,
    `- maxOrders: \`${payload.maxOrders}\``,
    `- source tag: \`${SOURCE_TAG}\``,
    `- stopOnPoolLedger: \`${payload.stopOnPoolLedger}\``,
    `- runAll: \`${payload.runAll}\``,
    `- processedDays: \`${payload.processedDays}\``,
    `- processedOrders: \`${payload.processedOrders}\``,
    `- poolReached: \`${payload.poolReached}\``,
    "",
    "## Day Log",
    "",
    "| Date | Orders touched | Finalized | Pool ledger rows | Linked payouts | Eligible members | Fallback |",
    "| --- | ---: | --- | ---: | ---: | ---: | ---: |",
    ...payload.dayRuns.map(
      (row) =>
        `| ${row.settlementDate} | ${row.orderActions.length} | ${row.finalized ? "yes" : "no"} | ${row.poolAfterDay?.poolLedgerCount ?? 0} | ${row.poolAfterDay?.linkedPoolPayoutCount ?? 0} | ${row.poolAfterDay?.eligibleMemberCount ?? 0} | ${row.poolAfterDay?.companyFallbackAmount ?? "0"} |`,
    ),
    "",
    "## Pool Progress",
    "",
    "| Date | Cycle status | Eligible | Pool fund | Pool ledger | Linked payouts | Payout amount | Fallback |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...payload.poolProgress.rows.map(
      (row) =>
        `| ${row.settlementDate} | ${row.cycleStatus || "-"} | ${row.eligibleMemberCount} | ${row.poolFund} | ${row.poolLedgerAmount} (${row.poolLedgerCount}) | ${row.linkedPoolPayoutCount}/${row.poolPayoutCount} | ${row.poolPayoutAmount} | ${row.companyFallbackAmount} |`,
    ),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

async function main() {
  await expectOk("/health");

  const resetRun = runResetIfRequested();
  const members = loadMembers();
  const batches = batchMembersByDate(members);
  const productDetailId = resolveProductDetailId();
  const existingOrders = loadExistingOrders();
  const auth = OPTIONS.apply ? await resolveApiAuth() : null;
  const dayRuns = [];
  let processedDays = 0;
  let processedOrders = 0;
  let poolReached = false;

  for (const batch of batches) {
    if (processedDays >= OPTIONS.maxDays) {
      break;
    }

    const dayRun = {
      settlementDate: batch.settlementDate,
      orderActions: [],
      finalized: false,
      finalizeResult: null,
      poolAfterDay: null,
    };

    for (const member of batch.members) {
      if (processedOrders >= OPTIONS.maxOrders) {
        break;
      }

      const existing = existingOrders.get(memberTag(member));
      if (!batchHasPendingMembers({ members: [member] }, existingOrders)) {
        continue;
      }

      if (!OPTIONS.apply) {
        dayRun.orderActions.push({
          action: existing ? "would_process_existing" : "would_create_order",
          settlementDate: batch.settlementDate,
          memberCode: member.memberCode,
          orderId: existing?.orderId || null,
          orderNo: existing?.orderNo || null,
        });
        processedOrders += 1;
        continue;
      }

      const action = await createOrProcessOrder({
        member,
        auth,
        productDetailId,
        existingOrders,
      });
      console.log(
        `[baseline-until-pool] ${action.action} ${action.memberCode} on ${action.settlementDate}${action.orderNo ? ` (${action.orderNo})` : ""}`,
      );
      dayRun.orderActions.push(action);
      processedOrders += 1;
    }

    const hasPendingMembers = batchHasPendingMembers(batch, existingOrders);
    const orderLimitHit = processedOrders >= OPTIONS.maxOrders;

    if (!hasPendingMembers && (!orderLimitHit || dayRun.orderActions.length === 0)) {
      if (OPTIONS.apply) {
        const finalizeResult = await finalizeDay({
          settlementDate: batch.settlementDate,
          auth,
        });
        console.log(
          `[baseline-until-pool] finalized ${batch.settlementDate}`,
        );
        dayRun.finalized = true;
        dayRun.finalizeResult = finalizeResult.result;
      }

      const poolProgress = loadPoolProgress();
      dayRun.poolAfterDay =
        poolProgress.rows.find((row) => row.settlementDate === batch.settlementDate) || null;
      if (poolProgress.success) {
        poolReached = true;
        if (!OPTIONS.runAll) {
          dayRuns.push(dayRun);
          processedDays += 1;
          break;
        }
      }
    }

    dayRuns.push(dayRun);
    processedDays += 1;

    if (orderLimitHit) {
      break;
    }
  }

  const poolProgress = loadPoolProgress();
  const payload = {
    ok: true,
    apply: OPTIONS.apply,
    reset: OPTIONS.reset,
    maxDays:
      Number.isFinite(OPTIONS.maxDays) ? OPTIONS.maxDays : "unbounded",
    maxOrders:
      Number.isFinite(OPTIONS.maxOrders) ? OPTIONS.maxOrders : "unbounded",
    stopOnPoolLedger: OPTIONS.stopOnPoolLedger,
    runAll: OPTIONS.runAll,
    processedDays,
    processedOrders,
    poolReached,
    resetRun,
    dayRuns,
    poolProgress,
  };

  writeJson("commission-test-baseline-until-pool.json", payload);
  writeText(
    "commission-test-baseline-until-pool.md",
    buildMarkdownReport(payload),
  );
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
