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
  optionalPositiveInteger,
  optionalString,
  requireNonEmptyString,
  requirePositiveIntegerString,
  rethrowHttpError,
} from "../../../../../apps/api/src/http/request.util";
import { MembersService } from "../services/members.service";
import { WalletsService } from "../../../wallets/src/services/wallets.service";

@Controller("members")
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly walletsService: WalletsService,
  ) {}

  @Get()
  async listMembers(
    @Query("sponsorId") sponsorId?: string,
    @Query("memberCode") memberCode?: string,
    @Query("query") query?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.membersService.listMembers({
      sponsorId: sponsorId
        ? requirePositiveIntegerString(sponsorId, "sponsorId")
        : undefined,
      memberCode: memberCode ? requireNonEmptyString(memberCode, "memberCode") : undefined,
      query: optionalString(query),
      page: optionalPositiveInteger(page, "page"),
      pageSize: optionalPositiveInteger(pageSize, "pageSize"),
    });
  }

  @Get(":memberId")
  async getMember(@Param("memberId") memberId: string) {
    const validatedMemberId = requirePositiveIntegerString(memberId, "memberId");
    const member = await this.membersService.getMember(validatedMemberId);

    if (!member) {
      throw new NotFoundException("Member not found.");
    }

    return member;
  }

  @Get(":memberId/detail")
  async getMemberDetail(@Param("memberId") memberId: string) {
    const validatedMemberId = requirePositiveIntegerString(memberId, "memberId");
    const member = await this.membersService.getMember(validatedMemberId);

    if (!member) {
      throw new NotFoundException("Member not found.");
    }

    const [walletSummary, activeCycles] = await Promise.all([
      this.walletsService.getWalletSummary(validatedMemberId),
      this.membersService.getMemberCycles(validatedMemberId, new Date().toISOString()),
    ]);

    return {
      ...member,
      walletSummary,
      activeCycles,
    };
  }

  @Get(":memberId/network")
  async getMemberNetwork(@Param("memberId") memberId: string) {
    const network = await this.membersService.getMemberNetwork(
      requirePositiveIntegerString(memberId, "memberId"),
    );

    if (!network) {
      throw new NotFoundException("Member not found.");
    }

    return network;
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

  @Get("by-code/:memberCode/direct-referrals")
  async getDirectReferralsByMemberCode(@Param("memberCode") memberCode: string) {
    const validatedMemberCode = requireNonEmptyString(memberCode, "memberCode");
    const result = await this.membersService.getDirectReferralsByMemberCode(
      validatedMemberCode,
    );

    if (!result) {
      throw new NotFoundException("Member not found.");
    }

    return result;
  }

  @Get("by-code/:memberCode/referral-link")
  async getReferralLink(
    @Param("memberCode") memberCode: string,
    @Query("baseUrl") baseUrl?: string,
  ) {
    try {
      return await this.membersService.getReferralLink(
        requireNonEmptyString(memberCode, "memberCode"),
        optionalString(baseUrl) ||
          process.env.APP_PUBLIC_BASE_URL ||
          process.env.APP_BASE_URL ||
          "http://127.0.0.1:3002",
      );
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post()
  async createMember(
    @Body()
    body: {
      memberCode?: string | null;
      name?: string | null;
      email?: string;
      phone?: string;
      sponsorId?: string | null;
      sponsorCode?: string | null;
      ref?: string | null;
      password?: string | null;
    },
  ) {
    const name = optionalString(body.name);
    const memberCode = optionalString(body.memberCode);
    const sponsorCode = optionalString(body.sponsorCode);
    const ref = optionalString(body.ref);
    const password = optionalString(body.password);
    const email = optionalString(body.email);
    const phone = optionalString(body.phone);

    if (password && !/^[A-Za-z0-9]{6,}$/.test(password)) {
      throw new BadRequestException("Password must be at least 6 letters or numbers.");
    }

    if (body.sponsorId) {
      throw new BadRequestException("Use sponsorCode or ref, not sponsorId.");
    }

    if (sponsorCode && ref) {
      throw new BadRequestException("Use sponsorCode or ref, not both.");
    }

    try {
      return await this.membersService.createMember({
        memberCode,
        name,
        email,
        phone,
        sponsorCode,
        ref,
        password,
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

  @Post(":memberId/reset-password")
  async resetPassword(
    @Param("memberId") memberId: string,
    @Body() body: { newPassword: string },
  ) {
    try {
      return await this.membersService.resetMemberPassword(
        requirePositiveIntegerString(memberId, "memberId"),
        requireNonEmptyString(body.newPassword, "newPassword"),
      );
    } catch (error) {
      rethrowHttpError(error);
    }
  }
}
