#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const SOURCE_TAG = "commission-test-baseline";
const PRODUCT_DETAIL_CODE = "COMMTEST1000";
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const POSTGRES_CONTAINER =
  process.env.POSTGRES_DOCKER_CONTAINER || "poolproject-uat-postgres-1";
const POSTGRES_DB = process.env.POSTGRES_DB || "poolproject";
const POSTGRES_USER = process.env.POSTGRES_USER || "postgres";
const API_ENV_PATH =
  process.env.API_ENV_PATH || path.join(ROOT, "deploy/compose/api.env");
const RUNTIME_DIR = path.join(ROOT, "runtime");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return new Map();
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const values = new Map();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const equalIndex = trimmed.indexOf("=");
    if (equalIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1).trim();
    values.set(key, value);
  }

  return values;
}

function resolveInternalReceiptToken() {
  const direct = (process.env.INTERNAL_RECEIPT_TOKEN || "").trim();
  if (direct) {
    return direct;
  }

  const envMap = parseEnvFile(API_ENV_PATH);
  return (envMap.get("INTERNAL_RECEIPT_TOKEN") || "").trim();
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
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
      "-At",
      "-F",
      "\t",
      "-c",
      sql,
    ],
    {
      encoding: "utf8",
      cwd: ROOT,
    },
  ).trim();
}

function runPsqlMutate(sql) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      POSTGRES_CONTAINER,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      POSTGRES_USER,
      "-d",
      POSTGRES_DB,
      "-c",
      sql,
    ],
    {
      encoding: "utf8",
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();
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
          ...(options.token
            ? { "x-internal-bao-token": options.token }
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
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(
      `${options.method || "GET"} ${requestPath} failed with ${response.statusCode}: ${JSON.stringify(response.body)}`,
    );
  }
  return response.body;
}

function parseRows(raw, keys) {
  if (!raw) {
    return [];
  }

  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const values = line.split("\t");
      return Object.fromEntries(keys.map((key, index) => [key, values[index] || ""]));
    });
}

function loadMembers() {
  const rows = parseRows(
    runPsql(`
      select
        u.id::text as user_id,
        u."memberCode" as member_code,
        coalesce(u."name", '') as member_name,
        to_char((u."createdAt" + interval '7 hour')::date, 'YYYY-MM-DD') as signup_date,
        coalesce(u."sponsorId"::text, '') as sponsor_user_id
      from "User" u
      where u."isAdmin" = false
      order by
        to_char((u."createdAt" + interval '7 hour')::date, 'YYYY-MM-DD') asc,
        u."memberCode" asc,
        u.id asc
    `),
    ["userId", "memberCode", "name", "originalSignupDate", "sponsorUserId"],
  ).map((row, index) => ({
    originalOrder: index,
    userId: row.userId,
    memberCode: row.memberCode,
    name: row.name,
    originalSignupDate: row.originalSignupDate,
    sponsorUserId: row.sponsorUserId || null,
  }));

  return applyCommissionSequence(rows);
}

function applyCommissionSequence(members) {
  if (members.length === 0) {
    return [];
  }

  const dateBuckets = new Map();
  for (const member of members) {
    dateBuckets.set(
      member.originalSignupDate,
      (dateBuckets.get(member.originalSignupDate) || 0) + 1,
    );
  }

  const memberByUserId = new Map();
  const childrenByUserId = new Map();
  const indegreeByUserId = new Map();

  for (const member of members) {
    memberByUserId.set(member.userId, member);
    childrenByUserId.set(member.userId, []);
    indegreeByUserId.set(member.userId, 0);
  }

  for (const member of members) {
    if (!member.sponsorUserId || !memberByUserId.has(member.sponsorUserId)) {
      continue;
    }
    childrenByUserId.get(member.sponsorUserId).push(member.userId);
    indegreeByUserId.set(member.userId, (indegreeByUserId.get(member.userId) || 0) + 1);
  }

  const readyUserIds = [...indegreeByUserId.entries()]
    .filter(([, indegree]) => indegree === 0)
    .map(([userId]) => userId);
  const sortReady = () =>
    readyUserIds.sort(
      (left, right) =>
        (memberByUserId.get(left)?.originalOrder || 0) -
        (memberByUserId.get(right)?.originalOrder || 0),
    );
  sortReady();

  const orderedMembers = [];
  while (readyUserIds.length > 0) {
    const userId = readyUserIds.shift();
    const member = memberByUserId.get(userId);
    if (!member) {
      continue;
    }
    orderedMembers.push(member);
    for (const childUserId of childrenByUserId.get(userId) || []) {
      indegreeByUserId.set(childUserId, (indegreeByUserId.get(childUserId) || 0) - 1);
      if ((indegreeByUserId.get(childUserId) || 0) === 0) {
        readyUserIds.push(childUserId);
      }
    }
    sortReady();
  }

  if (orderedMembers.length < members.length) {
    const seen = new Set(orderedMembers.map((member) => member.userId));
    for (const member of members) {
      if (!seen.has(member.userId)) {
        orderedMembers.push(member);
      }
    }
  }

  const dateEntries = [...dateBuckets.entries()].map(([date, count]) => ({
    date,
    count,
  }));
  let dateIndex = 0;
  let slotUsage = 0;
  const daySequences = new Map();

  return orderedMembers.map((member, index) => {
    while (dateEntries[dateIndex] && slotUsage >= dateEntries[dateIndex].count) {
      dateIndex += 1;
      slotUsage = 0;
    }

    const assignedDate = dateEntries[dateIndex]?.date || member.originalSignupDate;
    slotUsage += 1;
    daySequences.set(assignedDate, (daySequences.get(assignedDate) || 0) + 1);

    return {
      ...member,
      sequence: index + 1,
      daySequence: daySequences.get(assignedDate),
      signupDate: assignedDate,
    };
  });
}

