import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";

export interface PackagesRepository {
  createPackage(input: {
    code: string;
    name: string;
    priceUsdt: string;
    pv: string;
    activeDays: number;
    earningCapAmount: string;
  }): Promise<{
    packageId: string;
    code: string;
    name: string;
    priceUsdt: string;
    pv: string;
    activeDays: number;
    earningCapAmount: string;
    status: string;
  }>;

  listPackages(): Promise<
    Array<{
      packageId: string;
      code: string;
      name: string;
      priceUsdt: string;
      pv: string;
      activeDays: number;
      earningCapAmount: string;
      status: string;
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

  async createPackage(input: {
    code: string;
    name: string;
    priceUsdt: string;
    pv: string;
    activeDays: number;
    earningCapAmount: string;
  }) {
    const pkg = await this.prisma.package.create({
      data: {
        code: input.code,
        name: input.name,
        priceUsdt: input.priceUsdt,
        pv: input.pv,
        activeDays: input.activeDays,
        earningCapType: "FIXED_AMOUNT",
        earningCapAmount: input.earningCapAmount,
        status: "ACTIVE",
      },
    });

    return {
      packageId: pkg.id.toString(),
      code: pkg.code,
      name: pkg.name,
      priceUsdt: pkg.priceUsdt.toString(),
      pv: pkg.pv.toString(),
      activeDays: pkg.activeDays,
      earningCapAmount: pkg.earningCapAmount.toString(),
      status: pkg.status.toLowerCase(),
    };
  }

  async listPackages() {
    const packages = await this.prisma.package.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    return packages.map((pkg) => ({
      packageId: pkg.id.toString(),
      code: pkg.code,
      name: pkg.name,
      priceUsdt: pkg.priceUsdt.toString(),
      pv: pkg.pv.toString(),
      activeDays: pkg.activeDays,
      earningCapAmount: pkg.earningCapAmount.toString(),
      status: pkg.status.toLowerCase(),
    }));
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
