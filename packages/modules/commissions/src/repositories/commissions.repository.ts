import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import {
  BuybackEventDraft,
  BonusToCycleAllocationInput,
  CommissionFinalizationInput,
  CommissionFinalizationResult,
  CommissionSourceType,
  DailyCommissionCapSnapshot,
  UserBuybackProgressSnapshot,
} from "../domain/commissions.types";
import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import { toQualificationCycleSnapshot } from "../../../../infrastructure/src/prisma/prisma.mappers";

function mapCommissionSourceTypeToPrisma(
  sourceType: CommissionSourceType,
):
  | "DIRECT"
  | "UNI"
  | "POOL"
  | "CASHBACK"
  | "TEAM_2LEG"
  | "TEAM_3LEG"
  | "MATCHING_L1"
  | "MATCHING_L2" {
  switch (sourceType) {
    case "direct":
      return "DIRECT";
    case "uni":
      return "UNI";
    case "pool":
      return "POOL";
    case "cashback":
      return "CASHBACK";
    case "team_2leg":
      return "TEAM_2LEG";
    case "team_3leg":
      return "TEAM_3LEG";
    case "matching_l1":
      return "MATCHING_L1";
    case "matching_l2":
      return "MATCHING_L2";
  }
}

export interface CommissionsRepository {
  findCandidateCyclesForAllocation(
    input: BonusToCycleAllocationInput,
  ): Promise<BonusToCycleAllocationInput["candidateCycles"]>;

  createCommissionDraft(
    input: CommissionFinalizationInput,
  ): Promise<{ commissionId: string }>;

  finalizeCommissionEntry(
    commissionId: string,
    result: CommissionFinalizationResult,
  ): Promise<void>;

  createCompanyFallbackEntry(input: {
    sourceType: CommissionFinalizationInput["sourceType"];
    sourceRefId: string;
    amount: string;
    reasonCode: string;
  }): Promise<void>;

  getDailyCommissionCapSnapshot(input: {
    beneficiaryUserId: string;
    capDate: string;
    capAmount: string;
  }): Promise<DailyCommissionCapSnapshot>;

  incrementDailyCommissionCapUsage(input: {
    beneficiaryUserId: string;
    capDate: string;
    capAmount: string;
    amount: string;
  }): Promise<void>;

  getUserBuybackProgress(
    beneficiaryUserId: string,
  ): Promise<UserBuybackProgressSnapshot | null>;

  upsertUserBuybackProgress(input: {
    beneficiaryUserId: string;
    accumulatedAmount: string;
    status: UserBuybackProgressSnapshot["status"];
    thresholdReachedAt?: string | null;
    graceExpiresAt?: string | null;
    blockedAt?: string | null;
  }): Promise<UserBuybackProgressSnapshot>;

  createBuybackEvent(input: BuybackEventDraft): Promise<void>;

  listCommissionEntries(filters?: {
    orderId?: string;
    beneficiaryUserId?: string;
    commissionType?: string;
    page?: number;
    pageSize?: number;
  }): Promise<
    | Array<{
        commissionId: string;
        orderId: string | null;
        sourceUserId: string;
        beneficiaryUserId: string | null;
        beneficiaryCycleId: string | null;
        commissionType: string;
        levelNo: number | null;
        rate: string;
        basePv: string;
        amount: string;
        grossAmount: string;
        finalPayableAmount: string;
        discardedAmount: string;
        releaseStatus: string;
        status: string;
        companyFallbackReason: string | null;
        createdAt: string;
      }>
    | {
        items: Array<{
          commissionId: string;
          orderId: string | null;
          sourceUserId: string;
          beneficiaryUserId: string | null;
          beneficiaryCycleId: string | null;
          commissionType: string;
          levelNo: number | null;
          rate: string;
          basePv: string;
          amount: string;
          grossAmount: string;
          finalPayableAmount: string;
          discardedAmount: string;
          releaseStatus: string;
          status: string;
          companyFallbackReason: string | null;
          createdAt: string;
        }>;
        total: number;
        page: number;
        pageSize: number;
      }
  >;

  listCompanyFallbackEntries(filters?: {
    sourceRefId?: string;
    sourceType?: string;
    page?: number;
    pageSize?: number;
  }): Promise<
    | Array<{
        fallbackId: string;
        sourceType: string;
        sourceRefId: string;
        bonusType: string;
        amount: string;
        reason: string;
        createdAt: string;
      }>
    | {
        items: Array<{
          fallbackId: string;
          sourceType: string;
          sourceRefId: string;
          bonusType: string;
          amount: string;
          reason: string;
          createdAt: string;
        }>;
        total: number;
        page: number;
        pageSize: number;
      }
  >;
}

