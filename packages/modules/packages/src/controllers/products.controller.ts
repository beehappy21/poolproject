import { Controller, Get } from "@nestjs/common";

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
}
