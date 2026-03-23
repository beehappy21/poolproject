import { Body, Controller, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";

import {
  optionalString,
  requireNonEmptyString,
  requireDecimalString,
  optionalPositiveInteger,
  requirePositiveIntegerString,
  rethrowHttpError,
} from "../../../../../apps/api/src/http/request.util";
import { CommissionsService } from "../../../commissions/src/services/commissions.service";
import { OrdersService } from "../services/orders.service";

@Controller("orders")
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly commissionsService: CommissionsService,
  ) {}

  @Get()
  async listOrders(
    @Query("userId") userId?: string,
    @Query("approvalStatus") approvalStatus?: string,
    @Query("bucket") bucket?: string,
    @Query("orderNo") orderNo?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const normalizedApprovalStatus = approvalStatus
      ? requireNonEmptyString(approvalStatus, "approvalStatus").toLowerCase()
      : undefined;

    if (
      normalizedApprovalStatus &&
      normalizedApprovalStatus !== "pending" &&
      normalizedApprovalStatus !== "approved"
    ) {
      throw new NotFoundException("approvalStatus must be pending or approved.");
    }

    const normalizedBucket = bucket
      ? requireNonEmptyString(bucket, "bucket").toLowerCase()
      : undefined;

    if (
      normalizedBucket &&
      normalizedBucket !== "awaiting-payment" &&
      normalizedBucket !== "transfer-review" &&
      normalizedBucket !== "awaiting-shipment" &&
      normalizedBucket !== "shipped" &&
      normalizedBucket !== "delivered"
    ) {
      throw new NotFoundException(
        "bucket must be awaiting-payment, transfer-review, awaiting-shipment, shipped, or delivered.",
      );
    }

    return this.ordersService.listOrders({
      userId: userId ? requirePositiveIntegerString(userId, "userId") : undefined,
      approvalStatus: normalizedApprovalStatus as "pending" | "approved" | undefined,
      bucket: normalizedBucket as
        | "awaiting-payment"
        | "transfer-review"
        | "awaiting-shipment"
        | "shipped"
        | "delivered"
        | undefined,
      orderNo: orderNo ? requireNonEmptyString(orderNo, "orderNo") : undefined,
      page: optionalPositiveInteger(page, "page"),
      pageSize: optionalPositiveInteger(pageSize, "pageSize"),
    });
  }

  @Post()
  async createOrder(
    @Body()
    body: {
      userId: string;
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
    try {
      const rawItems = Array.isArray(body.productItems)
        ? body.productItems
        : body.items;

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
        userId: requirePositiveIntegerString(body.userId, "userId"),
        packageId: optionalString(body.packageId)
          ? requirePositiveIntegerString(body.packageId, "packageId")
          : undefined,
        productDetailId: optionalString(body.productDetailId)
          ? requirePositiveIntegerString(body.productDetailId, "productDetailId")
          : undefined,
        quantity: optionalString(body.quantity)
          ? requirePositiveIntegerString(body.quantity, "quantity")
          : undefined,
        items,
        shippingAddressId: optionalString(body.shippingAddressId)
          ? requirePositiveIntegerString(body.shippingAddressId, "shippingAddressId")
          : undefined,
        fulfillmentMethod:
          optionalString(body.fulfillmentMethod)?.trim().toLowerCase() === "branch_pickup"
            ? "branch_pickup"
            : "delivery",
        pickupBranchName: optionalString(body.pickupBranchName),
        pickupBranchNote: optionalString(body.pickupBranchNote),
        pickupRecipientName: optionalString(body.pickupRecipientName),
        pickupPhone: optionalString(body.pickupPhone),
        pickupEmail: optionalString(body.pickupEmail),
        discountWalletAmount: optionalString(body.discountWalletAmount)
          ? requireDecimalString(body.discountWalletAmount, "discountWalletAmount")
          : undefined,
        shoppingWalletAmount: optionalString(body.shoppingWalletAmount)
          ? requireDecimalString(body.shoppingWalletAmount, "shoppingWalletAmount")
          : undefined,
        cashPaymentMethod: optionalString(body.cashPaymentMethod),
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":orderId/submit-transfer-slip")
  async submitTransferSlip(
    @Param("orderId") orderId: string,
    @Body() body: { transferSlipUrl: string; transferSlipNote?: string },
  ) {
    try {
      const order = await this.ordersService.submitTransferSlip({
        orderId: requirePositiveIntegerString(orderId, "orderId"),
        transferSlipUrl: requireNonEmptyString(
          body.transferSlipUrl,
          "transferSlipUrl",
        ),
        transferSlipNote: body.transferSlipNote
          ? requireNonEmptyString(body.transferSlipNote, "transferSlipNote")
          : undefined,
      });

      if (!order) {
        throw new NotFoundException("Order not found.");
      }

      return order;
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":orderId/ship")
  async markOrderShipped(
    @Param("orderId") orderId: string,
    @Body()
    body: {
      shipmentTrackingNo?: string;
      shipmentCarrier?: string;
      shipmentNote?: string;
    },
  ) {
    try {
      const order = await this.ordersService.markOrderShipped({
        orderId: requirePositiveIntegerString(orderId, "orderId"),
        shipmentTrackingNo: body.shipmentTrackingNo
          ? requireNonEmptyString(body.shipmentTrackingNo, "shipmentTrackingNo")
          : undefined,
        shipmentCarrier: body.shipmentCarrier
          ? requireNonEmptyString(body.shipmentCarrier, "shipmentCarrier")
          : undefined,
        shipmentNote: body.shipmentNote
          ? requireNonEmptyString(body.shipmentNote, "shipmentNote")
          : undefined,
      });

      if (!order) {
        throw new NotFoundException("Order not found.");
      }

      return order;
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":orderId/deliver")
  async markOrderDelivered(
    @Param("orderId") orderId: string,
    @Body()
    body: {
      shipmentNote?: string;
    },
  ) {
    try {
      const order = await this.ordersService.markOrderDelivered({
        orderId: requirePositiveIntegerString(orderId, "orderId"),
        shipmentNote: body.shipmentNote
          ? requireNonEmptyString(body.shipmentNote, "shipmentNote")
          : undefined,
      });

      if (!order) {
        throw new NotFoundException("Order not found.");
      }

      return order;
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":orderId/approve")
  async approveOrder(@Param("orderId") orderId: string) {
    const order = await this.ordersService.approveOrder(
      requirePositiveIntegerString(orderId, "orderId"),
    );

    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    return order;
  }

  @Get(":orderId")
  async getOrder(@Param("orderId") orderId: string) {
    const order = await this.ordersService.getOrder(
      requirePositiveIntegerString(orderId, "orderId"),
    );

    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    return order;
  }

  @Get(":orderId/snapshot")
  async getOrderSnapshot(@Param("orderId") orderId: string) {
    const validatedOrderId = requirePositiveIntegerString(orderId, "orderId");
    const order = await this.ordersService.getOrder(validatedOrderId);

    if (!order) {
      throw new NotFoundException("Order not found.");
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

  @Post(":orderId/process-approved")
  async processApprovedOrder(@Param("orderId") orderId: string) {
    try {
      return await this.ordersService.handleApprovedOrder(
        requirePositiveIntegerString(orderId, "orderId"),
      );
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":orderId/reprocess")
  async reprocessApprovedOrder(@Param("orderId") orderId: string) {
    try {
      return await this.ordersService.handleApprovedOrder(
        requirePositiveIntegerString(orderId, "orderId"),
      );
    } catch (error) {
      rethrowHttpError(error);
    }
  }
}
