import { BadRequestException, Body, Controller, Get, Param, Post } from "@nestjs/common";

import {
  optionalString,
  optionalUrlString,
  optionalUrlStringArray,
  requireDecimalRateString,
  requireDecimalString,
  requireNonEmptyString,
  requirePositiveInteger,
  requirePositiveIntegerString,
  rethrowHttpError,
} from "../../../../../apps/api/src/http/request.util";
import { readWalletSettings } from "../../../../shared/utils/src/wallet-settings.util";
import { PackagesService } from "../services/packages.service";

function normalizePoolEnabledInput(input: {
  poolEnabled?: boolean | string;
  poolRateMode?: string;
}) {
  if (input.poolEnabled === true || input.poolEnabled === "true" || input.poolEnabled === "1") {
    return true;
  }

  if (
    input.poolEnabled === false ||
    input.poolEnabled === "false" ||
    input.poolEnabled === "0"
  ) {
    return false;
  }

  const normalizedMode = optionalString(input.poolRateMode)?.toLowerCase();
  if (!normalizedMode || normalizedMode === "enabled") {
    return true;
  }

  if (normalizedMode === "disabled") {
    return false;
  }

  throw new BadRequestException(
    "poolEnabled must be true/false, or poolRateMode must be enabled/disabled.",
  );
}

