const { execFileSync } = require("node:child_process");
const http = require("node:http");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const IDENTIFIER = process.env.POOL_ADMIN_IDENTIFIER || "dev-admin@example.com";
const PASSWORD = process.env.POOL_ADMIN_PASSWORD || "472121";
const SOURCE_TAG = process.env.POOL_SOURCE_TAG || "saletest05042026";
const POSTGRES_CONTAINER =
  process.env.POOL_POSTGRES_CONTAINER || "poolproject-postgres";
const TARGET_DB_NAME = process.env.POOL_TARGET_DB_NAME || "poolproject_retest";

function request(path, method, token, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode || 500,
              body: raw ? JSON.parse(raw) : null,
            });
          } catch {
            resolve({
              status: res.statusCode || 500,
              body: raw,
            });
          }
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
      "-c",
      query,
    ],
    { encoding: "utf8" },
  ).trim();
}

async function main() {
  const login = await request("/auth/login", "POST", null, {
    identifier: IDENTIFIER,
    password: PASSWORD,
  });
  if (login.status < 200 || login.status >= 300) {
    throw new Error(`Login failed: ${login.status} ${JSON.stringify(login.body)}`);
  }

  const datesRaw = runPsql(`
    select to_char(
      date_trunc('week', "approvedAt" at time zone 'Asia/Bangkok') + interval '6 days',
      'YYYY-MM-DD'
    )
    from "Order"
    where "shippingAddressNote" like '${SOURCE_TAG}|invoice=%'
      and "approvedAt" is not null
    group by 1
    order by 1;
  `);
  const dates = datesRaw ? datesRaw.split(/\n+/).filter(Boolean) : [];
  const results = [];

  for (const date of dates) {
    const response = await request(`/pool/${date}/close`, "POST", login.body.accessToken, {});
    results.push({
      date,
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      body: response.body,
    });
  }

  console.log(JSON.stringify({ sourceTag: SOURCE_TAG, dates, results }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