function loadExistingOrders() {
  const rows = parseRows(
    runPsql(`
      select
        o.id::text as order_id,
        o."orderNo" as order_no,
        coalesce(o."shippingAddressNote", '') as tag
      from "Order" o
      where o."shippingAddressNote" like ${sqlLiteral(`${SOURCE_TAG}|%`)}
      order by o.id asc
    `),
    ["orderId", "orderNo", "tag"],
  );

  return new Map(
    rows.map((row) => [
      row.tag,
      {
        orderId: row.orderId,
        orderNo: row.orderNo,
      },
    ]),
  );
}

function resolveProductDetailId() {
  const rows = parseRows(
    runPsql(`
      select id::text as id
      from "ProductDetail"
      where code = ${sqlLiteral(PRODUCT_DETAIL_CODE)}
      limit 1
    `),
    ["id"],
  );
  const id = rows[0]?.id || "";
  if (!id) {
    throw new Error("ไม่พบสินค้า baseline code COMMTEST1000 สำหรับสร้าง order ทดสอบ");
  }
  return id;
}

function memberTag(member) {
  return `${SOURCE_TAG}|member=${member.memberCode}|signupDate=${member.signupDate}|seq=${member.sequence}`;
}

function toBangkokSequencedIso(dateOnly, sequence) {
  const minuteOffset = Math.max(0, Number(sequence || 1) - 1);
  const minute = String(minuteOffset % 60).padStart(2, "0");
  const hour = String(5 + Math.floor(minuteOffset / 60)).padStart(2, "0");
  return `${dateOnly}T${hour}:${minute}:00+07:00`;
}

function loadCommissionedOrderLookup(orderIds) {
  const uniqueOrderIds = [...new Set(orderIds.filter((value) => /^\d+$/.test(value || "")))];
  if (uniqueOrderIds.length === 0) {
    return new Set();
  }
  const rows = parseRows(
    runPsql(`
      select distinct "orderId"::text as order_id
      from "CommissionLedger"
      where "orderId" in (${uniqueOrderIds.join(",")})
    `),
    ["orderId"],
  );
  return new Set(rows.map((row) => row.orderId));
}

function batchProgress(batch, existingOrders) {
  const orderIds = [];
  for (const member of batch.members) {
    const existing = existingOrders.get(memberTag(member));
    if (existing?.orderId) {
      orderIds.push(existing.orderId);
    }
  }

  const commissionedOrderIds = loadCommissionedOrderLookup(orderIds);
  let completedMemberCount = 0;
  let nextPendingMember = null;
  let nextPendingExistingOrder = null;

  for (const member of batch.members) {
    const existing = existingOrders.get(memberTag(member));
    const isComplete = existing?.orderId && commissionedOrderIds.has(existing.orderId);
    if (isComplete) {
      completedMemberCount += 1;
      continue;
    }
    if (!nextPendingMember) {
      nextPendingMember = member;
      nextPendingExistingOrder = existing || null;
    }
  }

  return {
    totalMemberCount: batch.members.length,
    completedMemberCount,
    remainingMemberCount: Math.max(0, batch.members.length - completedMemberCount),
    nextPendingMember,
    nextPendingExistingOrder,
  };
}

