export interface CommissionItemSummary {
  commissionId: string;
}

export interface BonusToCycleAllocationInput {
  beneficiaryUserId: string;
  evaluationAt: string;
  bonusAmount: string;
  sourceType?: "direct" | "uni" | "pool" | "cashback";
  candidateCycles: Array<{
    cycleId: string;
    activatedAt: string;
    activeUntil: string;
    earningCap: string;
    earnedTotalInCycle: string;
    purchaseBase: string;
    poolRateMode?: "default_50_percent" | "custom_rate" | "disabled";
    poolRate?: string;
    poolCapMultiple?: string;
    commissionCapScope?: "pool_only" | "all_commissions";
    commissionCapMultiple?: string;
    poolEarnedToDate?: string;
    isReceivable: boolean;
    earningStatus: "active" | "capped";
  }>;
}

export interface BonusToCycleAllocationResult {
  beneficiaryUserId: string;
  assignedCycleId: string | null;
  fallbackToCompany: boolean;
  fallbackReason:
    | "no_receivable_cycle"
    | "cap_blocked_all_receivable_cycles"
    | null;
}

export interface CommissionFinalizationInput {
  sourceType: "direct" | "uni" | "pool" | "cashback";
  sourceRefId: string;
  sourceUserId: string;
  beneficiaryUserId: string | null;
  evaluationAt: string;
  basePv: string;
  rate: string;
  amount: string;
  levelNo?: number | null;
  tierNo?: number | null;
}

export interface CommissionFinalizationResult {
  commissionStatus:
    | "approved"
    | "held"
    | "fallback"
    | "withdrawable";
  beneficiaryCycleId: string | null;
  fallbackReason: string | null;
}

export type DirectCommissionFallbackReason =
  | "no_active_sponsor"
  | "no_receivable_cycle"
  | "cap_blocked_all_receivable_cycles";

export interface DirectCommissionFinalizationResult
  extends Omit<CommissionFinalizationResult, "fallbackReason"> {
  fallbackReason: DirectCommissionFallbackReason | null;
}

export interface CommissionSourceOrder {
  orderId: string;
  sourceUserId: string;
  approvedAt: string;
  totalPv: string;
  approvalFinalInNormalFlow: true;
  includedInPoolFundingSource: true;
}

export interface CommissionCandidatePath {
  sourceUserId: string;
  evaluationAt: string;
  candidateUserIds: string[];
}

export interface DirectCommissionDraftResult {
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

export interface UniCommissionDraftResult {
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

export interface ApprovedOrderCommissionFlowResult {
  sourceOrderId: string;
  cashbackDrafts: Array<{
    sourceType: "cashback";
    sourceOrderId: string;
    beneficiaryUserId: string | null;
    rate: string;
    basePv: string;
    amount: string;
    allocation: BonusToCycleAllocationResult | null;
    finalization: CommissionFinalizationResult;
  }>;
  directDrafts: DirectCommissionDraftResult[];
  uniDrafts: UniCommissionDraftResult[];
}
