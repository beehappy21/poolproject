const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();

const DEMO_SUPPLIER_CODE = "STHDEMO";

async function main() {
  const supplier = await prisma.supplier.findUnique({
    where: { code: DEMO_SUPPLIER_CODE },
    select: { id: true, code: true, name: true },
  });

  if (!supplier) {
    process.stdout.write("Stephub demo catalog is already absent. Nothing to remove.\n");
    return;
  }

  const categories = await prisma.productCategory.findMany({
    where: { supplierId: supplier.id },
    select: { id: true, code: true, name: true },
  });
  const categoryIds = categories.map((category) => category.id);

  const products = await prisma.product.findMany({
    where: { supplierId: supplier.id },
    select: { id: true, code: true, name: true },
  });
  const productIds = products.map((product) => product.id);

  const details = await prisma.productDetail.findMany({
    where: { productId: { in: productIds.length > 0 ? productIds : [-1] } },
    select: { id: true, code: true, name: true },
  });
  const detailIds = details.map((detail) => detail.id);

  const packages = await prisma.package.findMany({
    where: { code: { startsWith: "STHPKG" } },
    select: { id: true, code: true, name: true },
  });
  const packageIds = packages.map((pkg) => pkg.id);

  const [orderItemCount, cycleByPackageCount, cycleByDetailCount] = await Promise.all([
    packageIds.length > 0
      ? prisma.orderItem.count({ where: { packageId: { in: packageIds } } })
      : 0,
    packageIds.length > 0
      ? prisma.memberPackageCycle.count({ where: { packageId: { in: packageIds } } })
      : 0,
    detailIds.length > 0
      ? prisma.memberPackageCycle.count({ where: { productDetailId: { in: detailIds } } })
      : 0,
  ]);

  if (orderItemCount > 0 || cycleByPackageCount > 0 || cycleByDetailCount > 0) {
    throw new Error(
      `Refusing to remove Stephub demo catalog because it is referenced: orderItems=${orderItemCount}, memberPackageCyclesByPackage=${cycleByPackageCount}, memberPackageCyclesByDetail=${cycleByDetailCount}`,
    );
  }

  await prisma.$transaction(async (tx) => {
    if (packageIds.length > 0) {
      await tx.packageItem.deleteMany({
        where: { packageId: { in: packageIds } },
      });
      await tx.package.deleteMany({
        where: { id: { in: packageIds } },
      });
    }

    if (detailIds.length > 0) {
      await tx.productDetail.deleteMany({
        where: { id: { in: detailIds } },
      });
    }

    if (productIds.length > 0) {
      await tx.product.deleteMany({
        where: { id: { in: productIds } },
      });
    }

    if (categoryIds.length > 0) {
      await tx.productCategory.deleteMany({
        where: { id: { in: categoryIds } },
      });
    }

    await tx.supplier.delete({
      where: { id: supplier.id },
    });
  });

  const [remainingCategories, remainingProducts, remainingDetails] = await Promise.all([
    prisma.productCategory.count(),
    prisma.product.count(),
    prisma.productDetail.count(),
  ]);

  process.stdout.write(
    `Removed Stephub demo catalog supplier=${supplier.code} categories=${categoryIds.length} products=${productIds.length} details=${detailIds.length} packages=${packageIds.length}. Remaining catalog: categories=${remainingCategories} products=${remainingProducts} details=${remainingDetails}\n`,
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
