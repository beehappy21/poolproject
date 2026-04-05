import { Injectable } from "@nestjs/common";

import {
  PoolEligibilityDecision,
  PoolFundingResult,
  PoolRecipientDraftResult,
} from "../domain/pool.types";
import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";

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
    recipientDrafts: PoolRecipientDraftResult[];
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
    evaluationAt: string;
    qualifiedWindowStartAt: string;
  }): Promise<PoolEligibilityDecision[]>;
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
    recipientDrafts: PoolRecipientDraftResult[];
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existingApprovedPayouts = await tx.dailyPoolPayout.findMany({
        where: {
          cycleId: BigInt(input.poolCycleId),
          status: "APPROVED",
          beneficiaryCycleId: { not: null },
        },
        select: {
          beneficiaryCycleId: true,
          payoutAmount: true,
        },
      });

      for (const payout of existingApprovedPayouts) {
        if (!payout.beneficiaryCycleId) {
          continue;
        }

        await tx.memberPackageCycle.update({
          where: { id: payout.beneficiaryCycleId },
          data: {
            earnedTotalInCycle: {
              decrement: payout.payoutAmount,
            },
          },
        });
      }

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
          beneficiaryCycleId: recipient.finalization.beneficiaryCycleId
            ? BigInt(recipient.finalization.beneficiaryCycleId)
            : null,
          payoutAmount: recipient.amount,
          status:
            recipient.finalization.commissionStatus === "approved"
              ? "APPROVED"
              : "FALLBACK",
          blockReason: recipient.finalization.fallbackReason,
        })),
      });

      const approvedRecipients = input.recipientDrafts.filter(
        (recipient) =>
          recipient.finalization.commissionStatus === "approved" &&
          !!recipient.finalization.beneficiaryCycleId,
      );

      for (const recipient of approvedRecipients) {
        await tx.memberPackageCycle.update({
          where: { id: BigInt(recipient.finalization.beneficiaryCycleId!) },
          data: {
            earnedTotalInCycle: {
              increment: recipient.amount,
            },
          },
        });
      }
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
        payoutAmount: true,
        status: true,
        blockReason: true,
      },
    });

    return payouts.map((payout) => ({
      payoutId: payout.id.toString(),
      userId: payout.userId.toString(),
      beneficiaryCycleId: payout.beneficiaryCycleId?.toString() ?? null,
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
    evaluationAt: string;
    qualifiedWindowStartAt: string;
  }): Promise<PoolEligibilityDecision[]> {
    const evaluationAt = new Date(input.evaluationAt);
    const qualifiedWindowStartAt = new Date(input.qualifiedWindowStartAt);

    const users = await this.prisma.user.findMany({
      where: {
        status: "ACTIVE",
        payoutStatus: "ACTIVE",
      },
      select: {
        id: true,
        _count: {
          select: {
            directReferrals: true,
          },
        },
        matrixCycles: {
          orderBy: [{ startedAt: "desc" }, { id: "desc" }],
          select: {
            boards: {
              where: {
                boardNo: 1,
                status: "COMPLETED",
                completedAt: {
                  gte: qualifiedWindowStartAt,
                  lte: evaluationAt,
                },
              },
              orderBy: [{ completedAt: "desc" }, { id: "desc" }],
              select: {
                completedAt: true,
              },
            },
          },
        },
      },
    });

    return users.map((user) => {
      const latestQualifiedBoardCompletedAt =
        user.matrixCycles.flatMap((cycle) => cycle.boards)[0]?.completedAt ?? null;
      const activeDirectReferralCount = user._count.directReferrals;
      const memberActive = latestQualifiedBoardCompletedAt !== null;
      const eligible = memberActive && activeDirectReferralCount >= 2;

      return {
        userId: user.id.toString(),
        eligible,
        reasonCode: eligible
          ? "weekly_pool_qualified"
          : !memberActive
            ? "missing_recent_b1_completion"
            : "missing_two_direct_referrals",
        memberActive,
        activeDirectReferralCount,
      };
    });
  }
}
