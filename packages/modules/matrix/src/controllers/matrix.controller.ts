import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";

import {
  optionalPositiveInteger,
  requirePositiveIntegerString,
} from "../../../../../apps/api/src/http/request.util";
import { readCommissionSettings } from "../../../../shared/utils/src/commission-settings.util";
import { MembersService } from "../../../members/src/services/members.service";
import { MatrixService } from "../services/matrix.service";

@Controller("matrix")
export class MatrixController {
  constructor(
    private readonly matrixService: MatrixService,
    private readonly membersService: MembersService,
  ) {}

  @Get("member/by-code/:memberCode")
  async getMemberMatrixByCode(@Param("memberCode") memberCode: string) {
    const validatedMemberCode = memberCode.trim();
    if (validatedMemberCode === "") {
      throw new NotFoundException("Member not found.");
    }

    const member = await this.membersService.getMemberByCode(validatedMemberCode);

    if (!member) {
      throw new NotFoundException("Member not found.");
    }

    return this.buildMemberMatrixResponse(member.memberId, member);
  }

  @Get("member/:memberId")
  async getMemberMatrix(@Param("memberId") memberId: string) {
    const validatedMemberId = requirePositiveIntegerString(memberId, "memberId");
    const member = await this.membersService.getMember(validatedMemberId);

    if (!member) {
      throw new NotFoundException("Member not found.");
    }

    return this.buildMemberMatrixResponse(validatedMemberId, member);
  }

  private async buildMemberMatrixResponse(
    memberId: string,
    member: Awaited<ReturnType<MembersService["getMember"]>>,
  ) {
    if (readCommissionSettings().appVisibility.matrix === false) {
      return {
        member,
        cycles: [],
      };
    }

    const cycles = await this.matrixService.getMemberMatrixCycles(memberId);

    return {
      member,
      cycles,
    };
  }

  @Get("summary")
  async getMatrixSummary() {
    if (readCommissionSettings().appVisibility.matrix === false) {
      return {
        cycleCount: 0,
        activeCycleCount: 0,
        payoutCount: 0,
        payoutTotal: "0",
        latestCycles: [],
      };
    }

    return this.matrixService.getMatrixSummary();
  }

  @Get("payouts")
  async listMatrixPayouts(
    @Query("beneficiaryUserId") beneficiaryUserId?: string,
    @Query("sourceOrderId") sourceOrderId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    if (readCommissionSettings().appVisibility.matrix === false) {
      return {
        items: [],
        total: 0,
        page: optionalPositiveInteger(page, "page") ?? 1,
        pageSize: optionalPositiveInteger(pageSize, "pageSize") ?? 20,
      };
    }

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
