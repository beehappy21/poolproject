const http = require("node:http");
const https = require("node:https");
const { execFileSync } = require("node:child_process");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const INTERNAL_BAO_TOKEN =
  process.env.INTERNAL_BAO_TOKEN || "local-bao-internal-token-20260508";
const MEMBER_PASSWORD =
  process.env.WAP_PROMO_CHECK_MEMBER_PASSWORD || "a1a1a1";
const MEMBER_CODES = (process.env.WAP_PROMO_CHECK_MEMBER_CODES ||
  "TH0000013,TH0000016,TH0000023,TH0000074")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const PRIMARY_PRODUCT_CODE =
  process.env.WAP_PROMO_CHECK_PRODUCT_CODE || "DRI001";
const EXPECTED_PROMO_MIN_QTY = Number(
  process.env.WAP_PROMO_CHECK_PROMO_MIN_QTY || "2",
);
const EXPECTED_PROMO_PRICE = Number(
  process.env.WAP_PROMO_CHECK_PROMO_PRICE || "500",
);
const EXPECTED_PROMO_PV = Number(
  process.env.WAP_PROMO_CHECK_PROMO_PV || "100",
);

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
          ...(options.headers || {}),
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
    body: { identifier, password },
  });
}

function runPsql(query) {
  return execFileSync(
    "docker",
    [
      "exec",
      "poolproject-postgres",
      "psql",
      "-U",
      "postgres",
      "-d",
      "poolproject",
      "-Atqc",
      query,
    ],
    {
      encoding: "utf8",
    },
  ).trim();
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return Array.isArray(value?.items) ? value.items : [];
}

function asNumber(value) {
  return Number.parseFloat(String(value ?? "0"));
}

function round(value) {
  return Number.parseFloat(value.toFixed(8));
}

function expectedTotals(product, quantity) {
  const usePromotion =
    quantity >= EXPECTED_PROMO_MIN_QTY &&
    String(product.promotionStatus || "").trim().toUpperCase() === "ACTIVE";

  return {
    usePromotion,
    totalUsdt: round(
      (usePromotion ? EXPECTED_PROMO_PRICE : asNumber(product.memberPriceUsdt)) *
        quantity,
    ),
    totalPv: round(
      (usePromotion ? EXPECTED_PROMO_PV : asNumber(product.pv)) * quantity,
    ),
  };
}

function expectedDirectRows(memberInfoByCode, buyerCode, totalPv) {
  const rows = [];
  const buyer = memberInfoByCode.get(buyerCode);
  let sponsorCode = buyer?.sponsorCode || null;
  const rates = [0.5, 0.5];

  for (const [index, rate] of rates.entries()) {
    if (!sponsorCode) {
      break;
    }

    rows.push({
      levelNo: index + 1,
      beneficiaryCode: sponsorCode,
      expectedAmount: round(totalPv * rate),
    });

    sponsorCode = memberInfoByCode.get(sponsorCode)?.sponsorCode || null;
  }

  return rows;
}

async function createAndApproveOrder({
  memberSession,
  productDetailId,
  quantity,
}) {
  const createdOrder = await expectOk("/auth/orders", {
    method: "POST",
    token: memberSession.accessToken,
    body: {
      productDetailId,
      quantity: String(quantity),
      fulfillmentMethod: "branch_pickup",
      pickupBranchName: "Promo 100PV Validation",
      pickupRecipientName: memberSession.user.memberCode,
      pickupPhone: "0800000000",
      cashPaymentMethod: "bank_transfer",
    },
  });

  await expectOk(`/internal/bao/orders/${createdOrder.orderId}/approve`, {
    method: "POST",
    headers: {
      "x-internal-bao-token": INTERNAL_BAO_TOKEN,
    },
  });

  const memberOrderView = await expectOk(`/auth/orders/${createdOrder.orderId}`, {
    method: "GET",
    token: memberSession.accessToken,
  });

  return {
    createdOrder,
    memberOrderView,
  };
}

