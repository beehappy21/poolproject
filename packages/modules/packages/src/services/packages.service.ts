import { Injectable } from "@nestjs/common";

import { PrismaPackagesRepository } from "../repositories/packages.repository";

@Injectable()
export class PackagesService {
  constructor(private readonly packagesRepository: PrismaPackagesRepository) {}

  async createPackage(input: {
    code: string;
    name: string;
    priceUsdt: string;
    pv: string;
    activeDays: number;
    earningCapAmount: string;
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
