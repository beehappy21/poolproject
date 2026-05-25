export interface PoolCycleSummary {
  poolCycleId: string;
}

export interface PoolFundingInput {
  poolDate: string;
  approvedOrderCount: number;
  fundingTotalApprovedPv: string;
  approvedOrders?: PoolSourceOrder[];
}

export interface PoolSourceOrder {
  orderId: string;
  sourceUserId: string;
  approvedAt: string;
  totalPv: string;
  items?: Array<{
    lineTotalPv: string;
    lineTotalUsdt?: string;
    poolRateMode?: "default_50_percent" | "custom_rate" | "disabled";
  }>;
}

export interface PoolFundingResult {
  poolDate: string;
  approvedOrderCount: number;
  fundingTotalApprovedPv: string;
  poolRate: string;
  poolFund: string;
}

export interface PoolEligibilityMemberSnapshot {
  userId: string;
  memberActive: boolean;
  hasPassedInitialQualification: boolean;
  hasOwnApprovedOrder: boolean;
  activeDirectReferralCount: number;
  activeDirectBuyerCount: number;
  roundStatus?: "clear" | "held_pending_repurchase" | "blocked_after_expiry" | null;
  realPaidPoolEnabledAmount?: string;
  latestQualifiedBoardCompletedAt?: string | null;
  evaluationAt?: string;
}

export interface PoolEligibilityDecision {
  userId: string;
  eligible: boolean;
  reasonCode: string;
  memberActive: boolean;
  activeDirectReferralCount: number;
}

export interface PoolRecipientDraftResult {
  userId: string;
  eligible: boolean;
  requestedAmount: string;
  amount: string;
  fallbackAmount: string;
  candidateCycleIds: string[];
  allocation: {
    assignedCycleId: string | null;
    fallbackToCompany: boolean;
    fallbackReason:
      | "no_receivable_cycle"
      | "cap_blocked_all_receivable_cycles"
      | null;
  } | null;
  finalization: {
    commissionStatus: "approved" | "fallback";
    beneficiaryCycleId: string | null;
    fallbackReason:
      | "no_receivable_cycle"
      | "cap_blocked_all_receivable_cycles"
      | null;
  };
}

export interface DailyPoolFlowResult {
  poolDate: string;
  evaluationAt: string;
  fundingSource: "approved_orders_only";
  approvedOrderIds: string[];
  sameDayContributionRequired: false;
  hasRollup: false;
  fundingTotalApprovedPv: string;
  poolFund: string;
  payoutPerMember: string;
  eligibleRecipientCount: number;
  eligibilityDecisions: PoolEligibilityDecision[];
  recipientDrafts: PoolRecipientDraftResult[];
  companyFallback: {
    fallbackToCompany: boolean;
    reasonCode: "no_eligible_pool_members" | "recipient_level_fallback" | null;
    amount: string;
  };
}

export interface PoolCloseResult {
  poolDate: string;
  fundingTotalApprovedPv: string;
  poolFund: string;
  eligibleMemberCount: number;
  payoutPerMember: string;
  companyFallbackAmount: string;
  reprocessed?: boolean;
}