async function main() {
  await expectOk("/health");

  const storefrontProducts = await expectOk("/products/storefront");
  const hiddenTestProductCodes = ["COMMTEST1000", "COMMTEST650"];
  const visibleCodes = new Set(storefrontProducts.map((item) => item.code));
  const leakedTestCodes = hiddenTestProductCodes.filter((code) =>
    visibleCodes.has(code),
  );

  if (leakedTestCodes.length > 0) {
    throw new Error(
      `Test products still visible on storefront: ${leakedTestCodes.join(", ")}`,
    );
  }

  const product =
    storefrontProducts.find((item) => item.code === PRIMARY_PRODUCT_CODE) ||
    storefrontProducts.find(
      (item) =>
        String(item.code || "").toUpperCase().startsWith("COMMTEST") === false &&
        asNumber(item.pv) === 100,
    );

  if (!product) {
    throw new Error("No active non-test 100 PV storefront product found.");
  }

  const productRow = runPsql(
    `select id, code, name, pv::text, "memberPriceUsdt"::text,
            coalesce("promotionStatus", ''),
            coalesce("promotionMinQuantity"::text, ''),
            coalesce("promotionPriceUsdt"::text, ''),
            coalesce("promotionPv"::text, '')
       from "ProductDetail"
      where id = ${product.productDetailId}
      limit 1;`,
  );

  if (!productRow) {
    throw new Error("Selected product detail row not found.");
  }

  const [
    productId,
    productCode,
    productName,
    productPv,
    productMemberPrice,
    productPromotionStatus,
    productPromotionMinQty,
    productPromotionPrice,
    productPromotionPv,
  ] = productRow.split("|");

  const productInfo = {
    productDetailId: productId,
    code: productCode,
    name: productName,
    pv: productPv,
    memberPriceUsdt: productMemberPrice,
    promotionStatus: productPromotionStatus,
    promotionMinQuantity: productPromotionMinQty,
    promotionPriceUsdt: productPromotionPrice,
    promotionPv: productPromotionPv,
  };

  const memberRows = runPsql(
    `select u."memberCode", coalesce(s."memberCode", '')
       from "User" u
       left join "User" s on s.id = u."sponsorId"
      where u."memberCode" in (${MEMBER_CODES.map((code) => `'${code}'`).join(", ")})
      order by u."memberCode";`,
  );
  const memberInfoByCode = new Map(
    memberRows
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [memberCode, sponsorCode] = line.split("|");
        return [memberCode, { memberCode, sponsorCode: sponsorCode || null }];
      }),
  );

  const results = [];
  for (const memberCode of MEMBER_CODES) {
    const memberSession = await login(memberCode, MEMBER_PASSWORD);
    const orderResults = [];

    for (const quantity of [1, 2]) {
      const { createdOrder, memberOrderView } =
        await createAndApproveOrder({
          memberSession,
          productDetailId: productInfo.productDetailId,
          quantity,
        });

      const expected = expectedTotals(productInfo, quantity);
      const actualOrder = memberOrderView.order;
      const commissionRowsRaw = runPsql(
        `select cl.id::text,
                cl."commissionType",
                coalesce(cl."levelNo"::text, ''),
                coalesce(u."memberCode", ''),
                cl."commissionAmount"::text,
                cl."finalPayableAmount"::text,
                cl.status,
                cl."releaseStatus"
           from "CommissionLedger" cl
           left join "User" u on u.id = cl."beneficiaryUserId"
          where cl."orderId" = ${createdOrder.orderId}
          order by cl."commissionType" asc, cl."levelNo" asc nulls last, cl.id asc;`,
      );
      const actualCommissions = commissionRowsRaw
        ? commissionRowsRaw.split("\n").filter(Boolean).map((line) => {
            const [
              commissionId,
              commissionType,
              levelNo,
              beneficiaryCode,
              amount,
              finalPayableAmount,
              status,
              releaseStatus,
            ] = line.split("|");
            return {
              commissionId,
              commissionType,
              levelNo: levelNo ? Number(levelNo) : null,
              beneficiaryCode: beneficiaryCode || null,
              amount,
              finalPayableAmount,
              status,
              releaseStatus,
            };
          })
        : [];
      const expectedDirect = expectedDirectRows(
        memberInfoByCode,
        memberCode,
        expected.totalPv,
      );
      const visibleCommissionTypes = toArray(memberOrderView.commissions).map((row) => ({
        commissionType: row.commissionType,
        levelNo: row.levelNo,
        amount: row.amount,
        status: row.status,
      }));

      orderResults.push({
        quantity,
        orderId: createdOrder.orderId,
        orderNo: createdOrder.orderNo,
        expected,
        actual: {
          totalUsdt: asNumber(actualOrder.totalUsdt),
          totalPv: asNumber(actualOrder.totalPv),
          approvalStatus: actualOrder.approvalStatus,
          transferSubmittedAt: actualOrder.transferSubmittedAt,
          itemCount: Array.isArray(actualOrder.items) ? actualOrder.items.length : 0,
        },
        expectedDirect,
        visibleOnWap: {
          hasOrder: Boolean(actualOrder?.orderId),
          approvalStatus: actualOrder.approvalStatus,
          commissionRows: visibleCommissionTypes,
        },
        commissionRows: actualCommissions,
      });
    }

    results.push({
      memberCode,
      sponsorCode: memberInfoByCode.get(memberCode)?.sponsorCode || null,
      orders: orderResults,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        storefrontHiddenTestProducts: hiddenTestProductCodes,
        selectedProduct: productInfo,
        results,
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
