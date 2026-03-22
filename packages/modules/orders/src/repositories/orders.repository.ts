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
    bucket?:
      | "awaiting-payment"
      | "transfer-review"
      | "awaiting-shipment"
      | "shipped";
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
        transferSubmittedAt: string | null;
        transferSlipUrl: string | null;
        transferSlipNote: string | null;
        approvedAt: string | null;
        shippedAt: string | null;
        deliveredAt: string | null;
        shipmentTrackingNo: string | null;
        shipmentCarrier: string | null;
        shipmentNote: string | null;
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
          transferSubmittedAt: string | null;
          transferSlipUrl: string | null;
          transferSlipNote: string | null;
          approvedAt: string | null;
          shippedAt: string | null;
          deliveredAt: string | null;
          shipmentTrackingNo: string | null;
          shipmentCarrier: string | null;
          shipmentNote: string | null;
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
    transferSubmittedAt: string | null;
    transferSlipUrl: string | null;
    transferSlipNote: string | null;
    approvedAt: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    shipmentTrackingNo: string | null;
    shipmentCarrier: string | null;
    shipmentNote: string | null;
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

  submitTransferSlip(input: {
    orderId: string;
    transferSlipUrl: string;
    transferSlipNote?: string;
  }): Promise<{
    orderId: string;
    status: string;
    approvalStatus: string;
    paidAt: string | null;
    transferSubmittedAt: string | null;
    transferSlipUrl: string | null;
    transferSlipNote: string | null;
  } | null>;

  markOrderShipped(input: {
    orderId: string;
    shipmentTrackingNo?: string;
    shipmentCarrier?: string;
    shipmentNote?: string;
  }): Promise<{
    orderId: string;
    status: string;
    approvalStatus: string;
    shippedAt: string | null;
    shipmentTrackingNo: string | null;
    shipmentCarrier: string | null;
    shipmentNote: string | null;
  } | null>;

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
    bucket?:
      | "awaiting-payment"
      | "transfer-review"
      | "awaiting-shipment"
      | "shipped";
    orderNo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const bucketWhere =
      filters?.bucket === "awaiting-payment"
        ? {
            status: "PENDING" as const,
            approvalStatus: "PENDING" as const,
            paidAt: null,
          }
        : filters?.bucket === "transfer-review"
          ? {
              status: "PAID" as const,
              approvalStatus: "PENDING" as const,
              paidAt: { not: null },
            }
          : filters?.bucket === "awaiting-shipment"
            ? {
                status: "APPROVED" as const,
                approvalStatus: "APPROVED" as const,
                shippedAt: null,
              }
            : filters?.bucket === "shipped"
              ? {
                  approvalStatus: "APPROVED" as const,
                  shippedAt: { not: null },
                }
          : {};

    const where = {
      userId: filters?.userId ? BigInt(filters.userId) : undefined,
      approvalStatus: filters?.approvalStatus
        ? (filters.approvalStatus.toUpperCase() as "PENDING" | "APPROVED")
        : undefined,
      orderNo: filters?.orderNo
        ? { contains: filters.orderNo, mode: "insensitive" as const }
        : undefined,
      ...bucketWhere,
    };
    const orders = await this.prisma.order.findMany({
      where,
      orderBy:
        filters?.bucket === "transfer-review"
          ? [{ paidAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]
          : filters?.bucket === "awaiting-shipment"
            ? [{ approvedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]
            : filters?.bucket === "shipped"
              ? [{ shippedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]
          : filters?.bucket === "awaiting-payment"
            ? [{ createdAt: "desc" }, { id: "desc" }]
            : [{ paidAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
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
        transferSubmittedAt: true,
        transferSlipUrl: true,
        transferSlipNote: true,
        approvedAt: true,
        shippedAt: true,
        deliveredAt: true,
        shipmentTrackingNo: true,
        shipmentCarrier: true,
        shipmentNote: true,
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
      transferSubmittedAt: order.transferSubmittedAt?.toISOString() ?? null,
      transferSlipUrl: order.transferSlipUrl ?? null,
      transferSlipNote: order.transferSlipNote ?? null,
      approvedAt: order.approvedAt?.toISOString() ?? null,
      shippedAt: order.shippedAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      shipmentTrackingNo: order.shipmentTrackingNo ?? null,
      shipmentCarrier: order.shipmentCarrier ?? null,
      shipmentNote: order.shipmentNote ?? null,
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
        transferSubmittedAt: true,
        transferSlipUrl: true,
        transferSlipNote: true,
        approvedAt: true,
        shippedAt: true,
        deliveredAt: true,
        shipmentTrackingNo: true,
        shipmentCarrier: true,
        shipmentNote: true,
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
          transferSubmittedAt: order.transferSubmittedAt?.toISOString() ?? null,
          transferSlipUrl: order.transferSlipUrl ?? null,
          transferSlipNote: order.transferSlipNote ?? null,
          approvedAt: order.approvedAt?.toISOString() ?? null,
          shippedAt: order.shippedAt?.toISOString() ?? null,
          deliveredAt: order.deliveredAt?.toISOString() ?? null,
          shipmentTrackingNo: order.shipmentTrackingNo ?? null,
          shipmentCarrier: order.shipmentCarrier ?? null,
          shipmentNote: order.shipmentNote ?? null,
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

  async submitTransferSlip(input: {
    orderId: string;
    transferSlipUrl: string;
    transferSlipNote?: string;
  }) {
    const submittedAt = new Date();
    const order = await this.prisma.order.update({
      where: { id: BigInt(input.orderId) },
      data: {
        paidAt: submittedAt,
        transferSubmittedAt: submittedAt,
        transferSlipUrl: input.transferSlipUrl,
        transferSlipNote: input.transferSlipNote ?? null,
        approvalStatus: "PENDING",
        status: "PAID",
      },
      select: {
        id: true,
        status: true,
        approvalStatus: true,
        paidAt: true,
        transferSubmittedAt: true,
        transferSlipUrl: true,
        transferSlipNote: true,
      },
    });

    return order
      ? {
          orderId: order.id.toString(),
          status: order.status.toLowerCase(),
          approvalStatus: order.approvalStatus.toLowerCase(),
          paidAt: order.paidAt?.toISOString() ?? null,
          transferSubmittedAt: order.transferSubmittedAt?.toISOString() ?? null,
          transferSlipUrl: order.transferSlipUrl ?? null,
          transferSlipNote: order.transferSlipNote ?? null,
        }
      : null;
  }

  async markOrderShipped(input: {
    orderId: string;
    shipmentTrackingNo?: string;
    shipmentCarrier?: string;
    shipmentNote?: string;
  }) {
    const shippedAt = new Date();
    const order = await this.prisma.order.update({
      where: { id: BigInt(input.orderId) },
      data: {
        shippedAt,
        shipmentTrackingNo: input.shipmentTrackingNo ?? null,
        shipmentCarrier: input.shipmentCarrier ?? null,
        shipmentNote: input.shipmentNote ?? null,
      },
      select: {
        id: true,
        status: true,
        approvalStatus: true,
        shippedAt: true,
        shipmentTrackingNo: true,
        shipmentCarrier: true,
        shipmentNote: true,
      },
    });

    return order
      ? {
          orderId: order.id.toString(),
          status: order.status.toLowerCase(),
          approvalStatus: order.approvalStatus.toLowerCase(),
          shippedAt: order.shippedAt?.toISOString() ?? null,
          shipmentTrackingNo: order.shipmentTrackingNo ?? null,
          shipmentCarrier: order.shipmentCarrier ?? null,
          shipmentNote: order.shipmentNote ?? null,
        }
      : null;
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