@Controller("packages")
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get("suppliers")
  async listSuppliers() {
    return this.packagesService.listSuppliers();
  }

  @Post("suppliers")
  async createSupplier(@Body() body: { code: string; name: string }) {
    try {
      return await this.packagesService.createSupplier({
        code: requireNonEmptyString(body.code, "code"),
        name: requireNonEmptyString(body.name, "name"),
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Get("categories")
  async listCategories() {
    return this.packagesService.listCategories();
  }

  @Post("categories")
  async createCategory(@Body() body: { supplierId: string; code: string; name: string }) {
    try {
      return await this.packagesService.createCategory({
        supplierId: requirePositiveIntegerString(body.supplierId, "supplierId"),
        code: requireNonEmptyString(body.code, "code"),
        name: requireNonEmptyString(body.name, "name"),
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Get("products")
  async listProducts() {
    return this.packagesService.listProducts();
  }

  @Post("products")
  async createProduct(
    @Body() body: { supplierId: string; categoryId: string; code: string; name: string },
  ) {
    try {
      return await this.packagesService.createProduct({
        supplierId: requirePositiveIntegerString(body.supplierId, "supplierId"),
        categoryId: requirePositiveIntegerString(body.categoryId, "categoryId"),
        code: requireNonEmptyString(body.code, "code"),
        name: requireNonEmptyString(body.name, "name"),
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Get("product-details")
  async listProductDetails() {
    return this.packagesService.listProductDetails();
  }

  @Get("storefront-products")
  async listStorefrontProducts() {
    return this.packagesService.listStorefrontProducts();
  }

  @Post("product-details")
  async createProductDetail(
    @Body()
    body: {
      productId: string;
      code: string;
      name: string;
      youtubeUrl?: string;
      imageUrls?: string[];
      costPriceUsdt: string;
      memberPriceUsdt: string;
      retailPriceUsdt: string;
      pv: string;
      poolEnabled?: boolean | string;
      poolRateMode?: string;
      poolCapMultiple?: string;
      commissionCapScope?: string;
      commissionCapMultiple?: string;
      activeDays?: number | string;
      earningCapAmount?: string;
      firmEnabled?: boolean | string;
      firmOverrideCostGuard?: boolean | string;
      firmDcwRewardAmount?: string;
      firmRedeemStockLimit?: number | string;
      stockQuantity?: number | string;
    },
  ) {
    try {
      const poolEnabled = normalizePoolEnabledInput(body);

      const normalizedCommissionCapScope = (
        optionalString(body.commissionCapScope) ?? "pool_only"
      ).toLowerCase();
      if (
        normalizedCommissionCapScope !== "pool_only" &&
        normalizedCommissionCapScope !== "all_commissions"
      ) {
        throw new BadRequestException(
          "commissionCapScope must be pool_only or all_commissions.",
        );
      }

      const firmEnabled =
        body.firmEnabled === true ||
        body.firmEnabled === "true" ||
        body.firmEnabled === "1";

      if (firmEnabled && !readWalletSettings().firmEnabled) {
        throw new BadRequestException("FIRM product flags are disabled in phase 1.");
      }

      return await this.packagesService.createProductDetail({
        productId: requirePositiveIntegerString(body.productId, "productId"),
        code: requireNonEmptyString(body.code, "code"),
        name: requireNonEmptyString(body.name, "name"),
        youtubeUrl: optionalUrlString(body.youtubeUrl, "youtubeUrl"),
        imageUrls: optionalUrlStringArray(body.imageUrls, "imageUrls", 10),
        costPriceUsdt: requireDecimalString(body.costPriceUsdt, "costPriceUsdt"),
        memberPriceUsdt: requireDecimalString(body.memberPriceUsdt, "memberPriceUsdt"),
        retailPriceUsdt: requireDecimalString(body.retailPriceUsdt, "retailPriceUsdt"),
        pv: requireDecimalString(body.pv, "pv"),
        poolEnabled,
        poolCapMultiple: optionalString(body.poolCapMultiple)
          ? requireDecimalString(body.poolCapMultiple, "poolCapMultiple")
          : "0",
        commissionCapScope: normalizedCommissionCapScope as
          | "pool_only"
          | "all_commissions",
        commissionCapMultiple: optionalString(body.commissionCapMultiple)
          ? requireDecimalString(
              body.commissionCapMultiple,
              "commissionCapMultiple",
            )
          : "0",
        activeDays: optionalString(body.activeDays)
          ? requirePositiveInteger(body.activeDays, "activeDays")
          : undefined,
        earningCapAmount: optionalString(body.earningCapAmount)
          ? requireDecimalString(body.earningCapAmount, "earningCapAmount")
          : undefined,
        firmEnabled,
        firmOverrideCostGuard:
          body.firmOverrideCostGuard === true ||
          body.firmOverrideCostGuard === "true" ||
          body.firmOverrideCostGuard === "1",
        firmDcwRewardAmount: optionalString(body.firmDcwRewardAmount)
          ? requireDecimalString(body.firmDcwRewardAmount, "firmDcwRewardAmount")
          : "0",
        firmRedeemStockLimit:
          body.firmRedeemStockLimit === undefined ||
          body.firmRedeemStockLimit === null ||
          body.firmRedeemStockLimit === ""
            ? undefined
            : requirePositiveInteger(
                body.firmRedeemStockLimit,
                "firmRedeemStockLimit",
              ),
        stockQuantity:
          body.stockQuantity === undefined ||
          body.stockQuantity === null ||
          body.stockQuantity === ""
            ? undefined
            : requirePositiveInteger(body.stockQuantity, "stockQuantity"),
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Get()
  async listPackages() {
    return this.packagesService.listPackages();
  }

  @Post()
  async createPackage(
    @Body()
    body: {
      code: string;
      name: string;
      priceUsdt?: string;
      pv?: string;
      costPriceUsdt?: string;
      memberPriceUsdt?: string;
      activeDays: number;
      earningCapAmount: string;
      poolEnabled?: boolean | string;
      poolRateMode?: string;
      poolCapMultiple?: string;
      commissionCapScope?: string;
      commissionCapMultiple?: string;
      dcwSpendEnabled?: boolean | string;
      dcwUsageAmount?: string;
      dcwRewardRate?: string;
      dcwCashRewardRate?: string;
      dcwShoppingRewardRate?: string;
      productDetailItems?: Array<{ productDetailId: string; qty: number }>;
    },
  ) {
    try {
      const poolEnabled = normalizePoolEnabledInput(body);

      const normalizedCommissionCapScope = (
        optionalString(body.commissionCapScope) ?? "pool_only"
      ).toLowerCase();
      if (
        normalizedCommissionCapScope !== "pool_only" &&
        normalizedCommissionCapScope !== "all_commissions"
      ) {
        throw new BadRequestException(
          "commissionCapScope must be pool_only or all_commissions.",
        );
      }

      const normalizedItems = (body.productDetailItems ?? []).map((item, index) => ({
        productDetailId: requirePositiveIntegerString(
          item?.productDetailId,
          `productDetailItems[${index}].productDetailId`,
        ),
        qty: requirePositiveInteger(item?.qty, `productDetailItems[${index}].qty`),
      }));

      if (!normalizedItems.length && (!body.priceUsdt || !body.pv)) {
        throw new BadRequestException(
          "priceUsdt and pv are required when no productDetailItems are selected.",
        );
      }

      return await this.packagesService.createPackage({
        code: requireNonEmptyString(body.code, "code"),
        name: requireNonEmptyString(body.name, "name"),
        priceUsdt: optionalString(body.priceUsdt)
          ? requireDecimalString(body.priceUsdt, "priceUsdt")
          : undefined,
        pv: optionalString(body.pv)
          ? requireDecimalString(body.pv, "pv")
          : undefined,
        costPriceUsdt: optionalString(body.costPriceUsdt)
          ? requireDecimalString(body.costPriceUsdt, "costPriceUsdt")
          : undefined,
        memberPriceUsdt: optionalString(body.memberPriceUsdt)
          ? requireDecimalString(body.memberPriceUsdt, "memberPriceUsdt")
          : undefined,
        activeDays: requirePositiveInteger(body.activeDays, "activeDays"),
        earningCapAmount: requireDecimalString(
          body.earningCapAmount,
          "earningCapAmount",
        ),
        poolEnabled,
        poolCapMultiple: optionalString(body.poolCapMultiple)
          ? requireDecimalString(body.poolCapMultiple, "poolCapMultiple")
          : undefined,
        commissionCapScope: normalizedCommissionCapScope as
          | "pool_only"
          | "all_commissions",
        commissionCapMultiple: optionalString(body.commissionCapMultiple)
          ? requireDecimalString(
              body.commissionCapMultiple,
              "commissionCapMultiple",
            )
          : undefined,
        dcwSpendEnabled:
          body.dcwSpendEnabled === true ||
          body.dcwSpendEnabled === "true" ||
          body.dcwSpendEnabled === "1",
        dcwUsageAmount: optionalString(body.dcwUsageAmount)
          ? requireDecimalString(body.dcwUsageAmount, "dcwUsageAmount")
          : undefined,
        dcwRewardRate: optionalString(body.dcwRewardRate)
          ? requireDecimalRateString(body.dcwRewardRate, "dcwRewardRate")
          : undefined,
        dcwCashRewardRate: optionalString(body.dcwCashRewardRate)
          ? requireDecimalRateString(body.dcwCashRewardRate, "dcwCashRewardRate")
          : undefined,
        dcwShoppingRewardRate: optionalString(body.dcwShoppingRewardRate)
          ? requireDecimalRateString(
              body.dcwShoppingRewardRate,
              "dcwShoppingRewardRate",
            )
          : undefined,
        productDetailItems: normalizedItems,
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":packageId/status")
  async updatePackageStatus(
    @Param("packageId") packageId: string,
    @Body() body: { status: string },
  ) {
    const normalizedStatus = requireNonEmptyString(body.status, "status").toLowerCase();

    if (normalizedStatus !== "active" && normalizedStatus !== "inactive") {
      throw new BadRequestException("status must be active or inactive.");
    }

    try {
      return await this.packagesService.updatePackageStatus(
        requirePositiveIntegerString(packageId, "packageId"),
        normalizedStatus as "active" | "inactive",
      );
    } catch (error) {
      rethrowHttpError(error);
    }
  }
}
