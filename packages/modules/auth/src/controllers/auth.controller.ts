import {
  NotFoundException,
  BadRequestException,
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
  requireDecimalString,
  requirePositiveIntegerString,
  optionalString,
  optionalImageReferenceString,
  optionalUrlString,
} from "../../../../../apps/api/src/http/request.util";
import { readCommissionSettings } from "../../../../shared/utils/src/commission-settings.util";
import { readManualPaymentSettings } from "../../../../shared/utils/src/manual-payment-settings.util";
import { CommissionsService } from "../../../commissions";
import { MatrixService } from "../../../matrix/src";
import { MembersService } from "../../../members";
import { OrdersService } from "../../../orders";
import { PackagesService } from "../../../packages";
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
    private readonly packagesService: PackagesService,
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

  @Post("forgot-password-reset")
  async forgotPasswordReset(
    @Body()
    body: {
      identifier: string;
    },
  ) {
    return this.authService.resetPasswordFromIdentifier({
      identifier: requireNonEmptyString(body.identifier, "identifier"),
    });
  }

  @Post("line-login")
  async lineLogin(
    @Body()
    body: {
      lineUserId?: string;
      lineIdToken?: string;
    },
    @Res({ passthrough: true }) response: { setHeader(name: string, value: string): void },
  ) {
    await this.authService.verifyLineIdentity({
      lineUserId: requireNonEmptyString(body?.lineUserId, "lineUserId"),
      lineIdToken: optionalString(body?.lineIdToken),
    });

    const binding = await this.authService.getLineBindingByLineUserId(
      requireNonEmptyString(body?.lineUserId, "lineUserId"),
    );

    if (!binding) {
      throw new UnauthorizedException("LINE account is not connected to any member.");
    }

    const session = await this.authService.createSessionForUserId(binding.userId);
    response.setHeader("Set-Cookie", this.buildSessionCookie(session.accessToken));

    return {
      ...session,
      lineBinding: binding,
    };
  }

  @Post("line-binding/check")
  async checkLineBinding(
    @Body()
    body: {
      lineUserId?: string;
      lineIdToken?: string;
    },
  ) {
    await this.authService.verifyLineIdentity({
      lineUserId: requireNonEmptyString(body?.lineUserId, "lineUserId"),
      lineIdToken: optionalString(body?.lineIdToken),
    });

    const binding = await this.authService.getLineBindingByLineUserId(
      requireNonEmptyString(body?.lineUserId, "lineUserId"),
    );

    return {
      exists: Boolean(binding),
      binding,
    };
  }

  @Get("me")
  async me(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    return {
      user,
      lineBinding: await this.authService.getLineBindingByUserId(user.userId),
    };
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
        process.env.APP_WAP_URL ||
          process.env.APP_PUBLIC_BASE_URL ||
          process.env.APP_BASE_URL ||
          "http://127.0.0.1:3002",
      ),
    ]);

    return {
      user,
      wallet,
      cycles,
      referral,
      lineBinding: await this.authService.getLineBindingByUserId(user.userId),
    };
  }

  @Get("line-binding")
  async getOwnLineBinding(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return {
      userId: user.userId,
      memberCode: user.memberCode,
      lineBinding: await this.authService.getLineBindingByUserId(user.userId),
    };
  }

  @Get("line-bindings")
  async listAllLineBindings(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    if (!this.authService.isAdminUser(user)) {
      throw new UnauthorizedException("Admin access required.");
    }

    const items = await this.authService.listLineBindings();

    return {
      items,
      total: items.length,
    };
  }

  @Post("line-binding")
  async bindOwnLineProfile(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body()
    body?: {
      lineUserId?: string;
      lineIdToken?: string;
      displayName?: string;
      pictureUrl?: string;
      statusMessage?: string;
      source?: string;
    },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.authService.upsertLineBinding({
      userId: user.userId,
      memberCode: user.memberCode,
      lineUserId: requireNonEmptyString(body?.lineUserId, "lineUserId"),
      lineIdToken: optionalString(body?.lineIdToken),
      displayName: optionalString(body?.displayName) ?? null,
      pictureUrl: optionalUrlString(body?.pictureUrl, "pictureUrl") ?? null,
      statusMessage: optionalString(body?.statusMessage) ?? null,
      source: optionalString(body?.source) ?? "liff",
    });
  }

  @Post("line-bindings/:userId/unbind")
  async adminUnbindLineProfile(
    @Param("userId") userId: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    if (!this.authService.isAdminUser(user)) {
      throw new UnauthorizedException("Admin access required.");
    }

    const removed = await this.authService.removeLineBindingByUserId(
      requireNonEmptyString(userId, "userId"),
    );

    if (!removed) {
      throw new NotFoundException("LINE binding not found.");
    }

    return {
      removed,
      total: (await this.authService.listLineBindings()).length,
    };
  }

  @Post("line-bindings/:userId/force-rebind")
  async adminForceRebindLineProfile(
    @Param("userId") userId: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    if (!this.authService.isAdminUser(user)) {
      throw new UnauthorizedException("Admin access required.");
    }

    const result = await this.authService.forceRebindLineBindingByUserId(
      requireNonEmptyString(userId, "userId"),
    );

    if (!result.record) {
      throw new NotFoundException("LINE binding not found.");
    }

    return {
      ...result,
      total: (await this.authService.listLineBindings()).length,
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

  @Get("payment-instructions")
  async paymentInstructions(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    await this.requireSessionUser(authorization, cookieHeader);
    return readManualPaymentSettings();
  }

  @Get("orders/shipping")
  async shippingOrders(
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

    return filterCommissionResponseByVisibility(
      await this.commissionsService.listCommissions({
        beneficiaryUserId: user.userId,
        page: 1,
        pageSize: 20,
      }),
      readCommissionSettings().appVisibility,
    );
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

    if (readCommissionSettings().appVisibility.matrix === false) {
      return {
        userId: user.userId,
        autoOrderEnabled: user.matrixReentryEnabled,
        reentryEnabled: user.matrixReentryEnabled,
        cycles: [],
      };
    }

    return {
      userId: user.userId,
      autoOrderEnabled: user.matrixReentryEnabled,
      reentryEnabled: user.matrixReentryEnabled,
      cycles: await this.matrixService.getMemberMatrixCycles(user.userId),
    };
  }

  @Get("matrix-payouts")
  async matrixPayouts(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    if (readCommissionSettings().appVisibility.matrix === false) {
      return {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };
    }

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

    if (readCommissionSettings().appVisibility.pool === false) {
      return [];
    }

    return this.poolService.listMemberPoolPayouts(user.userId);
  }

  @Post("activate-product")
  async activateProduct(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body() body?: { productDetailId?: string },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.membersService.activateProductCycle({
      memberId: user.userId,
      productDetailId: requirePositiveIntegerString(
        body?.productDetailId,
        "productDetailId",
      ),
    });
  }

  @Post("activate-package")
  async activateLegacyPackage(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body() body?: { packageId?: string },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.membersService.activateProductCycle({
      memberId: user.userId,
      packageId: requirePositiveIntegerString(body?.packageId, "packageId"),
    });
  }

  @Post("orders")
  async createOwnOrder(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body()
    body?: {
      packageId?: string;
      productDetailId?: string;
      quantity?: string;
      items?: Array<{
        packageId?: string;
        productDetailId?: string;
        quantity?: string;
      }>;
      productItems?: Array<{
        packageId?: string;
        productDetailId?: string;
        quantity?: string;
      }>;
      shippingAddressId?: string;
      fulfillmentMethod?: string;
      pickupBranchName?: string;
      pickupBranchNote?: string;
      pickupRecipientName?: string;
      pickupPhone?: string;
      pickupEmail?: string;
      discountWalletAmount?: string;
      shoppingWalletAmount?: string;
      cashPaymentMethod?: string;
    },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    const rawItems = Array.isArray(body?.productItems)
      ? body?.productItems
      : body?.items;

    const items = Array.isArray(rawItems)
      ? rawItems
          .filter((item) => optionalString(item?.packageId) || optionalString(item?.productDetailId))
          .map((item) => ({
            packageId: optionalString(item?.packageId)
              ? requirePositiveIntegerString(item?.packageId, "items.packageId")
              : undefined,
            productDetailId: optionalString(item?.productDetailId)
              ? requirePositiveIntegerString(
                  item?.productDetailId,
                  "items.productDetailId",
                )
              : undefined,
            quantity: optionalString(item?.quantity)
              ? requirePositiveIntegerString(item?.quantity, "items.quantity")
              : "1",
          }))
      : undefined;

    return this.ordersService.createOrder({
      userId: user.userId,
      packageId: optionalString(body?.packageId)
        ? requirePositiveIntegerString(body?.packageId, "packageId")
        : undefined,
      productDetailId: optionalString(body?.productDetailId)
        ? requirePositiveIntegerString(body?.productDetailId, "productDetailId")
        : undefined,
      quantity: optionalString(body?.quantity)
        ? requirePositiveIntegerString(body?.quantity, "quantity")
        : undefined,
      items,
      shippingAddressId: optionalString(body?.shippingAddressId)
        ? requirePositiveIntegerString(body?.shippingAddressId, "shippingAddressId")
        : undefined,
      fulfillmentMethod:
        optionalString(body?.fulfillmentMethod)?.trim().toLowerCase() === "branch_pickup"
          ? "branch_pickup"
          : "delivery",
      pickupBranchName: optionalString(body?.pickupBranchName),
      pickupBranchNote: optionalString(body?.pickupBranchNote),
      pickupRecipientName: optionalString(body?.pickupRecipientName),
      pickupPhone: optionalString(body?.pickupPhone),
      pickupEmail: optionalString(body?.pickupEmail),
      discountWalletAmount: optionalString(body?.discountWalletAmount)
        ? requireDecimalString(body?.discountWalletAmount, "discountWalletAmount")
        : undefined,
      shoppingWalletAmount: optionalString(body?.shoppingWalletAmount)
        ? requireDecimalString(body?.shoppingWalletAmount, "shoppingWalletAmount")
        : undefined,
      cashPaymentMethod: optionalString(body?.cashPaymentMethod),
    });
  }

  @Get("shipping-addresses")
  async listOwnShippingAddresses(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    return this.membersService.listShippingAddresses(user.userId);
  }

  @Post("shipping-addresses")
  async createOwnShippingAddress(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body()
    body?: {
      label?: string;
      recipientName?: string;
      phone?: string;
      email?: string;
      countryCode?: string;
      countryName?: string;
      provinceCode?: string;
      provinceName?: string;
      districtCode?: string;
      districtName?: string;
      subdistrictCode?: string;
      subdistrictName?: string;
      postalCode?: string;
      addressLine?: string;
      note?: string;
      isDefault?: boolean;
    },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    return this.membersService.createShippingAddress(user.userId, {
      label: optionalString(body?.label),
      recipientName: requireNonEmptyString(body?.recipientName, "recipientName"),
      phone: requireNonEmptyString(body?.phone, "phone"),
      email: optionalString(body?.email),
      countryCode: optionalString(body?.countryCode),
      countryName: optionalString(body?.countryName),
      provinceCode: optionalString(body?.provinceCode),
      provinceName: optionalString(body?.provinceName),
      districtCode: optionalString(body?.districtCode),
      districtName: optionalString(body?.districtName),
      subdistrictCode: optionalString(body?.subdistrictCode),
      subdistrictName: optionalString(body?.subdistrictName),
      postalCode: optionalString(body?.postalCode),
      addressLine: requireNonEmptyString(body?.addressLine, "addressLine"),
      note: optionalString(body?.note),
      isDefault: body?.isDefault === true,
    });
  }

  @Post("shipping-addresses/:shippingAddressId/default")
  async setOwnDefaultShippingAddress(
    @Param("shippingAddressId") shippingAddressId: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    return this.membersService.setDefaultShippingAddress(
      user.userId,
      requirePositiveIntegerString(shippingAddressId, "shippingAddressId"),
    );
  }

  @Post("wallets/convert")
  async convertCommissionToShoppingWallet(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body() body?: { amount?: string },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.walletsService.convertCommissionToShoppingWallet({
      userId: user.userId,
      amount: requireDecimalString(body?.amount, "amount"),
    });
  }

  @Post("wallets/transfer")
  async transferShoppingWalletToDownline(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body()
    body?: {
      amount?: string;
      recipientUserId?: string;
      recipientMemberCode?: string;
    },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.walletsService.transferShoppingWalletToDownline({
      senderUserId: user.userId,
      recipientUserId: optionalString(body?.recipientUserId)
        ? requirePositiveIntegerString(body?.recipientUserId, "recipientUserId")
        : undefined,
      recipientMemberCode: optionalString(body?.recipientMemberCode),
      amount: requireDecimalString(body?.amount, "amount"),
    });
  }

  @Get("wallets/topup-requests")
  async listOwnWalletTopupRequests(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.walletsService.listWalletTopupRequests({
      userId: user.userId,
    });
  }

  @Post("wallets/topup-requests")
  async createOwnWalletTopupRequest(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body()
    body?: {
      amount?: string;
      paymentMethod?: string;
      transferSlipUrl?: string;
      note?: string;
    },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.walletsService.requestWalletTopup({
      userId: user.userId,
      amount: requireDecimalString(body?.amount, "amount"),
      paymentMethod: requireNonEmptyString(body?.paymentMethod, "paymentMethod")
        .toLowerCase(),
      transferSlipUrl: optionalImageReferenceString(
        body?.transferSlipUrl,
        "transferSlipUrl",
      ),
      note: optionalString(body?.note),
    });
  }

  @Get("withdraw-requests")
  async listOwnWithdrawRequests(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    return this.walletsService.listWithdrawRequests({
      userId: user.userId,
    });
  }

  @Post("withdraw-requests")
  async createOwnWithdrawRequest(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body()
    body?: {
      amount?: string;
      note?: string;
    },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.walletsService.requestWithdraw({
      userId: user.userId,
      amount: requireDecimalString(body?.amount, "amount"),
      note: optionalString(body?.note),
    });
  }

  @Get("kyc-requests")
  async listOwnKycRequests(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    return this.walletsService.listKycRequests({
      userId: user.userId,
    });
  }

  @Post("kyc-requests")
  async createOwnKycRequest(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body()
    body?: {
      nationalId?: string;
      bankName?: string;
      bankBranch?: string;
      bankAccountNumber?: string;
      bankAccountName?: string;
      bankAccountType?: string;
      personalIdImageUrl?: string;
      bankBookImageUrl?: string;
      selfieImageUrl?: string;
      note?: string;
    },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    return this.walletsService.createKycRequest({
      userId: user.userId,
      nationalId: optionalString(body?.nationalId),
      bankName: optionalString(body?.bankName),
      bankBranch: optionalString(body?.bankBranch),
      bankAccountNumber: optionalString(body?.bankAccountNumber),
      bankAccountName: optionalString(body?.bankAccountName),
      bankAccountType: optionalString(body?.bankAccountType),
      personalIdImageUrl: optionalImageReferenceString(
        body?.personalIdImageUrl,
        "personalIdImageUrl",
      ),
      bankBookImageUrl: optionalImageReferenceString(
        body?.bankBookImageUrl,
        "bankBookImageUrl",
      ),
      selfieImageUrl: optionalImageReferenceString(body?.selfieImageUrl, "selfieImageUrl"),
      note: optionalString(body?.note),
    });
  }

  @Post("orders/:orderId/submit-transfer-slip")
  async submitOwnTransferSlip(
    @Param("orderId") orderId: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body() body?: { transferSlipUrl?: string; transferSlipNote?: string },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    const validatedOrderId = requirePositiveIntegerString(orderId, "orderId");
    const order = await this.ordersService.getOrder(validatedOrderId);

    if (!order || order.sourceUserId !== user.userId) {
      throw new UnauthorizedException("Order not found for session.");
    }

    return this.ordersService.submitTransferSlip({
      orderId: validatedOrderId,
      transferSlipUrl: requireNonEmptyString(body?.transferSlipUrl, "transferSlipUrl"),
      transferSlipNote: body?.transferSlipNote
        ? requireNonEmptyString(body.transferSlipNote, "transferSlipNote")
        : undefined,
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
    const appVisibility = readCommissionSettings().appVisibility;

    return {
      order,
      commissions: filterCommissionResponseByVisibility(commissions, appVisibility),
      companyFallbacks: filterCompanyFallbacksByVisibility(
        companyFallbacks,
        appVisibility,
      ),
    };
  }

  @Get("orders/:orderId/receipt")
  async getOwnOrderReceipt(
    @Param("orderId") orderId: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Res() response?: any,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    const validatedOrderId = requirePositiveIntegerString(orderId, "orderId");
    const order = await this.ordersService.getOrder(validatedOrderId);

    if (!order || order.sourceUserId !== user.userId) {
      throw new UnauthorizedException("Order not found for session.");
    }

    const baoBaseUrl = (process.env.INTERNAL_BAO_BASE_URL || "http://bao:8001").replace(/\/+$/, "");
    const receiptToken = (process.env.INTERNAL_RECEIPT_TOKEN || "").trim();
    const receiptUrl = `${baoBaseUrl}/internal/order-source/${validatedOrderId}/receipt.pdf`;
    const upstreamResponse = await fetch(receiptUrl, {
      headers: receiptToken
        ? {
            "x-internal-receipt-token": receiptToken,
          }
        : undefined,
    });

    if (!upstreamResponse.ok) {
      throw new NotFoundException("Receipt PDF is not available.");
    }

    const contentType = upstreamResponse.headers.get("content-type") || "application/pdf";
    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());

    response.setHeader("Content-Type", contentType);
    response.setHeader(
      "Content-Disposition",
      `inline; filename="receipt-${order.orderNo}.pdf"`,
    );
    response.send(buffer);
  }

  @Post("products/:productDetailId/reviews")
  async upsertOwnProductReview(
    @Param("productDetailId") productDetailId: string,
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body() body?: { rating?: number | string; comment?: string },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    const normalizedRating = Number(body?.rating);

    if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      throw new BadRequestException("rating must be an integer between 1 and 5.");
    }

    return this.packagesService.upsertProductReview({
      productDetailId: requirePositiveIntegerString(productDetailId, "productDetailId"),
      userId: user.userId,
      rating: normalizedRating,
      comment: optionalString(body?.comment),
    });
  }

  @Post("matrix/reentry")
  async requestOwnMatrixReentry(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    try {
      const openedAutoOrder = await this.matrixService.requestMemberAutoOrder(user.userId);
      await this.ordersService.createMatrixAutoOrderAuditArtifacts({
        openedAutoOrders: [openedAutoOrder],
      });

      return {
        opened: true,
        openedAutoOrder,
        openedReentry: openedAutoOrder,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }

      throw new BadRequestException("Unable to open matrix auto order.");
    }
  }

  @Post("matrix/auto-order")
  async requestOwnMatrixAutoOrder(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    return this.requestOwnMatrixReentry(authorization, cookieHeader);
  }

  @Post("matrix/reentry-preference")
  async updateOwnMatrixReentryPreference(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body() body?: { enabled?: boolean },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);

    if (typeof body?.enabled !== "boolean") {
      throw new BadRequestException("enabled must be a boolean.");
    }

    const result = await this.matrixService.updateMemberAutoOrderPreference({
      userId: user.userId,
      enabled: body.enabled,
    });

    return {
      ...result,
      autoOrderEnabled: result.enabled,
      openedAutoOrder: result.openedAutoOrder ?? result.openedReentry ?? null,
    };
  }

  @Post("matrix/auto-order-preference")
  async updateOwnMatrixAutoOrderPreference(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body() body?: { enabled?: boolean },
  ) {
    return this.updateOwnMatrixReentryPreference(authorization, cookieHeader, body);
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
    const newPassword = requireNonEmptyString(body?.newPassword, "newPassword");

    if (newPassword.trim().length < 6) {
      throw new BadRequestException("New password must be at least 6 characters.");
    }

    return this.authService.changePassword({
      userId: user.userId,
      currentPassword: requireNonEmptyString(body?.currentPassword, "currentPassword"),
      newPassword,
    });
  }

  @Post("profile")
  async updateProfile(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Body() body?: { name?: string; email?: string; phone?: string },
  ) {
    const user = await this.requireSessionUser(authorization, cookieHeader);
    const name = body?.name?.trim() || undefined;
    const email = body?.email?.trim() || undefined;
    const phone = body?.phone?.trim() || undefined;

    if (!name && !email && !phone) {
      throw new BadRequestException("Name, email, or phone is required.");
    }

    return this.membersService.updateMemberProfile(user.userId, {
      name,
      email,
      phone,
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

function isCommissionTypeVisible(
  commissionType: string | null | undefined,
  appVisibility: ReturnType<typeof readCommissionSettings>["appVisibility"],
): boolean {
  switch ((commissionType || "").trim().toLowerCase()) {
    case "cashback":
      return appVisibility.cashback !== false;
    case "direct":
      return appVisibility.direct !== false;
    case "uni":
    case "unilevel":
      return appVisibility.unilevel !== false;
    case "pool":
      return appVisibility.pool !== false;
    default:
      return true;
  }
}

function filterCommissionResponseByVisibility<
  T extends
    | Array<{ commissionType: string }>
    | {
        items: Array<{ commissionType: string }>;
        total: number;
        page: number;
        pageSize: number;
      },
>(
  payload: T,
  appVisibility: ReturnType<typeof readCommissionSettings>["appVisibility"],
): T {
  if (Array.isArray(payload)) {
    return payload.filter((entry) =>
      isCommissionTypeVisible(entry.commissionType, appVisibility),
    ) as T;
  }

  const items = payload.items.filter((entry) =>
    isCommissionTypeVisible(entry.commissionType, appVisibility),
  );

  return {
    ...payload,
    items,
    total: items.length,
  };
}

function filterCompanyFallbacksByVisibility<
  T extends Array<{ sourceType: string }> | { items: Array<{ sourceType: string }> },
>(
  payload: T,
  appVisibility: ReturnType<typeof readCommissionSettings>["appVisibility"],
): T {
  if (Array.isArray(payload)) {
    return payload.filter((entry) =>
      isCommissionTypeVisible(entry.sourceType, appVisibility),
    ) as T;
  }

  return {
    ...payload,
    items: payload.items.filter((entry) =>
      isCommissionTypeVisible(entry.sourceType, appVisibility),
    ),
  };
}
