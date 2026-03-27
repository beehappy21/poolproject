const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();

const SUPPLIER_CODE = "STHDEMO";
const SUPPLIER_NAME = "Stephub Demo Catalog";
const CATEGORY_COUNT = 10;
const PRODUCTS_PER_CATEGORY = 5;
const FORCE = process.argv.includes("--force");

process.stdout.write(
  "Stephub demo catalog restore is permanently disabled.\n",
);
process.exit(0);

const CATEGORY_COLORS = [
  "#E11D48",
  "#EA580C",
  "#CA8A04",
  "#16A34A",
  "#0891B2",
  "#2563EB",
  "#7C3AED",
  "#9333EA",
  "#DB2777",
  "#0F766E",
];

function decimal(value) {
  return value.toFixed(8);
}

function categoryImage(categoryIndex) {
  const color = CATEGORY_COLORS[(categoryIndex - 1) % CATEGORY_COLORS.length].replace("#", "");
  return `https://singlecolorimage.com/get/${color}/900x900`;
}

async function shouldSeedCatalog() {
  if (FORCE) {
    return true;
  }

  const [supplierCount, categoryCount, productCount, detailCount] = await Promise.all([
    prisma.supplier.count({ where: { code: SUPPLIER_CODE } }),
    prisma.productCategory.count(),
    prisma.product.count(),
    prisma.productDetail.count(),
  ]);

  return supplierCount === 0 || categoryCount === 0 || productCount === 0 || detailCount === 0;
}

async function ensureSupplier() {
  const existing = await prisma.supplier.findUnique({
    where: { code: SUPPLIER_CODE },
  });

  if (existing) {
    return existing;
  }

  return prisma.supplier.create({
    data: {
      code: SUPPLIER_CODE,
      name: SUPPLIER_NAME,
      status: "ACTIVE",
    },
  });
}

