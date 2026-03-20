import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";

import {
  requireIsoDateTimeString,
  optionalString,
  requireNonEmptyString,
  requirePositiveIntegerString,
  rethrowHttpError,
} from "../../../../../apps/api/src/http/request.util";
import { MembersService } from "../services/members.service";

@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get(":memberId")
  async getMember(@Param("memberId") memberId: string) {
    const validatedMemberId = requirePositiveIntegerString(memberId, "memberId");
    const member = await this.membersService.getMember(validatedMemberId);

    if (!member) {
      throw new NotFoundException("Member not found.");
    }

    return member;
  }

  @Get(":memberId/cycles")
  async getMemberCycles(
    @Param("memberId") memberId: string,
    @Query("at") at?: string,
  ) {
    const evaluationAt = at
      ? requireIsoDateTimeString(at, "at")
      : new Date().toISOString();

    return this.membersService.getMemberCycles(
      requirePositiveIntegerString(memberId, "memberId"),
      evaluationAt,
    );
  }

  @Get("by-code/:memberCode")
  async getMemberByCode(@Param("memberCode") memberCode: string) {
    const validatedMemberCode = requireNonEmptyString(memberCode, "memberCode");
    const member = await this.membersService.getMemberByCode(validatedMemberCode);

    if (!member) {
      throw new NotFoundException("Member not found.");
    }

    return member;
  }

  @Get("by-code/:memberCode/referral-link")
  async getReferralLink(
    @Param("memberCode") memberCode: string,
    @Query("baseUrl") baseUrl?: string,
  ) {
    try {
      return await this.membersService.getReferralLink(
        requireNonEmptyString(memberCode, "memberCode"),
        optionalString(baseUrl),
      );
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post()
  async createMember(
    @Body()
    body: {
      memberCode: string;
      name: string;
      email?: string;
      phone?: string;
      sponsorId?: string | null;
      sponsorCode?: string | null;
      ref?: string | null;
    },
  ) {
    const memberCode = requireNonEmptyString(body.memberCode, "memberCode");
    const name = requireNonEmptyString(body.name, "name");
    const sponsorId = body.sponsorId
      ? requirePositiveIntegerString(body.sponsorId, "sponsorId")
      : undefined;
    const sponsorCode = optionalString(body.sponsorCode);
    const ref = optionalString(body.ref);

    if (sponsorCode && ref) {
      throw new BadRequestException("Use sponsorCode or ref, not both.");
    }

    try {
      return await this.membersService.createMember({
        memberCode,
        name,
        email: optionalString(body.email),
        phone: optionalString(body.phone),
        sponsorId,
        sponsorCode,
        ref,
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":memberId/activate-package")
  async activatePackage(
    @Param("memberId") memberId: string,
    @Body() body: { packageId: string },
  ) {
    try {
      return await this.membersService.activatePackageCycle({
        memberId: requirePositiveIntegerString(memberId, "memberId"),
        packageId: requirePositiveIntegerString(body.packageId, "packageId"),
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }
}
