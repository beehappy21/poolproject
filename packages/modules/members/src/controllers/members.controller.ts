import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import {
  requireIsoDateTimeString,
  optionalPositiveInteger,
  optionalString,
  requireNonEmptyString,
  requirePositiveIntegerString,
  rethrowHttpError,
} from "../../../../../apps/api/src/http/request.util";
import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import { MembersService } from "../services/members.service";
import { WalletsService } from "../../../wallets/src/services/wallets.service";

@Controller("members")
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly walletsService: WalletsService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
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
  async getDirectReferralsByMemberCode(
    @Param("memberCode") memberCode: string,
    @Req() request: any,
  ) {
    const validatedMemberCode = requireNonEmptyString(memberCode, "memberCode");
    const viewerMemberCode = String(request?.authUser?.memberCode ?? "").trim();
    if (!viewerMemberCode) {
      throw new UnauthorizedException("Session required.");
    }
    const result = await this.membersService.getDirectReferralsByMemberCode(
      validatedMemberCode,
      { viewerMemberCode },
    );

    if (!result) {
      throw new NotFoundException("Member not found in your downline.");
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
          process.env.APP_WAP_URL ||
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
      lineUserId?: string | null;
      lineIdToken?: string | null;
      lineDisplayName?: string | null;
      linePictureUrl?: string | null;
      lineStatusMessage?: string | null;
    },
  ) {
    const name = optionalString(body.name);
    const memberCode = optionalString(body.memberCode);
    const sponsorCode = optionalString(body.sponsorCode);
    const ref = optionalString(body.ref);
    const password = optionalString(body.password);
    const email = optionalString(body.email);
    const phone = optionalString(body.phone);
    const lineUserId = optionalString(body.lineUserId);
    const lineIdToken = optionalString(body.lineIdToken);
    const lineDisplayName = optionalString(body.lineDisplayName);
    const linePictureUrl = optionalString(body.linePictureUrl);
    const lineStatusMessage = optionalString(body.lineStatusMessage);

    if (password && !/^[A-Za-z0-9]{6,}$/.test(password)) {
      throw new BadRequestException("Password must be at least 6 letters or numbers.");
    }

    if (body.sponsorId) {
      throw new BadRequestException("Use sponsorCode or ref, not sponsorId.");
    }

    if (sponsorCode && ref) {
      throw new BadRequestException("Use sponsorCode or ref, not both.");
    }

    if (!lineUserId) {
      throw new BadRequestException(
        "LINE profile is required before signup. Please reopen the invite link in LINE and try again.",
      );
    }

    try {
      await this.verifyLineIdentity({
        lineUserId,
        lineIdToken,
      });

      const existingBinding = await this.prisma.lineBinding.findUnique({
        where: { lineUserId },
        select: { userId: true },
      });

      if (existingBinding) {
        throw new ConflictException("LINE account is already connected to another member.");
      }

      return await this.membersService.createMember({
        memberCode,
        name,
        email,
        phone,
        sponsorCode,
        ref,
        password,
        lineBinding: {
          lineUserId,
          displayName: lineDisplayName,
          pictureUrl: linePictureUrl,
          statusMessage: lineStatusMessage,
          source: "line_invite_signup",
        },
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":memberId/activate-product")
  async activateProduct(
    @Param("memberId") memberId: string,
    @Body() body: { productDetailId: string },
  ) {
    try {
      return await this.membersService.activateProductCycle({
        memberId: requirePositiveIntegerString(memberId, "memberId"),
        productDetailId: requirePositiveIntegerString(
          body.productDetailId,
          "productDetailId",
        ),
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":memberId/activate-package")
  async activateLegacyPackage(
    @Param("memberId") memberId: string,
    @Body() body: { packageId: string },
  ) {
    try {
      return await this.membersService.activateProductCycle({
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

  private async verifyLineIdentity(input: {
    lineUserId: string;
    lineIdToken?: string | null;
  }): Promise<void> {
    const normalizedUserId = input.lineUserId.trim();
    const normalizedToken = input.lineIdToken?.trim() || "";
    const lineChannelId =
      process.env.LINE_CHANNEL_ID?.trim() ||
      process.env.LINE_LOGIN_CHANNEL_ID?.trim() ||
      "";
    const strictMode =
      process.env.LINE_STRICT_VERIFY === "true" ||
      process.env.NODE_ENV === "production";

    if (!normalizedToken || !lineChannelId) {
      if (strictMode) {
        throw new BadRequestException(
          "LINE identity verification is not configured correctly.",
        );
      }

      return;
    }

    const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        id_token: normalizedToken,
        client_id: lineChannelId,
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException("LINE identity verification failed.");
    }

    const payload = (await response.json()) as {
      sub?: string;
      exp?: number;
    };

    if (!payload?.sub || payload.sub !== normalizedUserId) {
      throw new UnauthorizedException(
        "LINE identity does not match the requested account.",
      );
    }

    if (
      typeof payload.exp === "number" &&
      payload.exp > 0 &&
      payload.exp * 1000 < Date.now()
    ) {
      throw new UnauthorizedException("LINE identity token has expired.");
    }
  }
}
