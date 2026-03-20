import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";

import {
  requirePositiveIntegerString,
  rethrowHttpError,
} from "../../../../../apps/api/src/http/request.util";
import { OrdersService } from "../services/orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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
