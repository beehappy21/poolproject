import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import {
  buildUtcDayRange,
  toApprovedOrderSummary,
} from "../../../../infrastructure/src/prisma/prisma.mappers";
import {
  readCommissionSettings,
  serializeCommissionSettingsSnapshot,
} from "../../../../shared/utils/src/commission-settings.util";
import {
  readMatrixSettings,
  serializeMatrixSettingsSnapshot,
} from "../../../../shared/utils/src/matrix-settings.util";

export interface OrdersRepository {
  listOrders(filters?: {
    userId?: string;
    approvalStatus?: "pending" | "approved";
    orderNo?: string;
    page?: number;
    pageSize?: number;
  }): Promise<
    | Array<{
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
    | {
        items: Array<{
          orderId: string;
          orderNo: string;
          sourceUserId: string;
          status: string;
          approvalStatus: string;
          totalUsdt: string;
          totalPv: string;
          approvedAt: string | null;
          createdAt: string;
        }>;
        total: number;
        page: number;
        pageSize: number;
      }
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
    commissionSettingsSnapshot: string | null;
    matrixSettingsSnapshot: string | null;
  } | null>;

  findApprovedOrderById(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    commissionSettingsSnapshot: string | null;
    matrixSettingsSnapshot: string | null;
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
    orderNo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where = {
        userId: filters?.userId ? BigInt(filters.userId) : undefined,
        approvalStatus: filters?.approvalStatus
          ? filters.approvalStatus.toUpperCase() as "PENDING" | "APPROVED"
          : undefined,
        orderNo: filters?.orderNo
          ? { contains: filters.orderNo, mode: "insensitive" as const }
          : undefined,
      };
    const orders = await this.prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip:
        filters?.page && filters?.pageSize
          ? (filters.page - 1) * filters.pageSize
          : undefined,
      take: filters?.pageSize ?? 100,
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

    const items = orders.map((order) => ({
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

    if (!filters?.page || !filters?.pageSize) {
      return items;
    }

    const total = await this.prisma.order.count({ where });

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
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
    const commissionSettingsSnapshot = serializeCommissionSettingsSnapshot(
      readCommissionSettings(),
    );
    const matrixSettingsSnapshot = serializeMatrixSettingsSnapshot(readMatrixSettings());
    const order = await this.prisma.order.update({
      where: { id: BigInt(orderId) },
      data: {
        paidAt: approvedAt,
        approvedAt,
        commissionSettingsSnapshot,
        matrixSettingsSnapshot,
        approvalStatus: "APPROVED",
        status: "APPROVED",
      },
      select: {
        id: true,
        userId: true,
        approvedAt: true,
        totalPv: true,
        commissionSettingsSnapshot: true,
        matrixSettingsSnapshot: true,
      },
    });

    return order
      ? {
          orderId: order.id.toString(),
          sourceUserId: order.userId.toString(),
          approvedAt: order.approvedAt?.toISOString() ?? "",
          totalPv: order.totalPv.toString(),
          commissionSettingsSnapshot: order.commissionSettingsSnapshot,
          matrixSettingsSnapshot: order.matrixSettingsSnapshot,
        }
      : null;
  }

  async findApprovedOrderById(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    commissionSettingsSnapshot: string | null;
    matrixSettingsSnapshot: string | null;
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
        commissionSettingsSnapshot: true,
        matrixSettingsSnapshot: true,
      },
    });

    return order
      ? {
          orderId: order.id.toString(),
          sourceUserId: order.userId.toString(),
          approvedAt: order.approvedAt?.toISOString() ?? "",
          totalPv: order.totalPv.toString(),
          commissionSettingsSnapshot: order.commissionSettingsSnapshot,
          matrixSettingsSnapshot: order.matrixSettingsSnapshot,
        }
      : null;
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
