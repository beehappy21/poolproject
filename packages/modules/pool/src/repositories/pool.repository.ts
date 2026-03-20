import { Injectable } from "@nestjs/common";

import {
  PoolEligibilityDecision,
  PoolEligibilityMemberSnapshot,
  PoolFundingResult,
  PoolRecipientDraftResult,
} from "../domain/pool.types";
import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";

export interface PoolRepository {
  listPoolCycles(): Promise<
    Array<{
      poolCycleId: string;
      poolDate: string;
      fundingTotalApprovedPv: string;
      poolFund: string;
      eligibleMemberCount: number;
      payoutPerMember: string;
      companyFallbackAmount: string;
      status: string;
    }>
  >;

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
}

@Injectable()
export class PrismaPoolRepository implements PoolRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPoolCycles() {
    const cycles = await this.prisma.dailyPoolCycle.findMany({
      orderBy: [{ cycleDate: "desc" }, { id: "desc" }],
      take: 100,
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

    return cycles.map((cycle) => ({
      poolCycleId: cycle.id.toString(),
      poolDate: cycle.cycleDate.toISOString().slice(0, 10),
      fundingTotalApprovedPv: cycle.fundingTotalApprovedPv.toString(),
      poolFund: cycle.poolFund.toString(),
      eligibleMemberCount: cycle.eligibleMemberCount,
      payoutPerMember: cycle.payoutPerMember.toString(),
      companyFallbackAmount: cycle.companyFallbackAmount.toString(),
      status: cycle.status.toLowerCase(),
    }));
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
}
