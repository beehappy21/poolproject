import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import { readWalletSettings } from "../../../../shared/utils/src/wallet-settings.util";
import {
  floorDecimalString,
  maxDecimalString,
  multiplyDecimalStrings,
  subtractDecimalStrings,
} from "../../../../shared/utils/src/money.util";

type PackageDetailItemInput = {
  productDetailId: string;
  qty: number;
};

type ProductDetailRecord = {
  id: bigint;
  productId: bigint;
  code: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  primaryImageUrl: string | null;
  homeCardImageUrl: string | null;
  youtubeUrl: string | null;
  imageUrls: string[];
  ratingAvg: { toString(): string };
  ratingCount: number;
  sortOrder: number;
  isNew: boolean;
  isTop: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  costPriceUsdt: { toString(): string };
  memberPriceUsdt: { toString(): string };
  retailPriceUsdt: { toString(): string };
  pv: { toString(): string };
  poolRateMode: { toString(): string };
  poolRate: { toString(): string };
  poolCapMultiple: { toString(): string };
  commissionCapScope: { toString(): string };
  commissionCapMultiple: { toString(): string };
  firmEnabled: boolean;
  firmOverrideCostGuard: boolean;
  firmDcwRewardAmount: { toString(): string };
  firmRedeemStockLimit: number | null;
  stockQuantity: number | null;
  status: { toLowerCase(): string };
};

function computeDefaultDcwUsageAmount(input: {
  costPriceUsdt: string;
  memberPriceUsdt: string;
}) {
  return floorDecimalString(
    maxDecimalString(
      subtractDecimalStrings(
        input.memberPriceUsdt,
        multiplyDecimalStrings(input.costPriceUsdt, "0.7"),
      ),
      "0",
    ),
  );
}

function normalizeDcwWholeAmount(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return floorDecimalString(maxDecimalString(value, "0"));
}

function computeFirmCostGuardPassed(input: {
  costPriceUsdt: string;
  memberPriceUsdt: string;
}) {
  return (
    Number(input.costPriceUsdt || "0") <= Number(input.memberPriceUsdt || "0") * 0.3
  );
}

function computeFirmRedemptionEligible(input: {
  categoryCode?: string | null;
  firmEnabled: boolean;
  firmOverrideCostGuard?: boolean;
  costPriceUsdt: string;
  memberPriceUsdt: string;
}) {
  if (!readWalletSettings().firmEnabled) {
    return false;
  }

  const categoryCode = String(input.categoryCode || "").trim().toLowerCase();
  const isFirmCategory = categoryCode === "firm";

  return (
    input.firmEnabled &&
    (
      isFirmCategory ||
      input.firmOverrideCostGuard === true ||
      computeFirmCostGuardPassed({
        costPriceUsdt: input.costPriceUsdt,
        memberPriceUsdt: input.memberPriceUsdt,
      })
    )
  );
}

function toReviewSummary(review: {
  id: bigint;
  rating: number;
  comment: string | null;
  createdAt: Date;
  user: {
    name: string;
    memberCode: string;
  };
}) {
  const displayDate = review.createdAt.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return {
    id: Number(review.id),
    name: review.user.name || review.user.memberCode,
    rating: review.rating,
    comment: review.comment ?? undefined,
    createdAt: review.createdAt.toISOString(),
    date: displayDate,
    photo: undefined,
  };
}