function nextPendingSettlementDate() {
  const rows = parseRows(
    runPsql(`
      with approved_dates as (
        select distinct to_char(("approvedAt" + interval '7 hour')::date, 'YYYY-MM-DD') as settlement_date
        from "Order"
        where "approvedAt" is not null
          and "shippingAddressNote" like ${sqlLiteral(`${SOURCE_TAG}|%`)}
      )
      select min(approved_dates.settlement_date) as settlement_date
      from approved_dates
      left join "TeamSettlementBatch" team_batch
        on to_char(team_batch."settlementDate", 'YYYY-MM-DD') = approved_dates.settlement_date
      left join "DailyPoolCycle" pool_cycle
        on to_char(pool_cycle."cycleDate", 'YYYY-MM-DD') = approved_dates.settlement_date
      where team_batch.id is null
         or pool_cycle.id is null
    `),
    ["settlementDate"],
  );

  return rows[0]?.settlementDate || null;
}

function countBaselineOrdersForSettlementDate(settlementDate) {
  const rows = parseRows(
    runPsql(`
      select count(*)::text as aggregate
      from "Order"
      where "shippingAddressNote" like ${sqlLiteral(`${SOURCE_TAG}|%`)}
        and "approvedAt" is not null
        and to_char(("approvedAt" + interval '7 hour')::date, 'YYYY-MM-DD') = ${sqlLiteral(settlementDate)}
    `),
    ["aggregate"],
  );
  return Number(rows[0]?.aggregate || "0");
}

function nextSeedBatch() {
  const members = loadMembers();
  if (members.length === 0) {
    return null;
  }

  const existingTags = new Set(loadExistingOrders().keys());
  const grouped = new Map();

  for (const member of members) {
    if (!grouped.has(member.signupDate)) {
      grouped.set(member.signupDate, []);
    }
    grouped.get(member.signupDate).push(member);
  }

  for (const [signupDate, rows] of grouped.entries()) {
    if (rows.some((member) => !existingTags.has(memberTag(member)))) {
      return { signupDate, members: rows };
    }
  }

  return null;
}

function batchForDate(signupDate) {
  const members = loadMembers().filter((member) => member.signupDate === signupDate);
  return members.length > 0 ? { signupDate, members } : null;
}

function resolveActiveBatch(pendingSettlementDate = nextPendingSettlementDate()) {
  return pendingSettlementDate ? batchForDate(pendingSettlementDate) : nextSeedBatch();
}

function currentDayStatus() {
  const pendingSettlementDate = nextPendingSettlementDate();
  const batch = resolveActiveBatch(pendingSettlementDate);

  if (!batch) {
    if (pendingSettlementDate) {
      const orderCount = countBaselineOrdersForSettlementDate(pendingSettlementDate);
      if (orderCount > 0) {
        return {
          workingDate: pendingSettlementDate,
          totalMemberCount: orderCount,
          completedMemberCount: orderCount,
          remainingMemberCount: 0,
          canSeedNextMember: false,
          canFinalizeDay: true,
          isPendingSettlementDay: true,
          nextMemberCode: null,
          nextMemberName: null,
        };
      }
    }
    return null;
  }

  const progress = batchProgress(batch, loadExistingOrders());
  return {
    workingDate: batch.signupDate,
    totalMemberCount: progress.totalMemberCount,
    completedMemberCount: progress.completedMemberCount,
    remainingMemberCount: progress.remainingMemberCount,
    canSeedNextMember: Boolean(progress.nextPendingMember),
    canFinalizeDay:
      progress.totalMemberCount > 0 && progress.remainingMemberCount === 0,
    isPendingSettlementDay: pendingSettlementDate !== null,
    nextMemberCode: progress.nextPendingMember?.memberCode || null,
    nextMemberName: progress.nextPendingMember?.name || null,
  };
}

