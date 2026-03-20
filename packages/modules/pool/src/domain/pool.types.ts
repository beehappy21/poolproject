export interface PoolCycleSummary {
  poolCycleId: string;
}

export interface PoolFundingInput {
  poolDate: string;
  approvedOrderCount: number;
  fundingTotalApprovedPv: string;
  poolRate: string;
}

export interface PoolSourceOrder {
  orderId: string;
  sourceUserId: string;
  approvedAt: string;
  totalPv: string;
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
  activeDirectReferralCount: number;
  poolDate?: string;
}

export interface PoolEligibilityDecision {
  userId: string;
  eligible: boolean;
  reasonCode: string;
}

export interface PoolRecipientDraftResult {
  userId: string;
  eligible: boolean;
  amount: string;
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
  fundingSource: "approved_orders_only";
  approvedOrderIds: string[];
  sameDayContributionRequired: false;
  hasRollup: false;
  fundingTotalApprovedPv: string;
  poolFund: string;
  payoutPerMember: string;
  eligibleRecipientCount: number;
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
}
