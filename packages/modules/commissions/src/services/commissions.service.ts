import { Inject, Injectable, forwardRef } from "@nestjs/common";

import {
  ApprovedOrderCommissionFlowResult,
  BonusToCycleAllocationInput,
  BonusToCycleAllocationResult,
  CommissionCandidatePath,
  CommissionFinalizationInput,
  CommissionFinalizationResult,
  DirectCommissionFinalizationResult,
} from "../domain/commissions.types";
import {
  compareDecimalStrings,
  multiplyDecimalStrings,
} from "../../../../shared/utils/src/money.util";
import { parseCommissionSettingsSnapshot } from "../../../../shared/utils/src/commission-settings.util";
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
    sourceType: CommissionFinalizationInput["sourceType"];
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
    const cashbackDrafts = await this.buildCashbackDrafts(
      sourceOrder.orderId,
      sourceOrder.sourceUserId,
      sourceOrder.approvedAt,
      sourceOrder.totalPv,
      commissionSettings,
    );

    const directCandidateUserIds = await this.resolveDirectBonusCandidatePath({
      sourceUserId: sourceOrder.sourceUserId,
      evaluationAt: sourceOrder.approvedAt,
      candidateUserIds,
      directLevelCount: commissionSettings.directLevelRates.length,
    });

    const directDrafts = await this.buildDirectDrafts(
      sourceOrder.orderId,
      sourceOrder.sourceUserId,
      sourceOrder.approvedAt,
      sourceOrder.totalPv,
      candidateUserIds,
      directCandidateUserIds,
      commissionSettings,
    );
    const uniCandidateUserIds = await this.resolveUniBonusCandidatePath({
      sourceUserId: sourceOrder.sourceUserId,
      evaluationAt: sourceOrder.approvedAt,
      candidateUserIds,
      uniLevelCount: commissionSettings.uniLevelRates.length,
    });
    const uniDrafts = await this.buildUniDrafts(
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
      return this.buildMissingBeneficiaryFinalization();
    }

    const candidateCycles = await this.membersService.getMemberCycles(
      input.beneficiaryUserId,
      input.evaluationAt,
    );
    const allocation = await this.allocateBonusToCycle({
      beneficiaryUserId: input.beneficiaryUserId,
      evaluationAt: input.evaluationAt,
      bonusAmount: input.amount,
      candidateCycles,
    });

    return this.buildFinalizationFromAllocation(allocation);
  }

  async createCompanyFallback(input: {
    sourceType: CommissionFinalizationInput["sourceType"];
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

    const allocation = await this.allocateBonusToCycle({
      beneficiaryUserId: sourceUserId,
      evaluationAt,
      bonusAmount: amount,
      candidateCycles: [],
    });
    const finalization = this.buildFinalizationFromAllocation(allocation);

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
        allocation,
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

    if (!candidateUserId) {
      const finalization = this.buildDirectFallbackFinalization("no_active_sponsor");
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

    const allocation = await this.allocateBonusToCycle({
      beneficiaryUserId: candidateUserId,
      evaluationAt,
      bonusAmount: amount,
      candidateCycles: [],
    });
    const finalization = this.buildDirectFinalizationFromAllocation(allocation);
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
      allocation,
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

  private buildMissingBeneficiaryFinalization(): CommissionFinalizationResult {
    return {
      commissionStatus: "fallback",
      beneficiaryCycleId: null,
      fallbackReason: "no_beneficiary_user",
    };
  }

  private buildFinalizationFromAllocation(
    allocation: BonusToCycleAllocationResult,
  ): CommissionFinalizationResult {
    if (allocation.fallbackToCompany) {
      return {
        commissionStatus: "fallback",
        beneficiaryCycleId: null,
        fallbackReason: allocation.fallbackReason,
      };
    }

    return {
      commissionStatus: "approved",
      beneficiaryCycleId: allocation.assignedCycleId,
      fallbackReason: null,
    };
  }

  private buildDirectFinalizationFromAllocation(
    allocation: BonusToCycleAllocationResult,
  ): DirectCommissionFinalizationResult {
    if (allocation.fallbackToCompany) {
      return this.buildDirectFallbackFinalization(allocation.fallbackReason);
    }

    return {
      commissionStatus: "approved",
      beneficiaryCycleId: allocation.assignedCycleId,
      fallbackReason: null,
    };
  }

  private buildDirectFallbackFinalization(
    fallbackReason: "no_active_sponsor" | BonusToCycleAllocationResult["fallbackReason"],
  ): DirectCommissionFinalizationResult {
    return {
      commissionStatus: "fallback",
      beneficiaryCycleId: null,
      fallbackReason,
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
    const allocation = candidateUserId
      ? await this.allocateBonusToCycle({
          beneficiaryUserId: candidateUserId,
          evaluationAt,
          bonusAmount: amount,
          candidateCycles: [],
        })
      : null;
    const finalization =
      candidateUserId && allocation
        ? this.buildFinalizationFromAllocation(allocation)
        : this.buildUniMissingBeneficiaryFinalization();
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
      allocation,
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

  private buildUniMissingBeneficiaryFinalization(): CommissionFinalizationResult {
    return {
      commissionStatus: "fallback",
      beneficiaryCycleId: null,
      fallbackReason: "no_active_upline",
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
      await this.commissionsRepository.createCommissionDraft(input);

    await this.commissionsRepository.finalizeCommissionEntry(
      commissionId,
      finalization,
    );

    if (finalization.commissionStatus === "fallback" && finalization.fallbackReason) {
      await this.createCompanyFallback({
        sourceType: input.sourceType,
        sourceRefId: input.sourceRefId,
        amount: input.amount,
        reasonCode: finalization.fallbackReason,
      });
    }
  }
}