@Injectable()
export class PrismaCommissionsRepository implements CommissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private asCapDate(capDate: string): Date {
    return new Date(`${capDate}T00:00:00.000Z`);
  }

  async findCandidateCyclesForAllocation(
    input: BonusToCycleAllocationInput,
  ): Promise<BonusToCycleAllocationInput["candidateCycles"]> {
    const at = new Date(input.evaluationAt);
    const cycles = await this.prisma.memberPackageCycle.findMany({
      where: {
        userId: BigInt(input.beneficiaryUserId),
        status: "ACTIVE",
        activatedAt: { lte: at },
        activeUntil: { gte: at },
      },
      orderBy: [{ activatedAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        activatedAt: true,
        activeUntil: true,
        purchaseBase: true,
        poolRateMode: true,
        poolRate: true,
        poolCapMultiple: true,
        commissionCapScope: true,
        commissionCapMultiple: true,
        earningCap: true,
        earnedTotalInCycle: true,
        dailyPoolPayouts: {
          where: {
            status: "APPROVED",
          },
          select: {
            payoutAmount: true,
          },
        },
        isReceivable: true,
        earningStatus: true,
      },
    });

    return cycles.map(toQualificationCycleSnapshot);
  }

  async createCommissionDraft(
    input: CommissionFinalizationInput,
  ): Promise<{ commissionId: string }> {
    const commission = await this.prisma.commissionLedger.create({
      data: {
        beneficiaryUserId: input.beneficiaryUserId
          ? BigInt(input.beneficiaryUserId)
          : null,
        sourceUserId: BigInt(input.sourceUserId),
        orderId: BigInt(input.sourceRefId),
        sourceCommissionLedgerId: input.sourceCommissionLedgerId
          ? BigInt(input.sourceCommissionLedgerId)
          : null,
        commissionType: mapCommissionSourceTypeToPrisma(input.sourceType),
        levelNo: input.levelNo ?? null,
        tierNo: input.tierNo ?? null,
        rate: input.rate,
        basePv: input.basePv,
        commissionAmount: input.finalPayableAmount ?? input.amount,
        grossAmount: input.grossAmount ?? input.amount,
        finalPayableAmount: input.finalPayableAmount ?? input.amount,
        discardedAmount: input.discardedAmount ?? "0",
        releaseStatus:
          input.releaseStatus?.toUpperCase() as
            | "WITHDRAWABLE"
            | "HELD_PENDING_REPURCHASE"
            | "RELEASED_AFTER_REPURCHASE"
            | "BLOCKED_AFTER_EXPIRY" | undefined,
        commissionDate: new Date(input.evaluationAt),
        metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
        evaluationAt: new Date(input.evaluationAt),
        status: "PENDING",
      },
      select: { id: true },
    });

    return { commissionId: commission.id.toString() };
  }

  async getDailyCommissionCapSnapshot(input: {
    beneficiaryUserId: string;
    capDate: string;
    capAmount: string;
  }): Promise<DailyCommissionCapSnapshot> {
    const capDate = this.asCapDate(input.capDate);
    const existing = await this.prisma.dailyCommissionCapUsage.findUnique({
      where: {
        userId_capDate: {
          userId: BigInt(input.beneficiaryUserId),
          capDate,
        },
      },
      select: {
        usedAmount: true,
      },
    });

    return {
      beneficiaryUserId: input.beneficiaryUserId,
      capDate: input.capDate,
      capAmount: input.capAmount,
      usedAmount: existing?.usedAmount.toString() ?? "0",
    };
  }

  async incrementDailyCommissionCapUsage(input: {
    beneficiaryUserId: string;
    capDate: string;
    capAmount: string;
    amount: string;
  }): Promise<void> {
    await this.prisma.dailyCommissionCapUsage.upsert({
      where: {
        userId_capDate: {
          userId: BigInt(input.beneficiaryUserId),
          capDate: this.asCapDate(input.capDate),
        },
      },
      create: {
        userId: BigInt(input.beneficiaryUserId),
        capDate: this.asCapDate(input.capDate),
        capAmount: input.capAmount,
        usedAmount: input.amount,
      },
      update: {
        capAmount: input.capAmount,
        usedAmount: {
          increment: input.amount,
        },
      },
    });
  }

  async getUserBuybackProgress(
    beneficiaryUserId: string,
  ): Promise<UserBuybackProgressSnapshot | null> {
    const progress = await this.prisma.userBuybackProgress.findUnique({
      where: {
        userId: BigInt(beneficiaryUserId),
      },
      select: {
        accumulatedAmount: true,
        status: true,
        thresholdReachedAt: true,
        graceExpiresAt: true,
        blockedAt: true,
      },
    });

    if (!progress) {
      return null;
    }

    return {
      beneficiaryUserId,
      accumulatedAmount: progress.accumulatedAmount.toString(),
      status: progress.status.toLowerCase() as UserBuybackProgressSnapshot["status"],
      thresholdReachedAt: progress.thresholdReachedAt?.toISOString() ?? null,
      graceExpiresAt: progress.graceExpiresAt?.toISOString() ?? null,
      blockedAt: progress.blockedAt?.toISOString() ?? null,
    };
  }

  async upsertUserBuybackProgress(input: {
    beneficiaryUserId: string;
    accumulatedAmount: string;
    status: UserBuybackProgressSnapshot["status"];
    thresholdReachedAt?: string | null;
    graceExpiresAt?: string | null;
    blockedAt?: string | null;
  }): Promise<UserBuybackProgressSnapshot> {
    const progress = await this.prisma.userBuybackProgress.upsert({
      where: {
        userId: BigInt(input.beneficiaryUserId),
      },
      create: {
        userId: BigInt(input.beneficiaryUserId),
        accumulatedAmount: input.accumulatedAmount,
        status: input.status.toUpperCase() as
          | "CLEAR"
          | "HELD_PENDING_REPURCHASE"
          | "BLOCKED_AFTER_EXPIRY",
        thresholdReachedAt: input.thresholdReachedAt
          ? new Date(input.thresholdReachedAt)
          : null,
        graceExpiresAt: input.graceExpiresAt
          ? new Date(input.graceExpiresAt)
          : null,
        blockedAt: input.blockedAt ? new Date(input.blockedAt) : null,
      },
      update: {
        accumulatedAmount: input.accumulatedAmount,
        status: input.status.toUpperCase() as
          | "CLEAR"
          | "HELD_PENDING_REPURCHASE"
          | "BLOCKED_AFTER_EXPIRY",
        thresholdReachedAt: input.thresholdReachedAt
          ? new Date(input.thresholdReachedAt)
          : null,
        graceExpiresAt: input.graceExpiresAt
          ? new Date(input.graceExpiresAt)
          : null,
        blockedAt: input.blockedAt ? new Date(input.blockedAt) : null,
      },
      select: {
        accumulatedAmount: true,
        status: true,
        thresholdReachedAt: true,
        graceExpiresAt: true,
        blockedAt: true,
      },
    });

    return {
      beneficiaryUserId: input.beneficiaryUserId,
      accumulatedAmount: progress.accumulatedAmount.toString(),
      status: progress.status.toLowerCase() as UserBuybackProgressSnapshot["status"],
      thresholdReachedAt: progress.thresholdReachedAt?.toISOString() ?? null,
      graceExpiresAt: progress.graceExpiresAt?.toISOString() ?? null,
      blockedAt: progress.blockedAt?.toISOString() ?? null,
    };
  }

  async createBuybackEvent(input: BuybackEventDraft): Promise<void> {
    await this.prisma.buybackEvent.create({
      data: {
        userId: BigInt(input.beneficiaryUserId),
        triggerAmount: input.triggerAmount,
        remainingAccumulatedAmount: input.remainingAccumulatedAmount,
        status: input.status,
        message: input.message ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  }

  async finalizeCommissionEntry(
    commissionId: string,
    result: CommissionFinalizationResult,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.commissionLedger.findUnique({
        where: { id: BigInt(commissionId) },
        select: {
          status: true,
          commissionAmount: true,
          beneficiaryCycleId: true,
        },
      });

      const nextStatus =
        result.commissionStatus === "approved"
          ? "APPROVED"
          : result.commissionStatus === "held"
            ? "HELD"
            : result.commissionStatus === "withdrawable"
              ? "WITHDRAWABLE"
              : "FALLBACK";
      const nextBeneficiaryCycleId = result.beneficiaryCycleId
        ? BigInt(result.beneficiaryCycleId)
        : null;

      await tx.commissionLedger.update({
        where: { id: BigInt(commissionId) },
        data: {
          beneficiaryCycleId: nextBeneficiaryCycleId,
          finalizedAt: new Date(),
          finalizeCheckedAt: new Date(),
          status: nextStatus,
          fallbackToCompany: result.commissionStatus === "fallback",
          companyFallbackReason:
            result.commissionStatus === "fallback" ? result.fallbackReason : null,
          blockReason:
            result.commissionStatus === "fallback" ? result.fallbackReason : null,
        },
      });

      const shouldApplyToCycle =
        !!nextBeneficiaryCycleId &&
        (nextStatus === "APPROVED" ||
          nextStatus === "HELD" ||
          nextStatus === "WITHDRAWABLE") &&
        !(
          existing &&
          existing.beneficiaryCycleId &&
          existing.beneficiaryCycleId.toString() === nextBeneficiaryCycleId.toString() &&
          (existing.status === "APPROVED" ||
            existing.status === "HELD" ||
            existing.status === "WITHDRAWABLE")
        );

      if (shouldApplyToCycle) {
        await tx.memberPackageCycle.update({
          where: { id: nextBeneficiaryCycleId },
          data: {
            earnedTotalInCycle: {
              increment: existing?.commissionAmount ?? 0,
            },
          },
        });
      }
    });
  }

  async createCompanyFallbackEntry(input: {
    sourceType: CommissionFinalizationInput["sourceType"];
    sourceRefId: string;
    amount: string;
    reasonCode: string;
  }): Promise<void> {
    await this.prisma.companyBonusLedger.create({
      data: {
        sourceType: input.sourceType.toUpperCase() as
          | "DIRECT"
          | "UNI"
          | "POOL"
          | "CASHBACK"
          | "TEAM_2LEG"
          | "TEAM_3LEG"
          | "MATCHING_L1"
          | "MATCHING_L2",
        sourceRefId: BigInt(input.sourceRefId),
        bonusType: mapCommissionSourceTypeToPrisma(input.sourceType),
        amount: input.amount,
        reason: input.reasonCode,
      },
    });
  }

  async listCommissionEntries(filters?: {
    orderId?: string;
    beneficiaryUserId?: string;
    commissionType?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where = {
        orderId: filters?.orderId ? BigInt(filters.orderId) : undefined,
        beneficiaryUserId: filters?.beneficiaryUserId
          ? BigInt(filters.beneficiaryUserId)
          : undefined,
        commissionType: filters?.commissionType
          ? filters.commissionType.toUpperCase() as
              | "DIRECT"
              | "UNI"
              | "POOL"
              | "CASHBACK"
              | "TEAM_2LEG"
              | "TEAM_3LEG"
              | "MATCHING_L1"
              | "MATCHING_L2"
          : undefined,
      };
    const entries = await this.prisma.commissionLedger.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip:
        filters?.page && filters?.pageSize
          ? (filters.page - 1) * filters.pageSize
          : undefined,
      take: filters?.pageSize ?? undefined,
      select: {
        id: true,
        orderId: true,
        sourceUserId: true,
        beneficiaryUserId: true,
        beneficiaryCycleId: true,
        commissionType: true,
        levelNo: true,
        rate: true,
        basePv: true,
        commissionAmount: true,
        grossAmount: true,
        finalPayableAmount: true,
        discardedAmount: true,
        releaseStatus: true,
        status: true,
        companyFallbackReason: true,
        createdAt: true,
      },
    });

    const items = entries.map((entry) => ({
      commissionId: entry.id.toString(),
      orderId: entry.orderId?.toString() ?? null,
      sourceUserId: entry.sourceUserId.toString(),
      beneficiaryUserId: entry.beneficiaryUserId?.toString() ?? null,
      beneficiaryCycleId: entry.beneficiaryCycleId?.toString() ?? null,
      commissionType: entry.commissionType.toLowerCase(),
      levelNo: entry.levelNo,
      rate: entry.rate.toString(),
      basePv: entry.basePv.toString(),
      amount: entry.commissionAmount.toString(),
      grossAmount: entry.grossAmount.toString(),
      finalPayableAmount: entry.finalPayableAmount.toString(),
      discardedAmount: entry.discardedAmount.toString(),
      releaseStatus: entry.releaseStatus.toLowerCase(),
      status: entry.status.toLowerCase(),
      companyFallbackReason: entry.companyFallbackReason,
      createdAt: entry.createdAt.toISOString(),
    }));

    if (!filters?.page || !filters?.pageSize) {
      return items;
    }

    const total = await this.prisma.commissionLedger.count({ where });

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async listCompanyFallbackEntries(filters?: {
    sourceRefId?: string;
    sourceType?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where = {
        sourceRefId: filters?.sourceRefId
          ? BigInt(filters.sourceRefId)
          : undefined,
        sourceType: filters?.sourceType
          ? filters.sourceType.toUpperCase() as
              | "DIRECT"
              | "UNI"
              | "POOL"
              | "CASHBACK"
              | "TEAM_2LEG"
              | "TEAM_3LEG"
              | "MATCHING_L1"
              | "MATCHING_L2"
          : undefined,
      };
    const entries = await this.prisma.companyBonusLedger.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip:
        filters?.page && filters?.pageSize
          ? (filters.page - 1) * filters.pageSize
          : undefined,
      take: filters?.pageSize ?? undefined,
      select: {
        id: true,
        sourceType: true,
        sourceRefId: true,
        bonusType: true,
        amount: true,
        reason: true,
        createdAt: true,
      },
    });

    const items = entries.map((entry) => ({
      fallbackId: entry.id.toString(),
      sourceType: entry.sourceType.toLowerCase(),
      sourceRefId: entry.sourceRefId.toString(),
      bonusType: entry.bonusType.toLowerCase(),
      amount: entry.amount.toString(),
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    }));

    if (!filters?.page || !filters?.pageSize) {
      return items;
    }

    const total = await this.prisma.companyBonusLedger.count({ where });

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }
}
