export interface CommissionItemSummary {
  commissionId: string;
}

export interface EndOfDayCommissionBatchResult {
  settlementDate: string;
  teamSettlement: TeamSettlementBatchProcessResult;
  pool: {
    poolDate: string;
    fundingTotalApprovedPv: string;
    poolFund: string;
    eligibleMemberCount: number;
    payoutPerMember: string;
    companyFallbackAmount: string;
    reprocessed?: boolean;
  };
}

export type CommissionSourceType =
  | "direct"
  | "uni"
  | "pool"
  | "cashback"
  | "team_2leg"
  | "team_3leg"
  | "matching_l1"
  | "matching_l2";

export type CommissionReleaseStatus =
  | "withdrawable"
  | "held_pending_repurchase"
  | "released_after_repurchase"
  | "blocked_after_expiry";

export type BuybackProgressStatus =
  | "clear"
  | "held_pending_repurchase"
  | "blocked_after_expiry";

export interface BonusToCycleAllocationInput {
  beneficiaryUserId: string;
  evaluationAt: string;
  bonusAmount: string;
  sourceType?: CommissionSourceType;
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
  sourceType: CommissionSourceType;
  sourceRefId: string;
  sourceUserId: string;
  beneficiaryUserId: string | null;
  evaluationAt: string;
  basePv: string;
  rate: string;
  amount: string;
  grossAmount?: string;
  finalPayableAmount?: string;
  discardedAmount?: string;
  releaseStatus?: CommissionReleaseStatus;
  sourceCommissionLedgerId?: string | null;
  metadata?: Record<string, unknown> | null;
  levelNo?: number | null;
  tierNo?: number | null;
  commissionConfig?: {
    dailyCommissionCapAmount: string;
    buybackThresholdAmount: string;
    buybackGraceDays: number;
  };
  applyDailyCap?: boolean;
}

export interface CommissionFinalizationResult {
  commissionStatus:
    | "approved"
    | "held"
    | "fallback"
    | "withdrawable";
  beneficiaryCycleId: string | null;
  fallbackReason: string | null;
  grossAmount: string;
  finalPayableAmount: string;
  discardedAmount: string;
  releaseStatus: CommissionReleaseStatus;
}

export type DirectCommissionFallbackReason =
  | "no_active_sponsor"
  | "no_receivable_cycle"
  | "cap_blocked_all_receivable_cycles";

export interface DirectCommissionFinalizationResult
  extends Omit<CommissionFinalizationResult, "fallbackReason"> {
  fallbackReason: DirectCommissionFallbackReason | null;
}

export interface DailyCommissionCapSnapshot {
  beneficiaryUserId: string;
  capDate: string;
  capAmount: string;
  usedAmount: string;
}

export interface UserBuybackProgressSnapshot {
  beneficiaryUserId: string;
  accumulatedAmount: string;
  status: BuybackProgressStatus;
  thresholdReachedAt: string | null;
  graceExpiresAt: string | null;
  blockedAt: string | null;
}

export interface BuybackEventDraft {
  beneficiaryUserId: string;
  triggerAmount: string;
  remainingAccumulatedAmount: string;
  status: string;
  message?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown> | null;
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

export interface TeamSettlementCandidateSnapshot {
  userId: string;
  uplineUserId: string | null;
  placementSide: "LEFT" | "MIDDLE" | "RIGHT" | null;
  totalPv: string;
}

export interface TeamSettlementBatchScaffoldResult {
  settlementDate: string;
  status: "scaffolded" | "processed";
  totalUsers: number;
  processedUsers?: number;
  carriedForwardUsers?: number;
  totalPayablePv?: string;
  totalBonusAmount?: string;
  items: Array<{
    userId: string;
    availablePvByLeg: Record<
      "LEFT" | "MIDDLE" | "RIGHT",
      { memberCount: number; totalPv: string }
    >;
    plannedPaidPvByLeg: Record<"LEFT" | "MIDDLE" | "RIGHT", string>;
    carryForwardPvByLeg: Record<"LEFT" | "MIDDLE" | "RIGHT", string>;
    payablePv: string;
    bonusAmount: string;
    status: "planned" | "processed" | "carried_forward";
  }>;
}

export interface TeamSettlementBatchItemSnapshot {
  itemId: string;
  userId: string;
  availablePvByLeg: Record<
    "LEFT" | "MIDDLE" | "RIGHT",
    { memberCount: number; totalPv: string }
  >;
  plannedPaidPvByLeg: Record<"LEFT" | "MIDDLE" | "RIGHT", string>;
  carryForwardPvByLeg: Record<"LEFT" | "MIDDLE" | "RIGHT", string>;
  payablePv: string;
  bonusAmount: string;
  status: "planned" | "processed" | "carried_forward";
}

export interface TeamSettlementBatchProcessResult {
  settlementDate: string;
  status: "processed";
  totalUsers: number;
  processedUsers: number;
  carriedForwardUsers: number;
  totalPayablePv: string;
  totalBonusAmount: string;
  items: TeamSettlementBatchItemSnapshot[];
}

export interface TeamSettlementBatchSnapshotResult {
  settlementDate: string;
  batchStatus: "missing" | "scaffolded" | "processed";
  totalUsers: number;
  processedUsers: number;
  carriedForwardUsers: number;
  totalPayablePv: string;
  totalBonusAmount: string;
  items: TeamSettlementBatchItemSnapshot[];
}
