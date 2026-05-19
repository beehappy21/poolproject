import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";

import {
  optionalString,
  requireDateOnlyString,
  requireDecimalString,
  requireNonEmptyString,
  requirePositiveIntegerString,
  rethrowHttpError,
} from "./http/request.util";
import { CommissionsService } from "../../../packages/modules/commissions/src/services/commissions.service";
import { MembersService } from "../../../packages/modules/members/src/services/members.service";
import { OrdersService } from "../../../packages/modules/orders/src/services/orders.service";

@Controller("internal/bao")
export class InternalBaoController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly commissionsService: CommissionsService,
    private readonly membersService: MembersService,
  ) {}

  @Post("orders")
  async createOrder(
    @Headers("x-internal-bao-token") token?: string,
    @Body()
    body?: {
      userId?: string;
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
      firmWalletAmount?: string;
      cashPaymentMethod?: string;
    },
  ) {
    this.assertInternalToken(token);

    try {
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

      return await this.ordersService.createOrder({
        userId: requirePositiveIntegerString(body?.userId, "userId"),
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
        firmWalletAmount: optionalString(body?.firmWalletAmount)
          ? requireDecimalString(body?.firmWalletAmount, "firmWalletAmount")
          : undefined,
        cashPaymentMethod: optionalString(body?.cashPaymentMethod),
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post("orders/:orderId/approve")
  async approveOrder(
    @Headers("x-internal-bao-token") token: string | undefined,
    @Param("orderId") orderId: string,
  ) {
    this.assertInternalToken(token);

    const order = await this.ordersService.approveOrder(
      requirePositiveIntegerString(orderId, "orderId"),
    );

    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    return order;
  }

  @Post("orders/:orderId/process-approved")
  async processApprovedOrder(
    @Headers("x-internal-bao-token") token: string | undefined,
    @Param("orderId") orderId: string,
  ) {
    this.assertInternalToken(token);

    try {
      return await this.ordersService.handleApprovedOrder(
        requirePositiveIntegerString(orderId, "orderId"),
      );
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post("commissions/end-of-day/:settlementDate/process")
  async processEndOfDayCommissionBatch(
    @Headers("x-internal-bao-token") token: string | undefined,
    @Param("settlementDate") settlementDate: string,
  ) {
    this.assertInternalToken(token);

    return this.commissionsService.processEndOfDayCommissionBatch(
      requireDateOnlyString(settlementDate, "settlementDate"),
    );
  }

  @Post("members/special-commission-cycle")
  async grantSpecialCommissionCycle(
    @Headers("x-internal-bao-token") token: string | undefined,
    @Body()
    body?: {
      memberId?: string;
      grantCode?: string;
      reason?: string;
      note?: string;
      grantedByAdminName?: string;
      grantedByAdminEmail?: string;
      activatedAt?: string;
    },
  ) {
    this.assertInternalToken(token);

    const grantCode = requireNonEmptyString(
      optionalString(body?.grantCode),
      "grantCode",
    ) as "SPECIAL_100_PV" | "SPECIAL_200_PV";

    if (grantCode !== "SPECIAL_100_PV" && grantCode !== "SPECIAL_200_PV") {
      throw new BadRequestException("grantCode must be SPECIAL_100_PV or SPECIAL_200_PV.");
    }

    try {
      return await this.membersService.grantSpecialCommissionCycle({
        memberId: requirePositiveIntegerString(body?.memberId, "memberId"),
        grantCode,
        reason: requireNonEmptyString(optionalString(body?.reason), "reason"),
        note: optionalString(body?.note),
        grantedByAdminName: optionalString(body?.grantedByAdminName),
        grantedByAdminEmail: optionalString(body?.grantedByAdminEmail),
        activatedAt: optionalString(body?.activatedAt),
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post("members/special-commission-cycle/close-latest")
  async closeLatestSpecialCommissionCycle(
    @Headers("x-internal-bao-token") token: string | undefined,
    @Body()
    body?: {
      memberId?: string;
      closedByAdminName?: string;
      closedByAdminEmail?: string;
      closedAt?: string;
    },
  ) {
    this.assertInternalToken(token);

    try {
      return await this.membersService.closeLatestSpecialCommissionCycle({
        memberId: requirePositiveIntegerString(body?.memberId, "memberId"),
        closedByAdminName: optionalString(body?.closedByAdminName),
        closedByAdminEmail: optionalString(body?.closedByAdminEmail),
        closedAt: optionalString(body?.closedAt),
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  private assertInternalToken(providedToken?: string): void {
    const expectedToken = (process.env.INTERNAL_RECEIPT_TOKEN || "").trim();
    const normalizedToken = requireNonEmptyString(
      optionalString(providedToken),
      "x-internal-bao-token",
    );

    if (!expectedToken || expectedToken !== normalizedToken) {
      throw new ForbiddenException("Invalid internal BAO token.");
    }
  }
}