function prepareOrderForApprovedProcessing(orderId, approvedAtIso) {
  const quoted = sqlLiteral(approvedAtIso);
  runPsqlMutate(`
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
  runPsqlMutate(`
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

async function internalRequest(method, requestPath, body = null) {
  const token = resolveInternalReceiptToken();
  if (!token) {
    throw new Error(`Missing INTERNAL_RECEIPT_TOKEN. Checked env and ${API_ENV_PATH}`);
  }
  return expectOk(requestPath, { method, body, token });
}

async function processNextMember() {
  const pendingSettlementDate = nextPendingSettlementDate();
  const batch = resolveActiveBatch(pendingSettlementDate);

  if (!batch) {
    if (pendingSettlementDate && countBaselineOrdersForSettlementDate(pendingSettlementDate) > 0) {
      throw new Error(`สมาชิกของวันที่ ${pendingSettlementDate} ครบแล้ว กรุณากดคำนวณเมื่อหมดวัน`);
    }
    throw new Error("ไม่พบสมาชิกถัดไปสำหรับ baseline แล้ว");
  }

  const progress = batchProgress(batch, loadExistingOrders());
  const member = progress.nextPendingMember;
  const existing = progress.nextPendingExistingOrder;

  if (!member) {
    throw new Error(`สมาชิกของวันที่ ${batch.signupDate} ครบแล้ว กรุณากดคำนวณเมื่อหมดวัน`);
  }

  const approvedAtIso = toBangkokSequencedIso(
    member.signupDate,
    member.daySequence || member.sequence || 1,
  );

  if (existing?.orderId) {
    prepareOrderForApprovedProcessing(existing.orderId, approvedAtIso);
    await internalRequest("POST", `/internal/bao/orders/${existing.orderId}/process-approved`);
    backfillOrderDates(existing.orderId, member.userId, approvedAtIso);
    return {
      settlementDate: batch.signupDate,
      memberCode: member.memberCode,
      memberName: member.name,
      orderId: existing.orderId,
      orderNo: existing.orderNo,
      action: "processed_existing_order",
    };
  }

  const created = await internalRequest("POST", "/internal/bao/orders", {
    userId: member.userId,
    productDetailId: resolveProductDetailId(),
    quantity: "1",
    fulfillmentMethod: "branch_pickup",
    pickupBranchName: "Commission Test Baseline",
    pickupBranchNote: memberTag(member),
    pickupRecipientName: member.name || member.memberCode,
    pickupPhone: "0800000000",
    cashPaymentMethod: "bank_transfer",
  });

  const orderId = String(created.orderId || "");
  if (!orderId) {
    throw new Error("Order create succeeded but missing orderId.");
  }

  prepareOrderForApprovedProcessing(orderId, approvedAtIso);
  await internalRequest("POST", `/internal/bao/orders/${orderId}/process-approved`);
  backfillOrderDates(orderId, member.userId, approvedAtIso);

  return {
    settlementDate: batch.signupDate,
    memberCode: member.memberCode,
    memberName: member.name,
    orderId,
    orderNo: String(created.orderNo || ""),
    action: "created_order",
  };
}

async function finalizeCurrentDay() {
  const pendingSettlementDate = nextPendingSettlementDate();
  if (!pendingSettlementDate) {
    throw new Error("ยังไม่มีวันที่พร้อมปิดวันเพื่อคำนวณ end-of-day");
  }

  const batch = batchForDate(pendingSettlementDate);
  if (batch) {
    const progress = batchProgress(batch, loadExistingOrders());
    if (progress.remainingMemberCount > 0) {
      const nextCode = progress.nextPendingMember?.memberCode || null;
      throw new Error(
        `ยังสร้างรายการไม่ครบสำหรับวันที่ ${pendingSettlementDate} คงเหลือ ${progress.remainingMemberCount} รายการ${nextCode ? ` (ถัดไป: ${nextCode})` : ""}`,
      );
    }
  } else if (countBaselineOrdersForSettlementDate(pendingSettlementDate) === 0) {
    throw new Error(`ไม่พบข้อมูลสมาชิกหรือ order baseline ของวันที่ ${pendingSettlementDate}`);
  }

  const endOfDayResult = await internalRequest(
    "POST",
    `/internal/bao/commissions/end-of-day/${pendingSettlementDate}/process`,
  );

  return {
    settlementDate: pendingSettlementDate,
    endOfDayResult,
  };
}

function toIdList(values) {
  return [...new Set(values.map((value) => String(value || "")).filter((value) => /^\d+$/.test(value)))];
}

function idIn(values) {
  const normalized = toIdList(values);
  return normalized.length > 0 ? normalized.join(",") : null;
}

function dateIn(values) {
  const normalized = [...new Set(values.filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)).map((value) => sqlLiteral(value)))];
  return normalized.length > 0 ? normalized.join(",") : null;
}

function queryIdList(sql) {
  return parseRows(runPsql(sql), ["id"])
    .map((row) => row.id)
    .filter(Boolean);
}

function loadIds(table, column, whereSql) {
  return queryIdList(`select ${column}::text as id from ${table} ${whereSql} order by ${column} asc`);
}

function loadBaselineOrders() {
  return parseRows(
    runPsql(`
      select
        o.id::text as order_id,
        o."userId"::text as user_id,
        o."orderNo" as order_no,
        to_char((o."approvedAt" + interval '7 hour')::date, 'YYYY-MM-DD') as approved_date
      from "Order" o
      where o."shippingAddressNote" like ${sqlLiteral(`${SOURCE_TAG}|%`)}
      order by o.id asc
    `),
    ["orderId", "userId", "orderNo", "approvedDate"],
  );
}

