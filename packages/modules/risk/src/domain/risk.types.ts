export interface RiskFlagSummary {
  riskFlagId: string;
}

export interface RiskFlagDecisionInput {
  userId: string;
  flagTypes: string[];
  riskLevel: "normal" | "watch" | "high" | "critical";
}

export interface HoldDecisionResult {
  userId: string;
  placePayoutHold: boolean;
  holdReasonCode: string | null;
  manualReviewRequired: boolean;
}

export interface ManualReviewCaseSummary {
  reviewCaseId: string;
  caseType:
    | "risk_review"
    | "wallet_rebind"
    | "payout_hold"
    | "exceptional_reversal";
  status: "open" | "assigned" | "resolved" | "rejected";
}
