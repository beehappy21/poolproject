import { Body, Controller, Get, Post } from "@nestjs/common";

import {
  requireDecimalString,
  requireNonEmptyString,
  requirePositiveInteger,
  rethrowHttpError,
} from "../../../../../apps/api/src/http/request.util";
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
    try {
      return await this.packagesService.createPackage({
        code: requireNonEmptyString(body.code, "code"),
        name: requireNonEmptyString(body.name, "name"),
        priceUsdt: requireDecimalString(body.priceUsdt, "priceUsdt"),
        pv: requireDecimalString(body.pv, "pv"),
        activeDays: requirePositiveInteger(body.activeDays, "activeDays"),
        earningCapAmount: requireDecimalString(
          body.earningCapAmount,
          "earningCapAmount",
        ),
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }
}
