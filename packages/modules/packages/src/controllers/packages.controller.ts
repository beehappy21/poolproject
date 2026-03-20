import { Body, Controller, Get, Post } from "@nestjs/common";

import { PackagesService } from "../services/packages.service";

@Controller("packages")
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

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
      priceUsdt: string;
      pv: string;
      activeDays: number;
      earningCapAmount: string;
    },
  ) {
    return this.packagesService.createPackage(body);
  }
}
