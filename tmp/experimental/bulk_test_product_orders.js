const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const ADMIN_IDENTIFIER = process.env.BULK_TEST_ADMIN_IDENTIFIER || "TH0000013";
const ADMIN_PASSWORD = process.env.BULK_TEST_ADMIN_PASSWORD || "a1a1a1";
const PRODUCT_CODE = process.env.BULK_TEST_PRODUCT_CODE || "TEST1000";
const SOURCE_TAG =
  process.env.BULK_TEST_SOURCE_TAG || "bulk-test-product-2026-05-02";
const LIMIT = Number.parseInt(process.env.BULK_TEST_LIMIT || "0", 10) || 0;
const OFFSET = Number.parseInt(process.env.BULK_TEST_OFFSET || "0", 10) || 0;
const STEP_DELAY_MS =
  Number.parseInt(process.env.BULK_TEST_STEP_DELAY_MS || "400", 10) || 400;
const APPLY = process.argv.includes("--apply");

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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function expectOkWithRetry(path, options = {}, retry = 0) {
  const response = await request(path, options);

  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.body;
  }

  if (response.statusCode === 429 && retry < 15) {
    await sleep(1000 * (retry + 1));
    return expectOkWithRetry(path, options, retry + 1);
  }

  throw new Error(
    `${options.method || "GET"} ${path} failed with ${response.statusCode}: ${JSON.stringify(response.body)}`,
  );
}

async function login(identifier, password) {
  return expectOkWithRetry("/auth/login", {
    method: "POST",
    body: {
      identifier,
      password,
    },
  });
}

async function loadActiveTestProduct() {
  const product = await prisma.productDetail.findFirst({
    where: {
      code: PRODUCT_CODE,
      status: "ACTIVE",
    },
    orderBy: [{ id: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      memberPriceUsdt: true,
      pv: true,
      stockQuantity: true,
    },
  });

  if (!product) {
    throw new Error(`Active product detail ${PRODUCT_CODE} not found.`);
  }

  return {
    id: product.id.toString(),
    code: product.code,
    name: product.name,
    memberPriceUsdt: product.memberPriceUsdt.toString(),
    pv: product.pv.toString(),
    stockQuantity:
      product.stockQuantity === null ? null : Number(product.stockQuantity),
  };
}

async function loadExistingTaggedOrders() {
  const rows = await prisma.order.findMany({
    where: {
      shippingAddressNote: {
        contains: SOURCE_TAG,
      },
    },
    select: {
      id: true,
      orderNo: true,
      userId: true,
      shippingAddressNote: true,
      approvalStatus: true,
    },
  });

  return new Map(
    rows.map((row) => [
      row.userId.toString(),
      {
        orderId: row.id.toString(),
        orderNo: row.orderNo,
        approvalStatus: row.approvalStatus,
        shippingAddressNote: row.shippingAddressNote ?? null,
      },
    ]),
  );
}

async function loadRemainingMembers() {
  const users = await prisma.user.findMany({
    where: {
      isAdmin: false,
    },
    orderBy: [{ memberCode: "asc" }],
    select: {
      id: true,
      memberCode: true,
      status: true,
      orders: {
        where: {
          approvalStatus: "APPROVED",
          orderSourceType: "NORMAL",
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  const remaining = users.filter((user) => user.orders.length === 0);
  return OFFSET > 0 || LIMIT > 0
    ? remaining.slice(OFFSET, LIMIT > 0 ? OFFSET + LIMIT : undefined)
    : remaining;
}

async function createAndApproveOrder(adminToken, input) {
  const createdOrder = await expectOkWithRetry("/orders", {
    method: "POST",
    token: adminToken,
    body: {
      userId: input.userId,
      items: [{ productDetailId: input.productDetailId, quantity: "1" }],
      fulfillmentMethod: "branch_pickup",
      pickupBranchName: "Bulk Test Product",
      pickupBranchNote: `${SOURCE_TAG}|member=${input.memberCode}`,
      pickupRecipientName: "Bulk Test Product",
      pickupPhone: "0800000000",
      discountWalletAmount: "0",
      shoppingWalletAmount: "0",
      firmWalletAmount: "0",
      cashPaymentMethod: "bank_transfer",
    },
  });

  const approval = await expectOkWithRetry(`/orders/${createdOrder.orderId}/approve`, {
    method: "POST",
    token: adminToken,
  });

  return {
    createdOrder,
    approval,
  };
}

async function main() {
  await expectOkWithRetry("/health");

  const product = await loadActiveTestProduct();
  const existingTaggedOrders = await loadExistingTaggedOrders();
  const remainingMembers = await loadRemainingMembers();

  const adminSession = APPLY
    ? await login(ADMIN_IDENTIFIER, ADMIN_PASSWORD)
    : null;

  const results = [];
  for (const member of remainingMembers) {
    const userId = member.id.toString();
    const existingTagged = existingTaggedOrders.get(userId);

    if (existingTagged?.approvalStatus === "APPROVED") {
      results.push({
        memberCode: member.memberCode,
        userId,
        status: "skipped_existing_tag",
        orderId: existingTagged.orderId,
        orderNo: existingTagged.orderNo,
        approvalStatus: existingTagged.approvalStatus.toLowerCase(),
      });
      continue;
    }

    if (existingTagged && APPLY) {
      const approval = await expectOkWithRetry(
        `/orders/${existingTagged.orderId}/approve`,
        {
          method: "POST",
          token: adminSession.accessToken,
        },
      );

      results.push({
        memberCode: member.memberCode,
        userId,
        status: "approved_existing_tag",
        orderId: existingTagged.orderId,
        orderNo: existingTagged.orderNo,
        directStatus: approval.commissionDrafts?.directStatus ?? null,
        directCount: approval.commissionDrafts?.directCount ?? 0,
        hasFallback: approval.commissionDrafts?.hasFallback ?? false,
        walletPostingCount: approval.walletPostingInputs?.length ?? 0,
      });
      continue;
    }

    if (!APPLY) {
      results.push({
        memberCode: member.memberCode,
        userId,
        status: "dry_run",
      });
      continue;
    }

    const { createdOrder, approval } = await createAndApproveOrder(
      adminSession.accessToken,
      {
        userId,
        memberCode: member.memberCode,
        productDetailId: product.id,
      },
    );

    results.push({
      memberCode: member.memberCode,
      userId,
      status: "approved",
      orderId: createdOrder.orderId,
      orderNo: createdOrder.orderNo,
      directStatus: approval.commissionDrafts?.directStatus ?? null,
      directCount: approval.commissionDrafts?.directCount ?? 0,
      hasFallback: approval.commissionDrafts?.hasFallback ?? false,
      walletPostingCount: approval.walletPostingInputs?.length ?? 0,
    });
    await sleep(STEP_DELAY_MS);
  }

  const summary = results.reduce(
    (acc, row) => {
      acc.total += 1;
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    },
    { total: 0 },
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        apply: APPLY,
        sourceTag: SOURCE_TAG,
        product,
        offset: OFFSET,
        limit: LIMIT,
        stepDelayMs: STEP_DELAY_MS,
        remainingMemberCount: remainingMembers.length,
        summary,
        sample: results.slice(0, 50),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
