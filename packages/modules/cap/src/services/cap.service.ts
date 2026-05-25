import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import {
  addDecimalStrings,
  compareDecimalStrings,
  maxDecimalString,
  minDecimalString,
  subtractDecimalStrings,
} from "../../../../shared/utils/src/money.util";
import { CapAllocation, CapBucketSummary, CapSummary } from "../domain/cap.types";

const DEFAULT_CAP_AMOUNT = "10000";

function decimal(value: { toString(): string } | null | undefined): string {
  return value?.toString() ?? "0";
}

function id(value: bigint | null | undefined): string | null {
  return value === null || value === undefined ? null : value.toString();
}

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function remainingForBucket(bucket: {
  grantedAmount: { toString(): string };
  adjustedAmount: { toString(): string };
  usedCommissionAmount: { toString(): string };
  reservedDcwAmount: { toString(): string };
  usedDcwAmount: { toString(): string };
}) {
  return maxDecimalString(
    subtractDecimalStrings(
      subtractDecimalStrings(
        addDecimalStrings(decimal(bucket.grantedAmount), decimal(bucket.adjustedAmount)),
        decimal(bucket.usedCommissionAmount),
      ),
      addDecimalStrings(decimal(bucket.reservedDcwAmount), decimal(bucket.usedDcwAmount)),
    ),
    "0",
  );
}

function configuredCapOrDefault(value: string): string {
  return compareDecimalStrings(value, "0") > 0 ? value : DEFAULT_CAP_AMOUNT;
}

@Injectable()
export class CapService {
  constructor(private readonly prisma: PrismaService) {}

  async getCapSummary(userId: string): Promise<CapSummary> {
    const buckets = await this.prisma.capBucket.findMany({
      where: { userId: BigInt(userId) },
      orderBy: [{ sourceApprovedAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });

    const mapped = buckets.map((bucket): CapBucketSummary => {
      const remaining = remainingForBucket(bucket);

      return {
        bucketId: bucket.id.toString(),
        userId: bucket.userId.toString(),
        sourceOrderId: id(bucket.sourceOrderId),
        sourceOrderItemId: id(bucket.sourceOrderItemId),
        memberPackageCycleId: id(bucket.memberPackageCycleId),
        sourceType: bucket.sourceType,
        grantIndex: bucket.grantIndex,
        grantedAmount: decimal(bucket.grantedAmount),
        usedByCommission: decimal(bucket.usedCommissionAmount),
        reservedByDcw: decimal(bucket.reservedDcwAmount),
        usedByDcw: decimal(bucket.usedDcwAmount),
        adjusted: decimal(bucket.adjustedAmount),
        remaining,
        status: bucket.status.toLowerCase() as CapBucketSummary["status"],
        sourceApprovedAt: iso(bucket.sourceApprovedAt),
        createdAt: bucket.createdAt.toISOString(),
      };
    });

    return mapped.reduce<CapSummary>(
      (summary, bucket) => ({
        userId,
        totalGranted: addDecimalStrings(summary.totalGranted, bucket.grantedAmount),
        usedByCommission: addDecimalStrings(summary.usedByCommission, bucket.usedByCommission),
        reservedByDcw: addDecimalStrings(summary.reservedByDcw, bucket.reservedByDcw),
        usedByDcw: addDecimalStrings(summary.usedByDcw, bucket.usedByDcw),
        adjusted: addDecimalStrings(summary.adjusted, bucket.adjusted),
        remaining: addDecimalStrings(summary.remaining, bucket.remaining),
        buckets: [...summary.buckets, bucket],
      }),
      {
        userId,
        totalGranted: "0",
        usedByCommission: "0",
        reservedByDcw: "0",
        usedByDcw: "0",
        adjusted: "0",
        remaining: "0",
        buckets: [],
      },
    );
  }

  async grantCapForApprovedOrder(orderId: string): Promise<{ grantedCount: number }> {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(orderId) },
      select: {
        id: true,
        userId: true,
        status: true,
        approvalStatus: true,
        approvedAt: true,
        createdAt: true,
        orderItems: {
          orderBy: [{ id: "asc" }],
          select: {
            id: true,
            packageId: true,
            productId: true,
            qty: true,
          },
        },
      },
    });

    if (!order || order.approvalStatus !== "APPROVED") {
      return { grantedCount: 0 };
    }

    let grantedCount = 0;

