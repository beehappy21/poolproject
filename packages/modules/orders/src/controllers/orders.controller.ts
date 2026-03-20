import { Body, Controller, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";

import {
  requireNonEmptyString,
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

    return this.ordersService.listOrders({
      userId: userId ? requirePositiveIntegerString(userId, "userId") : undefined,
      approvalStatus: normalizedApprovalStatus as "pending" | "approved" | undefined,
      orderNo: orderNo ? requireNonEmptyString(orderNo, "orderNo") : undefined,
      page: optionalPositiveInteger(page, "page"),
      pageSize: optionalPositiveInteger(pageSize, "pageSize"),
    });
  }

  @Post()
  async createOrder(@Body() body: { userId: string; packageId: string }) {
    try {
      return await this.ordersService.createOrder({
        userId: requirePositiveIntegerString(body.userId, "userId"),
        packageId: requirePositiveIntegerString(body.packageId, "packageId"),
      });
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
