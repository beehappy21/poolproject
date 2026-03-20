import { Injectable } from "@nestjs/common";

import {
  PoolEligibilityDecision,
  PoolEligibilityMemberSnapshot,
  PoolFundingResult,
  PoolRecipientDraftResult,
} from "../domain/pool.types";
import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";

export interface PoolRepository {
  findApprovedOrderFunding(poolDate: string): Promise<{
    approvedOrderCount: number;
    fundingTotalApprovedPv: string;
  }>;

  createOrUpdatePoolCycle(input: PoolFundingResult & {
    eligibleMemberCount: number;
    payoutPerMember: string;
    companyFallbackAmount: string;
  }): Promise<{ poolCycleId: string }>;

  saveEligibilitySnapshots(
    poolDate: string,
    decisions: PoolEligibilityDecision[],
    snapshots: PoolEligibilityMemberSnapshot[],
  ): Promise<void>;

  createPoolPayoutDrafts(input: {
    poolCycleId: string;
    recipientDrafts: PoolRecipientDraftResult[];
  }): Promise<void>;
}

@Injectable()
export class PrismaPoolRepository implements PoolRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    eligibleMemberCount: number;
    payoutPerMember: string;
    companyFallbackAmount: string;
  }): Promise<{ poolCycleId: string }> {
    const cycle = await this.prisma.dailyPoolCycle.upsert({
      where: { cycleDate: new Date(`${input.poolDate}T00:00:00.000Z`) },
      update: {
        snapshotAt: new Date(),
        fundingApprovedOrderCount: input.approvedOrderCount,
        fundingTotalApprovedPv: input.fundingTotalApprovedPv,
        poolRate: input.poolRate,
        poolFund: input.poolFund,
        eligibleMemberCount: input.eligibleMemberCount,
        payoutPerMember: input.payoutPerMember,
        companyFallbackAmount: input.companyFallbackAmount,
        status: "CLOSED",
      },
      create: {
        cycleDate: new Date(`${input.poolDate}T00:00:00.000Z`),
        snapshotAt: new Date(),
        totalPv: input.fundingTotalApprovedPv,
        fundingApprovedOrderCount: input.approvedOrderCount,
        fundingTotalApprovedPv: input.fundingTotalApprovedPv,
        poolRate: input.poolRate,
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
    poolDate: string,
    decisions: PoolEligibilityDecision[],
    snapshots: PoolEligibilityMemberSnapshot[],
  ): Promise<void> {
    void poolDate;
    void decisions;
    void snapshots;
  }

  async createPoolPayoutDrafts(input: {
    poolCycleId: string;
    recipientDrafts: PoolRecipientDraftResult[];
  }): Promise<void> {
    await this.prisma.dailyPoolPayout.deleteMany({
      where: { cycleId: BigInt(input.poolCycleId) },
    });

    if (input.recipientDrafts.length === 0) {
      return;
    }

    await this.prisma.dailyPoolPayout.createMany({
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
  }
}
