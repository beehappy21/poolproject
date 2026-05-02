import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import {
  PoolEligibilityDecision,
  PoolEligibilityMemberSnapshot,
  PoolFundingResult,
  PoolRecipientDraftResult,
} from "../domain/pool.types";
import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import { addDecimalStrings } from "../../../../shared/utils/src/money.util";

const BANGKOK_UTC_OFFSET_HOURS = 7;

function parseDateOnlyParts(dateOnly: string) {
  const [year, month, day] = dateOnly.split("-").map((part) => Number(part));
  return { year, month, day };
}

function toBangkokUtcDate(input: {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
}) {
  return new Date(
    Date.UTC(
      input.year,
      input.month - 1,
      input.day,
      (input.hour ?? 0) - BANGKOK_UTC_OFFSET_HOURS,
      input.minute ?? 0,
      input.second ?? 0,
      input.millisecond ?? 0,
    ),
  );
}

function buildBangkokSingleDayRange(dateOnly: string) {
  const { year, month, day } = parseDateOnlyParts(dateOnly);
  return {
    gte: toBangkokUtcDate({
      year,
      month,
      day,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    }),
    lte: toBangkokUtcDate({
      year,
      month,
      day,
      hour: 23,
      minute: 59,
      second: 59,
      millisecond: 999,
    }),
  } satisfies Prisma.DateTimeFilter;
}

