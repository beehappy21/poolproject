export interface PayoutBatchSummary {
  payoutBatchId: string;
}

export interface PayoutSelectionCandidate {
  userId: string;
  refType: "commission" | "pool";
  refId: string;
  amount: string;
  holdStatus: "none" | "held" | "released";
  payoutLockStatus: "unlocked" | "hold" | "locked";
}

export interface PayoutSelectionResult {
  selected: PayoutSelectionCandidate[];
  excluded: Array<{
    refId: string;
    reasonCode: string;
  }>;
}

export interface PayoutReservationInput {
  batchId: string;
  items: Array<{
    refType: "commission" | "pool";
    refId: string;
    userId: string;
    amount: string;
  }>;
}

export interface PayoutReservationResult {
  batchId: string;
  reservedItemCount: number;
}

export interface PayoutBatchDraftResult {
  batchId: string;
  status: "draft";
}

export interface PayoutBatchDraftInput {
  chainId: string;
  tokenAddress: string;
  items: PayoutSelectionCandidate[];
}

export interface PayoutBatchSubmissionResult {
  batchId: string;
  status: "submitted";
}

export interface PayoutBatchReconciliationResult {
  batchId: string;
  status: "confirmed" | "failed";
  releasedItemCount?: number;
}
