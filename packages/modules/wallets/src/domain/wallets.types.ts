export interface WalletSummary {
  walletId: string;
}

export interface WalletPostingInput {
  userId: string;
  refType: "commission" | "pool" | "reversal" | "payout_batch";
  refId: string;
  amount: string;
  holdRequired: boolean;
  direction?: "credit" | "debit";
}

export interface WalletPostingResult {
  userId: string;
  creditedBucket: "held" | "withdrawable" | null;
  negativeOffsetApplied: string;
  negativeCarryForwardCreated: string;
  residualCreditedAmount: string;
  payoutEligible: boolean;
}

export interface WalletNegativeOffsetInput {
  userId: string;
  amount: string;
}

export interface WalletNegativeOffsetResult {
  userId: string;
  appliedAmount: string;
  remainingNegativeOffset: string;
}

export interface WalletHoldDecision {
  userId: string;
  holdRequired: boolean;
  holdReasonCode: string | null;
}

export interface WalletBalanceReservationInput {
  userId: string;
  refType: "commission" | "pool";
  refId: string;
  amount: string;
}

export interface WalletBalanceReservationResult {
  userId: string;
  reserved: boolean;
  reasonCode: string | null;
}

export interface WalletBalanceReleaseResult {
  userId: string;
  released: boolean;
  reasonCode: string | null;
}

export interface WalletReservationReleaseInput {
  userId: string;
  batchId?: string;
}
