#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const DAILY_REPORT_PATH = path.join(
  ROOT,
  "runtime",
  "allsaletest02042026-daily-report.json",
);
const REPLAY_REPORT_PATH = path.join(
  ROOT,
  "runtime",
  "allsaletest02042026-replay-by-day-bloodline.json",
);
const OUTPUT_PATH = path.join(
  ROOT,
  "runtime",
  "allsaletest02042026-runtime-all-normal-replay.json",
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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
            parsed = null;
          }

          if ((res.statusCode || 500) < 200 || (res.statusCode || 500) >= 300) {
            reject(
              new Error(
                parsed?.message || raw || `${res.statusCode} request failed for ${requestPath}`,
              ),
            );
            return;
          }

          resolve(parsed);
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

async function loginAdmin() {
  const candidates = [
    { identifier: "dev-admin@example.com", password: "472121" },
    { identifier: "superadmin@blifehealthy.com", password: "472121" },
  ];

  let lastError = null;
  for (const candidate of candidates) {
    try {
      const session = await request("/auth/login", {
        method: "POST",
        body: candidate,
      });

      return {
        token: session.accessToken,
        identifier: candidate.identifier,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to login admin.");
}

async function getMemberByCode(memberCode) {
  return request(`/members/by-code/${encodeURIComponent(memberCode)}`);
}

function normalizeMemberCode(memberCode) {
  if (typeof memberCode !== "string") {
    return memberCode;
  }

  const trimmed = memberCode.trim();
  if (/^CT\d{7}$/.test(trimmed)) {
    return `TH${trimmed.slice(2)}`;
  }

  return trimmed;
}

async function resolveMemberForReplay(memberCode) {
  try {
    return await getMemberByCode(memberCode);
  } catch (error) {
    const normalized = normalizeMemberCode(memberCode);
    if (normalized !== memberCode) {
      return getMemberByCode(normalized);
    }
    throw error;
  }
}

async function createOrder(memberId, token) {
  return request("/orders", {
    method: "POST",
    token,
    body: {
      userId: memberId,
      productDetailId: "1",
      fulfillmentMethod: "branch_pickup",
      pickupBranchName: "Allsale Replay Branch",
      pickupRecipientName: "Allsale Replay",
      pickupPhone: "0800000000",
      cashPaymentMethod: "bank_transfer",
    },
  });
}

async function approveOrder(orderId, token) {
  return request(`/orders/${orderId}/approve`, {
    method: "POST",
    token,
  });
}

async function processOrder(orderId, token) {
  return request(`/orders/${orderId}/process-approved`, {
    method: "POST",
    token,
  });
}

async function getMatrixByCode(memberCode) {
  return request(`/matrix/member/by-code/${encodeURIComponent(memberCode)}`);
}

function summarizeMatrixMember(payload) {
  const cycle = payload?.cycles?.[0];
  if (!cycle) {
    return null;
  }

  return {
    memberCode: payload?.member?.memberCode ?? null,
    currentBoardNo: cycle.currentBoardNo,
    currentBoardRoundNo: cycle.currentBoardRoundNo,
    totalAccumulatedPv: cycle.totalAccumulatedPv,
    boards: (cycle.boards || []).map((board) => ({
      boardNo: board.boardNo,
      roundNo: board.roundNo,
      status: board.status,
      filledSlots: board.filledSlots,
    })),
  };
}

async function main() {
  const dailyReport = readJson(DAILY_REPORT_PATH);
  const replayReport = readJson(REPLAY_REPORT_PATH);
  const replayDayMap = new Map(
    (replayReport.dayReports || []).map((day) => [day.date, day]),
  );

  await request("/health");
  const session = await loginAdmin();

  const processedOrders = [];
  const daySummaries = [];

  for (const day of dailyReport.days || []) {
    console.log(`[replay] day=${day.date} normalOrders=${(day.normalOrders || []).length}`);
    let processedOrderCount = 0;
    let openedReentryCount = 0;
    const openedReentries = [];

    for (const row of day.normalOrders || []) {
      console.log(
        `[replay] order=${row.invoiceNo} member=${row.memberId} date=${day.date}`,
      );
      let member;
      try {
        member = await resolveMemberForReplay(row.memberId);
      } catch (error) {
        throw new Error(
          `Member not found during replay: ${row.memberId} at ${day.date} invoice ${row.invoiceNo}`,
        );
      }
      const createdOrder = await createOrder(member.memberId, session.token);
      await approveOrder(createdOrder.orderId, session.token);
      const processed = await processOrder(createdOrder.orderId, session.token);

      const matrixProcessing = processed?.matrixProcessing || null;
      openedReentryCount += Number(matrixProcessing?.openedReentryCount || 0);
      if (Array.isArray(matrixProcessing?.openedReentries)) {
        openedReentries.push(...matrixProcessing.openedReentries);
      }

      processedOrders.push({
        sourceDate: day.date,
        sourceInvoiceNo: row.invoiceNo,
        sourceMemberCode: row.memberId,
        runtimeOrderId: createdOrder.orderId,
        runtimeOrderNo: createdOrder.orderNo || null,
        matrixProcessing,
      });
      processedOrderCount += 1;
    }

    const expected = replayDayMap.get(day.date);
    daySummaries.push({
      date: day.date,
      sourceInvoiceCount: (day.normalOrders || []).length,
      processedOrderCount,
      runtimeOpenedReentryCount: openedReentryCount,
      runtimeOpenedReentries: openedReentries,
      expectedGeneratedReentryCount: expected?.generatedReentryCount || 0,
      expectedGeneratedReentries: expected?.generatedReentries || [],
    });
  }

  const checkpoints = {};
  for (const memberCode of ["TH0000013", "TH0000016", "TH0000017", "TH0000020", "TH0000023"]) {
    checkpoints[memberCode] = summarizeMatrixMember(await getMatrixByCode(memberCode));
  }

  const output = {
    apiBaseUrl: API_BASE_URL,
    adminIdentifier: session.identifier,
    dailyReportPath: DAILY_REPORT_PATH,
    replayReportPath: REPLAY_REPORT_PATH,
    processedOrderCount: processedOrders.length,
    daySummaries,
    checkpoints,
    processedOrders,
  };

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        outputPath: OUTPUT_PATH,
        processedOrderCount: processedOrders.length,
        dates: daySummaries.length,
        firstMismatchDay:
          daySummaries.find(
            (day) => day.runtimeOpenedReentryCount !== day.expectedGeneratedReentryCount,
          )?.date || null,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
