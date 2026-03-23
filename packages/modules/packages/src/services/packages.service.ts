import { Injectable } from "@nestjs/common";

import { PrismaPackagesRepository } from "../repositories/packages.repository";

@Injectable()
export class PackagesService {
  constructor(private readonly packagesRepository: PrismaPackagesRepository) {}

  async createSupplier(input: { code: string; name: string }) {
    return this.packagesRepository.createSupplier(input);
  }

  async listSuppliers() {
    return this.packagesRepository.listSuppliers();
  }

  async createCategory(input: { supplierId: string; code: string; name: string }) {
    return this.packagesRepository.createCategory(input);
  }

  async listCategories() {
    return this.packagesRepository.listCategories();
  }

  async createProduct(input: {
    supplierId: string;
    categoryId: string;
    code: string;
    name: string;
  }) {
    return this.packagesRepository.createProduct(input);
  }

  async listProducts() {
    return this.packagesRepository.listProducts();
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
    poolRateMode: "default_50_percent" | "custom_rate" | "disabled";
    poolRate: string;
    poolCapMultiple: string;
    commissionCapScope: "pool_only" | "all_commissions";
    commissionCapMultiple: string;
  }) {
    return this.packagesRepository.createProductDetail(input);
  }

  async listProductDetails() {
    return this.packagesRepository.listProductDetails();
  }

  async createPackage(input: {
    code: string;
    name: string;
    priceUsdt?: string;
    pv?: string;
    activeDays: number;
    earningCapAmount: string;
    poolRateMode?: "default_50_percent" | "custom_rate" | "disabled";
    poolRate?: string;
    poolCapMultiple?: string;
    commissionCapScope?: "pool_only" | "all_commissions";
    commissionCapMultiple?: string;
    productDetailItems?: Array<{
      productDetailId: string;
      qty: number;
    }>;
  }) {
    return this.packagesRepository.createPackage(input);
  }

  async listPackages() {
    return this.packagesRepository.listPackages();
  }

  async updatePackageStatus(packageId: string, status: "active" | "inactive") {
    return this.packagesRepository.updatePackageStatus(packageId, status);
  }
}