function loadCleanupTargets(baselineOrders) {
  const baselineOrderIds = toIdList(baselineOrders.map((row) => row.orderId));
  const userIds = toIdList(baselineOrders.map((row) => row.userId));
  const approvedDates = [...new Set(baselineOrders.map((row) => row.approvedDate).filter(Boolean))];

  if (userIds.length === 0) {
    return {
      baselineOrderIds,
      userIds,
      approvedDates,
      nonBaselineOrderIds: [],
      orderIds: [],
      orderItemIds: [],
      memberPackageCycleIds: [],
      commissionIds: [],
      companyBonusIds: [],
      walletTransactionIds: [],
      walletIds: [],
      capBucketIds: [],
      capLedgerIds: [],
      buybackEventIds: [],
      userBuybackProgressIds: [],
      dailyPoolCycleIds: [],
      dailyPoolEligibilitySnapshotIds: [],
      dailyPoolPayoutIds: [],
      dailyCommissionCapUsageIds: [],
      teamSettlementBatchIds: [],
      teamSettlementBatchItemIds: [],
      poolSettlementBatchIds: [],
      poolSettlementBatchItemIds: [],
      matrixCycleIds: [],
      matrixBoardIds: [],
      matrixPositionIds: [],
      matrixPayoutIds: [],
      matrixAccumulationEventIds: [],
      matrixHoldbackAccountIds: [],
      matrixReorderIds: [],
      impactedBoardIds: [],
      impactedCycleIds: [],
    };
  }

  const userIn = idIn(userIds);
  const orderIds = loadIds(`"Order"`, "id", `where "userId" in (${userIn})`);
  const nonBaselineOrderIds = orderIds.filter((id) => !baselineOrderIds.includes(id));
  const orderIn = idIn(orderIds);
  const orderItemIds = orderIn ? loadIds(`"OrderItem"`, "id", `where "orderId" in (${orderIn})`) : [];
  const memberPackageCycleIds = loadIds(`"MemberPackageCycle"`, "id", `where "userId" in (${userIn})`);
  const memberPackageCycleIn = idIn(memberPackageCycleIds);
  const commissionIds = loadIds(
    `"CommissionLedger"`,
    "id",
    `where "sourceUserId" in (${userIn})
      or "beneficiaryUserId" in (${userIn})
      or ${orderIn ? `"orderId" in (${orderIn})` : "false"}
      or ${memberPackageCycleIn ? `"beneficiaryCycleId" in (${memberPackageCycleIn})` : "false"}`,
  );
  const commissionIn = idIn(commissionIds);
  const companyBonusIds = orderIn
    ? loadIds(`"CompanyBonusLedger"`, "id", `where "sourceRefId" in (${orderIn})`)
    : [];
  const walletTransactionIds = loadIds(
    `"WalletTransaction"`,
    "id",
    `where "userId" in (${userIn})
      ${commissionIn ? `or ("refType" = 'COMMISSION' and "refId" in (${commissionIn}))` : ""}
      ${orderIn ? `or ("refType" = 'ORDER' and "refId" in (${orderIn}))` : ""}
      ${orderIn ? `or ("refType" = 'order' and "refId" in (${orderIn}))` : ""}`,
  );
  const walletIds = loadIds(`"Wallet"`, "id", `where "userId" in (${userIn})`);
  const capBucketIds = loadIds(
    `"CapBucket"`,
    "id",
    `where "userId" in (${userIn})
      or ${orderIn ? `"sourceOrderId" in (${orderIn})` : "false"}
      or ${memberPackageCycleIn ? `"memberPackageCycleId" in (${memberPackageCycleIn})` : "false"}`,
  );
  const capBucketIn = idIn(capBucketIds);
  const capLedgerIds = loadIds(
    `"CapLedger"`,
    "id",
    `where "userId" in (${userIn})
      or ${capBucketIn ? `"bucketId" in (${capBucketIn})` : "false"}
      or ${orderIn ? `"sourceOrderId" in (${orderIn})` : "false"}
      or ${orderIn ? `"relatedOrderId" in (${orderIn})` : "false"}
      or ${commissionIn ? `"relatedCommissionLedgerId" in (${commissionIn})` : "false"}
      or ${memberPackageCycleIn ? `"memberPackageCycleId" in (${memberPackageCycleIn})` : "false"}`,
  );
  const buybackEventIds = loadIds(
    `"BuybackEvent"`,
    "id",
    `where "userId" in (${userIn})
      or ${orderIn ? `"orderId" in (${orderIn})` : "false"}`,
  );
  const userBuybackProgressIds = loadIds(`"UserBuybackProgress"`, "id", `where "userId" in (${userIn})`);
  const approvedDateIn = dateIn(approvedDates);
  const dailyPoolCycleIds = approvedDateIn
    ? loadIds(`"DailyPoolCycle"`, "id", `where to_char("cycleDate", 'YYYY-MM-DD') in (${approvedDateIn})`)
    : [];
  const dailyPoolCycleIn = idIn(dailyPoolCycleIds);
  const dailyPoolEligibilitySnapshotIds = dailyPoolCycleIn
    ? loadIds(`"DailyPoolEligibilitySnapshot"`, "id", `where "cycleId" in (${dailyPoolCycleIn})`)
    : [];
  const dailyPoolPayoutIds = loadIds(
    `"DailyPoolPayout"`,
    "id",
    `where ${dailyPoolCycleIn ? `"cycleId" in (${dailyPoolCycleIn})` : "false"}
      or ${commissionIn ? `"commissionLedgerId" in (${commissionIn})` : "false"}
      or ${memberPackageCycleIn ? `"beneficiaryCycleId" in (${memberPackageCycleIn})` : "false"}
      or "userId" in (${userIn})`,
  );
  const dailyCommissionCapUsageIds = approvedDateIn
    ? loadIds(`"DailyCommissionCapUsage"`, "id", `where "userId" in (${userIn}) and to_char("capDate", 'YYYY-MM-DD') in (${approvedDateIn})`)
    : [];
  const teamSettlementBatchIds = approvedDateIn
    ? loadIds(`"TeamSettlementBatch"`, "id", `where to_char("settlementDate", 'YYYY-MM-DD') in (${approvedDateIn})`)
    : [];
  const teamSettlementBatchIn = idIn(teamSettlementBatchIds);
  const teamSettlementBatchItemIds = teamSettlementBatchIn
    ? loadIds(`"TeamSettlementBatchItem"`, "id", `where "batchId" in (${teamSettlementBatchIn}) or "userId" in (${userIn})`)
    : [];
  const poolSettlementBatchIds = approvedDateIn
    ? loadIds(`"PoolSettlementBatch"`, "id", `where to_char("settlementDate", 'YYYY-MM-DD') in (${approvedDateIn})`)
    : [];
  const poolSettlementBatchIn = idIn(poolSettlementBatchIds);
  const poolSettlementBatchItemIds = poolSettlementBatchIn
    ? loadIds(`"PoolSettlementBatchItem"`, "id", `where "batchId" in (${poolSettlementBatchIn}) or "userId" in (${userIn})`)
    : [];
  const matrixCycleIds = loadIds(`"MatrixCycle"`, "id", `where "userId" in (${userIn})`);
  const matrixCycleIn = idIn(matrixCycleIds);
  const matrixBoardIds = matrixCycleIn
    ? loadIds(`"MatrixBoard"`, "id", `where "cycleId" in (${matrixCycleIn})`)
    : [];
  const matrixBoardIn = idIn(matrixBoardIds);
  const matrixPositionIds = loadIds(
    `"MatrixPosition"`,
    "id",
    `where "sourceUserId" in (${userIn})
      or ${orderIn ? `"sourceOrderId" in (${orderIn})` : "false"}
      or ${matrixBoardIn ? `"boardId" in (${matrixBoardIn})` : "false"}`,
  );
  const matrixPayoutIds = loadIds(
    `"MatrixPayout"`,
    "id",
    `where "sourceUserId" in (${userIn})
      or "beneficiaryUserId" in (${userIn})
      or ${orderIn ? `"sourceOrderId" in (${orderIn})` : "false"}
      or ${matrixCycleIn ? `"cycleId" in (${matrixCycleIn})` : "false"}
      or ${matrixBoardIn ? `"boardId" in (${matrixBoardIn})` : "false"}`,
  );
  const matrixAccumulationEventIds = loadIds(
    `"MatrixAccumulationEvent"`,
    "id",
    `where "sourceUserId" in (${userIn})
      or ${orderIn ? `"sourceOrderId" in (${orderIn})` : "false"}
      or ${matrixCycleIn ? `"cycleId" in (${matrixCycleIn})` : "false"}
      or ${matrixBoardIn ? `"boardId" in (${matrixBoardIn})` : "false"}`,
  );
  const matrixHoldbackAccountIds = loadIds(`"MatrixHoldbackAccount"`, "id", `where "userId" in (${userIn})`);
  const matrixHoldbackAccountIn = idIn(matrixHoldbackAccountIds);
  const matrixReorderIds = loadIds(
    `"MatrixReorder"`,
    "id",
    `where "userId" in (${userIn})
      or ${matrixBoardIn ? `"triggerBoardId" in (${matrixBoardIn})` : "false"}
      or ${matrixHoldbackAccountIn ? `"holdbackAccountId" in (${matrixHoldbackAccountIn})` : "false"}
      or ${orderIn ? `"generatedOrderId" in (${orderIn})` : "false"}`,
  );
  const impactedBoardIds = queryIdList(`
    select distinct "boardId"::text as id
    from (
      select "boardId" from "MatrixPosition" where id in (${idIn(matrixPositionIds) || "null"})
      union
      select "boardId" from "MatrixPayout" where id in (${idIn(matrixPayoutIds) || "null"})
      union
      select "boardId" from "MatrixAccumulationEvent" where id in (${idIn(matrixAccumulationEventIds) || "null"})
    ) impacted
    where "boardId" is not null
    order by id asc
  `);
  const impactedCycleIds = queryIdList(`
    select distinct "cycleId"::text as id
    from (
      select "cycleId" from "MatrixPayout" where id in (${idIn(matrixPayoutIds) || "null"})
      union
      select "cycleId" from "MatrixAccumulationEvent" where id in (${idIn(matrixAccumulationEventIds) || "null"})
      union
      select "cycleId" from "MatrixBoard" where id in (${idIn(impactedBoardIds) || "null"})
    ) impacted
    where "cycleId" is not null
    order by id asc
  `);

  return {
    baselineOrderIds,
    userIds,
    approvedDates,
    nonBaselineOrderIds,
    orderIds,
    orderItemIds,
    memberPackageCycleIds,
    commissionIds,
    companyBonusIds,
    walletTransactionIds,
    walletIds,
    capBucketIds,
    capLedgerIds,
    buybackEventIds,
    userBuybackProgressIds,
    dailyPoolCycleIds,
    dailyPoolEligibilitySnapshotIds,
    dailyPoolPayoutIds,
    dailyCommissionCapUsageIds,
    teamSettlementBatchIds,
    teamSettlementBatchItemIds,
    poolSettlementBatchIds,
    poolSettlementBatchItemIds,
    matrixCycleIds,
    matrixBoardIds,
    matrixPositionIds,
    matrixPayoutIds,
    matrixAccumulationEventIds,
    matrixHoldbackAccountIds,
    matrixReorderIds,
    impactedBoardIds,
    impactedCycleIds,
  };
}

