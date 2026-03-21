export interface OrderSummary {
  orderId: string;
}

export interface ApprovedOrderOrchestrationStep {
  step:
    | "load_approved_order"
    | "run_source_qualification"
    | "build_commission_drafts"
    | "register_pool_source"
    | "prepare_wallet_postings"
    | "evaluate_risk_holds";
  status: "completed";
}

export interface ApprovedOrderOrchestrationResult {
  orderId: string;
  sourceUserId: string;
  approvedAt: string;
  approvalFinalInNormalFlow: true;
  poolContributionSource: "approved_orders_only";
  steps: ApprovedOrderOrchestrationStep[];
  commissionDrafts: {
    directStatus: "approved" | "held" | "fallback" | "withdrawable";
    directCount: number;
    uniCount: number;
    hasFallback: boolean;
  };
  matrixProcessing: {
    affectedMemberCount: number;
    payoutCount: number;
    completedCycleCount: number;
    skipped: boolean;
  };
  walletPostingInputs: Array<{
    userId: string;
    refType: "commission";
    refId: string;
    amount: string;
    holdRequired: boolean;
  }>;
}
