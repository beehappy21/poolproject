import { BadRequestException, Controller, Get, Query } from "@nestjs/common";

import {
  requirePositiveIntegerString,
} from "../../../../../apps/api/src/http/request.util";
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
      orderId: orderId ? requirePositiveIntegerString(orderId, "orderId") : undefined,
      beneficiaryUserId: beneficiaryUserId
        ? requirePositiveIntegerString(beneficiaryUserId, "beneficiaryUserId")
        : undefined,
    });
  }

  @Get("company-fallbacks")
  async listCompanyFallbacks(
    @Query("sourceRefId") sourceRefId?: string,
    @Query("sourceType") sourceType?: string,
  ) {
    const normalizedSourceType = sourceType?.trim().toLowerCase();

    if (
      normalizedSourceType &&
      normalizedSourceType !== "direct" &&
      normalizedSourceType !== "uni" &&
      normalizedSourceType !== "pool"
    ) {
      throw new BadRequestException("sourceType must be direct, uni, or pool.");
    }

    return this.commissionsService.listCompanyFallbacks({
      sourceRefId: sourceRefId
        ? requirePositiveIntegerString(sourceRefId, "sourceRefId")
        : undefined,
      sourceType: normalizedSourceType,
    });
  }
}