function deleteIds(table, ids) {
  const inClause = idIn(ids);
  if (!inClause) {
    return;
  }
  runPsqlMutate(`delete from ${table} where id in (${inClause})`);
}

function runtimeArtifactCount() {
  return [
    "commission-test-baseline-plan.json",
    "commission-test-baseline-result.json",
    "commission-test-baseline-result.md",
  ].filter((name) => fs.existsSync(path.join(RUNTIME_DIR, name))).length;
}

function clearRuntimeArtifacts() {
  let deletedCount = 0;
  for (const name of [
    "commission-test-baseline-plan.json",
    "commission-test-baseline-result.json",
    "commission-test-baseline-result.md",
  ]) {
    const target = path.join(RUNTIME_DIR, name);
    if (!fs.existsSync(target)) {
      continue;
    }
    fs.unlinkSync(target);
    deletedCount += 1;
  }
  return deletedCount;
}

function resetStatus() {
  const targets = loadCleanupTargets(loadBaselineOrders());
  return {
    baselineOrderCount: targets.baselineOrderIds.length,
    affectedUserCount: targets.userIds.length,
    runtimeArtifactCount: runtimeArtifactCount(),
    nonBaselineOrderCount: targets.nonBaselineOrderIds.length,
    canReset:
      (targets.baselineOrderIds.length > 0 || runtimeArtifactCount() > 0) &&
      targets.nonBaselineOrderIds.length === 0,
  };
}

