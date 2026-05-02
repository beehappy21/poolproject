const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const ADMIN_IDENTIFIER = process.env.ADMIN_IDENTIFIER || "dev-admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "472121";
const SETTLEMENT_DATE = process.env.SETTLEMENT_DATE || "2025-11-27";

function countPositiveLegs(legs) {
  return Object.values(legs).filter(
    (value) => Number.parseFloat(value?.totalPv || "0") > 0,
  ).length;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const target = new URL(`${API_BASE_URL}${path}`);
  const transport = target.protocol === "https:" ? https : http;
  const payload = options.body ? JSON.stringify(options.body) : null;

  const response = await new Promise((resolve, reject) => {
    const req = transport.request(
      target,
      {
        method: options.method || "GET",
        headers: {
          ...(options.token
            ? { Authorization: `Bearer ${options.token}` }
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
          resolve({
            statusCode: res.statusCode || 500,
            body: raw,
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

  const parsed = response.body ? JSON.parse(response.body) : null;

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(parsed?.message || `${response.statusCode} request failed for ${path}`);
  }

  return parsed;
}

async function loginAdmin() {
  const session = await request("/auth/login", {
    method: "POST",
    body: {
      identifier: ADMIN_IDENTIFIER,
      password: ADMIN_PASSWORD,
    },
  });

  return session.accessToken;
}

async function main() {
  await request("/health");
  const token = await loginAdmin();

  const scaffold = await request(
    `/commissions/team-settlement-batches/${SETTLEMENT_DATE}/scaffold`,
    {
      method: "POST",
      token,
    },
  );

  const oneLegItem = scaffold.items.find(
    (item) => countPositiveLegs(item.availablePvByLeg) === 1,
  );

  assert(
    oneLegItem,
    `No one-leg carry-forward candidate found for settlement date ${SETTLEMENT_DATE}.`,
  );
  assert(
    oneLegItem.payablePv === "0",
    `Expected one-leg item payablePv=0, received ${oneLegItem.payablePv}.`,
  );
  assert(
    oneLegItem.bonusAmount === "0",
    `Expected one-leg item bonusAmount=0, received ${oneLegItem.bonusAmount}.`,
  );
  assert(
    Object.values(oneLegItem.plannedPaidPvByLeg).every((value) => value === "0"),
    "Expected one-leg item plannedPaidPvByLeg to stay at zero.",
  );

  const processResult = await request(
    `/commissions/team-settlement-batches/${SETTLEMENT_DATE}/process`,
    {
      method: "POST",
      token,
    },
  );
  const processedItem = processResult.items.find(
    (item) => item.userId === oneLegItem.userId,
  );

  assert(processedItem, "Processed batch did not include the one-leg item.");
  assert(
    processedItem.status === "carried_forward",
    `Expected one-leg item status=carried_forward, received ${processedItem.status}.`,
  );
  assert(
    processedItem.payablePv === "0",
    `Expected processed one-leg item payablePv=0, received ${processedItem.payablePv}.`,
  );
  assert(
    processedItem.bonusAmount === "0",
    `Expected processed one-leg item bonusAmount=0, received ${processedItem.bonusAmount}.`,
  );

  const snapshot = await request(
    `/commissions/team-settlement-batches/${SETTLEMENT_DATE}/snapshot`,
    {
      method: "GET",
      token,
    },
  );
  const snapshotItem = snapshot.items.find(
    (item) => item.userId === oneLegItem.userId,
  );

  assert(snapshotItem, "Snapshot did not include the one-leg item.");
  assert(
    snapshotItem.status === "carried_forward",
    `Expected snapshot one-leg item status=carried_forward, received ${snapshotItem.status}.`,
  );

  console.log(
    JSON.stringify(
      {
        settlementDate: SETTLEMENT_DATE,
        verifiedUserId: oneLegItem.userId,
        batchStatus: snapshot.batchStatus,
        positiveLegs: countPositiveLegs(oneLegItem.availablePvByLeg),
        payablePv: snapshotItem.payablePv,
        bonusAmount: snapshotItem.bonusAmount,
        status: snapshotItem.status,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
