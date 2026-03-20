import {
  WalletBalanceReleaseResult,
  WalletBalanceReservationInput,
  WalletBalanceReservationResult,
  WalletHoldDecision,
  WalletNegativeOffsetInput,
  WalletNegativeOffsetResult,
  WalletPostingInput,
  WalletPostingResult,
  WalletReservationReleaseInput,
} from "../domain/wallets.types";
import {
  compareDecimalStrings,
  maxDecimalString,
  minDecimalString,
  subtractDecimalStrings,
} from "../../../../shared/utils/src/money.util";
import { RiskServiceContract } from "../../../risk/src/services/risk.service";
import { WalletsRepository } from "../repositories/wallets.repository";

export interface WalletsServiceContract {
  postLedgerEntry(input: WalletPostingInput): Promise<WalletPostingResult>;

  postApprovedEarning(input: WalletPostingInput): Promise<WalletPostingResult>;

  applyNegativeOffset(
    input: WalletNegativeOffsetInput,
  ): Promise<WalletNegativeOffsetResult>;

  decideWalletHold(userId: string): Promise<WalletHoldDecision>;

  releasePayoutHold(userId: string): Promise<void>;

  reserveBalanceForPayout(
    input: WalletBalanceReservationInput,
  ): Promise<WalletBalanceReservationResult>;

  releaseReservedBalance(
    input: WalletReservationReleaseInput,
  ): Promise<WalletBalanceReleaseResult>;
}

export class WalletsService implements WalletsServiceContract {
  constructor(
    private readonly walletsRepository: WalletsRepository,
    private readonly riskService: RiskServiceContract,
  ) {}

  async postLedgerEntry(input: WalletPostingInput): Promise<WalletPostingResult> {
    if (input.direction === "debit") {
      const walletState = await this.walletsRepository.getWalletState(input.userId);
      const withdrawableBalance = walletState?.withdrawableBalance ?? "0";
      const negativeCarryForwardCreated = maxDecimalString(
        subtractDecimalStrings(input.amount, withdrawableBalance),
        "0",
      );

      return {
        userId: input.userId,
        creditedBucket: null,
        negativeOffsetApplied: "0",
        negativeCarryForwardCreated,
        residualCreditedAmount: "0",
        payoutEligible: false,
      };
    }

    return this.postApprovedEarning(input);
  }

  async postApprovedEarning(
    input: WalletPostingInput,
  ): Promise<WalletPostingResult> {
    const holdDecision = await this.decideWalletHold(input.userId);
    const negativeOffset = await this.applyNegativeOffset({
      userId: input.userId,
      amount: input.amount,
    });

    return {
      userId: input.userId,
      creditedBucket:
        holdDecision.holdRequired || input.holdRequired ? "held" : "withdrawable",
      negativeOffsetApplied: negativeOffset.appliedAmount,
      negativeCarryForwardCreated: "0",
      residualCreditedAmount: maxDecimalString(
        subtractDecimalStrings(input.amount, negativeOffset.appliedAmount),
        "0",
      ),
      payoutEligible:
        !holdDecision.holdRequired &&
        !input.holdRequired &&
        compareDecimalStrings(input.amount, negativeOffset.appliedAmount) > 0,
    };
  }

  async applyNegativeOffset(
    input: WalletNegativeOffsetInput,
  ): Promise<WalletNegativeOffsetResult> {
    const walletState = await this.walletsRepository.getWalletState(input.userId);

    if (!walletState) {
      return {
        userId: input.userId,
        appliedAmount: "0",
        remainingNegativeOffset: input.amount,
      };
    }

    const currentNegativeOffset = walletState.negativeOffsetBalance;
    const incomingAmount = input.amount;
    const appliedAmount = minDecimalString(currentNegativeOffset, incomingAmount);
    const remainingNegativeOffset = maxDecimalString(
      subtractDecimalStrings(currentNegativeOffset, appliedAmount),
      "0",
    );

    return {
      userId: input.userId,
      appliedAmount,
      remainingNegativeOffset,
    };
  }

  async decideWalletHold(userId: string): Promise<WalletHoldDecision> {
    const riskDecision = await this.riskService.decidePayoutHold(userId);

    return {
      userId,
      holdRequired: riskDecision.placePayoutHold,
      holdReasonCode: riskDecision.holdReasonCode,
    };
  }

  async releasePayoutHold(userId: string): Promise<void> {
    void userId;
  }

  async reserveBalanceForPayout(
    input: WalletBalanceReservationInput,
  ): Promise<WalletBalanceReservationResult> {
    const walletState = await this.walletsRepository.getWalletState(input.userId);
    const holdDecision = await this.decideWalletHold(input.userId);

    if (!walletState) {
      return {
        userId: input.userId,
        reserved: false,
        reasonCode: "wallet_not_found",
      };
    }

    if (walletState.payoutLockStatus !== "unlocked") {
      return {
        userId: input.userId,
        reserved: false,
        reasonCode: "payout_lock_active",
      };
    }

    if (compareDecimalStrings(walletState.negativeOffsetBalance, "0") > 0) {
      return {
        userId: input.userId,
        reserved: false,
        reasonCode: "negative_offset_outstanding",
      };
    }

    if (holdDecision.holdRequired) {
      return {
        userId: input.userId,
        reserved: false,
        reasonCode: holdDecision.holdReasonCode ?? "payout_hold_active",
      };
    }

    return {
      userId: input.userId,
      reserved: true,
      reasonCode: null,
    };
  }

  async releaseReservedBalance(
    input: WalletReservationReleaseInput,
  ): Promise<WalletBalanceReleaseResult> {
    const holdDecision = await this.decideWalletHold(input.userId);

    if (holdDecision.holdRequired) {
      return {
        userId: input.userId,
        released: false,
        reasonCode: holdDecision.holdReasonCode ?? "payout_hold_active",
      };
    }

    return {
      userId: input.userId,
      released: true,
      reasonCode: input.batchId ? "batch_release" : null,
    };
  }
}
