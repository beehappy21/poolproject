const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");
const { execFileSync } = require("node:child_process");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const INTERNAL_BAO_TOKEN =
  process.env.INTERNAL_BAO_TOKEN || "local-bao-internal-token-20260508";
const SMOKE_USER_ID = process.env.BAO_PROMO_SMOKE_USER_ID || "2";
const PRODUCT_DETAIL_CODE =
  process.env.BAO_PROMO_SMOKE_PRODUCT_CODE || "COMMTEST650";
const PROMOTION_NAME =
  process.env.BAO_PROMO_SMOKE_PROMOTION_NAME || "LOCAL TEST PROMO";
const PROMOTION_MIN_QTY = Number(
  process.env.BAO_PROMO_SMOKE_PROMOTION_MIN_QTY || "2",
);
const PROMOTION_UNIT_PRICE = Number(
  process.env.BAO_PROMO_SMOKE_PROMOTION_UNIT_PRICE || "500",
);
const PROMOTION_UNIT_PV = Number(
  process.env.BAO_PROMO_SMOKE_PROMOTION_UNIT_PV || "100",
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

function runPsqlQuiet(query) {
  execFileSync(
    "docker",
    [
      "exec",
      "poolproject-postgres",
      "psql",
      "-U",
      "postgres",
      "-d",
      "poolproject",
      "-qc",
      query,
    ],
    {
      stdio: "ignore",
    },
  );
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") {
    return "NULL";
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "NULL";
  }

  return String(value);
}

function decimalAsNumber(value) {
  return Number.parseFloat(String(value || "0"));
}

async function createBaoOrder(productDetailId, quantity) {
  return expectOk("/internal/bao/orders", {
    method: "POST",
    headers: {
      "x-internal-bao-token": INTERNAL_BAO_TOKEN,
    },
    body: {
      userId: SMOKE_USER_ID,
      productDetailId: String(productDetailId),
      quantity: String(quantity),
      fulfillmentMethod: "branch_pickup",
      pickupBranchName: "Promotion Smoke Branch",
      pickupRecipientName: "Promotion Smoke",
      pickupPhone: "0800000000",
      cashPaymentMethod: "cash",
    },
  });
}

async function main() {
  await expectOk("/health");

  const detailRow = runPsql(
    `select id, code, "memberPriceUsdt"::text, pv::text,
            coalesce("promotionId"::text, ''),
            coalesce("promotionName", ''),
            coalesce("promotionStatus", ''),
            coalesce("promotionMinQuantity"::text, ''),
            coalesce("promotionPriceUsdt"::text, ''),
            coalesce("promotionPv"::text, '')
       from "ProductDetail"
      where code = '${PRODUCT_DETAIL_CODE.replace(/'/g, "''")}'
      limit 1;`,
  );

  if (!detailRow) {
    throw new Error(`ProductDetail not found for code ${PRODUCT_DETAIL_CODE}`);
  }

  const [
    productDetailId,
    productCode,
    memberPriceUsdt,
    memberPv,
    originalPromotionId,
    originalPromotionName,
    originalPromotionStatus,
    originalPromotionMinQty,
    originalPromotionPrice,
    originalPromotionPv,
  ] = detailRow.split("|");

  const cleanupOrderIds = [];

  try {
    runPsqlQuiet(
      `update "ProductDetail"
          set "promotionId" = 999999,
              "promotionName" = ${sqlString(PROMOTION_NAME)},
              "promotionStatus" = 'ACTIVE',
              "promotionMinQuantity" = ${sqlNumber(PROMOTION_MIN_QTY)},
              "promotionPriceUsdt" = ${sqlNumber(PROMOTION_UNIT_PRICE)},
              "promotionPv" = ${sqlNumber(PROMOTION_UNIT_PV)}
        where id = ${sqlNumber(productDetailId)};`,
    );

    const qty1Order = await createBaoOrder(productDetailId, 1);
    const qty2Order = await createBaoOrder(productDetailId, 2);
    cleanupOrderIds.push(qty1Order.orderId, qty2Order.orderId);

    const expectedQty1TotalUsdt = decimalAsNumber(memberPriceUsdt);
    const expectedQty1TotalPv = decimalAsNumber(memberPv);
    const expectedQty2TotalUsdt = PROMOTION_UNIT_PRICE * 2;
    const expectedQty2TotalPv = PROMOTION_UNIT_PV * 2;

    const actualQty1TotalUsdt = decimalAsNumber(qty1Order.totalUsdt);
    const actualQty1TotalPv = decimalAsNumber(qty1Order.totalPv);
    const actualQty2TotalUsdt = decimalAsNumber(qty2Order.totalUsdt);
    const actualQty2TotalPv = decimalAsNumber(qty2Order.totalPv);

    if (
      actualQty1TotalUsdt !== expectedQty1TotalUsdt ||
      actualQty1TotalPv !== expectedQty1TotalPv
    ) {
      throw new Error(
        `qty=1 expected ${expectedQty1TotalUsdt}/${expectedQty1TotalPv} but got ${qty1Order.totalUsdt}/${qty1Order.totalPv}`,
      );
    }

    if (
      actualQty2TotalUsdt !== expectedQty2TotalUsdt ||
      actualQty2TotalPv !== expectedQty2TotalPv
    ) {
      throw new Error(
        `qty=2 expected ${expectedQty2TotalUsdt}/${expectedQty2TotalPv} but got ${qty2Order.totalUsdt}/${qty2Order.totalPv}`,
      );
    }

    process.stdout.write(
      JSON.stringify(
        {
          ok: true,
          productDetailId,
          productCode,
          promotion: {
            minQuantity: PROMOTION_MIN_QTY,
            unitPriceUsdt: PROMOTION_UNIT_PRICE,
            unitPv: PROMOTION_UNIT_PV,
          },
          qty1: {
            orderId: qty1Order.orderId,
            orderNo: qty1Order.orderNo,
            totalUsdt: qty1Order.totalUsdt,
            totalPv: qty1Order.totalPv,
          },
          qty2: {
            orderId: qty2Order.orderId,
            orderNo: qty2Order.orderNo,
            totalUsdt: qty2Order.totalUsdt,
            totalPv: qty2Order.totalPv,
          },
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    runPsqlQuiet(
      `update "ProductDetail"
          set "promotionId" = ${sqlNumber(originalPromotionId)},
              "promotionName" = ${sqlString(originalPromotionName)},
              "promotionStatus" = ${sqlString(originalPromotionStatus)},
              "promotionMinQuantity" = ${sqlNumber(originalPromotionMinQty)},
              "promotionPriceUsdt" = ${sqlNumber(originalPromotionPrice)},
              "promotionPv" = ${sqlNumber(originalPromotionPv)}
        where id = ${sqlNumber(productDetailId)};`,
    );

    if (cleanupOrderIds.length > 0) {
      const orderIdList = cleanupOrderIds
        .filter(Boolean)
        .map((value) => Number.parseInt(String(value), 10))
        .filter(Number.isFinite)
        .join(",");

      if (orderIdList) {
        runPsqlQuiet(`delete from "OrderItem" where "orderId" in (${orderIdList});`);
        runPsqlQuiet(`delete from "Order" where id in (${orderIdList});`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