function toPackageSummary(pkg: {
  id: bigint;
  code: string;
  name: string;
  costPriceUsdt: { toString(): string };
  memberPriceUsdt: { toString(): string };
  retailPriceUsdt: { toString(): string };
  priceUsdt: { toString(): string };
  pv: { toString(): string };
  poolRateMode: { toString(): string };
  poolRate: { toString(): string };
  poolCapMultiple: { toString(): string };
  commissionCapScope: { toString(): string };
  commissionCapMultiple: { toString(): string };
  dcwSpendEnabled: boolean;
  dcwUsageAmount: { toString(): string };
  dcwUsageAmountOverridden: boolean;
  dcwCashRewardRate: { toString(): string };
  dcwShoppingRewardRate: { toString(): string };
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
    poolRateMode: pkg.poolRateMode.toString(),
    poolRate: pkg.poolRate.toString(),
    poolCapMultiple: pkg.poolCapMultiple.toString(),
    commissionCapScope: pkg.commissionCapScope.toString(),
    commissionCapMultiple: pkg.commissionCapMultiple.toString(),
    dcwSpendEnabled: pkg.dcwSpendEnabled,
    dcwUsageAmount: pkg.dcwUsageAmount.toString(),
    dcwUsageAmountOverridden: pkg.dcwUsageAmountOverridden,
    dcwDefaultUsageAmount: computeDefaultDcwUsageAmount({
      costPriceUsdt: pkg.costPriceUsdt.toString(),
      memberPriceUsdt: pkg.memberPriceUsdt.toString(),
    }),
    dcwRewardRate:
      pkg.dcwCashRewardRate.toString() !== "0"
        ? pkg.dcwCashRewardRate.toString()
        : pkg.dcwShoppingRewardRate.toString(),
    dcwCashRewardRate: pkg.dcwCashRewardRate.toString(),
    dcwShoppingRewardRate: pkg.dcwShoppingRewardRate.toString(),
    dcwConfigWarning: pkg.dcwUsageAmountOverridden
      ? "Custom DCW usage amount overrides the automatic default derived from member price - (cost x 70%)."
      : null,
    activeDays: pkg.activeDays,
    earningCapAmount: pkg.earningCapAmount.toString(),
    status: pkg.status.toLowerCase(),
    itemCount: pkg.packageItems?.length ?? 0,
  };
}

export interface PackagesRepository {
  listProductReviews(productDetailId: string): Promise<
    Array<{
      id: number;
      name: string;
      rating: number;
      comment?: string;
      createdAt?: string;
      date?: string;
      photo?: string;
    }>
  >;