function applyCleanup(targets) {
  const survivingBoardIds = targets.impactedBoardIds.filter(
    (id) => !targets.matrixBoardIds.includes(id),
  );
  const survivingCycleIds = targets.impactedCycleIds.filter(
    (id) => !targets.matrixCycleIds.includes(id),
  );

  runPsqlMutate("begin;");
  try {
    for (const [table, ids] of [
      [`"DailyPoolPayout"`, targets.dailyPoolPayoutIds],
      [`"DailyPoolEligibilitySnapshot"`, targets.dailyPoolEligibilitySnapshotIds],
      [`"DailyPoolCycle"`, targets.dailyPoolCycleIds],
      [`"PoolSettlementBatchItem"`, targets.poolSettlementBatchItemIds],
      [`"PoolSettlementBatch"`, targets.poolSettlementBatchIds],
      [`"TeamSettlementBatchItem"`, targets.teamSettlementBatchItemIds],
      [`"TeamSettlementBatch"`, targets.teamSettlementBatchIds],
      [`"DailyCommissionCapUsage"`, targets.dailyCommissionCapUsageIds],
      [`"CapLedger"`, targets.capLedgerIds],
      [`"CapBucket"`, targets.capBucketIds],
      [`"WalletTransaction"`, targets.walletTransactionIds],
      [`"CompanyBonusLedger"`, targets.companyBonusIds],
      [`"BuybackEvent"`, targets.buybackEventIds],
      [`"UserBuybackProgress"`, targets.userBuybackProgressIds],
      [`"MatrixReorder"`, targets.matrixReorderIds],
      [`"MatrixPayout"`, targets.matrixPayoutIds],
      [`"MatrixAccumulationEvent"`, targets.matrixAccumulationEventIds],
      [`"MatrixPosition"`, targets.matrixPositionIds],
      [`"MatrixBoard"`, targets.matrixBoardIds],
      [`"MatrixHoldbackAccount"`, targets.matrixHoldbackAccountIds],
      [`"MatrixCycle"`, targets.matrixCycleIds],
      [`"CommissionLedger"`, targets.commissionIds],
      [`"OrderItem"`, targets.orderItemIds],
      [`"Order"`, targets.orderIds],
      [`"MemberPackageCycle"`, targets.memberPackageCycleIds],
      [`"Wallet"`, targets.walletIds],
    ]) {
      const inClause = idIn(ids);
      if (inClause) {
        runPsqlMutate(`delete from ${table} where id in (${inClause})`);
      }
    }

    const userIn = idIn(targets.userIds);
    if (userIn) {
      runPsqlMutate(`update "User" set "matrixPersonalPv" = 0 where id in (${userIn})`);
    }

    const boardIn = idIn(survivingBoardIds);
    if (boardIn) {
      runPsqlMutate(`
        update "MatrixBoard" board set
          "accumulatedPv" = coalesce((
            select sum(event."creditedPv") from "MatrixAccumulationEvent" event where event."boardId" = board.id
          ), 0),
          "filledSlots" = coalesce((
            select count(*) from "MatrixPosition" position where position."boardId" = board.id and position."resetAt" is null
          ), 0)
        where board.id in (${boardIn})
      `);
    }

    const cycleIn = idIn(survivingCycleIds);
    if (cycleIn) {
      runPsqlMutate(`
        update "MatrixCycle" cycle set
          "totalAccumulatedPv" = coalesce((
            select sum(event."creditedPv") from "MatrixAccumulationEvent" event where event."cycleId" = cycle.id
          ), 0)
        where cycle.id in (${cycleIn})
      `);
    }

    runPsqlMutate("commit;");
  } catch (error) {
    try {
      runPsqlMutate("rollback;");
    } catch {}
    throw error;
  }
}

