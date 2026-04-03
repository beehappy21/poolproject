import { Controller, Get, Param } from "@nestjs/common";

import { requirePositiveIntegerString } from "../../../../../apps/api/src/http/request.util";

import { PackagesService } from "../services/packages.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get("suppliers")
  async listSuppliers() {
    return this.packagesService.listSuppliers();
  }

  @Get("categories")
  async listCategories() {
    return this.packagesService.listCategories();
  }

  @Get()
  async listProducts() {
    return this.packagesService.listProducts();
  }

  @Get("details")
  async listProductDetails() {
    return this.packagesService.listProductDetails();
  }

  @Get("storefront")
  async listStorefrontProducts() {
    return this.packagesService.listStorefrontProducts();
  }

  @Get(":productDetailId/reviews")
  async listProductReviews(@Param("productDetailId") productDetailId: string) {
    return {
      items: await this.packagesService.listProductReviews(
        requirePositiveIntegerString(productDetailId, "productDetailId"),
      ),
    };
  }
}
