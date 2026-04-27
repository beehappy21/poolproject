import { Inject, Injectable, forwardRef } from "@nestjs/common";

import {
  ApprovedOrderCommissionFlowResult,
  BonusToCycleAllocationInput,
  BonusToCycleAllocationResult,
  CommissionReleaseStatus,
  CommissionCandidatePath,
  CommissionFinalizationInput,
  CommissionFinalizationResult,
  CommissionSourceType,
  DirectCommissionFinalizationResult,
  UserBuybackProgressSnapshot,
} from "../domain/commissions.types";
import {
  addDecimalStrings,
  compareDecimalStrings,
  minDecimalString,
  multiplyDecimalStrings,
  subtractDecimalStrings,
} from "../../../../shared/utils/src/money.util";
import {
  parseCommissionSettingsSnapshot,
  readCommissionSettings,
} from "../../../../shared/utils/src/commission-settings.util";
import { MembersService } from "../../../members/src/services/members.service";
import { MembersServiceContract } from "../../../members/src/services/members.service";
import { OrdersService } from "../../../orders/src/services/orders.service";
import { OrdersServiceContract } from "../../../orders/src/services/orders.service";
import { QualificationService } from "../../../qualification/src/services/qualification.service";
import { QualificationServiceContract } from "../../../qualification/src/services/qualification.service";
import { PrismaCommissionsRepository } from "../repositories/commissions.repository";

export interface CommissionsServiceContract {
  handleApprovedOrderCommissionSource(
    orderId: string,
  ): Promise<ApprovedOrderCommissionFlowResult>;

  resolveDirectBonusCandidatePath(
    input: CommissionCandidatePath,
  ): Promise<string[]>;

  resolveUniBonusCandidatePath(
    input: CommissionCandidatePath,
  ): Promise<string[]>;

  allocateBonusToCycle(
    input: BonusToCycleAllocationInput,
  ): Promise<BonusToCycleAllocationResult>;

  finalizeCommissionItem(
    input: CommissionFinalizationInput,
  ): Promise<CommissionFinalizationResult>;

  createCompanyFallback(input: {
    sourceType: CommissionSourceType;
    sourceRefId: string;
    amount: string;
    reasonCode: string;
  }): Promise<void>;

