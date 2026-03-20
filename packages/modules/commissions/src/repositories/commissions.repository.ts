import { Injectable } from "@nestjs/common";

import {
  BonusToCycleAllocationInput,
  CommissionFinalizationInput,
  CommissionFinalizationResult,
} from "../domain/commissions.types";
import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import { toQualificationCycleSnapshot } from "../../../../infrastructure/src/prisma/prisma.mappers";

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
}

@Injectable()
export class PrismaCommissionsRepository implements CommissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

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
        earningCap: true,
        earnedTotalInCycle: true,
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
        commissionType: input.sourceType.toUpperCase() as
          | "DIRECT"
          | "UNI"
          | "POOL",
        levelNo: input.levelNo ?? null,
        tierNo: input.tierNo ?? null,
        rate: input.rate,
        basePv: input.basePv,
        commissionAmount: input.amount,
        evaluationAt: new Date(input.evaluationAt),
        status: "PENDING",
      },
      select: { id: true },
    });

    return { commissionId: commission.id.toString() };
  }

  async finalizeCommissionEntry(
    commissionId: string,
    result: CommissionFinalizationResult,
  ): Promise<void> {
    await this.prisma.commissionLedger.update({
      where: { id: BigInt(commissionId) },
      data: {
        beneficiaryCycleId: result.beneficiaryCycleId
          ? BigInt(result.beneficiaryCycleId)
          : null,
        finalizedAt: new Date(),
        finalizeCheckedAt: new Date(),
        status:
          result.commissionStatus === "approved"
            ? "APPROVED"
            : result.commissionStatus === "held"
              ? "HELD"
              : result.commissionStatus === "withdrawable"
                ? "WITHDRAWABLE"
                : "FALLBACK",
        fallbackToCompany: result.commissionStatus === "fallback",
        companyFallbackReason:
          result.commissionStatus === "fallback" ? result.fallbackReason : null,
        blockReason:
          result.commissionStatus === "fallback" ? result.fallbackReason : null,
      },
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
          | "POOL",
        sourceRefId: BigInt(input.sourceRefId),
        bonusType: input.sourceType.toUpperCase() as "DIRECT" | "UNI" | "POOL",
        amount: input.amount,
        reason: input.reasonCode,
      },
    });
  }
}