    for (const item of order.orderItems) {
      const capAmount = await this.resolveCapAmountForOrderItem({
        packageId: item.packageId,
        productDetailId: item.productId,
      });

      if (compareDecimalStrings(capAmount, "0") <= 0) {
        continue;
      }

      const quantity = Math.max(1, item.qty || 1);
      for (let grantIndex = 0; grantIndex < quantity; grantIndex += 1) {
        const memberPackageCycleId = await this.findUnlinkedCycleForOrderItem({
          userId: order.userId,
          packageId: item.packageId,
          productDetailId: item.productId,
          activatedAt: order.approvedAt ?? order.createdAt,
        });
        const created = await this.createGrantBucket({
          userId: order.userId,
          memberPackageCycleId,
          sourceOrderId: order.id,
          sourceOrderItemId: item.id,
          sourceType: item.packageId ? "package_order_item" : "product_order_item",
          grantIndex,
          amount: capAmount,
          sourceApprovedAt: order.approvedAt ?? order.createdAt,
        });

        if (created) {
          grantedCount += 1;
        }
      }
    }

    return { grantedCount };
  }

  async allocateFifo(
    userId: string,
    amount: string,
    _purpose: "commission" | "dcw",
  ): Promise<CapAllocation[]> {
    if (compareDecimalStrings(amount, "0") <= 0) {
      return [];
    }

    const buckets = await this.prisma.capBucket.findMany({
      where: { userId: BigInt(userId), status: "OPEN" },
      orderBy: [{ sourceApprovedAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
    const allocations: CapAllocation[] = [];
    let remainingAmount = amount;

    for (const bucket of buckets) {
      if (compareDecimalStrings(remainingAmount, "0") <= 0) {
        break;
      }

      const bucketRemaining = remainingForBucket(bucket);
      if (compareDecimalStrings(bucketRemaining, "0") <= 0) {
        continue;
      }

      const allocated = minDecimalString(bucketRemaining, remainingAmount);
      allocations.push({
        bucketId: bucket.id.toString(),
        amount: allocated,
        remainingBefore: bucketRemaining,
        remainingAfter: subtractDecimalStrings(bucketRemaining, allocated),
      });
      remainingAmount = subtractDecimalStrings(remainingAmount, allocated);
    }

    return allocations;
  }

  async reserveDcw(orderId: string, userId: string, amount: string) {
    const existing = await this.prisma.capLedger.findFirst({
      where: {
        relatedOrderId: BigInt(orderId),
        movementType: "DCW_RESERVE",
        status: { in: ["PENDING", "POSTED"] },
      },
      select: { id: true },
    });

    if (existing) {
      return { reserved: false, reasonCode: "already_reserved" as const };
    }

    const allocations = await this.allocateFifo(userId, amount, "dcw");
    const allocatedTotal = allocations.reduce(
      (sum, allocation) => addDecimalStrings(sum, allocation.amount),
      "0",
    );

    if (compareDecimalStrings(allocatedTotal, amount) < 0) {
      return { reserved: false, reasonCode: "insufficient_cap" as const };
    }

    await this.prisma.$transaction(
      allocations.map((allocation) =>
        this.prisma.capBucket.update({
          where: { id: BigInt(allocation.bucketId) },
          data: {
            reservedDcwAmount: { increment: new Prisma.Decimal(allocation.amount) },
            ledgers: {
              create: {
                userId: BigInt(userId),
                sourceType: "order",
                movementType: "DCW_RESERVE",
                amount: allocation.amount,
                status: "PENDING",
                relatedOrderId: BigInt(orderId),
                idempotencyKey: `cap:dcw-reserve:${orderId}:${allocation.bucketId}`,
              },
            },
          },
        }),
      ),
    );

    return { reserved: true, reasonCode: null, allocations };
  }

  async releaseDcw(orderId: string) {
    const reservations = await this.prisma.capLedger.findMany({
      where: {
        relatedOrderId: BigInt(orderId),
        movementType: "DCW_RESERVE",
        status: "PENDING",
        bucketId: { not: null },
      },
      select: { id: true, bucketId: true, userId: true, amount: true },
    });

    await this.prisma.$transaction(
      reservations.flatMap((reservation) => [
        this.prisma.capBucket.update({
          where: { id: reservation.bucketId! },
          data: {
            reservedDcwAmount: {
              decrement: reservation.amount,
            },
          },
        }),
        this.prisma.capLedger.update({
          where: { id: reservation.id },
          data: { status: "REVERSED" },
        }),
        this.prisma.capLedger.create({
          data: {
            bucketId: reservation.bucketId,
            userId: reservation.userId,
            sourceType: "order",
            movementType: "DCW_RELEASE",
            amount: reservation.amount,
            status: "POSTED",
            relatedOrderId: BigInt(orderId),
            postedAt: new Date(),
            idempotencyKey: `cap:dcw-release:${orderId}:${reservation.bucketId}`,
          },
        }),
      ]),
    );

    return { releasedCount: reservations.length };
  }

  async commitDcw(orderId: string) {
    const reservations = await this.prisma.capLedger.findMany({
      where: {
        relatedOrderId: BigInt(orderId),
        movementType: "DCW_RESERVE",
        status: "PENDING",
        bucketId: { not: null },
      },
      select: { id: true, bucketId: true, userId: true, amount: true },
    });

    await this.prisma.$transaction(
      reservations.flatMap((reservation) => [
        this.prisma.capBucket.update({
          where: { id: reservation.bucketId! },
          data: {
            reservedDcwAmount: { decrement: reservation.amount },
            usedDcwAmount: { increment: reservation.amount },
          },
        }),
        this.prisma.capLedger.update({
          where: { id: reservation.id },
          data: { status: "POSTED", postedAt: new Date() },
        }),
        this.prisma.capLedger.create({
          data: {
            bucketId: reservation.bucketId,
            userId: reservation.userId,
            sourceType: "order",
            movementType: "DCW_COMMIT",
            amount: reservation.amount,
            status: "POSTED",
            relatedOrderId: BigInt(orderId),
            postedAt: new Date(),
            idempotencyKey: `cap:dcw-commit:${orderId}:${reservation.bucketId}`,
          },
        }),
      ]),
    );

    await this.refreshBucketStatuses(reservations.map((entry) => entry.bucketId!));
    return { committedCount: reservations.length };
  }

  async commitCommission(commissionLedgerId: string) {
    // Phase 2 will wire commission finalization into FIFO CAP consumption.
    // Current commission cap accounting remains on MemberPackageCycle.earnedTotalInCycle.
    void commissionLedgerId;
    return { committed: false, reasonCode: "not_integrated_yet" as const };
  }

  private async resolveCapAmountForOrderItem(input: {
    packageId: bigint | null;
    productDetailId: string | null;
  }) {
    if (input.packageId) {
      const pkg = await this.prisma.package.findUnique({
        where: { id: input.packageId },
        select: { earningCapAmount: true },
      });
      return configuredCapOrDefault(decimal(pkg?.earningCapAmount));
    }

    if (input.productDetailId) {
      const detail = await this.prisma.productDetail.findUnique({
        where: { id: BigInt(input.productDetailId) },
        select: { earningCapAmount: true },
      });
      return configuredCapOrDefault(decimal(detail?.earningCapAmount));
    }

    return "0";
  }

  private async createGrantBucket(input: {
    userId: bigint;
    memberPackageCycleId: bigint | null;
    sourceOrderId: bigint;
    sourceOrderItemId: bigint;
    sourceType: string;
    grantIndex: number;
    amount: string;
    sourceApprovedAt: Date;
  }) {
    const idempotencyKey = `cap:grant:${input.sourceOrderItemId.toString()}:${input.grantIndex}`;
    const existing = await this.prisma.capLedger.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });

    if (existing) {
      return false;
    }

    await this.prisma.$transaction(async (tx) => {
      const bucket = await tx.capBucket.create({
        data: {
          userId: input.userId,
          memberPackageCycleId: input.memberPackageCycleId ?? undefined,
          sourceOrderId: input.sourceOrderId,
          sourceOrderItemId: input.sourceOrderItemId,
          sourceType: input.sourceType,
          grantIndex: input.grantIndex,
          grantedAmount: input.amount,
          status: "OPEN",
          sourceApprovedAt: input.sourceApprovedAt,
        },
        select: { id: true },
      });

      await tx.capLedger.create({
        data: {
          bucketId: bucket.id,
          userId: input.userId,
          memberPackageCycleId: input.memberPackageCycleId ?? undefined,
          sourceOrderId: input.sourceOrderId,
          sourceOrderItemId: input.sourceOrderItemId,
          sourceType: input.sourceType,
          movementType: "GRANT",
          amount: input.amount,
          status: "POSTED",
          idempotencyKey,
          postedAt: new Date(),
        },
      });
    });

    return true;
  }

  private async findUnlinkedCycleForOrderItem(input: {
    userId: bigint;
    packageId: bigint | null;
    productDetailId: string | null;
    activatedAt: Date;
  }): Promise<bigint | null> {
    const cycle = await this.prisma.memberPackageCycle.findFirst({
      where: {
        userId: input.userId,
        packageId: input.packageId ?? undefined,
        productDetailId:
          !input.packageId && input.productDetailId
            ? BigInt(input.productDetailId)
            : undefined,
        activatedAt: input.activatedAt,
        capBuckets: {
          none: {},
        },
      },
      orderBy: [{ id: "asc" }],
      select: { id: true },
    });

    return cycle?.id ?? null;
  }

  private async refreshBucketStatuses(bucketIds: bigint[]) {
    for (const bucketId of Array.from(new Set(bucketIds.map((value) => value.toString())))) {
      const bucket = await this.prisma.capBucket.findUnique({
        where: { id: BigInt(bucketId) },
      });

      if (!bucket) {
        continue;
      }

      const remaining = remainingForBucket(bucket);
      await this.prisma.capBucket.update({
        where: { id: bucket.id },
        data: {
          status: compareDecimalStrings(remaining, "0") <= 0 ? "EXHAUSTED" : "OPEN",
        },
      });
    }
  }
}
