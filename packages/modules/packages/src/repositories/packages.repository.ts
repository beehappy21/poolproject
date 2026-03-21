import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";

type PackageDetailItemInput = {
  productDetailId: string;
  qty: number;
};

type ProductDetailRecord = {
  id: bigint;
  productId: bigint;
  code: string;
  name: string;
  youtubeUrl: string | null;
  imageUrls: string[];
  costPriceUsdt: { toString(): string };
  memberPriceUsdt: { toString(): string };
  retailPriceUsdt: { toString(): string };
  pv: { toString(): string };
  poolRate: { toString(): string };
  status: { toLowerCase(): string };
};

function toPackageSummary(pkg: {
  id: bigint;
  code: string;
  name: string;
  costPriceUsdt: { toString(): string };
  memberPriceUsdt: { toString(): string };
  retailPriceUsdt: { toString(): string };
  priceUsdt: { toString(): string };
  pv: { toString(): string };
  poolRate: { toString(): string };
  activeDays: number;
  earningCapAmount: { toString(): string };
  status: { toLowerCase(): string };
  packageItems?: Array<{ id: bigint }>;
}) {
  return {
    packageId: pkg.id.toString(),
    code: pkg.code,
    name: pkg.name,
    costPriceUsdt: pkg.costPriceUsdt.toString(),
    memberPriceUsdt: pkg.memberPriceUsdt.toString(),
    retailPriceUsdt: pkg.retailPriceUsdt.toString(),
    priceUsdt: pkg.priceUsdt.toString(),
    pv: pkg.pv.toString(),
    poolRate: pkg.poolRate.toString(),
    activeDays: pkg.activeDays,
    earningCapAmount: pkg.earningCapAmount.toString(),
    status: pkg.status.toLowerCase(),
    itemCount: pkg.packageItems?.length ?? 0,
  };
}

export interface PackagesRepository {
  createSupplier(input: { code: string; name: string }): Promise<{
    supplierId: string;
    code: string;
    name: string;
    status: string;
  }>;

  listSuppliers(): Promise<
    Array<{
      supplierId: string;
      code: string;
      name: string;
      status: string;
    }>
  >;

  createCategory(input: {
    supplierId: string;
    code: string;
    name: string;
  }): Promise<{
    categoryId: string;
    supplierId: string;
    code: string;
    name: string;
    status: string;
  }>;

  listCategories(): Promise<
    Array<{
      categoryId: string;
      supplierId: string;
      supplierCode: string;
      code: string;
      name: string;
      status: string;
    }>
  >;

  createProduct(input: {
    supplierId: string;
    categoryId: string;
    code: string;
    name: string;
  }): Promise<{
    productId: string;
    supplierId: string;
    categoryId: string;
    code: string;
    name: string;
    status: string;
  }>;

  listProducts(): Promise<
    Array<{
      productId: string;
      supplierId: string;
      supplierCode: string;
      categoryId: string;
      categoryCode: string;
      code: string;
      name: string;
      status: string;
    }>
  >;

  createProductDetail(input: {
    productId: string;
    code: string;
    name: string;
    youtubeUrl?: string;
    imageUrls: string[];
    costPriceUsdt: string;
    memberPriceUsdt: string;
    retailPriceUsdt: string;
    pv: string;
    poolRate: string;
  }): Promise<{
    productDetailId: string;
    productId: string;
    code: string;
    name: string;
    youtubeUrl: string | null;
    imageUrls: string[];
    costPriceUsdt: string;
    memberPriceUsdt: string;
    retailPriceUsdt: string;
    pv: string;
    poolRate: string;
    status: string;
  }>;

  listProductDetails(): Promise<
    Array<{
      productDetailId: string;
      productId: string;
      productCode: string;
      productName: string;
      categoryCode: string;
      supplierCode: string;
      code: string;
      name: string;
      youtubeUrl: string | null;
      imageUrls: string[];
      costPriceUsdt: string;
      memberPriceUsdt: string;
      retailPriceUsdt: string;
      pv: string;
      poolRate: string;
      status: string;
    }>
  >;

  createPackage(input: {
    code: string;
    name: string;
    priceUsdt?: string;
    pv?: string;
    activeDays: number;
    earningCapAmount: string;
    poolRate?: string;
    productDetailItems?: PackageDetailItemInput[];
  }): Promise<{
    packageId: string;
    code: string;
    name: string;
    costPriceUsdt: string;
    memberPriceUsdt: string;
    retailPriceUsdt: string;
    priceUsdt: string;
    pv: string;
    poolRate: string;
    activeDays: number;
    earningCapAmount: string;
    status: string;
    itemCount: number;
  }>;

  listPackages(): Promise<
    Array<{
      packageId: string;
      code: string;
      name: string;
      costPriceUsdt: string;
      memberPriceUsdt: string;
      retailPriceUsdt: string;
      priceUsdt: string;
      pv: string;
      poolRate: string;
      activeDays: number;
      earningCapAmount: string;
      status: string;
      itemCount: number;
    }>
  >;

