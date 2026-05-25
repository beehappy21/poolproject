import { Injectable } from "@nestjs/common";

import { PrismaPackagesRepository } from "../repositories/packages.repository";

@Injectable()
export class PackagesService {
  constructor(private readonly packagesRepository: PrismaPackagesRepository) {}

  async listProductReviews(productDetailId: string) {
    return this.packagesRepository.listProductReviews(productDetailId);
  }

  async upsertProductReview(input: {
    productDetailId: string;
    userId: string;
    rating: number;
    comment?: string;
  }) {
    return this.packagesRepository.upsertProductReview(input);
  }

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
    return this.packagesRepository.createProductDetail(input);
  }

  async listProductDetails() {
    return this.packagesRepository.listProductDetails();
  }

  async listStorefrontProducts() {
    return this.packagesRepository.listStorefrontProducts();
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
    dcwRewardRate?: string;
    dcwCashRewardRate?: string;
    dcwShoppingRewardRate?: string;
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
