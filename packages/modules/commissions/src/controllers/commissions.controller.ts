import { BadRequestException, Controller, Get, Query } from "@nestjs/common";

import {
  optionalPositiveInteger,
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
    @Query("commissionType") commissionType?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const normalizedCommissionType = commissionType?.trim().toLowerCase();

    if (
      normalizedCommissionType &&
      normalizedCommissionType !== "direct" &&
      normalizedCommissionType !== "uni" &&
      normalizedCommissionType !== "pool"
    ) {
      throw new BadRequestException("commissionType must be direct, uni, or pool.");
    }

    return this.commissionsService.listCommissions({
      orderId: orderId ? requirePositiveIntegerString(orderId, "orderId") : undefined,
      beneficiaryUserId: beneficiaryUserId
        ? requirePositiveIntegerString(beneficiaryUserId, "beneficiaryUserId")
        : undefined,
      commissionType: normalizedCommissionType,
      page: optionalPositiveInteger(page, "page"),
      pageSize: optionalPositiveInteger(pageSize, "pageSize"),
    });
  }

  @Get("company-fallbacks")
  async listCompanyFallbacks(
    @Query("sourceRefId") sourceRefId?: string,
    @Query("sourceType") sourceType?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
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
      page: optionalPositiveInteger(page, "page"),
      pageSize: optionalPositiveInteger(pageSize, "pageSize"),
    });
  }
}
