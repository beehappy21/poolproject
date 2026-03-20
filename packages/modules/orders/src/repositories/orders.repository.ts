import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import {
  buildUtcDayRange,
  toApprovedOrderSummary,
} from "../../../../infrastructure/src/prisma/prisma.mappers";

export interface OrdersRepository {
  listOrders(filters?: {
    userId?: string;
    approvalStatus?: "pending" | "approved";
  }): Promise<
    Array<{
      orderId: string;
      orderNo: string;
      sourceUserId: string;
      status: string;
      approvalStatus: string;
      totalUsdt: string;
      totalPv: string;
      approvedAt: string | null;
      createdAt: string;
    }>
  >;

  findOrderById(orderId: string): Promise<{
    orderId: string;
    orderNo: string;
    sourceUserId: string;
    status: string;
    approvalStatus: string;
    totalUsdt: string;
    totalPv: string;
    approvedAt: string | null;
    createdAt: string;
  } | null>;

  createOrder(input: {
    userId: string;
    packageId: string;
  }): Promise<{
    orderId: string;
    orderNo: string;
    status: string;
    approvalStatus: string;
    totalUsdt: string;
    totalPv: string;
  }>;

  approveOrder(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
  } | null>;

  findApprovedOrderById(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
  } | null>;

  findApprovedOrdersForPoolDate(poolDate: string): Promise<
    Array<{
      orderId: string;
      sourceUserId: string;
      approvedAt: string;
      totalPv: string;
    }>
  >;
}

@Injectable()
export class PrismaOrdersRepository implements OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listOrders(filters?: {
    userId?: string;
    approvalStatus?: "pending" | "approved";
  }) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId: filters?.userId ? BigInt(filters.userId) : undefined,
        approvalStatus: filters?.approvalStatus
          ? filters.approvalStatus.toUpperCase() as "PENDING" | "APPROVED"
          : undefined,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        orderNo: true,
        userId: true,
        status: true,
        approvalStatus: true,
        totalUsdt: true,
        totalPv: true,
        approvedAt: true,
        createdAt: true,
      },
    });

    return orders.map((order) => ({
      orderId: order.id.toString(),
      orderNo: order.orderNo,
      sourceUserId: order.userId.toString(),
      status: order.status.toLowerCase(),
      approvalStatus: order.approvalStatus.toLowerCase(),
      totalUsdt: order.totalUsdt.toString(),
      totalPv: order.totalPv.toString(),
      approvedAt: order.approvedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
    }));
  }

  async findOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(orderId) },
      select: {
        id: true,
        orderNo: true,
        userId: true,
        status: true,
        approvalStatus: true,
        totalUsdt: true,
        totalPv: true,
        approvedAt: true,
        createdAt: true,
      },
    });

    return order
      ? {
          orderId: order.id.toString(),
          orderNo: order.orderNo,
          sourceUserId: order.userId.toString(),
          status: order.status.toLowerCase(),
          approvalStatus: order.approvalStatus.toLowerCase(),
          totalUsdt: order.totalUsdt.toString(),
          totalPv: order.totalPv.toString(),
          approvedAt: order.approvedAt?.toISOString() ?? null,
          createdAt: order.createdAt.toISOString(),
        }
      : null;
  }

  async createOrder(input: { userId: string; packageId: string }) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: BigInt(input.packageId) },
      select: {
        id: true,
        priceUsdt: true,
        pv: true,
      },
    });

    if (!pkg) {
      throw new Error("Package not found.");
    }

    const order = await this.prisma.order.create({
      data: {
        orderNo: `ORD-${Date.now()}`,
        userId: BigInt(input.userId),
        subtotalUsdt: pkg.priceUsdt,
        totalUsdt: pkg.priceUsdt,
        totalPv: pkg.pv,
        approvalStatus: "PENDING",
        status: "PENDING",
        orderItems: {
          create: [
            {
              packageId: pkg.id,
              qty: 1,
              unitPriceUsdt: pkg.priceUsdt,
              unitPv: pkg.pv,
              lineTotalUsdt: pkg.priceUsdt,
              lineTotalPv: pkg.pv,
            },
          ],
        },
      },
    });

    return {
      orderId: order.id.toString(),
      orderNo: order.orderNo,
      status: order.status.toLowerCase(),
      approvalStatus: order.approvalStatus.toLowerCase(),
      totalUsdt: order.totalUsdt.toString(),
      totalPv: order.totalPv.toString(),
    };
  }

  async approveOrder(orderId: string) {
    const approvedAt = new Date();
    const order = await this.prisma.order.update({
      where: { id: BigInt(orderId) },
      data: {
        paidAt: approvedAt,
        approvedAt,
        approvalStatus: "APPROVED",
        status: "APPROVED",
      },
      select: {
        id: true,
        userId: true,
        approvedAt: true,
        totalPv: true,
      },
    });

    return order ? toApprovedOrderSummary(order) : null;
  }

  async findApprovedOrderById(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
  } | null> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: BigInt(orderId),
        approvalStatus: "APPROVED",
        approvedAt: { not: null },
      },
      select: {
        id: true,
        userId: true,
        approvedAt: true,
        totalPv: true,
      },
    });

    return order ? toApprovedOrderSummary(order) : null;
  }

  async findApprovedOrdersForPoolDate(poolDate: string): Promise<
    Array<{
      orderId: string;
      sourceUserId: string;
      approvedAt: string;
      totalPv: string;
    }>
  > {
    const range = buildUtcDayRange(poolDate);
    const orders = await this.prisma.order.findMany({
      where: {
        approvalStatus: "APPROVED",
        approvedAt: range,
      },
      orderBy: [{ approvedAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        userId: true,
        approvedAt: true,
        totalPv: true,
      },
    });

    return orders.map(toApprovedOrderSummary);
  }
}
