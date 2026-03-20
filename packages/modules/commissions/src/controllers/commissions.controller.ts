import { Controller, Get, Query } from "@nestjs/common";

import { CommissionsService } from "../services/commissions.service";

@Controller("commissions")
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  async listCommissions(
    @Query("orderId") orderId?: string,
    @Query("beneficiaryUserId") beneficiaryUserId?: string,
  ) {
    return this.commissionsService.listCommissions({
      orderId,
      beneficiaryUserId,
    });
  }

  @Get("company-fallbacks")
  async listCompanyFallbacks(@Query("sourceRefId") sourceRefId?: string) {
    return this.commissionsService.listCompanyFallbacks({ sourceRefId });
  }
}
