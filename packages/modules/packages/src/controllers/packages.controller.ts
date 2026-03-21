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
import { PackagesService } from "../services/packages.service";

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
      poolRate: string;
    },
  ) {
    try {
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
        poolRate: requireDecimalRateString(body.poolRate, "poolRate"),
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
      activeDays: number;
      earningCapAmount: string;
      poolRate?: string;
      productDetailItems?: Array<{ productDetailId: string; qty: number }>;
    },
  ) {
    try {
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
        activeDays: requirePositiveInteger(body.activeDays, "activeDays"),
        earningCapAmount: requireDecimalString(
          body.earningCapAmount,
          "earningCapAmount",
        ),
        poolRate: optionalString(body.poolRate)
          ? requireDecimalRateString(body.poolRate, "poolRate")
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
