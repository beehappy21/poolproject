import { Body, Controller, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";

import {
  requireNonEmptyString,
  requirePositiveIntegerString,
  rethrowHttpError,
} from "../../../../../apps/api/src/http/request.util";
import { OrdersService } from "../services/orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async listOrders(
    @Query("userId") userId?: string,
    @Query("approvalStatus") approvalStatus?: string,
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
}
