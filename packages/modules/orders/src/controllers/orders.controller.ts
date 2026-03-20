import { Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";

import { OrdersService } from "../services/orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get(":orderId")
  async getApprovedOrder(@Param("orderId") orderId: string) {
    const order = await this.ordersService.getApprovedOrder(orderId);

    if (!order) {
      throw new NotFoundException("Approved order not found.");
    }

    return order;
  }

  @Post(":orderId/process-approved")
  async processApprovedOrder(@Param("orderId") orderId: string) {
    return this.ordersService.handleApprovedOrder(orderId);
  }
}
