import {
  WalletNegativeOffsetResult,
  WalletPostingInput,
  WalletPostingResult,
} from "../domain/wallets.types";

export interface WalletsRepository {
  getWalletState(userId: string): Promise<{
    approvedBalance: string;
    heldBalance: string;
    withdrawableBalance: string;
    negativeOffsetBalance: string;
    payoutLockStatus: "unlocked" | "hold" | "locked";
  } | null>;

  recordWalletPosting(input: WalletPostingInput): Promise<WalletPostingResult>;

  applyNegativeOffsetResult(
    userId: string,
    result: WalletNegativeOffsetResult,
  ): Promise<void>;

  hasActivePayoutHold(userId: string): Promise<boolean>;
}
