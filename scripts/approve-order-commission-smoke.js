const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const MEMBER_IDENTIFIER = process.env.ORDER_APPROVAL_SMOKE_MEMBER || "TH0000002";
const MEMBER_PASSWORD = process.env.ORDER_APPROVAL_SMOKE_MEMBER_PASSWORD || "a1a1a1";
const ADMIN_IDENTIFIER = process.env.ORDER_APPROVAL_SMOKE_ADMIN || "TH0000013";
const ADMIN_PASSWORD = process.env.ORDER_APPROVAL_SMOKE_ADMIN_PASSWORD || "a1a1a1";
const PRODUCT_DETAIL_ID = process.env.ORDER_APPROVAL_SMOKE_PRODUCT_DETAIL_ID || "1";

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

function asItems(result) {
  if (Array.isArray(result)) {
    return result;
  }

  return Array.isArray(result?.items) ? result.items : [];
}

async function main() {
  await expectOk("/health");

  const memberSession = await login(MEMBER_IDENTIFIER, MEMBER_PASSWORD);
  const adminSession = await login(ADMIN_IDENTIFIER, ADMIN_PASSWORD);

  const createdOrder = await expectOk("/auth/orders", {
    method: "POST",
    token: memberSession.accessToken,
    body: {
      productDetailId: PRODUCT_DETAIL_ID,
      fulfillmentMethod: "branch_pickup",
      pickupBranchName: "Checkpoint Test Branch",
      pickupRecipientName: "Checkpoint Runner",
      pickupPhone: "0800000000",
      cashPaymentMethod: "bank_transfer",
    },
  });

  const approval = await expectOk(`/orders/${createdOrder.orderId}/approve`, {
    method: "POST",
    token: adminSession.accessToken,
  });

  const snapshot = await expectOk(`/orders/${createdOrder.orderId}/snapshot`, {
    method: "GET",
    token: adminSession.accessToken,
  });

  const commissionItems = asItems(snapshot.commissions);
  const relevantCommissionItems = commissionItems.filter(
    (item) => item.commissionType === "cashback" || item.commissionType === "direct",
  );
  const pendingRelevantItems = relevantCommissionItems.filter(
    (item) => item.status === "pending",
  );

  if (pendingRelevantItems.length > 0) {
    throw new Error(
      `Found pending cashback/direct commissions after approve: ${JSON.stringify(pendingRelevantItems)}`,
    );
  }

  const approvedRelevantItems = relevantCommissionItems.filter(
    (item) =>
      item.status === "approved" &&
      item.beneficiaryUserId &&
      Number(item.amount || "0") > 0,
  );

  const walletPostings = [];
  for (const item of approvedRelevantItems) {
    const transactions = await expectOk(
      `/wallets/${item.beneficiaryUserId}/transactions`,
      {
        method: "GET",
        token: adminSession.accessToken,
      },
    );
    const matchedTransaction = asItems(transactions).find(
      (entry) =>
        entry.refType === "commission" &&
        entry.refId === item.commissionId &&
        entry.status === "posted",
    );

    if (!matchedTransaction) {
      throw new Error(
        `Approved commission ${item.commissionId} for user ${item.beneficiaryUserId} was not posted to wallet.`,
      );
    }

    walletPostings.push({
      commissionId: item.commissionId,
      beneficiaryUserId: item.beneficiaryUserId,
      txType: matchedTransaction.txType,
      amount: matchedTransaction.amount,
      balanceBucket: matchedTransaction.balanceBucket,
    });
  }

  const authCommissions = asItems(
    await expectOk("/auth/commissions", {
      method: "GET",
      token: memberSession.accessToken,
    }),
  );
  const memberVisibleCommissionIds = new Set(
    authCommissions.map((item) => item.commissionId),
  );
  const visibleOwnCommissionIds = relevantCommissionItems
    .filter((item) => item.beneficiaryUserId === memberSession.user.userId)
    .map((item) => item.commissionId);
  const missingVisibleOwnCommissionIds = visibleOwnCommissionIds.filter(
    (commissionId) => !memberVisibleCommissionIds.has(commissionId),
  );

  if (missingVisibleOwnCommissionIds.length > 0) {
    throw new Error(
      `Approved commissions were not visible in /auth/commissions: ${missingVisibleOwnCommissionIds.join(", ")}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        orderId: createdOrder.orderId,
        orderNo: createdOrder.orderNo,
        approval: {
          orderId: approval.orderId,
          walletPostingCount: approval.walletPostingInputs?.length ?? 0,
          directStatus: approval.commissionDrafts?.directStatus ?? null,
          cashbackCount: approval.commissionDrafts?.cashbackCount ?? 0,
          directCount: approval.commissionDrafts?.directCount ?? 0,
          hasFallback: approval.commissionDrafts?.hasFallback ?? false,
        },
        relevantCommissionCount: relevantCommissionItems.length,
        approvedRelevantCount: approvedRelevantItems.length,
        walletPostings,
        authCommissionCount: authCommissions.length,
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
