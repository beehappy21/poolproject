#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { execFileSync } from "node:child_process";

const APPLY = process.argv.includes("--apply");
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const ROOT = process.cwd();
const COMMISSION_SETTINGS_PATH =
  process.env.SALETEST_COMMISSION_SETTINGS_PATH ||
  path.join(ROOT, "runtime", "commission-settings.json");
const MATRIX_SETTINGS_PATH =
  process.env.SALETEST_MATRIX_SETTINGS_PATH ||
  path.join(ROOT, "runtime", "matrix-settings.json");
const SEQUENCE_PATH =
  process.env.SALETEST_RUNTIME_SEQUENCE_PATH ||
  path.join(ROOT, "runtime", "saletest05042026-runtime-sequence.json");
const OUTPUT_PATH =
  process.env.SALETEST_RUNTIME_OUTPUT_PATH ||
  path.join(ROOT, "runtime", "saletest05042026-until-13-b1r2-report.json");
const ADMIN_IDENTIFIER =
  process.env.SALETEST_ADMIN_IDENTIFIER || "dev-admin@example.com";
const ADMIN_PASSWORD =
  process.env.SALETEST_ADMIN_PASSWORD || "472121";
const START_RUNTIME_SEQUENCE =
  Number.parseInt(process.env.SALETEST_RUNTIME_START_SEQUENCE || "1", 10) || 1;
const MAX_ORDERS =
  Number.parseInt(process.env.SALETEST_RUNTIME_MAX_ORDERS || "0", 10) || 0;
const TARGET_MEMBER_CODE =
  process.env.SALETEST_TRIGGER_MEMBER_CODE || "TH0000013";
const UPLINE_MEMBER_CODE =
  process.env.SALETEST_UPLINE_MEMBER_CODE || "TH0000012";
const POSTGRES_CONTAINER =
  process.env.SALETEST_POSTGRES_CONTAINER || "poolproject-postgres";
const TARGET_DB_NAME =
  process.env.SALETEST_TARGET_DB_NAME || "poolproject";
const PRODUCT_DETAIL_ID_BY_CODE = {
  LON001: process.env.PRODUCT_DETAIL_ID_LON001 || "1",
  FIR001: process.env.PRODUCT_DETAIL_ID_FIR001 || "52",
  FIR002: process.env.PRODUCT_DETAIL_ID_FIR002 || "56",
  DRI001: process.env.PRODUCT_DETAIL_ID_DRI001 || "54",
  DRI002: process.env.PRODUCT_DETAIL_ID_DRI002 || "55",
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
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
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(
      `${options.method || "GET"} ${requestPath} failed with ${response.statusCode}: ${JSON.stringify(response.body)}`,
    );
  }
  return response.body;
}

async function login() {
  return expectOk("/auth/login", {
    method: "POST",
    body: {
      identifier: ADMIN_IDENTIFIER,
      password: ADMIN_PASSWORD,
    },
  });
}

async function getMemberByCode(memberCode) {
  return expectOk(`/members/by-code/${encodeURIComponent(memberCode)}`);
}

async function getMatrixByCode(memberCode) {
  return expectOk(`/matrix/member/by-code/${encodeURIComponent(memberCode)}`);
}

async function createOrder(userId, productDetailId, pickupBranchNote, token) {
  return expectOk("/orders", {
    method: "POST",
    token,
    body: {
      userId,
      items: [{ productDetailId, quantity: "1" }],
      fulfillmentMethod: "branch_pickup",
      pickupBranchName: "Sale Test 05042026 Runtime",
      pickupBranchNote,
      pickupRecipientName: "Sale Test Runtime",
      pickupPhone: "0800000000",
      discountWalletAmount: "0",
      shoppingWalletAmount: "0",
      firmWalletAmount: "0",
      cashPaymentMethod: "bank_transfer",
    },
  });
}

async function approveOrder(orderId, token) {
  return expectOk(`/orders/${orderId}/approve`, {
    method: "POST",
    token,
  });
}

async function processApproved(orderId, token) {
  return expectOk(`/orders/${orderId}/process-approved`, {
    method: "POST",
    token,
  });
}

