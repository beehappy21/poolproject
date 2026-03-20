export interface QualificationCycleSnapshot {
  cycleId: string;
  activatedAt: string;
  activeUntil: string;
  earningCap: string;
  earnedTotalInCycle: string;
  isReceivable: boolean;
  earningStatus: "active" | "capped";
}

export interface QualificationDecisionInput {
  userId: string;
  evaluationAt: string;
  cycles: QualificationCycleSnapshot[];
}

export interface QualificationDecisionResult {
  userId: string;
  evaluationAt: string;
  memberActive: boolean;
  receivableCycleIds: string[];
  reasonCode: string;
}

export interface CycleSelectionInput {
  userId: string;
  evaluationAt: string;
  cycles: QualificationCycleSnapshot[];
}

export interface CycleSelectionResult {
  userId: string;
  evaluationAt: string;
  orderedCandidateCycleIds: string[];
  selectionRule: "oldest_receivable_cycle_first";
  requiresBusinessConfirmation: true;
}

export interface CycleCapCheckInput {
  cycle: QualificationCycleSnapshot;
  bonusAmount: string;
}

export interface CycleCapCheckResult {
  cycleId: string;
  canAbsorbFullAmount: boolean;
  fallbackReason: "cap_blocked_full_item" | null;
}

export interface PoolEligibilityInput {
  userId: string;
  evaluationAt: string;
}

export interface PoolEligibilityResult {
  userId: string;
  evaluationAt: string;
  memberActive: boolean;
  activeDirectReferralCount: number;
  eligible: boolean;
  reasonCode: string;
}

export interface QualificationResult {
  qualified: boolean;
}