export interface PoolRepository {
  listPoolCycles(filters?: {
    poolDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<
    | Array<{
        poolCycleId: string;
        poolDate: string;
        fundingTotalApprovedPv: string;
        poolFund: string;
        eligibleMemberCount: number;
        payoutPerMember: string;
        companyFallbackAmount: string;
        status: string;
      }>
    | {
        items: Array<{
          poolCycleId: string;
          poolDate: string;
          fundingTotalApprovedPv: string;
          poolFund: string;
          eligibleMemberCount: number;
          payoutPerMember: string;
          companyFallbackAmount: string;
          status: string;
        }>;
        total: number;
        page: number;
        pageSize: number;
      }
  >;

  findApprovedOrderFunding(poolDate: string): Promise<{
    approvedOrderCount: number;
    fundingTotalApprovedPv: string;
  }>;

  createOrUpdatePoolCycle(input: PoolFundingResult & {
    evaluationAt: string;
    settingsSnapshot: string;
    eligibleMemberCount: number;
    payoutPerMember: string;
    companyFallbackAmount: string;
  }): Promise<{ poolCycleId: string }>;

  saveEligibilitySnapshots(
    poolCycleId: string,
    decisions: PoolEligibilityDecision[],
  ): Promise<void>;

  createPoolPayoutDrafts(input: {
    poolCycleId: string;
    recipientDrafts: Array<{
      userId: string;
      beneficiaryCycleId: string | null;
      commissionLedgerId: string | null;
      payoutAmount: string;
      status: "approved" | "held" | "withdrawable" | "fallback";
      blockReason: string | null;
    }>;
  }): Promise<void>;

  updatePoolCycleCloseSummary(input: {
    poolCycleId: string;
    companyFallbackAmount: string;
  }): Promise<void>;

  getPoolCycle(poolDate: string): Promise<{
    poolCycleId: string;
    poolDate: string;
    fundingTotalApprovedPv: string;
    poolFund: string;
    eligibleMemberCount: number;
    payoutPerMember: string;
    companyFallbackAmount: string;
    status: string;
  } | null>;

  listPoolPayouts(poolDate: string): Promise<
    Array<{
      payoutId: string;
      userId: string;
      beneficiaryCycleId: string | null;
      commissionLedgerId: string | null;
      payoutAmount: string;
      status: string;
      blockReason: string | null;
    }>
  >;

  listMemberPoolPayouts(userId: string): Promise<
    Array<{
      payoutId: string;
      poolDate: string;
      beneficiaryCycleId: string | null;
      payoutAmount: string;
      status: string;
      blockReason: string | null;
      createdAt: string;
    }>
  >;

  listWeeklyEligibilitySnapshots(input: {
    poolDate: string;
    evaluationAt: string;
  }): Promise<PoolEligibilityMemberSnapshot[]>;
}

@Injectable()
export class PrismaPoolRepository implements PoolRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPoolCycles(filters?: {
    poolDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where = {
      cycleDate: filters?.poolDate
        ? new Date(`${filters.poolDate}T00:00:00.000Z`)
        : undefined,
    };
    const cycles = await this.prisma.dailyPoolCycle.findMany({
      where,
      orderBy: [{ cycleDate: "desc" }, { id: "desc" }],
      skip:
        filters?.page && filters?.pageSize
          ? (filters.page - 1) * filters.pageSize
          : undefined,
      take: filters?.pageSize ?? 100,
      select: {
        id: true,
        cycleDate: true,
        fundingTotalApprovedPv: true,
        poolFund: true,
        eligibleMemberCount: true,
        payoutPerMember: true,
        companyFallbackAmount: true,
        status: true,
      },
    });

    const items = cycles.map((cycle) => ({
      poolCycleId: cycle.id.toString(),
      poolDate: cycle.cycleDate.toISOString().slice(0, 10),
      fundingTotalApprovedPv: cycle.fundingTotalApprovedPv.toString(),
      poolFund: cycle.poolFund.toString(),
      eligibleMemberCount: cycle.eligibleMemberCount,
      payoutPerMember: cycle.payoutPerMember.toString(),
      companyFallbackAmount: cycle.companyFallbackAmount.toString(),
      status: cycle.status.toLowerCase(),
    }));

    if (!filters?.page || !filters?.pageSize) {
      return items;
    }

    const total = await this.prisma.dailyPoolCycle.count({ where });

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async findApprovedOrderFunding(poolDate: string): Promise<{
    approvedOrderCount: number;
    fundingTotalApprovedPv: string;
  }> {
    const cycle = await this.prisma.dailyPoolCycle.findFirst({
      where: { cycleDate: new Date(`${poolDate}T00:00:00.000Z`) },
      select: {
        fundingApprovedOrderCount: true,
        fundingTotalApprovedPv: true,
      },
    });

    return {
      approvedOrderCount: cycle?.fundingApprovedOrderCount ?? 0,
      fundingTotalApprovedPv: cycle?.fundingTotalApprovedPv.toString() ?? "0",
    };
  }

  async createOrUpdatePoolCycle(input: PoolFundingResult & {
    evaluationAt: string;
    settingsSnapshot: string;
    eligibleMemberCount: number;
    payoutPerMember: string;
    companyFallbackAmount: string;
  }): Promise<{ poolCycleId: string }> {
    const snapshotAt = new Date();
    const cycle = await this.prisma.dailyPoolCycle.upsert({
      where: { cycleDate: new Date(`${input.poolDate}T00:00:00.000Z`) },
      update: {
        snapshotAt,
        evaluationAt: new Date(input.evaluationAt),
        fundingApprovedOrderCount: input.approvedOrderCount,
        fundingTotalApprovedPv: input.fundingTotalApprovedPv,
        poolRate: input.poolRate,
        settingsSnapshot: input.settingsSnapshot,
        poolFund: input.poolFund,
        eligibleMemberCount: input.eligibleMemberCount,
        payoutPerMember: input.payoutPerMember,
        companyFallbackAmount: input.companyFallbackAmount,
        status: "CLOSED",
      },
      create: {
        cycleDate: new Date(`${input.poolDate}T00:00:00.000Z`),
        snapshotAt,
        evaluationAt: new Date(input.evaluationAt),
        totalPv: input.fundingTotalApprovedPv,
        fundingApprovedOrderCount: input.approvedOrderCount,
        fundingTotalApprovedPv: input.fundingTotalApprovedPv,
        poolRate: input.poolRate,
        settingsSnapshot: input.settingsSnapshot,
        poolFund: input.poolFund,
        eligibleMemberCount: input.eligibleMemberCount,
        payoutPerMember: input.payoutPerMember,
        companyFallbackAmount: input.companyFallbackAmount,
        status: "CLOSED",
      },
      select: { id: true },
    });

    return { poolCycleId: cycle.id.toString() };
  }

  async saveEligibilitySnapshots(
    poolCycleId: string,
    decisions: PoolEligibilityDecision[],
  ): Promise<void> {
    await this.prisma.dailyPoolEligibilitySnapshot.deleteMany({
      where: { cycleId: BigInt(poolCycleId) },
    });

    if (decisions.length === 0) {
      return;
    }

    await this.prisma.dailyPoolEligibilitySnapshot.createMany({
      data: decisions.map((decision) => ({
        cycleId: BigInt(poolCycleId),
        userId: BigInt(decision.userId),
        isMemberActive: decision.memberActive,
        activeDirectReferralCount: decision.activeDirectReferralCount,
        isEligible: decision.eligible,
        reason: decision.reasonCode,
      })),
    });
  }

  async createPoolPayoutDrafts(input: {
    poolCycleId: string;
    recipientDrafts: Array<{
      userId: string;
      beneficiaryCycleId: string | null;
      commissionLedgerId: string | null;
      payoutAmount: string;
      status: "approved" | "held" | "withdrawable" | "fallback";
      blockReason: string | null;
    }>;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.dailyPoolPayout.deleteMany({
        where: { cycleId: BigInt(input.poolCycleId) },
      });

      if (input.recipientDrafts.length === 0) {
        return;
      }

      await tx.dailyPoolPayout.createMany({
        data: input.recipientDrafts.map((recipient) => ({
          cycleId: BigInt(input.poolCycleId),
          userId: BigInt(recipient.userId),
          beneficiaryCycleId: recipient.beneficiaryCycleId
            ? BigInt(recipient.beneficiaryCycleId)
            : null,
          commissionLedgerId: recipient.commissionLedgerId
            ? BigInt(recipient.commissionLedgerId)
            : null,
          payoutAmount: recipient.payoutAmount,
          status:
            recipient.status === "held"
              ? "HELD"
              : recipient.status === "withdrawable"
                ? "WITHDRAWABLE"
                : recipient.status === "approved"
                  ? "APPROVED"
                  : "FALLBACK",
          blockReason: recipient.blockReason,
        })),
      });
    });
  }

  async updatePoolCycleCloseSummary(input: {
    poolCycleId: string;
    companyFallbackAmount: string;
  }): Promise<void> {
    await this.prisma.dailyPoolCycle.update({
      where: { id: BigInt(input.poolCycleId) },
      data: {
        companyFallbackAmount: input.companyFallbackAmount,
      },
    });
  }

  async getPoolCycle(poolDate: string) {
    const cycle = await this.prisma.dailyPoolCycle.findUnique({
      where: { cycleDate: new Date(`${poolDate}T00:00:00.000Z`) },
      select: {
        id: true,
        cycleDate: true,
        fundingTotalApprovedPv: true,
        poolFund: true,
        eligibleMemberCount: true,
        payoutPerMember: true,
        companyFallbackAmount: true,
        status: true,
      },
    });

    if (!cycle) {
      return null;
    }

    return {
      poolCycleId: cycle.id.toString(),
      poolDate: cycle.cycleDate.toISOString().slice(0, 10),
      fundingTotalApprovedPv: cycle.fundingTotalApprovedPv.toString(),
      poolFund: cycle.poolFund.toString(),
      eligibleMemberCount: cycle.eligibleMemberCount,
      payoutPerMember: cycle.payoutPerMember.toString(),
      companyFallbackAmount: cycle.companyFallbackAmount.toString(),
      status: cycle.status.toLowerCase(),
    };
  }

  async listPoolPayouts(poolDate: string) {
    const cycle = await this.prisma.dailyPoolCycle.findUnique({
      where: { cycleDate: new Date(`${poolDate}T00:00:00.000Z`) },
      select: { id: true },
    });

    if (!cycle) {
      return [];
    }

    const payouts = await this.prisma.dailyPoolPayout.findMany({
      where: { cycleId: cycle.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        userId: true,
        beneficiaryCycleId: true,
        commissionLedgerId: true,
        payoutAmount: true,
        status: true,
        blockReason: true,
      },
    });

    return payouts.map((payout) => ({
      payoutId: payout.id.toString(),
      userId: payout.userId.toString(),
      beneficiaryCycleId: payout.beneficiaryCycleId?.toString() ?? null,
      commissionLedgerId: payout.commissionLedgerId?.toString() ?? null,
      payoutAmount: payout.payoutAmount.toString(),
      status: payout.status.toLowerCase(),
      blockReason: payout.blockReason,
    }));
  }

  async listMemberPoolPayouts(userId: string) {
    const payouts = await this.prisma.dailyPoolPayout.findMany({
      where: { userId: BigInt(userId) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        beneficiaryCycleId: true,
        payoutAmount: true,
        status: true,
        blockReason: true,
        createdAt: true,
        cycle: {
          select: {
            cycleDate: true,
          },
        },
      },
    });

    return payouts.map((payout) => ({
      payoutId: payout.id.toString(),
      poolDate: payout.cycle.cycleDate.toISOString().slice(0, 10),
      beneficiaryCycleId: payout.beneficiaryCycleId?.toString() ?? null,
      payoutAmount: payout.payoutAmount.toString(),
      status: payout.status.toLowerCase(),
      blockReason: payout.blockReason,
      createdAt: payout.createdAt.toISOString(),
    }));
  }

  async listWeeklyEligibilitySnapshots(input: {
    poolDate: string;
    evaluationAt: string;
  }): Promise<PoolEligibilityMemberSnapshot[]> {
    const dayRange = buildBangkokSingleDayRange(input.poolDate);
    const dayStart = dayRange.gte;
    const evaluationAt = new Date(input.evaluationAt);

    const users = await this.prisma.user.findMany({
      where: {
        status: "ACTIVE",
        payoutStatus: "ACTIVE",
      },
      select: {
        id: true,
        packageCycles: {
          where: {
            status: "ACTIVE",
            earningStatus: "ACTIVE",
            isReceivable: true,
            activatedAt: {
              lte: evaluationAt,
            },
            activeUntil: {
              gte: evaluationAt,
            },
          },
          select: {
            id: true,
          },
        },
        orders: {
          where: {
            approvalStatus: "APPROVED",
            orderSourceType: "NORMAL",
            approvedAt: {
              lte: evaluationAt,
            },
          },
          select: {
            id: true,
            approvedAt: true,
            orderItems: {
              select: {
                lineTotalUsdt: true,
                poolRateMode: true,
              },
            },
          },
        },
        directReferrals: {
          where: {
            status: "ACTIVE",
            payoutStatus: "ACTIVE",
          },
          select: {
            id: true,
            orders: {
              where: {
                approvalStatus: "APPROVED",
                orderSourceType: "NORMAL",
                approvedAt: {
                  lt: dayStart,
                },
              },
              select: {
                id: true,
              },
            },
          },
        },
        buybackProgress: {
          select: {
            status: true,
            lastQualifyingOrderId: true,
          },
        },
      },
    });

    return users.map((user) => {
      const priorApprovedOrders = user.orders.filter(
        (order) => order.approvedAt != null && order.approvedAt < dayStart,
      );
      const sameDayApprovedOrders = user.orders.filter(
        (order) =>
          order.approvedAt != null &&
          order.approvedAt >= dayRange.gte &&
          order.approvedAt <= dayRange.lte,
      );
      const hasOwnApprovedOrder = priorApprovedOrders.length > 0;
      const activeDirectReferralCount = user.directReferrals.length;
      const activeDirectBuyerCount = user.directReferrals.filter(
        (directReferral) => directReferral.orders.length > 0,
      ).length;
      const memberActive = user.packageCycles.length > 0;
      const hasPersistedInitialQualification =
        user.buybackProgress?.lastQualifyingOrderId != null;
      const hasPassedInitialQualification =
        hasPersistedInitialQualification ||
        (hasOwnApprovedOrder &&
          activeDirectReferralCount >= 3 &&
          activeDirectBuyerCount >= 3);
      const roundStatus =
        user.buybackProgress?.status?.toLowerCase() as
          | "clear"
          | "held_pending_repurchase"
          | "blocked_after_expiry"
          | undefined;
      const eligible =
        memberActive &&
        hasPassedInitialQualification &&
        roundStatus !== "blocked_after_expiry";
      const realPaidPoolEnabledAmount = sameDayApprovedOrders.reduce(
        (orderTotal, order) =>
          addDecimalStrings(
            orderTotal,
            order.orderItems.reduce((itemTotal, item) => {
              if (item.poolRateMode?.toString().toLowerCase() === "disabled") {
                return itemTotal;
              }

              return addDecimalStrings(
                itemTotal,
                item.lineTotalUsdt?.toString() ?? "0",
              );
            }, "0"),
          ),
        "0",
      );

      return {
        userId: user.id.toString(),
        memberActive,
        hasPassedInitialQualification,
        hasOwnApprovedOrder,
        activeDirectReferralCount,
        activeDirectBuyerCount,
        roundStatus: roundStatus ?? null,
        realPaidPoolEnabledAmount,
        latestQualifiedBoardCompletedAt: null,
        evaluationAt: input.evaluationAt,
      };
    });
  }
}