async function ensureCategory(input) {
  const existing = await prisma.productCategory.findFirst({
    where: {
      supplierId: input.supplierId,
      code: input.code,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.productCategory.create({
    data: {
      supplierId: input.supplierId,
      code: input.code,
      name: input.name,
      imageUrl: input.imageUrl,
      sortOrder: input.sortOrder,
      isFeatured: input.isFeatured,
      status: "ACTIVE",
    },
  });
}

async function ensureProduct(input) {
  const existing = await prisma.product.findUnique({
    where: { code: input.code },
  });

  if (existing) {
    return existing;
  }

  return prisma.product.create({
    data: {
      supplierId: input.supplierId,
      categoryId: input.categoryId,
      code: input.code,
      name: input.name,
      description: input.description,
      sortOrder: input.sortOrder,
      isFeatured: input.isFeatured,
      status: "ACTIVE",
    },
  });
}

async function ensureProductDetail(input) {
  const existing = await prisma.productDetail.findUnique({
    where: { code: input.code },
  });

  if (existing) {
    return existing;
  }

  return prisma.productDetail.create({
    data: {
      productId: input.productId,
      code: input.code,
      name: input.name,
      shortDescription: input.shortDescription,
      description: input.description,
      primaryImageUrl: input.primaryImageUrl,
      imageUrls: input.imageUrls,
      youtubeUrl: input.youtubeUrl,
      costPriceUsdt: input.costPriceUsdt,
      memberPriceUsdt: input.memberPriceUsdt,
      retailPriceUsdt: input.retailPriceUsdt,
      pv: input.pv,
      sortOrder: input.sortOrder,
      isNew: input.isNew,
      isTop: input.isTop,
      isFeatured: input.isFeatured,
      isBestSeller: input.isBestSeller,
      poolRateMode: "DEFAULT_50_PERCENT",
      poolRate: "0",
      poolCapMultiple: "0",
      commissionCapScope: "POOL_ONLY",
      commissionCapMultiple: "0",
      activeDays: 30,
      earningCapAmount: "300",
      status: "ACTIVE",
    },
  });
}

async function ensurePackage(input) {
  const existing = await prisma.package.findUnique({
    where: { code: input.code },
  });

  if (existing) {
    return existing;
  }

  return prisma.package.create({
    data: {
      code: input.code,
      name: input.name,
      costPriceUsdt: input.costPriceUsdt,
      memberPriceUsdt: input.memberPriceUsdt,
      retailPriceUsdt: input.retailPriceUsdt,
      priceUsdt: input.memberPriceUsdt,
      pv: input.pv,
      activeDays: 30,
      earningCapType: "FIXED_AMOUNT",
      earningCapAmount: "300",
      status: "ACTIVE",
    },
  });
}

async function ensurePackageItem(input) {
  const existing = await prisma.packageItem.findFirst({
    where: {
      packageId: input.packageId,
      productDetailId: input.productDetailId,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.packageItem.create({
    data: {
      packageId: input.packageId,
      productDetailId: input.productDetailId,
      qty: 1,
      unitCostPriceUsdt: input.costPriceUsdt,
      unitMemberPriceUsdt: input.memberPriceUsdt,
      unitRetailPriceUsdt: input.retailPriceUsdt,
      unitPv: input.pv,
      unitPoolRate: "0",
      lineCostPriceUsdt: input.costPriceUsdt,
      lineMemberPriceUsdt: input.memberPriceUsdt,
      lineRetailPriceUsdt: input.retailPriceUsdt,
      linePv: input.pv,
    },
  });
}

async function main() {
  const shouldSeed = await shouldSeedCatalog();

  if (!shouldSeed) {
    process.stdout.write(
      "Stephub baseline catalog already present. Skipping demo catalog restore to preserve BAO edits.\n",
    );
    return;
  }

  const supplier = await ensureSupplier();

  let categoryTotal = 0;
  let productTotal = 0;
  let productDetailTotal = 0;
  let packageTotal = 0;

  for (let categoryIndex = 1; categoryIndex <= CATEGORY_COUNT; categoryIndex += 1) {
    const categoryCode = `STHCAT${String(categoryIndex).padStart(2, "0")}`;
    const categoryName = `Stephub Category ${String(categoryIndex).padStart(2, "0")}`;
    const category = await ensureCategory({
      supplierId: supplier.id,
      code: categoryCode,
      name: categoryName,
      imageUrl: categoryImage(categoryIndex),
      sortOrder: categoryIndex,
      isFeatured: categoryIndex <= 5,
    });
    categoryTotal += 1;

    for (let productIndex = 1; productIndex <= PRODUCTS_PER_CATEGORY; productIndex += 1) {
      const sequence = `${String(categoryIndex).padStart(2, "0")}${String(productIndex).padStart(
        2,
        "0",
      )}`;
      const productCode = `STHPROD${sequence}`;
      const detailCode = `STHDET${sequence}`;
      const packageCode = `STHPKG${sequence}`;
      const productName = `${categoryName} Product ${productIndex}`;
      const price = 100 + categoryIndex * 10 + productIndex;
      const cost = Math.round(price * 0.4);
      const retail = price + 25;
      const pv = price;
      const imageUrl = categoryImage(categoryIndex);

      const product = await ensureProduct({
        supplierId: supplier.id,
        categoryId: category.id,
        code: productCode,
        name: productName,
        description: `${productName} สำหรับ storefront Stephub หมวด ${categoryName}`,
        sortOrder: productIndex,
        isFeatured: productIndex === 1,
      });
      productTotal += 1;

      const detail = await ensureProductDetail({
        productId: product.id,
        code: detailCode,
        name: `${productName} Detail`,
        shortDescription: `สินค้าเดโม ${categoryName} ลำดับ ${productIndex}`,
        description: `${productName} ใช้สำหรับทดสอบ storefront, category collection และ product-first order flow`,
        primaryImageUrl: imageUrl,
        imageUrls: [imageUrl],
        youtubeUrl: "https://www.youtube.com/watch?v=WDCvEDaEue4",
        costPriceUsdt: decimal(cost),
        memberPriceUsdt: decimal(price),
        retailPriceUsdt: decimal(retail),
        pv: decimal(pv),
        sortOrder: productIndex,
        isNew: productIndex <= 2,
        isTop: productIndex === 1,
        isFeatured: productIndex === 1,
        isBestSeller: productIndex === 2,
      });
      productDetailTotal += 1;

      const pkg = await ensurePackage({
        code: packageCode,
        name: `${productName} Package`,
        costPriceUsdt: decimal(cost),
        memberPriceUsdt: decimal(price),
        retailPriceUsdt: decimal(retail),
        pv: decimal(pv),
      });
      packageTotal += 1;

      await ensurePackageItem({
        packageId: pkg.id,
        productDetailId: detail.id,
        costPriceUsdt: decimal(cost),
        memberPriceUsdt: decimal(price),
        retailPriceUsdt: decimal(retail),
        pv: decimal(pv),
      });
    }
  }

  process.stdout.write(
    `Restored Stephub baseline catalog: supplier=1 categories=${categoryTotal} products=${productTotal} details=${productDetailTotal} packages=${packageTotal}\n`,
  );
}

main()
  .catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