function summarizeMatrix(payload) {
  const cycle = payload?.cycles?.[0];
  if (!cycle) {
    return null;
  }
  return {
    memberCode: payload?.member?.memberCode ?? null,
    cycleId: cycle.cycleId,
    currentBoardNo: cycle.currentBoardNo,
    currentBoardRoundNo: cycle.currentBoardRoundNo,
    personalCarryPv: cycle.personalCarryPv,
    boards: (cycle.boards || []).map((board) => ({
      boardNo: board.boardNo,
      roundNo: board.roundNo,
      status: board.status,
      filledSlots: board.filledSlots,
      slotCount: board.slotCount,
      positions: (board.positions || []).map((position) => ({
        slotNo: position.slotNo,
        roundNo: position.roundNo,
        sourceMemberCode: position.sourceMemberCode,
      })),
    })),
  };
}

function hasBoardOneRoundTwo(matrixPayload) {
  const cycle = matrixPayload?.cycles?.[0];
  if (!cycle) {
    return false;
  }

  return (cycle.boards || []).some(
    (board) => board.boardNo === 1 && board.roundNo === 2,
  );
}

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
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

function parseRows(raw) {
  if (!raw) {
    return [];
  }
  return raw
    .split("\n")
    .map((line) => line.split("\t"))
    .filter((parts) => parts.length > 0 && parts[0] !== "");
}

function loadRuntimeSnapshots() {
  return {
    commissionSettingsSnapshot: fs.readFileSync(COMMISSION_SETTINGS_PATH, "utf8").trim(),
    matrixSettingsSnapshot: fs.readFileSync(MATRIX_SETTINGS_PATH, "utf8").trim(),
  };
}

