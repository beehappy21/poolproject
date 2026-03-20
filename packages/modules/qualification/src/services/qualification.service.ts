import {
  CycleCapCheckInput,
  CycleCapCheckResult,
  CycleSelectionInput,
  CycleSelectionResult,
  PoolEligibilityInput,
  PoolEligibilityResult,
  QualificationDecisionInput,
  QualificationDecisionResult,
} from "../domain/qualification.types";
import {
  addDecimalStrings,
  compareDecimalStrings,
} from "../../../../shared/utils/src/money.util";
import { QualificationRepository } from "../repositories/qualification.repository";

export interface QualificationServiceContract {
  evaluateMemberQualification(
    input: QualificationDecisionInput,
  ): Promise<QualificationDecisionResult>;

  getReceivableCycles(
    memberId: string,
    evaluationAt: string,
  ): Promise<string[]>;

  selectCandidateCycles(
    input: CycleSelectionInput,
  ): Promise<CycleSelectionResult>;

  evaluateCycleCapCheck(
    input: CycleCapCheckInput,
  ): Promise<CycleCapCheckResult>;

  evaluatePoolEligibility(
    input: PoolEligibilityInput,
  ): Promise<PoolEligibilityResult>;
}

export class QualificationService implements QualificationServiceContract {
  constructor(
    private readonly qualificationRepository: QualificationRepository,
  ) {}

  async evaluateMemberQualification(
    input: QualificationDecisionInput,
  ): Promise<QualificationDecisionResult> {
    const cycles =
      input.cycles.length > 0
        ? input.cycles
        : await this.qualificationRepository.findCyclesForQualification(input);

    const receivableCycleIds = cycles
      .filter((cycle) => cycle.isReceivable && cycle.earningStatus === "active")
      .map((cycle) => cycle.cycleId);

    return {
      userId: input.userId,
      evaluationAt: input.evaluationAt,
      memberActive: receivableCycleIds.length > 0,
      receivableCycleIds,
      reasonCode:
        receivableCycleIds.length > 0
          ? "has_receivable_cycle"
          : "no_receivable_cycle",
    };
  }

  async getReceivableCycles(
    memberId: string,
    evaluationAt: string,
  ): Promise<string[]> {
    const cycles = await this.qualificationRepository.findReceivableCycles(
      memberId,
      evaluationAt,
    );

    return cycles.map((cycle) => cycle.cycleId);
  }

  async selectCandidateCycles(
    input: CycleSelectionInput,
  ): Promise<CycleSelectionResult> {
    const orderedCandidateCycleIds = [...input.cycles]
      .filter((cycle) => cycle.isReceivable && cycle.earningStatus === "active")
      .sort((left, right) => {
        if (left.activatedAt === right.activatedAt) {
          return left.cycleId.localeCompare(right.cycleId);
        }

        return left.activatedAt.localeCompare(right.activatedAt);
      })
      .map((cycle) => cycle.cycleId);

    return {
      userId: input.userId,
      evaluationAt: input.evaluationAt,
      orderedCandidateCycleIds,
      selectionRule: "oldest_receivable_cycle_first",
      requiresBusinessConfirmation: true,
    };
  }

  async evaluateCycleCapCheck(
    input: CycleCapCheckInput,
  ): Promise<CycleCapCheckResult> {
    const earnedAfterBonus = addDecimalStrings(
      input.cycle.earnedTotalInCycle,
      input.bonusAmount,
    );
    const canAbsorbFullAmount =
      compareDecimalStrings(earnedAfterBonus, input.cycle.earningCap) <= 0;

    return {
      cycleId: input.cycle.cycleId,
      canAbsorbFullAmount,
      fallbackReason: canAbsorbFullAmount ? null : "cap_blocked_full_item",
    };
  }

  async evaluatePoolEligibility(
    input: PoolEligibilityInput,
  ): Promise<PoolEligibilityResult> {
    const cycles = await this.qualificationRepository.findReceivableCycles(
      input.userId,
      input.evaluationAt,
    );
    const memberQualification = await this.evaluateMemberQualification({
      userId: input.userId,
      evaluationAt: input.evaluationAt,
      cycles,
    });
    const activeDirectReferralCount =
      await this.qualificationRepository.countActiveDirectReferrals(
        input.userId,
        input.evaluationAt,
      );

    const eligible =
      memberQualification.memberActive && activeDirectReferralCount >= 2;

    return {
      userId: input.userId,
      evaluationAt: input.evaluationAt,
      memberActive: memberQualification.memberActive,
      activeDirectReferralCount,
      eligible,
      reasonCode: eligible
        ? "active_with_two_direct_actives"
        : "pool_eligibility_failed",
    };
  }
}
