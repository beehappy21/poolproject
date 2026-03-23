export interface WalletSummary {
  walletId: string;
  userId: string;
  approvedBalance: string;
  heldBalance: string;
  withdrawableBalance: string;
  shoppingBalance: string;
  discountBalance: string;
  negativeOffsetBalance: string;
  payoutLockStatus: "unlocked" | "hold" | "locked";
}

export interface WalletPostingInput {
  userId: string;
  refType: "commission" | "pool" | "reversal" | "payout_batch" | "matrix";
  refId: string;
  amount: string;
  holdRequired: boolean;
  direction?: "credit" | "debit";
  earningType?: "direct" | "uni" | "pool" | "matrix" | "cashback";
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

export interface WalletTransactionSummary {
  transactionId: string;
  txType: string;
  direction: string;
  balanceBucket: string;
  refType: string;
  refId: string;
  counterpartyUserId?: string | null;
  note?: string | null;
  amount: string;
  status: string;
  createdAt: string;
}

export interface CommissionToShoppingConversionResult {
  userId: string;
  grossAmount: string;
  feeAmount: string;
  netShoppingAmount: string;
  withdrawableBalance: string;
  shoppingBalance: string;
}

export interface ShoppingWalletTransferResult {
  senderUserId: string;
  recipientUserId: string;
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  senderShoppingBalance: string;
  recipientShoppingBalance: string;
}

export interface ShoppingWalletTopupResult {
  userId: string;
  amount: string;
  paymentMethod: string;
  shoppingBalance: string;
}

export interface DiscountWalletCreditResult {
  userId: string;
  amount: string;
  discountBalance: string;
  sourceOrderId: string;
}

export interface WalletTopupRequestSummary {
  requestId: string;
  userId: string;
  amount: string;
  paymentMethod: string;
  transferSlipUrl: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requestedAt: string;
  approvedAt: string | null;
  approvedByUserId: string | null;
  rejectionReason: string | null;
}