  listCommissions(filters?: {
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

  listCompanyFallbacks(filters?: {
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
export class CommissionsService implements CommissionsServiceContract {
  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly membersService: MembersService,
    private readonly qualificationService: QualificationService,
    private readonly commissionsRepository: PrismaCommissionsRepository,
  ) {}

  async handleApprovedOrderCommissionSource(
    orderId: string,
  ): Promise<ApprovedOrderCommissionFlowResult> {
    const sourceOrder =
      await this.ordersService.handleApprovedOrderEvent(orderId);
    const commissionSettings = parseCommissionSettingsSnapshot(
      sourceOrder.commissionSettingsSnapshot,
    );
    const candidateUserIds = await this.membersService.getUplineCandidateIds(
      sourceOrder.sourceUserId,
      sourceOrder.approvedAt,
    );
    const cashbackDrafts =
      commissionSettings.appVisibility.cashback === false
        ? []
        : await this.buildCashbackDrafts(
            sourceOrder.orderId,
            sourceOrder.sourceUserId,
            sourceOrder.approvedAt,
            sourceOrder.totalPv,
            commissionSettings,
          );

    const directCandidateUserIds =
      commissionSettings.appVisibility.direct === false
        ? []
        : await this.resolveDirectBonusCandidatePath({
            sourceUserId: sourceOrder.sourceUserId,
            evaluationAt: sourceOrder.approvedAt,
            candidateUserIds,
            directLevelCount: commissionSettings.directLevelRates.length,
          });

    const directDrafts =
      commissionSettings.appVisibility.direct === false
        ? []
        : await this.buildDirectDrafts(
            sourceOrder.orderId,
            sourceOrder.sourceUserId,
            sourceOrder.approvedAt,
            sourceOrder.totalPv,
            candidateUserIds,
            directCandidateUserIds,
            commissionSettings,
          );
    const uniCandidateUserIds =
      commissionSettings.appVisibility.unilevel === false
        ? []
        : await this.resolveUniBonusCandidatePath({
            sourceUserId: sourceOrder.sourceUserId,
            evaluationAt: sourceOrder.approvedAt,
            candidateUserIds,
            uniLevelCount: commissionSettings.uniLevelRates.length,
          });
    const uniDrafts =
      commissionSettings.appVisibility.unilevel === false
        ? []
        : await this.buildUniDrafts(
            sourceOrder.orderId,
            sourceOrder.sourceUserId,
            sourceOrder.approvedAt,
            sourceOrder.totalPv,
            candidateUserIds,
            uniCandidateUserIds,
            commissionSettings,
          );

    return {
      sourceOrderId: sourceOrder.orderId,
      cashbackDrafts,
      directDrafts,
      uniDrafts,
    };
  }

  async resolveDirectBonusCandidatePath(
    input: CommissionCandidatePath & { directLevelCount?: number },
  ): Promise<string[]> {
    const maxLevels = input.directLevelCount ?? 1;
    const activeCandidateUserIds: string[] = [];

    for (const candidateUserId of input.candidateUserIds) {
      const cycles = await this.membersService.getMemberCycles(
        candidateUserId,
        input.evaluationAt,
      );
      const qualification =
        await this.qualificationService.evaluateMemberQualification({
          userId: candidateUserId,
          evaluationAt: input.evaluationAt,
          cycles,
        });

      if (qualification.memberActive) {
        activeCandidateUserIds.push(candidateUserId);
      }

      if (activeCandidateUserIds.length >= maxLevels) {
        break;
      }
    }

    return activeCandidateUserIds;
  }

  async resolveUniBonusCandidatePath(
    input: CommissionCandidatePath & { uniLevelCount?: number },
  ): Promise<string[]> {
    const maxLevels = input.uniLevelCount ?? 1;
    const activeCandidateUserIds: string[] = [];

    for (const candidateUserId of input.candidateUserIds) {
      const cycles = await this.membersService.getMemberCycles(
        candidateUserId,
        input.evaluationAt,
      );
      const qualification =
        await this.qualificationService.evaluateMemberQualification({
          userId: candidateUserId,
          evaluationAt: input.evaluationAt,
          cycles,
        });

      if (qualification.memberActive) {
        activeCandidateUserIds.push(candidateUserId);
      }

      if (activeCandidateUserIds.length >= maxLevels) {
        break;
      }
    }

    return activeCandidateUserIds;
  }

  async allocateBonusToCycle(
    input: BonusToCycleAllocationInput,
  ): Promise<BonusToCycleAllocationResult> {
    const candidateCycles =
      input.candidateCycles.length > 0
        ? input.candidateCycles
        : await this.commissionsRepository.findCandidateCyclesForAllocation(
            input,
          );

    const selection =
      await this.qualificationService.selectCandidateCycles({
        userId: input.beneficiaryUserId,
        evaluationAt: input.evaluationAt,
        cycles: candidateCycles,
      });

    for (const cycleId of selection.orderedCandidateCycleIds) {
      const cycle = candidateCycles.find(
        (candidateCycle) => candidateCycle.cycleId === cycleId,
      );

      if (!cycle) {
        continue;
      }

      const capCheck =
        await this.qualificationService.evaluateCycleCapCheck({
          cycle,
          bonusAmount: input.bonusAmount,
          sourceType: input.sourceType,
        });

      if (capCheck.canAbsorbFullAmount) {
        return {
          beneficiaryUserId: input.beneficiaryUserId,
          assignedCycleId: cycle.cycleId,
          fallbackToCompany: false,
          fallbackReason: null,
        };
      }
    }

    return {
      beneficiaryUserId: input.beneficiaryUserId,
      assignedCycleId: null,
      fallbackToCompany: true,
      fallbackReason:
        selection.orderedCandidateCycleIds.length > 0
          ? "cap_blocked_all_receivable_cycles"
          : "no_receivable_cycle",
    };
  }

  async finalizeCommissionItem(
    input: CommissionFinalizationInput,
  ): Promise<CommissionFinalizationResult> {
    if (!input.beneficiaryUserId) {
      return this.buildMissingBeneficiaryFinalization(input.amount);
    }

    const commissionConfig =
      input.commissionConfig ?? this.readCommissionConfigFallback();
    const grossAmount = input.grossAmount ?? input.amount;
    const capSnapshot =
      await this.commissionsRepository.getDailyCommissionCapSnapshot({
        beneficiaryUserId: input.beneficiaryUserId,
        capDate: this.toBangkokBusinessDate(input.evaluationAt),
        capAmount: commissionConfig.dailyCommissionCapAmount,
      });
    const remainingCap = this.maxZeroDecimal(
      subtractDecimalStrings(capSnapshot.capAmount, capSnapshot.usedAmount),
    );
    const finalPayableAmount = minDecimalString(grossAmount, remainingCap);
    const discardedAmount = this.maxZeroDecimal(
      subtractDecimalStrings(grossAmount, finalPayableAmount),
    );
    if (compareDecimalStrings(finalPayableAmount, "0") <= 0) {
      return {
        commissionStatus: "approved",
        beneficiaryCycleId: null,
        fallbackReason: null,
        grossAmount,
        finalPayableAmount: "0",
        discardedAmount,
        releaseStatus: "withdrawable",
      };
    }

    const candidateCycles = await this.membersService.getMemberCycles(
      input.beneficiaryUserId,
      input.evaluationAt,
    );
    const allocation = await this.allocateBonusToCycle({
      beneficiaryUserId: input.beneficiaryUserId,
      evaluationAt: input.evaluationAt,
      bonusAmount: finalPayableAmount,
      sourceType: input.sourceType,
      candidateCycles,
    });

    if (allocation.fallbackToCompany) {
      return this.buildFinalizationFromAllocation(
        allocation,
        grossAmount,
        finalPayableAmount,
        discardedAmount,
        "withdrawable",
      );
    }

    const buybackDecision = await this.evaluateBuybackRelease({
      beneficiaryUserId: input.beneficiaryUserId,
      evaluationAt: input.evaluationAt,
      finalPayableAmount,
      buybackThresholdAmount: commissionConfig.buybackThresholdAmount,
      buybackGraceDays: commissionConfig.buybackGraceDays,
      sourceType: input.sourceType,
      sourceRefId: input.sourceRefId,
    });

    return this.buildFinalizationFromAllocation(
      allocation,
      grossAmount,
      finalPayableAmount,
      discardedAmount,
      buybackDecision.releaseStatus,
    );
  }

  async createCompanyFallback(input: {
    sourceType: CommissionSourceType;
    sourceRefId: string;
    amount: string;
    reasonCode: string;
  }): Promise<void> {
    await this.commissionsRepository.createCompanyFallbackEntry(input);
  }

  async listCommissions(filters?: {
    orderId?: string;
    beneficiaryUserId?: string;
    commissionType?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.commissionsRepository.listCommissionEntries(filters);
  }

  async listCompanyFallbacks(filters?: {
    sourceRefId?: string;
    sourceType?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.commissionsRepository.listCompanyFallbackEntries(filters);
  }

  private async buildCashbackDrafts(
    sourceOrderId: string,
    sourceUserId: string,
    evaluationAt: string,
    totalPv: string,
    commissionSettings: ReturnType<typeof parseCommissionSettingsSnapshot>,
  ) {
    const basePv = totalPv;
    const rate = commissionSettings.cashbackRate;
    const amount = multiplyDecimalStrings(basePv, rate);

    if (
      compareDecimalStrings(rate, "0") <= 0 ||
      compareDecimalStrings(amount, "0") <= 0
    ) {
      return [];
    }

    const commissionConfig = {
      dailyCommissionCapAmount: commissionSettings.dailyCommissionCapAmount,
      buybackThresholdAmount: commissionSettings.buybackThresholdAmount,
      buybackGraceDays: commissionSettings.buybackGraceDays,
    };
    const finalization = await this.finalizeCommissionItem({
      sourceType: "cashback",
      sourceRefId: sourceOrderId,
      sourceUserId,
      beneficiaryUserId: sourceUserId,
      evaluationAt,
      basePv,
      rate,
      amount,
      commissionConfig,
    });

    await this.persistCommissionItem(
      {
        sourceType: "cashback",
        sourceRefId: sourceOrderId,
        sourceUserId,
        beneficiaryUserId: sourceUserId,
        evaluationAt,
        basePv,
        rate,
        amount,
        commissionConfig,
      },
      finalization,
    );

    return [
      {
        sourceType: "cashback" as const,
        sourceOrderId,
        beneficiaryUserId:
          finalization.commissionStatus === "fallback" ? null : sourceUserId,
        rate,
        basePv,
        amount,
        allocation: null,
        finalization,
      },
    ];
  }

  private async buildDirectDraft(
    sourceOrderId: string,
    sourceUserId: string,
    evaluationAt: string,
    totalPv: string,
    candidateUserIds: string[],
    levelNo: number,
    rate: string,
    candidateUserId: string | null,
    commissionSettings: ReturnType<typeof parseCommissionSettingsSnapshot>,
  ): Promise<
    | {
        sourceType: "direct";
        sourceOrderId: string;
        level: number;
        levelNo: number;
        basePv: string;
        rate: string;
        amount: string;
        beneficiaryUserId: string | null;
        candidateUserId: string | null;
        rollupApplied: boolean;
        rollupDepth: number;
        allocation: BonusToCycleAllocationResult | null;
        finalization: DirectCommissionFinalizationResult;
      }
    | null
  > {
    const basePv = totalPv;
    const amount = multiplyDecimalStrings(basePv, rate);

    if (this.shouldSkipCommission(rate, amount)) {
      return null;
    }

    const candidateIndex = candidateUserId
      ? candidateUserIds.indexOf(candidateUserId)
      : -1;
    const rollupDepth = candidateIndex >= 0 ? Math.max(candidateIndex - (levelNo - 1), 0) : 0;
    const rollupApplied = rollupDepth > 0;
    const commissionConfig = {
      dailyCommissionCapAmount: commissionSettings.dailyCommissionCapAmount,
      buybackThresholdAmount: commissionSettings.buybackThresholdAmount,
      buybackGraceDays: commissionSettings.buybackGraceDays,
    };

    if (!candidateUserId) {
      const finalization = this.buildDirectFallbackFinalization(
        "no_active_sponsor",
        amount,
      );
      await this.persistCommissionItem({
        sourceType: "direct",
        sourceRefId: sourceOrderId,
        sourceUserId,
        beneficiaryUserId: null,
        evaluationAt,
        basePv,
        rate,
        amount,
        levelNo,
        commissionConfig,
      }, finalization);

      return {
        sourceType: "direct" as const,
        sourceOrderId,
        level: levelNo,
        levelNo,
        basePv,
        rate,
        amount,
        beneficiaryUserId: null,
        candidateUserId: null,
        rollupApplied: false,
        rollupDepth: 0,
        allocation: null,
        finalization,
      };
    }

    const finalization = this.toDirectFinalizationResult(
      await this.finalizeCommissionItem({
        sourceType: "direct",
        sourceRefId: sourceOrderId,
        sourceUserId,
        beneficiaryUserId: candidateUserId,
        evaluationAt,
        basePv,
        rate,
        amount,
        levelNo,
        commissionConfig,
      }),
    );
    await this.persistCommissionItem(
      {
        sourceType: "direct",
        sourceRefId: sourceOrderId,
        sourceUserId,
        beneficiaryUserId: candidateUserId,
        evaluationAt,
        basePv,
        rate,
        amount,
        levelNo,
        commissionConfig,
      },
      finalization,
    );

    return {
      sourceType: "direct" as const,
      sourceOrderId,
      level: levelNo,
      levelNo,
      basePv,
      rate,
      amount,
      beneficiaryUserId:
        finalization.commissionStatus === "fallback" ? null : candidateUserId,
      candidateUserId,
      rollupApplied,
      rollupDepth,
      allocation: null,
      finalization,
    };
  }

  private async buildDirectDrafts(
    sourceOrderId: string,
    sourceUserId: string,
    evaluationAt: string,
    totalPv: string,
    candidateUserIds: string[],
    directCandidateUserIds: string[],
    commissionSettings: ReturnType<typeof parseCommissionSettingsSnapshot>,
  ) {
    const directLevelRates = commissionSettings.directLevelRates;
    const drafts = await Promise.all(
      directLevelRates.map((rate, index) =>
        this.buildDirectDraft(
          sourceOrderId,
          sourceUserId,
          evaluationAt,
          totalPv,
          candidateUserIds,
          index + 1,
          rate,
          directCandidateUserIds[index] ?? null,
          commissionSettings,
        ),
      ),
    );

    return drafts.filter(
      (
        draft,
      ): draft is NonNullable<Awaited<ReturnType<typeof this.buildDirectDraft>>> =>
        draft !== null,
    );
  }

  private buildMissingBeneficiaryFinalization(
    grossAmount: string,
  ): CommissionFinalizationResult {
    return {
      commissionStatus: "fallback",
      beneficiaryCycleId: null,
      fallbackReason: "no_beneficiary_user",
      grossAmount,
      finalPayableAmount: "0",
      discardedAmount: grossAmount,
      releaseStatus: "withdrawable",
    };
  }

  private buildFinalizationFromAllocation(
    allocation: BonusToCycleAllocationResult,
    grossAmount: string,
    finalPayableAmount: string,
    discardedAmount: string,
    releaseStatus: CommissionReleaseStatus,
  ): CommissionFinalizationResult {
    if (allocation.fallbackToCompany) {
      return {
        commissionStatus: "fallback",
        beneficiaryCycleId: null,
        fallbackReason: allocation.fallbackReason,
        grossAmount,
        finalPayableAmount,
        discardedAmount,
        releaseStatus,
      };
    }

    return {
      commissionStatus:
        releaseStatus === "withdrawable" ? "approved" : "held",
      beneficiaryCycleId: allocation.assignedCycleId,
      fallbackReason: null,
      grossAmount,
      finalPayableAmount,
      discardedAmount,
      releaseStatus,
    };
  }

  private buildDirectFinalizationFromAllocation(
    allocation: BonusToCycleAllocationResult,
    grossAmount: string,
    finalPayableAmount: string,
    discardedAmount: string,
    releaseStatus: CommissionReleaseStatus,
  ): DirectCommissionFinalizationResult {
    if (allocation.fallbackToCompany) {
      return this.buildDirectFallbackFinalization(
        allocation.fallbackReason,
        grossAmount,
      );
    }

    return {
      commissionStatus:
        releaseStatus === "withdrawable" ? "approved" : "held",
      beneficiaryCycleId: allocation.assignedCycleId,
      fallbackReason: null,
      grossAmount,
      finalPayableAmount,
      discardedAmount,
      releaseStatus,
    };
  }

  private buildDirectFallbackFinalization(
    fallbackReason: "no_active_sponsor" | BonusToCycleAllocationResult["fallbackReason"],
    grossAmount: string,
  ): DirectCommissionFinalizationResult {
    return {
      commissionStatus: "fallback",
      beneficiaryCycleId: null,
      fallbackReason,
      grossAmount,
      finalPayableAmount: grossAmount,
      discardedAmount: "0",
      releaseStatus: "withdrawable",
    };
  }

  private toDirectFinalizationResult(
    finalization: CommissionFinalizationResult,
  ): DirectCommissionFinalizationResult {
    return {
      ...finalization,
      fallbackReason:
        (finalization.fallbackReason as DirectCommissionFinalizationResult["fallbackReason"]) ??
        null,
    };
  }

  private async buildUniDraft(
    sourceOrderId: string,
    sourceUserId: string,
    evaluationAt: string,
    totalPv: string,
    candidateUserIds: string[],
    candidateUserId: string | null,
    levelNo: number,
    rate: string,
    commissionSettings: ReturnType<typeof parseCommissionSettingsSnapshot>,
  ): Promise<
    | {
        sourceType: "uni";
        sourceOrderId: string;
        level: number;
        levelNo: number;
        beneficiaryUserId: string | null;
        candidateUserId: string | null;
        rate: string;
        amount: string;
        rollupApplied: boolean;
        allocation: BonusToCycleAllocationResult | null;
        finalization: CommissionFinalizationResult;
      }
    | null
  > {
    const basePv = totalPv;
    const amount = multiplyDecimalStrings(basePv, rate);

    if (this.shouldSkipCommission(rate, amount)) {
      return null;
    }

    const candidateIndex = candidateUserId
      ? candidateUserIds.indexOf(candidateUserId)
      : -1;
    const rollupApplied = candidateIndex >= 0 ? candidateIndex > levelNo - 1 : false;
    const commissionConfig = {
      dailyCommissionCapAmount: commissionSettings.dailyCommissionCapAmount,
      buybackThresholdAmount: commissionSettings.buybackThresholdAmount,
      buybackGraceDays: commissionSettings.buybackGraceDays,
    };
    const finalization =
      candidateUserId
        ? await this.finalizeCommissionItem({
            sourceType: "uni",
            sourceRefId: sourceOrderId,
            sourceUserId,
            beneficiaryUserId: candidateUserId,
            evaluationAt,
            basePv,
            rate,
            amount,
            levelNo,
            commissionConfig,
          })
        : this.buildUniMissingBeneficiaryFinalization(amount);
    await this.persistCommissionItem(
      {
        sourceType: "uni",
        sourceRefId: sourceOrderId,
        sourceUserId,
        beneficiaryUserId: candidateUserId,
        evaluationAt,
        basePv,
        rate,
        amount,
        levelNo,
        commissionConfig,
      },
      finalization,
    );

    return {
      sourceType: "uni" as const,
      sourceOrderId,
      level: levelNo,
      levelNo,
      beneficiaryUserId:
        finalization.commissionStatus === "fallback" ? null : candidateUserId,
      candidateUserId,
      rate,
      amount,
      rollupApplied,
      allocation: null,
      finalization,
    };
  }

  private async buildUniDrafts(
    sourceOrderId: string,
    sourceUserId: string,
    evaluationAt: string,
    totalPv: string,
    candidateUserIds: string[],
    uniCandidateUserIds: string[],
    commissionSettings: ReturnType<typeof parseCommissionSettingsSnapshot>,
  ) {
    const uniLevelRates = commissionSettings.uniLevelRates;
    const drafts = await Promise.all(
      uniLevelRates.map((rate, index) =>
        this.buildUniDraft(
          sourceOrderId,
          sourceUserId,
          evaluationAt,
          totalPv,
          candidateUserIds,
          uniCandidateUserIds[index] ?? null,
          index + 1,
          rate,
          commissionSettings,
        ),
      ),
    );

    return drafts.filter(
      (
        draft,
      ): draft is NonNullable<Awaited<ReturnType<typeof this.buildUniDraft>>> =>
        draft !== null,
    );
  }

  private shouldSkipCommission(rate: string, amount: string): boolean {
    return (
      compareDecimalStrings(rate, "0") <= 0 ||
      compareDecimalStrings(amount, "0") <= 0
    );
  }

  private buildUniMissingBeneficiaryFinalization(
    grossAmount: string,
  ): CommissionFinalizationResult {
    return {
      commissionStatus: "fallback",
      beneficiaryCycleId: null,
      fallbackReason: "no_active_upline",
      grossAmount,
      finalPayableAmount: grossAmount,
      discardedAmount: "0",
      releaseStatus: "withdrawable",
    };
  }

  private async persistCommissionItem(
    input: CommissionFinalizationInput,
    finalization: CommissionFinalizationResult,
  ): Promise<void> {
    if (this.shouldSkipCommission(input.rate, input.amount)) {
      return;
    }

    const { commissionId } =
      await this.commissionsRepository.createCommissionDraft({
        ...input,
        grossAmount: finalization.grossAmount,
        finalPayableAmount: finalization.finalPayableAmount,
        discardedAmount: finalization.discardedAmount,
        releaseStatus: finalization.releaseStatus,
      });

    await this.commissionsRepository.finalizeCommissionEntry(
      commissionId,
      finalization,
    );

    if (
      input.beneficiaryUserId &&
      finalization.commissionStatus !== "fallback" &&
      compareDecimalStrings(finalization.finalPayableAmount, "0") > 0
    ) {
      const commissionConfig =
        input.commissionConfig ?? this.readCommissionConfigFallback();

      await this.commissionsRepository.incrementDailyCommissionCapUsage({
        beneficiaryUserId: input.beneficiaryUserId,
        capDate: this.toBangkokBusinessDate(input.evaluationAt),
        capAmount: commissionConfig.dailyCommissionCapAmount,
        amount: finalization.finalPayableAmount,
      });
    }

    if (finalization.commissionStatus === "fallback" && finalization.fallbackReason) {
      if (compareDecimalStrings(finalization.finalPayableAmount, "0") <= 0) {
        return;
      }

      await this.createCompanyFallback({
        sourceType: input.sourceType,
        sourceRefId: input.sourceRefId,
        amount: finalization.finalPayableAmount,
        reasonCode: finalization.fallbackReason,
      });
    }
  }

  private readCommissionConfigFallback(): Required<
    NonNullable<CommissionFinalizationInput["commissionConfig"]>
  > {
    const settings = readCommissionSettings();

    return {
      dailyCommissionCapAmount: settings.dailyCommissionCapAmount,
      buybackThresholdAmount: settings.buybackThresholdAmount,
      buybackGraceDays: settings.buybackGraceDays,
    };
  }

  private toBangkokBusinessDate(value: string): string {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date(value));
    const year = parts.find((part) => part.type === "year")?.value ?? "1970";
    const month = parts.find((part) => part.type === "month")?.value ?? "01";
    const day = parts.find((part) => part.type === "day")?.value ?? "01";

    return `${year}-${month}-${day}`;
  }

  private maxZeroDecimal(value: string): string {
    return compareDecimalStrings(value, "0") >= 0 ? value : "0";
  }

  private async evaluateBuybackRelease(input: {
    beneficiaryUserId: string;
    evaluationAt: string;
    finalPayableAmount: string;
    buybackThresholdAmount: string;
    buybackGraceDays: number;
    sourceType: CommissionSourceType;
    sourceRefId: string;
  }): Promise<{
    releaseStatus: CommissionReleaseStatus;
    progress: UserBuybackProgressSnapshot | null;
  }> {
    const existing =
      await this.commissionsRepository.getUserBuybackProgress(
        input.beneficiaryUserId,
      );

    if (
      existing?.status === "blocked_after_expiry" &&
      existing.graceExpiresAt &&
      new Date(input.evaluationAt) >= new Date(existing.graceExpiresAt)
    ) {
      return {
        releaseStatus: "blocked_after_expiry",
        progress: existing,
      };
    }

    if (existing?.status === "held_pending_repurchase") {
      if (
        existing.graceExpiresAt &&
        new Date(input.evaluationAt) >= new Date(existing.graceExpiresAt)
      ) {
        const blockedProgress =
          await this.commissionsRepository.upsertUserBuybackProgress({
            beneficiaryUserId: input.beneficiaryUserId,
            accumulatedAmount: existing.accumulatedAmount,
            status: "blocked_after_expiry",
            thresholdReachedAt: existing.thresholdReachedAt,
            graceExpiresAt: existing.graceExpiresAt,
            blockedAt: input.evaluationAt,
          });
        await this.commissionsRepository.createBuybackEvent({
          beneficiaryUserId: input.beneficiaryUserId,
          triggerAmount: input.finalPayableAmount,
          remainingAccumulatedAmount: blockedProgress.accumulatedAmount,
          status: "BLOCKED_AFTER_EXPIRY",
          message: "Buyback grace period expired before repurchase completion.",
          referenceType: input.sourceType,
          referenceId: input.sourceRefId,
        });

        return {
          releaseStatus: "blocked_after_expiry",
          progress: blockedProgress,
        };
      }

      return {
        releaseStatus: "held_pending_repurchase",
        progress: existing,
      };
    }

    const nextAccumulatedAmount = addDecimalStrings(
      existing?.accumulatedAmount ?? "0",
      input.finalPayableAmount,
    );

    if (
      compareDecimalStrings(nextAccumulatedAmount, input.buybackThresholdAmount) >
      0
    ) {
      const heldProgress = await this.commissionsRepository.upsertUserBuybackProgress({
        beneficiaryUserId: input.beneficiaryUserId,
        accumulatedAmount: nextAccumulatedAmount,
        status: "held_pending_repurchase",
        thresholdReachedAt: input.evaluationAt,
        graceExpiresAt: this.addBangkokCalendarDays(
          input.evaluationAt,
          input.buybackGraceDays,
        ),
      });
      await this.commissionsRepository.createBuybackEvent({
        beneficiaryUserId: input.beneficiaryUserId,
        triggerAmount: input.finalPayableAmount,
        remainingAccumulatedAmount: heldProgress.accumulatedAmount,
        status: "HELD_PENDING_REPURCHASE",
        message: "Commission held pending member-initiated repurchase.",
        referenceType: input.sourceType,
        referenceId: input.sourceRefId,
      });

      return {
        releaseStatus: "held_pending_repurchase",
        progress: heldProgress,
      };
    }

    if (existing) {
      await this.commissionsRepository.upsertUserBuybackProgress({
        beneficiaryUserId: input.beneficiaryUserId,
        accumulatedAmount: nextAccumulatedAmount,
        status: "clear",
        thresholdReachedAt: null,
        graceExpiresAt: null,
        blockedAt: null,
      });
    }

    return {
      releaseStatus: "withdrawable",
      progress: existing,
    };
  }

  private addBangkokCalendarDays(value: string, days: number): string {
    const date = new Date(value);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
  }
}
