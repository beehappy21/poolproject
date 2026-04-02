const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const MEMBER_IDENTIFIER = process.env.ORDER_SMOKE_MEMBER || "TH0000002";
const MEMBER_PASSWORD = process.env.ORDER_SMOKE_MEMBER_PASSWORD || "a1a1a1";
const ADMIN_IDENTIFIER = process.env.ORDER_SMOKE_ADMIN || "TH0000013";
const ADMIN_PASSWORD = process.env.ORDER_SMOKE_ADMIN_PASSWORD || "a1a1a1";
const PRODUCT_DETAIL_ID = process.env.ORDER_SMOKE_PRODUCT_DETAIL_ID || "1";

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
    body: {
      identifier,
      password,
    },
  });
}

async function main() {
  await expectOk("/health");

  const memberSession = await login(MEMBER_IDENTIFIER, MEMBER_PASSWORD);
  const adminSession = await login(ADMIN_IDENTIFIER, ADMIN_PASSWORD);
  const member = await expectOk(`/members/by-code/${encodeURIComponent(MEMBER_IDENTIFIER)}`);

  const payload = {
    productDetailId: PRODUCT_DETAIL_ID,
    fulfillmentMethod: "branch_pickup",
    pickupBranchName: "Checkpoint Test Branch",
    pickupRecipientName: "Checkpoint Runner",
    pickupPhone: "0800000000",
    cashPaymentMethod: "bank_transfer",
  };

  const authOrder = await expectOk("/auth/orders", {
    method: "POST",
    token: memberSession.accessToken,
    body: payload,
  });

  const adminOrder = await expectOk("/orders", {
    method: "POST",
    token: adminSession.accessToken,
    body: {
      userId: member.memberId,
      ...payload,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        memberCode: MEMBER_IDENTIFIER,
        memberId: member.memberId,
        authOrder: {
          orderId: authOrder.orderId,
          orderNo: authOrder.orderNo,
          totalPv: authOrder.totalPv,
        },
        adminOrder: {
          orderId: adminOrder.orderId,
          orderNo: adminOrder.orderNo,
          totalPv: adminOrder.totalPv,
        },
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
