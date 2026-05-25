const { execFileSync } = require("node:child_process");
const { resolve } = require("node:path");

const BACKEND_SQLITE_PATH = resolve(
  process.cwd(),
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/database/database.sqlite",
);

const PROMOTION_CODE =
  process.env.BAO_PROMOTION_CODE || "PROMO-100PV-2PLUS-500-100PV";
const PROMOTION_NAME =
  process.env.BAO_PROMOTION_NAME || "ซื้อ 2 ชิ้นขึ้นไป 500 บาท / 100 PV";
const PROMOTION_DESCRIPTION =
  process.env.BAO_PROMOTION_DESCRIPTION ||
  "ใช้กับสินค้า 100 PV ปัจจุบัน เมื่อซื้อครบ 2 ชิ้นขึ้นไป คิดชิ้นละ 500 บาท และ 100 PV";
const PROMOTION_MIN_QTY = Number(
  process.env.BAO_PROMOTION_MIN_QTY || "2",
);
const PROMOTION_PRICE = Number(
  process.env.BAO_PROMOTION_PRICE || "500",
);
const PROMOTION_PV = Number(process.env.BAO_PROMOTION_PV || "100");
const PRODUCT_DETAIL_CODE =
  process.env.BAO_PROMOTION_PRIMARY_PRODUCT_CODE || "DRI001";

function run(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
  }).trim();
}

function runPsql(query) {
  return run("docker", [
    "exec",
    "poolproject-postgres",
    "psql",
    "-U",
    "postgres",
    "-d",
    "poolproject",
    "-Atqc",
    query,
  ]);
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
    { stdio: "ignore" },
  );
}

function runSqlite(query) {
  return run("sqlite3", [BACKEND_SQLITE_PATH, query]);
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function ensurePromotion() {
  return runSqlite(
    [
      "insert into promotions (code, name, description, min_quantity, promo_price, promo_pv, status, created_at, updated_at)",
      `values (${sqlString(PROMOTION_CODE)}, ${sqlString(PROMOTION_NAME)}, ${sqlString(PROMOTION_DESCRIPTION)}, ${PROMOTION_MIN_QTY}, ${PROMOTION_PRICE}, ${PROMOTION_PV}, 'ACTIVE', datetime('now'), datetime('now'))`,
      "on conflict(code) do update set",
      "name = excluded.name,",
      "description = excluded.description,",
      "min_quantity = excluded.min_quantity,",
      "promo_price = excluded.promo_price,",
      "promo_pv = excluded.promo_pv,",
      "status = excluded.status,",
      "updated_at = datetime('now');",
      `select id, code, name, min_quantity, promo_price, promo_pv, status from promotions where code = ${sqlString(PROMOTION_CODE)} limit 1;`,
    ].join(" "),
  );
}

function listTargetProducts() {
  const rows = runPsql(
    `select id, code, name, pv::text, "memberPriceUsdt"::text
       from "ProductDetail"
      where status = 'ACTIVE'
        and coalesce("salesChannelMode", 'WAP_CATALOG') in ('WAP_CATALOG', 'CATALOG_ONLY')
        and pv = 100
        and upper(coalesce(code, '')) not like 'COMMTEST%'
      order by id;`,
  );

  if (!rows) {
    return [];
  }

  return rows.split("\n").filter(Boolean).map((line) => {
    const [id, code, name, pv, memberPriceUsdt] = line.split("|");
    return { id, code, name, pv, memberPriceUsdt };
  });
}

function applyPromotionSnapshot(promotionId, products) {
  if (products.length === 0) {
    throw new Error("No active non-test 100 PV products found.");
  }

  const ids = products.map((product) => product.id).join(", ");
  runPsqlQuiet(
    `update "ProductDetail"
        set "promotionId" = ${promotionId},
            "promotionName" = ${sqlString(PROMOTION_NAME)},
            "promotionStatus" = 'ACTIVE',
            "promotionMinQuantity" = ${PROMOTION_MIN_QTY},
            "promotionPriceUsdt" = ${PROMOTION_PRICE},
            "promotionPv" = ${PROMOTION_PV}
      where id in (${ids});`,
  );
}

function main() {
  const promotionRow = ensurePromotion();

  if (!promotionRow) {
    throw new Error("Promotion record was not created.");
  }

  const [
    promotionId,
    promotionCode,
    promotionName,
    minQuantity,
    promoPrice,
    promoPv,
    promotionStatus,
  ] = promotionRow.split("|");
  const targetProducts = listTargetProducts();
  applyPromotionSnapshot(promotionId, targetProducts);

  const primaryProduct =
    targetProducts.find((product) => product.code === PRODUCT_DETAIL_CODE) ??
    targetProducts[0];

  console.log(
    JSON.stringify(
      {
        ok: true,
        promotion: {
          id: promotionId,
          code: promotionCode,
          name: promotionName,
          minQuantity: Number(minQuantity),
          promoPrice: Number(promoPrice),
          promoPv: Number(promoPv),
          status: promotionStatus,
        },
        targetProducts,
        primaryProduct,
        baoEditUrl: `http://127.0.0.1:8001/admin/product/edit/${primaryProduct.id}`,
      },
      null,
      2,
    ),
  );
}

main();
