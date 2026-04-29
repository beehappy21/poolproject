import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";

import {
  optionalPositiveInteger,
  requireDateOnlyString,
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
      normalizedCommissionType !== "pool" &&
      normalizedCommissionType !== "cashback" &&
      normalizedCommissionType !== "team_2leg" &&
      normalizedCommissionType !== "team_3leg" &&
      normalizedCommissionType !== "matching_l1" &&
      normalizedCommissionType !== "matching_l2"
    ) {
      throw new BadRequestException(
        "commissionType must be direct, uni, pool, cashback, team_2leg, team_3leg, matching_l1, or matching_l2.",
      );
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
      normalizedSourceType !== "pool" &&
      normalizedSourceType !== "cashback" &&
      normalizedSourceType !== "team_2leg" &&
      normalizedSourceType !== "team_3leg" &&
      normalizedSourceType !== "matching_l1" &&
      normalizedSourceType !== "matching_l2"
    ) {
      throw new BadRequestException(
        "sourceType must be direct, uni, pool, cashback, team_2leg, team_3leg, matching_l1, or matching_l2.",
      );
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

  @Post("team-settlement-batches/:settlementDate/scaffold")
  async scaffoldTeamSettlementBatch(
    @Param("settlementDate") settlementDate: string,
  ) {
    return this.commissionsService.scaffoldTeamSettlementBatch(
      requireDateOnlyString(settlementDate, "settlementDate"),
    );
  }

  @Post("team-settlement-batches/:settlementDate/process")
  async processTeamSettlementBatch(
    @Param("settlementDate") settlementDate: string,
  ) {
    return this.commissionsService.processTeamSettlementBatch(
      requireDateOnlyString(settlementDate, "settlementDate"),
    );
  }

  @Post("end-of-day/:settlementDate/process")
  async processEndOfDayCommissionBatch(
    @Param("settlementDate") settlementDate: string,
  ) {
    return this.commissionsService.processEndOfDayCommissionBatch(
      requireDateOnlyString(settlementDate, "settlementDate"),
    );
  }

  @Get("team-settlement-batches/:settlementDate/snapshot")
  async getTeamSettlementBatchSnapshot(
    @Param("settlementDate") settlementDate: string,
  ) {
    return this.commissionsService.getTeamSettlementBatchSnapshot(
      requireDateOnlyString(settlementDate, "settlementDate"),
    );
  }
}
