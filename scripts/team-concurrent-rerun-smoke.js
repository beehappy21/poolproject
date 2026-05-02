const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const ADMIN_IDENTIFIER = process.env.ADMIN_IDENTIFIER || "dev-admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "472121";
const SETTLEMENT_DATE = process.env.SETTLEMENT_DATE || "2025-11-27";
const CONCURRENCY_ROUNDS = Number.parseInt(
  process.env.CONCURRENCY_ROUNDS || "3",
  10,
);

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

async function getSnapshot(token) {
  return request(
    `/commissions/team-settlement-batches/${SETTLEMENT_DATE}/snapshot`,
    {
      method: "GET",
      token,
    },
  );
}

async function main() {
  await request("/health");
  const token = await loginAdmin();

  await request(
    `/commissions/team-settlement-batches/${SETTLEMENT_DATE}/scaffold`,
    {
      method: "POST",
      token,
    },
  );
  const baselineProcess = await request(
    `/commissions/team-settlement-batches/${SETTLEMENT_DATE}/process`,
    {
      method: "POST",
      token,
    },
  );
  const baselineSnapshot = await getSnapshot(token);

  assert(
    baselineSnapshot.batchStatus === "processed",
    `Expected baseline batchStatus=processed, received ${baselineSnapshot.batchStatus}.`,
  );

  for (let round = 1; round <= CONCURRENCY_ROUNDS; round += 1) {
    await Promise.all([
      request(
        `/commissions/team-settlement-batches/${SETTLEMENT_DATE}/scaffold`,
        {
          method: "POST",
          token,
        },
      ),
      request(
        `/commissions/team-settlement-batches/${SETTLEMENT_DATE}/process`,
        {
          method: "POST",
          token,
        },
      ),
      getSnapshot(token),
    ]);
  }

  const finalSnapshot = await getSnapshot(token);

  assert(
    finalSnapshot.batchStatus === "processed",
    `Expected final batchStatus=processed, received ${finalSnapshot.batchStatus}.`,
  );
  assert(
    finalSnapshot.processedUsers === baselineSnapshot.processedUsers,
    `Expected processedUsers=${baselineSnapshot.processedUsers}, received ${finalSnapshot.processedUsers}.`,
  );
  assert(
    finalSnapshot.carriedForwardUsers === baselineSnapshot.carriedForwardUsers,
    `Expected carriedForwardUsers=${baselineSnapshot.carriedForwardUsers}, received ${finalSnapshot.carriedForwardUsers}.`,
  );
  assert(
    finalSnapshot.totalPayablePv === baselineSnapshot.totalPayablePv,
    `Expected totalPayablePv=${baselineSnapshot.totalPayablePv}, received ${finalSnapshot.totalPayablePv}.`,
  );
  assert(
    finalSnapshot.totalBonusAmount === baselineSnapshot.totalBonusAmount,
    `Expected totalBonusAmount=${baselineSnapshot.totalBonusAmount}, received ${finalSnapshot.totalBonusAmount}.`,
  );
  assert(
    finalSnapshot.items.every((item) => item.status !== "planned"),
    "Expected no item to revert back to planned after concurrent reruns.",
  );

  console.log(
    JSON.stringify(
      {
        settlementDate: SETTLEMENT_DATE,
        rounds: CONCURRENCY_ROUNDS,
        baseline: {
          status: baselineProcess.status,
          processedUsers: baselineProcess.processedUsers,
          carriedForwardUsers: baselineProcess.carriedForwardUsers,
          totalPayablePv: baselineProcess.totalPayablePv,
          totalBonusAmount: baselineProcess.totalBonusAmount,
        },
        finalSnapshot: {
          batchStatus: finalSnapshot.batchStatus,
          processedUsers: finalSnapshot.processedUsers,
          carriedForwardUsers: finalSnapshot.carriedForwardUsers,
          totalPayablePv: finalSnapshot.totalPayablePv,
          totalBonusAmount: finalSnapshot.totalBonusAmount,
        },
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
