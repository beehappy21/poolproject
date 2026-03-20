import {
  ApprovedOrderCommissionFlowResult,
  BonusToCycleAllocationInput,
  BonusToCycleAllocationResult,
  CommissionCandidatePath,
  CommissionFinalizationInput,
  CommissionFinalizationResult,
  DirectCommissionFinalizationResult,
} from "../domain/commissions.types";
import { multiplyDecimalStrings } from "../../../../shared/utils/src/money.util";
import { MembersServiceContract } from "../../../members/src/services/members.service";
import { OrdersServiceContract } from "../../../orders/src/services/orders.service";
import { QualificationServiceContract } from "../../../qualification/src/services/qualification.service";
import { CommissionsRepository } from "../repositories/commissions.repository";

export interface CommissionsServiceContract {
  handleApprovedOrderCommissionSource(
    orderId: string,
  ): Promise<ApprovedOrderCommissionFlowResult>;

  resolveDirectBonusCandidatePath(
    input: CommissionCandidatePath,
  ): Promise<string | null>;

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
}

export class CommissionsService implements CommissionsServiceContract {
  constructor(
    private readonly ordersService: OrdersServiceContract,
    private readonly membersService: MembersServiceContract,
    private readonly qualificationService: QualificationServiceContract,
    private readonly commissionsRepository: CommissionsRepository,
  ) {}

  async handleApprovedOrderCommissionSource(
    orderId: string,
  ): Promise<ApprovedOrderCommissionFlowResult> {
    const sourceOrder =
      await this.ordersService.handleApprovedOrderEvent(orderId);
    const candidateUserIds = await this.membersService.getUplineCandidateIds(
      sourceOrder.sourceUserId,
      sourceOrder.approvedAt,
    );

    const directCandidateUserId = await this.resolveDirectBonusCandidatePath({
      sourceUserId: sourceOrder.sourceUserId,
      evaluationAt: sourceOrder.approvedAt,
      candidateUserIds,
    });

    const directDraft = await this.buildDirectDraft(
      sourceOrder.orderId,
      sourceOrder.approvedAt,
      sourceOrder.totalPv,
      candidateUserIds,
      directCandidateUserId,
    );
    const uniCandidateUserIds = await this.resolveUniBonusCandidatePath({
      sourceUserId: sourceOrder.sourceUserId,
      evaluationAt: sourceOrder.approvedAt,
      candidateUserIds,
    });
    const uniDrafts = await this.buildUniDrafts(
      sourceOrder.orderId,
      sourceOrder.sourceUserId,
      sourceOrder.approvedAt,
      sourceOrder.totalPv,
      candidateUserIds,
      uniCandidateUserIds,
    );

    return {
      sourceOrderId: sourceOrder.orderId,
      directDraft,
      uniDrafts,
    };
  }

  async resolveDirectBonusCandidatePath(
    input: CommissionCandidatePath,
  ): Promise<string | null> {
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
        return candidateUserId;
      }
    }

    return null;
  }

  async resolveUniBonusCandidatePath(
    input: CommissionCandidatePath,
  ): Promise<string[]> {
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

      if (activeCandidateUserIds.length >= 5) {
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

  private async buildDirectDraft(
    sourceOrderId: string,
    evaluationAt: string,
    totalPv: string,
    candidateUserIds: string[],
    candidateUserId: string | null,
  ) {
    const basePv = totalPv;
    const rate = "0.2";
    const amount = multiplyDecimalStrings(basePv, rate);
    const rollupDepth = candidateUserId
      ? Math.max(candidateUserIds.indexOf(candidateUserId), 0)
      : 0;
    const rollupApplied = rollupDepth > 0;

    if (!candidateUserId) {
      return {
        sourceType: "direct" as const,
        sourceOrderId,
        basePv,
        rate,
        amount,
        candidateUserId: null,
        rollupApplied: false,
        rollupDepth: 0,
        allocation: null,
        finalization: this.buildDirectFallbackFinalization("no_active_sponsor"),
      };
    }

    const allocation = await this.allocateBonusToCycle({
      beneficiaryUserId: candidateUserId,
      evaluationAt,
      bonusAmount: amount,
      candidateCycles: [],
    });
    const finalization = this.buildDirectFinalizationFromAllocation(allocation);

    return {
      sourceType: "direct" as const,
      sourceOrderId,
      basePv,
      rate,
      amount,
      candidateUserId,
      rollupApplied,
      rollupDepth,
      allocation,
      finalization,
    };
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
  ) {
    const basePv = totalPv;
    const rate = "0.05";
    const amount = multiplyDecimalStrings(basePv, rate);
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
  ) {
    const maxLevels = 5;
    const drafts = await Promise.all(
      uniCandidateUserIds.slice(0, maxLevels).map((candidateUserId, index) =>
        this.buildUniDraft(
          sourceOrderId,
          sourceUserId,
          evaluationAt,
          totalPv,
          candidateUserIds,
          candidateUserId,
          index + 1,
        ),
      ),
    );

    const missingLevelCount = Math.max(maxLevels - drafts.length, 0);

    if (missingLevelCount === 0) {
      return drafts;
    }

    const fallbackDrafts = Array.from({ length: missingLevelCount }, (_, index) =>
      this.buildUniDraft(
        sourceOrderId,
        sourceUserId,
        evaluationAt,
        totalPv,
        candidateUserIds,
        null,
        drafts.length + index + 1,
      ),
    );

    return [...drafts, ...(await Promise.all(fallbackDrafts))];
  }

  private buildUniMissingBeneficiaryFinalization(): CommissionFinalizationResult {
    return {
      commissionStatus: "fallback",
      beneficiaryCycleId: null,
      fallbackReason: "no_active_upline",
    };
  }
}