function resetBaselineRuntime() {
  const targets = loadCleanupTargets(loadBaselineOrders());
  if (targets.nonBaselineOrderIds.length > 0) {
    throw new Error("ยกเลิกการรีเซ็ต: พบ order อื่นของสมาชิกชุดทดสอบปะปนอยู่");
  }

  if (targets.userIds.length > 0) {
    applyCleanup(targets);
  }

  const deletedRuntimeArtifactCount = clearRuntimeArtifacts();
  if (targets.userIds.length === 0 && deletedRuntimeArtifactCount === 0) {
    throw new Error("ไม่พบ state ของ baseline test ที่พร้อมรีเซ็ต");
  }

  return {
    deletedBaselineOrderCount: targets.baselineOrderIds.length,
    affectedUserCount: targets.userIds.length,
    deletedRuntimeArtifactCount,
  };
}

async function main() {
  const command = process.argv[2] || "status";

  if (command === "status") {
    console.log(
      JSON.stringify(
        {
          ok: true,
          action: "status",
          currentDayStatus: currentDayStatus(),
          resetStatus: resetStatus(),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === "process-next-member") {
    console.log(
      JSON.stringify(
        {
          ok: true,
          action: "process-next-member",
          ...(await processNextMember()),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === "finalize-current-day") {
    console.log(
      JSON.stringify(
        {
          ok: true,
          action: "finalize-current-day",
          ...(await finalizeCurrentDay()),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === "reset-baseline-runtime") {
    console.log(
      JSON.stringify(
        {
          ok: true,
          action: "reset-baseline-runtime",
          ...resetBaselineRuntime(),
        },
        null,
        2,
      ),
    );
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
