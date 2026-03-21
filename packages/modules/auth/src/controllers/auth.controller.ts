import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
  UnauthorizedException,
} from "@nestjs/common";

import {
  requireNonEmptyString,
  requirePositiveIntegerString,
} from "../../../../../apps/api/src/http/request.util";
import { CommissionsService } from "../../../commissions";
import { MatrixService } from "../../../matrix/src";
import { MembersService } from "../../../members";
import { OrdersService } from "../../../orders";
import { PoolService } from "../../../pool";
import { WalletsService } from "../../../wallets";
import { AuthService } from "../services/auth.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly membersService: MembersService,
    private readonly ordersService: OrdersService,
    private readonly walletsService: WalletsService,
    private readonly commissionsService: CommissionsService,
    private readonly matrixService: MatrixService,
    private readonly poolService: PoolService,
  ) {}

  @Post("login")
  async login(
    @Body()
    body: {
      identifier: string;
      password: string;
    },
    @Res({ passthrough: true }) response: { setHeader(name: string, value: string): void },
  ) {
    const session = await this.authService.login({
      identifier: requireNonEmptyString(body.identifier, "identifier"),
      password: requireNonEmptyString(body.password, "password"),
    });

    response.setHeader("Set-Cookie", this.buildSessionCookie(session.accessToken));
    return session;
  }

  @Get("me")
  async me(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    return { user };
  }

  @Get("dashboard")
  async dashboard(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    const evaluationAt = new Date().toISOString();
    const [wallet, cycles, referral] = await Promise.all([
      this.walletsService.getWalletSummary(user.userId),
      this.membersService.getMemberCycles(user.userId, evaluationAt),
      this.membersService.getReferralLink(
        user.memberCode,
        process.env.APP_BASE_URL || "http://127.0.0.1:3000",
      ),
    ]);

    return {
      user,
      wallet,
      cycles,
      referral,
    };
  }

  @Get("orders")
  async orders(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.ordersService.listOrders({
      userId: user.userId,
      page: 1,
      pageSize: 10,
    });
  }

  @Get("transactions")
  async transactions(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    return this.walletsService.listWalletTransactions(user.userId);
  }

  @Get("commissions")
  async commissions(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.commissionsService.listCommissions({
      beneficiaryUserId: user.userId,
      page: 1,
      pageSize: 20,
    });
  }

  @Get("network")
  async network(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    return this.membersService.getMemberNetwork(user.userId);
  }

  @Get("matrix")
  async matrix(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return {
      userId: user.userId,
      cycles: await this.matrixService.getMemberMatrixCycles(user.userId),
    };
  }

  @Get("matrix-payouts")
  async matrixPayouts(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.matrixService.listMatrixPayouts({
      beneficiaryUserId: user.userId,
      page: 1,
      pageSize: 20,
    });
  }

  @Get("pool-payouts")
  async poolPayouts(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    return this.poolService.listMemberPoolPayouts(user.userId);
  }

  @Post("activate-package")
  async activatePackage(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body() body?: { packageId?: string },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.membersService.activatePackageCycle({
      memberId: user.userId,
      packageId: requirePositiveIntegerString(body?.packageId, "packageId"),
    });
  }

  @Post("orders")
  async createOwnOrder(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body() body?: { packageId?: string },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.ordersService.createOrder({
      userId: user.userId,
      packageId: requirePositiveIntegerString(body?.packageId, "packageId"),
    });
  }

  @Get("orders/:orderId")
  async getOwnOrder(
    @Param("orderId") orderId: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    const validatedOrderId = requirePositiveIntegerString(orderId, "orderId");
    const order = await this.ordersService.getOrder(validatedOrderId);

    if (!order || order.sourceUserId !== user.userId) {
      throw new UnauthorizedException("Order not found for session.");
    }

    const [commissions, companyFallbacks] = await Promise.all([
      this.commissionsService.listCommissions({ orderId: validatedOrderId }),
      this.commissionsService.listCompanyFallbacks({ sourceRefId: validatedOrderId }),
    ]);

    return {
      order,
      commissions,
      companyFallbacks,
    };
  }

  @Post("logout")
  async logout(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Res({ passthrough: true }) response?: { setHeader(name: string, value: string): void },
  ) {
    const token = this.extractToken(authorization, cookieHeader);
    await this.authService.logout(token);
    response?.setHeader("Set-Cookie", this.clearSessionCookie());
    return { success: true };
  }

  @Post("change-password")
  async changePassword(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body() body?: { currentPassword?: string; newPassword?: string },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.authService.changePassword({
      userId: user.userId,
      currentPassword: requireNonEmptyString(body?.currentPassword, "currentPassword"),
      newPassword: requireNonEmptyString(body?.newPassword, "newPassword"),
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

  private async requireSessionUser(
    authorization?: string,
    cookieHeader?: string,
  ) {
    const token = this.extractToken(authorization, cookieHeader);
    const user = await this.authService.getSessionUser(token);

    if (!user) {
      throw new UnauthorizedException("Invalid session.");
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

  private buildSessionCookie(token: string): string {
    return `adminAccessToken=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`;
  }

  private clearSessionCookie(): string {
    return "adminAccessToken=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  }
}