function toIsoFromThaiDate(raw) {
  const [day, month, year] = String(raw)
    .split("/")
    .map((value) => Number.parseInt(value, 10));
  return new Date(Date.UTC(year - 543, month - 1, day, 5, 0, 0)).toISOString();
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

function loadAutoOrdersForMember(memberCode) {
  return parseRows(
    runPsql(`
      select o.id, o."orderNo", o."orderSourceType", o."approvalStatus", o.status
      from "Order" o
      join "User" u on u.id = o."userId"
      where u."memberCode" = ${sqlLiteral(memberCode)}
        and o."orderSourceType" = 'MATRIX_REENTRY'
      order by o.id asc;
    `),
  ).map(([id, orderNo, orderSourceType, approvalStatus, status]) => ({
    id,
    orderNo,
    orderSourceType,
    approvalStatus,
    status,
  }));
}

function loadUplineAutoPlacements(ownerMemberCode, sourceMemberCode) {
  return parseRows(
    runPsql(`
      select mb."boardNo", mb."roundNo", mp."slotNo", su."memberCode", o."orderNo", o."orderSourceType"
      from "MatrixPosition" mp
      join "MatrixBoard" mb on mb.id = mp."boardId"
      join "MatrixCycle" mc on mc.id = mb."cycleId"
      join "User" owner_u on owner_u.id = mc."userId"
      left join "User" su on su.id = mp."sourceUserId"
      left join "Order" o on o.id = mp."sourceOrderId"
      where owner_u."memberCode" = ${sqlLiteral(ownerMemberCode)}
        and su."memberCode" = ${sqlLiteral(sourceMemberCode)}
      order by mb."boardNo" asc, mb."roundNo" asc, mp."slotNo" asc;
    `),
  ).map(([boardNo, roundNo, slotNo, memberCode, orderNo, orderSourceType]) => ({
    boardNo: Number(boardNo),
    roundNo: Number(roundNo),
    slotNo: Number(slotNo),
    sourceMemberCode: memberCode,
    orderNo,
    orderSourceType,
  }));
}

async function main() {
  await expectOk("/health");

  const sequencePayload = readJson(SEQUENCE_PATH);
  const selectedOrders = (sequencePayload.orders || [])
    .filter((row) => Number(row.runtimeSequenceNo) >= START_RUNTIME_SEQUENCE)
    .slice(0, MAX_ORDERS > 0 ? MAX_ORDERS : undefined);

  const initialTargetMatrix = await getMatrixByCode(TARGET_MEMBER_CODE);
  const targetAlreadyOpened = hasBoardOneRoundTwo(initialTargetMatrix);
  const session = await login();
  const runtimeSnapshots = loadRuntimeSnapshots();
  const executionLog = [];

  if (!APPLY) {
    const dryRun = {
      ok: true,
      apply: false,
      sequencePath: SEQUENCE_PATH,
      selectedOrderCount: selectedOrders.length,
      targetMemberCode: TARGET_MEMBER_CODE,
      targetAlreadyOpened,
      first10: selectedOrders.slice(0, 10).map((row) => ({
        runtimeSequenceNo: row.runtimeSequenceNo,
        memberId: row.memberId,
        invoiceNo: row.invoiceNo,
        productCode: row.productCode,
      })),
    };
    writeJson(OUTPUT_PATH, dryRun);
    console.log(JSON.stringify(dryRun, null, 2));
    return;
  }

  if (targetAlreadyOpened) {
    throw new Error(
      `${TARGET_MEMBER_CODE} already has board 1 round 2 before replay starts. Reset runtime first.`,
    );
  }

  for (const row of selectedOrders) {
    const member = await getMemberByCode(row.memberId);
    const productDetailId = PRODUCT_DETAIL_ID_BY_CODE[row.productCode];

    if (!productDetailId) {
      throw new Error(`No productDetailId mapping configured for ${row.productCode}.`);
    }

    const pickupBranchNote = `saletest05042026|runtimeSeq=${row.runtimeSequenceNo}|invoice=${row.invoiceNo}`;
    const created = await createOrder(
      member.memberId,
      productDetailId,
      pickupBranchNote,
      session.accessToken,
    );
    markOrderApprovedForRuntime({
      orderId: created.orderId,
      approvedAtIso: toIsoFromThaiDate(row.invoiceDate),
      commissionSettingsSnapshot: runtimeSnapshots.commissionSettingsSnapshot,
      matrixSettingsSnapshot: runtimeSnapshots.matrixSettingsSnapshot,
    });
    const processed = await processApproved(created.orderId, session.accessToken);

    const logRow = {
      runtimeSequenceNo: row.runtimeSequenceNo,
      memberId: row.memberId,
      invoiceNo: row.invoiceNo,
      productCode: row.productCode,
      runtimeOrderId: created.orderId,
      runtimeOrderNo: created.orderNo || null,
      openedAutoOrderCount:
        Number(processed?.matrixProcessing?.openedAutoOrderCount || 0),
      matrixProcessing: processed?.matrixProcessing || null,
    };
    executionLog.push(logRow);

    const targetMatrix = await getMatrixByCode(TARGET_MEMBER_CODE);
    if (!hasBoardOneRoundTwo(targetMatrix)) {
      continue;
    }

    const uplineMatrix = await getMatrixByCode(UPLINE_MEMBER_CODE);
    const autoOrders = loadAutoOrdersForMember(TARGET_MEMBER_CODE);
    const uplineAutoPlacements = loadUplineAutoPlacements(
      UPLINE_MEMBER_CODE,
      TARGET_MEMBER_CODE,
    );

    const result = {
      ok: true,
      apply: true,
      stoppedAtTrigger: true,
      sequencePath: SEQUENCE_PATH,
      trigger: {
        targetMemberCode: TARGET_MEMBER_CODE,
        triggerRuntimeSequenceNo: row.runtimeSequenceNo,
        triggerSourceInvoiceNo: row.invoiceNo,
        triggerRuntimeOrderId: created.orderId,
        triggerRuntimeOrderNo: created.orderNo || null,
      },
      processedOrderCount: executionLog.length,
      lastProcessedOrder: logRow,
      targetMatrix: summarizeMatrix(targetMatrix),
      uplineMatrix: summarizeMatrix(uplineMatrix),
      autoOrdersForTarget: autoOrders,
      uplinePlacementsFromTarget: uplineAutoPlacements,
      matchedExpectation: uplineAutoPlacements.some(
        (placement) =>
          placement.boardNo === 1 &&
          placement.slotNo === 2 &&
          placement.orderSourceType === "MATRIX_REENTRY",
      ),
      executionLog,
    };

    writeJson(OUTPUT_PATH, result);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const finalState = {
    ok: true,
    apply: true,
    stoppedAtTrigger: false,
    sequencePath: SEQUENCE_PATH,
    processedOrderCount: executionLog.length,
    targetMemberCode: TARGET_MEMBER_CODE,
    note: "Processed all selected normal orders without opening board 1 round 2 for the target member.",
    executionLog,
  };
  writeJson(OUTPUT_PATH, finalState);
  console.log(JSON.stringify(finalState, null, 2));
}

main().catch((error) => {
  const failure = {
    ok: false,
    apply: APPLY,
    sequencePath: SEQUENCE_PATH,
    error: error.message || String(error),
  };
  writeJson(OUTPUT_PATH, failure);
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
});
