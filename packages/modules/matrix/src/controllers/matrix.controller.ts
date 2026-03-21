import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";

import {
  optionalPositiveInteger,
  requirePositiveIntegerString,
} from "../../../../../apps/api/src/http/request.util";
import { MembersService } from "../../../members/src/services/members.service";
import { MatrixService } from "../services/matrix.service";

@Controller("matrix")
export class MatrixController {
  constructor(
    private readonly matrixService: MatrixService,
    private readonly membersService: MembersService,
  ) {}

  @Get("member/:memberId")
  async getMemberMatrix(@Param("memberId") memberId: string) {
    const validatedMemberId = requirePositiveIntegerString(memberId, "memberId");
    const member = await this.membersService.getMember(validatedMemberId);

    if (!member) {
      throw new NotFoundException("Member not found.");
    }

    const cycles = await this.matrixService.getMemberMatrixCycles(validatedMemberId);

    return {
      member,
      cycles,
    };
  }

  @Get("summary")
  async getMatrixSummary() {
    return this.matrixService.getMatrixSummary();
  }

  @Get("payouts")
  async listMatrixPayouts(
    @Query("beneficiaryUserId") beneficiaryUserId?: string,
    @Query("sourceOrderId") sourceOrderId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.matrixService.listMatrixPayouts({
      beneficiaryUserId: beneficiaryUserId
        ? requirePositiveIntegerString(beneficiaryUserId, "beneficiaryUserId")
        : undefined,
      sourceOrderId: sourceOrderId
        ? requirePositiveIntegerString(sourceOrderId, "sourceOrderId")
        : undefined,
      page: optionalPositiveInteger(page, "page"),
      pageSize: optionalPositiveInteger(pageSize, "pageSize"),
    });
  }
}
