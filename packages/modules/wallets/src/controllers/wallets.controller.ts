import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  UnauthorizedException,
  forwardRef,
} from "@nestjs/common";

import {
  optionalImageReferenceString,
  optionalString,
  optionalUrlString,
  requireDecimalString,
  requireNonEmptyString,
  requirePositiveIntegerString,
} from "../../../../../apps/api/src/http/request.util";
import { AuthService } from "../../../auth";
import { Roles } from "../../../auth/src/access-control/roles.decorator";
import { WalletTopupDto } from "../dto";
import { WalletsService } from "../services/wallets.service";

@Roles("admin")
@Controller("wallets")
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @Get(":userId")
  async getWalletSummary(@Param("userId") userId: string) {
    return this.walletsService.getWalletSummary(
      requirePositiveIntegerString(userId, "userId"),
    );
  }

  @Get(":userId/transactions")
  async listWalletTransactions(@Param("userId") userId: string) {
    return this.walletsService.listWalletTransactions(
      requirePositiveIntegerString(userId, "userId"),
    );
  }

  @Get("topup-requests")
  async listWalletTopupRequests(
    @Query("userId") userId?: string,
    @Query("status") status?: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    await this.requireAdminSessionUser(authorization, cookieHeader);

    return this.walletsService.listWalletTopupRequests({
      userId: optionalString(userId)
        ? requirePositiveIntegerString(userId, "userId")
        : undefined,
      status: optionalString(status)
        ? (requireNonEmptyString(status, "status").toLowerCase() as
            | "pending"
            | "approved"
            | "rejected"
            | "cancelled")
        : undefined,
    });
  }

  @Get(":userId/topup-requests")
  async listWalletTopupRequestsForUser(
    @Param("userId") userId: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    await this.requireAdminSessionUser(authorization, cookieHeader);

    return this.walletsService.listWalletTopupRequests({
      userId: requirePositiveIntegerString(userId, "userId"),
    });
  }

  @Post(":userId/topups")
  async topupShoppingWallet(
    @Param("userId") userId: string,
    @Body() body: WalletTopupDto,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const adminUser = await this.requireAdminSessionUser(authorization, cookieHeader);

    return this.walletsService.topupShoppingWallet({
      userId: requirePositiveIntegerString(userId, "userId"),
      amount: requireDecimalString(body.amount, "amount"),
      paymentMethod: requireNonEmptyString(body.paymentMethod, "paymentMethod")
        .toLowerCase(),
      note: optionalString(body.note),
      actorUserId: adminUser.userId,
    });
  }

  @Post("topup-requests/:requestId/approve")
  async approveWalletTopupRequest(
    @Param("requestId") requestId: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const adminUser = await this.requireAdminSessionUser(authorization, cookieHeader);

    return this.walletsService.approveWalletTopupRequest({
      requestId: requirePositiveIntegerString(requestId, "requestId"),
      actorUserId: adminUser.userId,
    });
  }

  @Post("topup-requests/:requestId/reject")
  async rejectWalletTopupRequest(
    @Param("requestId") requestId: string,
    @Body() body: { rejectionReason: string },
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const adminUser = await this.requireAdminSessionUser(authorization, cookieHeader);

    return this.walletsService.rejectWalletTopupRequest({
      requestId: requirePositiveIntegerString(requestId, "requestId"),
      actorUserId: adminUser.userId,
      rejectionReason: requireNonEmptyString(body.rejectionReason, "rejectionReason"),
    });
  }

  @Get("withdraw-requests")
  async listWithdrawRequests(
    @Query("userId") userId?: string,
    @Query("status") status?: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    await this.requireAdminSessionUser(authorization, cookieHeader);

    return this.walletsService.listWithdrawRequests({
      userId: optionalString(userId)
        ? requirePositiveIntegerString(userId, "userId")
        : undefined,
      status: optionalString(status)
        ? (requireNonEmptyString(status, "status").toLowerCase() as
            | "pending"
            | "approved"
            | "rejected"
            | "cancelled"
            | "exported"
            | "paid")
        : undefined,
    });
  }

  @Post("withdraw-requests/:requestId/approve")
  async approveWithdrawRequest(
    @Param("requestId") requestId: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const adminUser = await this.requireAdminSessionUser(authorization, cookieHeader);

    return this.walletsService.approveWithdrawRequest({
      requestId: requirePositiveIntegerString(requestId, "requestId"),
      actorUserId: adminUser.userId,
    });
  }

  @Post("withdraw-requests/:requestId/reject")
  async rejectWithdrawRequest(
    @Param("requestId") requestId: string,
    @Body() body: { rejectionReason: string },
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const adminUser = await this.requireAdminSessionUser(authorization, cookieHeader);

    return this.walletsService.rejectWithdrawRequest({
      requestId: requirePositiveIntegerString(requestId, "requestId"),
      actorUserId: adminUser.userId,
      rejectionReason: requireNonEmptyString(body.rejectionReason, "rejectionReason"),
    });
  }

  @Post("withdraw-requests/:requestId/cancel")
  async cancelWithdrawRequest(
    @Param("requestId") requestId: string,
    @Body() body: { reason?: string },
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const adminUser = await this.requireAdminSessionUser(authorization, cookieHeader);

    return this.walletsService.cancelWithdrawRequest({
      requestId: requirePositiveIntegerString(requestId, "requestId"),
      actorUserId: adminUser.userId,
      reason: optionalString(body.reason),
    });
  }

  @Post("withdraw-requests/export")
  async markWithdrawRequestsExported(
    @Body() body: { requestIds: string[] },
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const adminUser = await this.requireAdminSessionUser(authorization, cookieHeader);
    const requestIds = Array.isArray(body.requestIds) ? body.requestIds : [];

    return this.walletsService.markWithdrawRequestExported({
      requestIds: requestIds.map((requestId) =>
        requirePositiveIntegerString(requestId, "requestIds"),
      ),
      actorUserId: adminUser.userId,
    });
  }

  @Post("withdraw-requests/:requestId/paid")
  async markWithdrawRequestPaid(
    @Param("requestId") requestId: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const adminUser = await this.requireAdminSessionUser(authorization, cookieHeader);

    return this.walletsService.markWithdrawRequestPaid({
      requestId: requirePositiveIntegerString(requestId, "requestId"),
      actorUserId: adminUser.userId,
    });
  }

  @Get("kyc-requests")
  async listKycRequests(
    @Query("userId") userId?: string,
    @Query("status") status?: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    await this.requireAdminSessionUser(authorization, cookieHeader);

    return this.walletsService.listKycRequests({
      userId: optionalString(userId)
        ? requirePositiveIntegerString(userId, "userId")
        : undefined,
      status: optionalString(status)
        ? (requireNonEmptyString(status, "status").toLowerCase() as
            | "pending"
            | "approved"
            | "rejected")
        : undefined,
    });
  }

  @Post("kyc-requests/:requestId/approve")
  async approveKycRequest(
    @Param("requestId") requestId: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const adminUser = await this.requireAdminSessionUser(authorization, cookieHeader);

    return this.walletsService.approveKycRequest({
      requestId: requirePositiveIntegerString(requestId, "requestId"),
      actorUserId: adminUser.userId,
    });
  }

  @Post("kyc-requests/:requestId/reject")
  async rejectKycRequest(
    @Param("requestId") requestId: string,
    @Body() body: { rejectionReason: string },
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const adminUser = await this.requireAdminSessionUser(authorization, cookieHeader);

    return this.walletsService.rejectKycRequest({
      requestId: requirePositiveIntegerString(requestId, "requestId"),
      actorUserId: adminUser.userId,
      rejectionReason: requireNonEmptyString(body.rejectionReason, "rejectionReason"),
    });
  }

  @Post(":userId/topup-requests")
  async createWalletTopupRequest(
    @Param("userId") userId: string,
    @Body()
    body: {
      amount: string;
      paymentMethod: string;
      transferSlipUrl?: string;
      note?: string;
    },
  ) {
    return this.walletsService.requestWalletTopup({
      userId: requirePositiveIntegerString(userId, "userId"),
      amount: requireDecimalString(body.amount, "amount"),
      paymentMethod: requireNonEmptyString(body.paymentMethod, "paymentMethod")
        .toLowerCase(),
      transferSlipUrl: optionalImageReferenceString(
        body.transferSlipUrl,
        "transferSlipUrl",
      ),
      note: optionalString(body.note),
    });
  }

  private extractToken(authorization?: string, cookieHeader?: string): string {
    const normalized = (authorization || "").trim();

    if (normalized.toLowerCase().startsWith("bearer ")) {
      const token = normalized.slice(7).trim();

      if (!token) {
        throw new UnauthorizedException("Missing bearer token.");
      }

      return token;
    }

    const cookieToken = this.readCookie(cookieHeader, "adminAccessToken");

    if (!cookieToken) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    return cookieToken;
  }

  private async requireAdminSessionUser(
    authorization?: string,
    cookieHeader?: string,
  ) {
    const token = this.extractToken(authorization, cookieHeader);
    const user = await this.authService.getSessionUser(token);

    if (!user) {
      throw new UnauthorizedException("Invalid session.");
    }

    if (!this.authService.isAdminUser(user)) {
      throw new UnauthorizedException("Admin access required.");
    }

    return user;
  }

  private readCookie(cookieHeader: string | undefined, name: string): string | null {
    const source = cookieHeader || "";
    const prefix = `${name}=`;

    for (const part of source.split(";")) {
      const value = part.trim();
      if (value.startsWith(prefix)) {
        return decodeURIComponent(value.slice(prefix.length));
      }
    }

    return null;
  }
}