  upsertProductReview(input: {
    productDetailId: string;
    userId: string;
    rating: number;
    comment?: string;
  }): Promise<{
    review: {
      id: number;
      name: string;
      rating: number;
      comment?: string;
      createdAt?: string;
      date?: string;
      photo?: string;
    };
    ratingAvg: string;
    ratingCount: number;
  }>;

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
    poolEnabled: boolean;
    poolCapMultiple: string;
    commissionCapScope: "pool_only" | "all_commissions";
    commissionCapMultiple: string;
    firmEnabled: boolean;
    firmOverrideCostGuard?: boolean;
    firmDcwRewardAmount: string;
    firmRedeemStockLimit?: number | null;
    stockQuantity?: number | null;
    activeDays?: number;
    earningCapAmount?: string;
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
    poolRateMode: string;
    poolRate: string;
    poolCapMultiple: string;
    commissionCapScope: string;
    commissionCapMultiple: string;
    firmEnabled: boolean;
    firmOverrideCostGuard: boolean;
    firmDcwRewardAmount: string;
    firmRedeemStockLimit: number | null;
    stockQuantity: number | null;
    firmCostGuardPassed: boolean;
    firmRedemptionEligible: boolean;
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
      poolRateMode: string;
      poolRate: string;
      poolCapMultiple: string;
      commissionCapScope: string;
      commissionCapMultiple: string;
      firmEnabled: boolean;
      firmOverrideCostGuard: boolean;
      firmDcwRewardAmount: string;
      firmRedeemStockLimit: number | null;
      stockQuantity: number | null;
      firmCostGuardPassed: boolean;
      firmRedemptionEligible: boolean;
      status: string;
    }>
  >;

  listStorefrontProducts(): Promise<
    Array<{
      productDetailId: string;
      packageId?: string;
      packageCode?: string;
      productId: string;
      productCode: string;
      productName: string;
      categoryCode: string;
      categoryName: string;
      firmEnabled: boolean;
      firmOverrideCostGuard: boolean;
      firmDcwRewardAmount: string;
      firmRedeemStockLimit: number | null;
      stockQuantity: number | null;
      firmCostGuardPassed: boolean;
      firmRedemptionEligible: boolean;
      supplierCode: string;
      supplierName: string;
      code: string;
      name: string;
      shortDescription: string | null;
      description: string | null;
      primaryImageUrl: string | null;
      homeCardImageUrl: string | null;
      youtubeUrl: string | null;
      imageUrls: string[];
      memberPriceUsdt: string;
      retailPriceUsdt: string;
      pv: string;
      ratingAvg: string;
      ratingCount: number;
      isNew: boolean;
      isTop: boolean;
      isFeatured: boolean;
      isBestSeller: boolean;
      salesChannelMode: string;
      status: string;
    }>
  >;

  createPackage(input: {
    code: string;
    name: string;
    priceUsdt?: string;
    pv?: string;
    costPriceUsdt?: string;
    memberPriceUsdt?: string;
    activeDays: number;
    earningCapAmount: string;
    poolEnabled?: boolean;
    poolCapMultiple?: string;
    commissionCapScope?: "pool_only" | "all_commissions";
    commissionCapMultiple?: string;
    dcwSpendEnabled?: boolean;
    dcwUsageAmount?: string;
    dcwCashRewardRate?: string;
    dcwShoppingRewardRate?: string;
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
    poolRateMode: string;
    poolRate: string;
    poolCapMultiple: string;
    commissionCapScope: string;
    commissionCapMultiple: string;
    dcwSpendEnabled: boolean;
    dcwUsageAmount: string;
    dcwUsageAmountOverridden: boolean;
    dcwDefaultUsageAmount: string;
    dcwCashRewardRate: string;
    dcwShoppingRewardRate: string;
    dcwConfigWarning: string | null;
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
      poolRateMode: string;
      poolRate: string;
      poolCapMultiple: string;
      commissionCapScope: string;
      commissionCapMultiple: string;
      dcwSpendEnabled: boolean;
      dcwUsageAmount: string;
      dcwUsageAmountOverridden: boolean;
      dcwDefaultUsageAmount: string;
      dcwCashRewardRate: string;
      dcwShoppingRewardRate: string;
      dcwConfigWarning: string | null;
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

  async listProductReviews(productDetailId: string) {
    const productReview = (this.prisma as any).productReview;
    const reviews = await productReview.findMany({
      where: {
        productDetailId: BigInt(productDetailId),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      include: {
        user: {
          select: {
            name: true,
            memberCode: true,
          },
        },
      },
    });

    return reviews.map((review: {
      id: bigint;
      rating: number;
      comment: string | null;
      createdAt: Date;
      user: {
        name: string;
        memberCode: string;
      };
    }) => toReviewSummary(review));
  }

  async upsertProductReview(input: {
    productDetailId: string;
    userId: string;
    rating: number;
    comment?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const productReview = (tx as any).productReview;
      const existingProductDetail = await tx.productDetail.findUnique({
        where: {
          id: BigInt(input.productDetailId),
        },
        select: {
          id: true,
        },
      });

      if (!existingProductDetail) {
        throw new Error("Product detail not found.");
      }

      const review = await productReview.upsert({
        where: {
          productDetailId_userId: {
            productDetailId: BigInt(input.productDetailId),
            userId: BigInt(input.userId),
          },
        },
        update: {
          rating: input.rating,
          comment: input.comment ?? null,
        },
        create: {
          productDetailId: BigInt(input.productDetailId),
          userId: BigInt(input.userId),
          rating: input.rating,
          comment: input.comment ?? null,
        },
        include: {
          user: {
            select: {
              name: true,
              memberCode: true,
            },
          },
        },
      });

      const aggregate = await productReview.aggregate({
        where: {
          productDetailId: BigInt(input.productDetailId),
        },
        _avg: {
          rating: true,
        },
        _count: {
          id: true,
        },
      });

      const normalizedAverage = Number(aggregate._avg.rating || 0).toFixed(2);
      const normalizedCount = aggregate._count.id || 0;

      await tx.productDetail.update({
        where: {
          id: BigInt(input.productDetailId),
        },
        data: {
          ratingAvg: normalizedAverage,
          ratingCount: normalizedCount,
        },
      });

      return {
        review: toReviewSummary(review),
        ratingAvg: normalizedAverage,
        ratingCount: normalizedCount,
      };
    });
  }

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
    poolEnabled: boolean;
    poolCapMultiple: string;
    commissionCapScope: "pool_only" | "all_commissions";
    commissionCapMultiple: string;
    activeDays?: number;
    earningCapAmount?: string;
    firmEnabled: boolean;
    firmOverrideCostGuard?: boolean;
    firmDcwRewardAmount: string;
    firmRedeemStockLimit?: number | null;
    stockQuantity?: number | null;
  }) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(input.productId) },
      select: {
        id: true,
        category: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!product) {
      throw new Error("Product not found.");
    }

    const firmCostGuardPassed = computeFirmCostGuardPassed({
      costPriceUsdt: input.costPriceUsdt,
      memberPriceUsdt: input.memberPriceUsdt,
    });

    const isFirmCategory = String(product.category.code).trim().toLowerCase() === "firm";

    if (
      input.firmEnabled &&
      !isFirmCategory &&
      !input.firmOverrideCostGuard &&
      !firmCostGuardPassed
    ) {
      throw new Error(
        "Firm-enabled product detail must pass the 30% cost guard against member price.",
      );
    }

    const detail = (await this.prisma.productDetail.create({
      data: {
        productId: product.id,
        code: input.code,
        name: input.name,
        youtubeUrl: input.youtubeUrl,
        imageUrls: input.imageUrls,
        costPriceUsdt: input.costPriceUsdt,
        memberPriceUsdt: input.memberPriceUsdt,
        retailPriceUsdt: input.retailPriceUsdt,
        pv: input.pv,
        poolRateMode: input.poolEnabled ? "DEFAULT_50_PERCENT" : "DISABLED",
        poolRate: "1",
        poolCapMultiple: input.poolCapMultiple,
        commissionCapScope:
          input.commissionCapScope === "all_commissions"
            ? "ALL_COMMISSIONS"
            : "POOL_ONLY",
        commissionCapMultiple: input.commissionCapMultiple,
        activeDays: input.activeDays ?? 30,
        earningCapAmount: input.earningCapAmount ?? input.memberPriceUsdt,
        firmEnabled: input.firmEnabled,
        firmOverrideCostGuard: input.firmOverrideCostGuard ?? false,
        firmDcwRewardAmount: input.firmDcwRewardAmount,
        firmRedeemStockLimit: input.firmRedeemStockLimit ?? null,
        stockQuantity: input.stockQuantity ?? null,
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
      poolRateMode: detail.poolRateMode.toString().toLowerCase(),
      poolRate: detail.poolRate.toString(),
      poolCapMultiple: detail.poolCapMultiple.toString(),
      commissionCapScope: detail.commissionCapScope.toString().toLowerCase(),
      commissionCapMultiple: detail.commissionCapMultiple.toString(),
      firmEnabled: detail.firmEnabled,
      firmOverrideCostGuard: detail.firmOverrideCostGuard,
      firmDcwRewardAmount: detail.firmDcwRewardAmount.toString(),
      firmRedeemStockLimit: detail.firmRedeemStockLimit,
      stockQuantity: detail.stockQuantity,
      firmCostGuardPassed,
      firmRedemptionEligible: computeFirmRedemptionEligible({
        categoryCode: product.category.code,
        firmEnabled: detail.firmEnabled,
        firmOverrideCostGuard: detail.firmOverrideCostGuard,
        costPriceUsdt: detail.costPriceUsdt.toString(),
        memberPriceUsdt: detail.memberPriceUsdt.toString(),
      }),
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
      poolRateMode: detail.poolRateMode.toString().toLowerCase(),
      poolRate: detail.poolRate.toString(),
      poolCapMultiple: detail.poolCapMultiple.toString(),
      commissionCapScope: detail.commissionCapScope.toString().toLowerCase(),
      commissionCapMultiple: detail.commissionCapMultiple.toString(),
      firmEnabled: detail.firmEnabled,
      firmOverrideCostGuard: detail.firmOverrideCostGuard,
      firmDcwRewardAmount: detail.firmDcwRewardAmount.toString(),
      firmRedeemStockLimit: detail.firmRedeemStockLimit,
      stockQuantity: detail.stockQuantity,
      firmCostGuardPassed: computeFirmCostGuardPassed({
        costPriceUsdt: detail.costPriceUsdt.toString(),
        memberPriceUsdt: detail.memberPriceUsdt.toString(),
      }),
      firmRedemptionEligible: computeFirmRedemptionEligible({
        categoryCode: detail.product.category.code,
        firmEnabled: detail.firmEnabled,
        firmOverrideCostGuard: detail.firmOverrideCostGuard,
        costPriceUsdt: detail.costPriceUsdt.toString(),
        memberPriceUsdt: detail.memberPriceUsdt.toString(),
      }),
      status: detail.status.toLowerCase(),
    }));
  }

  async listStorefrontProducts() {
    const storefrontModeRows = await this.prisma.$queryRaw<Array<{
      id: bigint;
      salesChannelMode: string | null;
    }>>`
      SELECT "id", "salesChannelMode"
      FROM "ProductDetail"
      WHERE "status" = 'ACTIVE'
        AND COALESCE(NULLIF(TRIM("salesChannelMode"), ''), 'WAP_CATALOG') IN ('WAP_CATALOG', 'CATALOG_ONLY')
        AND UPPER(COALESCE("code", '')) NOT LIKE 'COMMTEST%'
    `;

    const storefrontModeById = new Map(
      storefrontModeRows.map((row) => [
        row.id.toString(),
        String(row.salesChannelMode || "WAP_CATALOG").trim().toUpperCase(),
      ]),
    );
    const storefrontIds = storefrontModeRows.map((row) => row.id);

    if (storefrontIds.length === 0) {
      return [];
    }

    const details = await this.prisma.productDetail.findMany({
      where: {
        id: {
          in: storefrontIds,
        },
        status: "ACTIVE",
        product: {
          status: "ACTIVE",
          category: {
            status: "ACTIVE",
            code: {
              not: "FIRM",
            },
          },
          supplier: { status: "ACTIVE" },
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { isTop: "desc" },
        { sortOrder: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
      include: {
        product: {
          select: {
            code: true,
            name: true,
            category: {
              select: {
                code: true,
                name: true,
              },
            },
            supplier: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        packageItems: {
          where: {
            package: {
              status: "ACTIVE",
            },
          },
          orderBy: [
            { package: { createdAt: "asc" } },
            { package: { id: "asc" } },
          ],
          select: {
            package: {
              select: {
                id: true,
                code: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    return details.map((detail) => {
        const storefrontPackage = detail.packageItems[0]?.package;

        return {
        productDetailId: detail.id.toString(),
        packageId: storefrontPackage?.id?.toString(),
        packageCode: storefrontPackage?.code,
        productId: detail.productId.toString(),
        productCode: detail.product.code,
        productName: detail.product.name,
        categoryCode: detail.product.category.code,
        categoryName: detail.product.category.name,
        firmEnabled: detail.firmEnabled,
        firmOverrideCostGuard: detail.firmOverrideCostGuard,
        firmDcwRewardAmount: detail.firmDcwRewardAmount.toString(),
        firmRedeemStockLimit: detail.firmRedeemStockLimit,
        stockQuantity: detail.stockQuantity,
        firmCostGuardPassed: computeFirmCostGuardPassed({
          costPriceUsdt: detail.costPriceUsdt.toString(),
          memberPriceUsdt: detail.memberPriceUsdt.toString(),
        }),
        firmRedemptionEligible: computeFirmRedemptionEligible({
          categoryCode: detail.product.category.code,
          firmEnabled: detail.firmEnabled,
          firmOverrideCostGuard: detail.firmOverrideCostGuard,
          costPriceUsdt: detail.costPriceUsdt.toString(),
          memberPriceUsdt: detail.memberPriceUsdt.toString(),
        }),
        supplierCode: detail.product.supplier.code,
        supplierName: detail.product.supplier.name,
        code: detail.code,
        name: detail.name,
        shortDescription: detail.shortDescription,
        description: detail.description,
        primaryImageUrl: detail.primaryImageUrl,
        homeCardImageUrl: detail.homeCardImageUrl,
        youtubeUrl: detail.youtubeUrl,
        imageUrls: [
          detail.primaryImageUrl,
          ...detail.imageUrls,
        ].filter((value, index, array): value is string => {
          return Boolean(value) && array.indexOf(value) === index;
        }),
        memberPriceUsdt: detail.memberPriceUsdt.toString(),
        retailPriceUsdt: detail.retailPriceUsdt.toString(),
        pv: detail.pv.toString(),
        dcwSpendEnabled: detail.dcwSpendEnabled,
        dcwUsageAmount: detail.dcwUsageAmount.toString(),
        dcwRewardRate:
          detail.dcwCashRewardRate.toString() !== "0"
            ? detail.dcwCashRewardRate.toString()
            : detail.dcwShoppingRewardRate.toString(),
        dcwCashRewardRate: detail.dcwCashRewardRate.toString(),
        dcwShoppingRewardRate: detail.dcwShoppingRewardRate.toString(),
        ratingAvg: detail.ratingAvg.toString(),
        ratingCount: detail.ratingCount,
        isNew: detail.isNew,
        isTop: detail.isTop,
        isFeatured: detail.isFeatured,
        isBestSeller: detail.isBestSeller,
        salesChannelMode:
          storefrontModeById.get(detail.id.toString()) || "WAP_CATALOG",
        status: detail.status.toLowerCase(),
      }});
  }

  async createPackage(input: {
    code: string;
    name: string;
    priceUsdt?: string;
    pv?: string;
    costPriceUsdt?: string;
    memberPriceUsdt?: string;
    activeDays: number;
    earningCapAmount: string;
    poolEnabled?: boolean;
    poolCapMultiple?: string;
    commissionCapScope?: "pool_only" | "all_commissions";
    commissionCapMultiple?: string;
    dcwSpendEnabled?: boolean;
    dcwUsageAmount?: string;
    dcwCashRewardRate?: string;
    dcwShoppingRewardRate?: string;
    productDetailItems?: PackageDetailItemInput[];
  }) {
    const productDetailItems = input.productDetailItems ?? [];
    const unifiedDcwRewardRate =
      input.dcwCashRewardRate ?? input.dcwShoppingRewardRate ?? "0";

    if (!productDetailItems.length) {
      const memberPriceUsdt = input.memberPriceUsdt ?? input.priceUsdt ?? "0";
      const costPriceUsdt = input.costPriceUsdt ?? "0";
      const pv = input.pv ?? "0";
      const poolEnabled = input.poolEnabled !== false;
      const defaultDcwUsageAmount = computeDefaultDcwUsageAmount({
        costPriceUsdt,
        memberPriceUsdt,
      });
      const normalizedDcwUsageAmount =
        normalizeDcwWholeAmount(input.dcwUsageAmount) ?? defaultDcwUsageAmount;
      const pkg = await this.prisma.package.create({
        data: {
          code: input.code,
          name: input.name,
          costPriceUsdt,
          memberPriceUsdt,
          retailPriceUsdt: memberPriceUsdt,
          priceUsdt: memberPriceUsdt,
          pv,
          poolRateMode: poolEnabled ? "DEFAULT_50_PERCENT" : "DISABLED",
          poolRate: "1",
          poolCapMultiple: input.poolCapMultiple ?? "0",
          commissionCapScope:
            input.commissionCapScope === "all_commissions"
              ? "ALL_COMMISSIONS"
              : "POOL_ONLY",
          commissionCapMultiple: input.commissionCapMultiple ?? "0",
          dcwSpendEnabled: input.dcwSpendEnabled === true,
          dcwUsageAmount: normalizedDcwUsageAmount,
          dcwUsageAmountOverridden: Boolean(input.dcwUsageAmount),
          dcwCashRewardRate: unifiedDcwRewardRate,
          dcwShoppingRewardRate: unifiedDcwRewardRate,
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

    const defaultDcwUsageAmount = computeDefaultDcwUsageAmount({
      costPriceUsdt: `${costTotal}`,
      memberPriceUsdt: `${memberTotal}`,
    });
    const normalizedDcwUsageAmount =
      normalizeDcwWholeAmount(input.dcwUsageAmount) ?? defaultDcwUsageAmount;

    const pkg = await this.prisma.package.create({
      data: {
        code: input.code,
        name: input.name,
        costPriceUsdt: `${costTotal}`,
        memberPriceUsdt: `${memberTotal}`,
        retailPriceUsdt: `${retailTotal}`,
        priceUsdt: `${memberTotal}`,
        pv: `${pvTotal}`,
        poolRateMode: input.poolEnabled === false ? "DISABLED" : "DEFAULT_50_PERCENT",
        poolRate: "1",
        poolCapMultiple: input.poolCapMultiple ?? "0",
        commissionCapScope:
          input.commissionCapScope === "all_commissions"
            ? "ALL_COMMISSIONS"
            : "POOL_ONLY",
        commissionCapMultiple: input.commissionCapMultiple ?? "0",
        dcwSpendEnabled: input.dcwSpendEnabled === true,
        dcwUsageAmount: normalizedDcwUsageAmount,
        dcwUsageAmountOverridden: Boolean(input.dcwUsageAmount),
        dcwCashRewardRate: unifiedDcwRewardRate,
        dcwShoppingRewardRate: unifiedDcwRewardRate,
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
          orderBy: [
            { productDetail: { sortOrder: "asc" } },
            { productDetail: { createdAt: "asc" } },
            { id: "asc" },
          ],
          select: {
            id: true,
            qty: true,
            unitMemberPriceUsdt: true,
            unitRetailPriceUsdt: true,
            unitPv: true,
            lineMemberPriceUsdt: true,
            lineRetailPriceUsdt: true,
            linePv: true,
            productDetail: {
              select: {
                id: true,
                code: true,
                name: true,
                shortDescription: true,
        description: true,
        primaryImageUrl: true,
        homeCardImageUrl: true,
        youtubeUrl: true,
        imageUrls: true,
                ratingAvg: true,
                ratingCount: true,
                sortOrder: true,
                isNew: true,
                isTop: true,
                isFeatured: true,
                isBestSeller: true,
                product: {
                  select: {
                    code: true,
                    name: true,
                    supplier: {
                      select: {
                        code: true,
                        name: true,
                        imageUrl: true,
                      },
                    },
                    category: {
                      select: {
                        code: true,
                        name: true,
                        imageUrl: true,
                        audienceTags: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return packages.map((pkg) => {
      const packageItems = pkg.packageItems.map((item) => {
        const detail = item.productDetail;
        const images = [
          detail.primaryImageUrl,
          ...detail.imageUrls,
        ].filter((value, index, array): value is string => {
          return Boolean(value) && array.indexOf(value) === index;
        });

        return {
          packageItemId: item.id.toString(),
          qty: item.qty,
          unitMemberPriceUsdt: item.unitMemberPriceUsdt.toString(),
          unitRetailPriceUsdt: item.unitRetailPriceUsdt.toString(),
          unitPv: item.unitPv.toString(),
          lineMemberPriceUsdt: item.lineMemberPriceUsdt.toString(),
          lineRetailPriceUsdt: item.lineRetailPriceUsdt.toString(),
          linePv: item.linePv.toString(),
          productDetailId: detail.id.toString(),
          productDetailCode: detail.code,
          productDetailName: detail.name,
          shortDescription: detail.shortDescription,
          description: detail.description,
          primaryImageUrl: detail.primaryImageUrl,
          youtubeUrl: detail.youtubeUrl,
          imageUrls: images,
          ratingAvg: detail.ratingAvg.toString(),
          ratingCount: detail.ratingCount,
          sortOrder: detail.sortOrder,
          isNew: detail.isNew,
          isTop: detail.isTop,
          isFeatured: detail.isFeatured,
          isBestSeller: detail.isBestSeller,
          productCode: detail.product.code,
          productName: detail.product.name,
          supplierCode: detail.product.supplier.code,
          supplierName: detail.product.supplier.name,
          categoryCode: detail.product.category.code,
          categoryName: detail.product.category.name,
          audienceTags: detail.product.category.audienceTags,
        };
      });

      const leadItem = packageItems[0] ?? null;
      const imageUrls = leadItem?.imageUrls ?? [];
      const audienceTags = Array.from(
        new Set(packageItems.flatMap((item) => item.audienceTags ?? [])),
      );
      const isFeatured = packageItems.some((item) => item.isFeatured);
      const isNew = packageItems.some((item) => item.isNew);
      const isTop = packageItems.some((item) => item.isTop || item.isBestSeller);
      const ratingValues = packageItems
        .map((item) => Number(item.ratingAvg))
        .filter((value) => Number.isFinite(value) && value > 0);
      const ratingCount = packageItems.reduce(
        (sum, item) => sum + Number(item.ratingCount || 0),
        0,
      );
      const ratingAvg =
        ratingValues.length > 0
          ? (ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length).toFixed(2)
          : "0";

      return {
        ...toPackageSummary(pkg),
        supplierCode: leadItem?.supplierCode ?? null,
        supplierName: leadItem?.supplierName ?? null,
        categoryCode: leadItem?.categoryCode ?? null,
        categoryName: leadItem?.categoryName ?? null,
        primaryImageUrl: leadItem?.primaryImageUrl ?? imageUrls[0] ?? null,
        youtubeUrl: leadItem?.youtubeUrl ?? null,
        imageUrls,
        shortDescription: leadItem?.shortDescription ?? null,
        description:
          leadItem?.description ??
          (packageItems.length
            ? `Includes ${packageItems
                .map((item) => `${item.productDetailName} x${item.qty}`)
                .join(", ")}.`
            : null),
        audienceTags,
        ratingAvg,
        ratingCount,
        isFeatured,
        isNew,
        isTop,
        packageItems,
      };
    });
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