  updatePackageStatus(
    packageId: string,
    status: "active" | "inactive",
  ): Promise<{
    packageId: string;
    status: string;
  }>;
}

@Injectable()
export class PrismaPackagesRepository implements PackagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSupplier(input: { code: string; name: string }) {
    const supplier = await this.prisma.supplier.create({
      data: {
        code: input.code,
        name: input.name,
        status: "ACTIVE",
      },
    });

    return {
      supplierId: supplier.id.toString(),
      code: supplier.code,
      name: supplier.name,
      status: supplier.status.toLowerCase(),
    };
  }

  async listSuppliers() {
    const suppliers = await this.prisma.supplier.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    return suppliers.map((supplier) => ({
      supplierId: supplier.id.toString(),
      code: supplier.code,
      name: supplier.name,
      status: supplier.status.toLowerCase(),
    }));
  }

  async createCategory(input: { supplierId: string; code: string; name: string }) {
    const category = await this.prisma.productCategory.create({
      data: {
        supplierId: BigInt(input.supplierId),
        code: input.code,
        name: input.name,
        status: "ACTIVE",
      },
    });

    return {
      categoryId: category.id.toString(),
      supplierId: category.supplierId.toString(),
      code: category.code,
      name: category.name,
      status: category.status.toLowerCase(),
    };
  }

  async listCategories() {
    const categories = await this.prisma.productCategory.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        supplier: {
          select: {
            code: true,
          },
        },
      },
    });

    return categories.map((category) => ({
      categoryId: category.id.toString(),
      supplierId: category.supplierId.toString(),
      supplierCode: category.supplier.code,
      code: category.code,
      name: category.name,
      status: category.status.toLowerCase(),
    }));
  }

  async createProduct(input: {
    supplierId: string;
    categoryId: string;
    code: string;
    name: string;
  }) {
    const product = await this.prisma.product.create({
      data: {
        supplierId: BigInt(input.supplierId),
        categoryId: BigInt(input.categoryId),
        code: input.code,
        name: input.name,
        status: "ACTIVE",
      },
    });

    return {
      productId: product.id.toString(),
      supplierId: product.supplierId.toString(),
      categoryId: product.categoryId.toString(),
      code: product.code,
      name: product.name,
      status: product.status.toLowerCase(),
    };
  }

  async listProducts() {
    const products = await this.prisma.product.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        supplier: {
          select: {
            code: true,
          },
        },
        category: {
          select: {
            code: true,
          },
        },
      },
    });

    return products.map((product) => ({
      productId: product.id.toString(),
      supplierId: product.supplierId.toString(),
      supplierCode: product.supplier.code,
      categoryId: product.categoryId.toString(),
      categoryCode: product.category.code,
      code: product.code,
      name: product.name,
      status: product.status.toLowerCase(),
    }));
  }

  async createProductDetail(input: {
    productId: string;
    code: string;
    name: string;
    youtubeUrl?: string;
    imageUrls: string[];
    costPriceUsdt: string;
    memberPriceUsdt: string;
    retailPriceUsdt: string;
    pv: string;
    poolRate: string;
  }) {
    const detail = (await this.prisma.productDetail.create({
      data: {
        productId: BigInt(input.productId),
        code: input.code,
        name: input.name,
        youtubeUrl: input.youtubeUrl,
        imageUrls: input.imageUrls,
        costPriceUsdt: input.costPriceUsdt,
        memberPriceUsdt: input.memberPriceUsdt,
        retailPriceUsdt: input.retailPriceUsdt,
        pv: input.pv,
        poolRate: input.poolRate,
        status: "ACTIVE",
      },
    })) as ProductDetailRecord;

    return {
      productDetailId: detail.id.toString(),
      productId: detail.productId.toString(),
      code: detail.code,
      name: detail.name,
      youtubeUrl: detail.youtubeUrl,
      imageUrls: detail.imageUrls,
      costPriceUsdt: detail.costPriceUsdt.toString(),
      memberPriceUsdt: detail.memberPriceUsdt.toString(),
      retailPriceUsdt: detail.retailPriceUsdt.toString(),
      pv: detail.pv.toString(),
      poolRate: detail.poolRate.toString(),
      status: detail.status.toLowerCase(),
    };
  }

  async listProductDetails() {
    const details = (await this.prisma.productDetail.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        product: {
          select: {
            code: true,
            name: true,
            category: {
              select: {
                code: true,
              },
            },
            supplier: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    })) as Array<
      ProductDetailRecord & {
        product: {
          code: string;
          name: string;
          category: {
            code: string;
          };
          supplier: {
            code: string;
          };
        };
      }
    >;

    return details.map((detail) => ({
      productDetailId: detail.id.toString(),
      productId: detail.productId.toString(),
      productCode: detail.product.code,
      productName: detail.product.name,
      categoryCode: detail.product.category.code,
      supplierCode: detail.product.supplier.code,
      code: detail.code,
      name: detail.name,
      youtubeUrl: detail.youtubeUrl,
      imageUrls: detail.imageUrls,
      costPriceUsdt: detail.costPriceUsdt.toString(),
      memberPriceUsdt: detail.memberPriceUsdt.toString(),
      retailPriceUsdt: detail.retailPriceUsdt.toString(),
      pv: detail.pv.toString(),
      poolRate: detail.poolRate.toString(),
      status: detail.status.toLowerCase(),
    }));
  }

  async createPackage(input: {
    code: string;
    name: string;
    priceUsdt?: string;
    pv?: string;
    activeDays: number;
    earningCapAmount: string;
    poolRate?: string;
    productDetailItems?: PackageDetailItemInput[];
  }) {
    const productDetailItems = input.productDetailItems ?? [];

    if (!productDetailItems.length) {
      const memberPriceUsdt = input.priceUsdt ?? "0";
      const pv = input.pv ?? "0";
      const poolRate = input.poolRate ?? "0";
      const pkg = await this.prisma.package.create({
        data: {
          code: input.code,
          name: input.name,
          costPriceUsdt: "0",
          memberPriceUsdt,
          retailPriceUsdt: memberPriceUsdt,
          priceUsdt: memberPriceUsdt,
          pv,
          poolRate,
          activeDays: input.activeDays,
          earningCapType: "FIXED_AMOUNT",
          earningCapAmount: input.earningCapAmount,
          status: "ACTIVE",
        },
        include: {
          packageItems: true,
        },
      });

      return toPackageSummary(pkg);
    }

    const detailIds = productDetailItems.map((item) => BigInt(item.productDetailId));
    const details = await this.prisma.productDetail.findMany({
      where: {
        id: { in: detailIds },
      },
      select: {
        id: true,
        costPriceUsdt: true,
        memberPriceUsdt: true,
        retailPriceUsdt: true,
        pv: true,
        poolRate: true,
      },
    });

    if (details.length !== productDetailItems.length) {
      throw new Error("Product detail not found.");
    }

    const detailMap = new Map(details.map((detail) => [detail.id.toString(), detail]));
    let costTotal = 0;
    let memberTotal = 0;
    let retailTotal = 0;
    let pvTotal = 0;

    const createItems = productDetailItems.map((item) => {
      const detail = detailMap.get(item.productDetailId);

      if (!detail) {
        throw new Error("Product detail not found.");
      }

      const qty = Number(item.qty);
      const unitCost = Number(detail.costPriceUsdt.toString());
      const unitMember = Number(detail.memberPriceUsdt.toString());
      const unitRetail = Number(detail.retailPriceUsdt.toString());
      const unitPv = Number(detail.pv.toString());

      costTotal += unitCost * qty;
      memberTotal += unitMember * qty;
      retailTotal += unitRetail * qty;
      pvTotal += unitPv * qty;

      return {
        productDetailId: detail.id,
        qty,
        unitCostPriceUsdt: detail.costPriceUsdt,
        unitMemberPriceUsdt: detail.memberPriceUsdt,
        unitRetailPriceUsdt: detail.retailPriceUsdt,
        unitPv: detail.pv,
        unitPoolRate: detail.poolRate,
        lineCostPriceUsdt: `${unitCost * qty}`,
        lineMemberPriceUsdt: `${unitMember * qty}`,
        lineRetailPriceUsdt: `${unitRetail * qty}`,
        linePv: `${unitPv * qty}`,
      };
    });

    const pkg = await this.prisma.package.create({
      data: {
        code: input.code,
        name: input.name,
        costPriceUsdt: `${costTotal}`,
        memberPriceUsdt: `${memberTotal}`,
        retailPriceUsdt: `${retailTotal}`,
        priceUsdt: `${memberTotal}`,
        pv: `${pvTotal}`,
        poolRate: input.poolRate ?? "0",
        activeDays: input.activeDays,
        earningCapType: "FIXED_AMOUNT",
        earningCapAmount: input.earningCapAmount,
        status: "ACTIVE",
        packageItems: {
          create: createItems,
        },
      },
      include: {
        packageItems: true,
      },
    });

    return toPackageSummary(pkg);
  }

  async listPackages() {
    const packages = await this.prisma.package.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        packageItems: {
          select: {
            id: true,
          },
        },
      },
    });

    return packages.map((pkg) => toPackageSummary(pkg));
  }

  async updatePackageStatus(packageId: string, status: "active" | "inactive") {
    const pkg = await this.prisma.package.update({
      where: { id: BigInt(packageId) },
      data: {
        status: status === "active" ? "ACTIVE" : "INACTIVE",
      },
      select: {
        id: true,
        status: true,
      },
    });

    return {
      packageId: pkg.id.toString(),
      status: pkg.status.toLowerCase(),
    };
  }
}
