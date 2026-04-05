import { Injectable } from "@nestjs/common";

import {
  KycRequestSummary,
  CommissionToShoppingConversionResult,
  DiscountWalletCreditResult,
  FirmWalletCreditResult,
  MatrixAutoOrderDebitResult,
  MatrixReentryDebitResult,
  ShoppingWalletTopupResult,
  ShoppingWalletTransferResult,
  WithdrawRequestSummary,
  WalletBalanceReleaseResult,
  WalletBalanceReservationInput,
  WalletBalanceReservationResult,
  WalletHoldDecision,
  WalletNegativeOffsetInput,
  WalletNegativeOffsetResult,
  WalletPostingInput,
  WalletPostingResult,
  WalletReservationReleaseInput,
  WalletSummary,
  WalletTopupRequestSummary,
  WalletTransactionSummary,
} from "../domain/wallets.types";
import {
  compareDecimalStrings,
  maxDecimalString,
  minDecimalString,
  multiplyDecimalStrings,
  subtractDecimalStrings,
} from "../../../../shared/utils/src/money.util";
import { RiskService } from "../../../risk/src/services/risk.service";
import { PrismaWalletsRepository } from "../repositories/wallets.repository";
import { readWalletSettings } from "../../../../shared/utils/src/wallet-settings.util";
import { readWithdrawSettings } from "../../../../shared/utils/src/withdraw-settings.util";

export interface WalletsServiceContract {
  getWalletSummary(userId: string): Promise<WalletSummary>;

  listWalletTransactions(userId: string): Promise<WalletTransactionSummary[]>;

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

  convertCommissionToShoppingWallet(
    input: { userId: string; amount: string },
  ): Promise<CommissionToShoppingConversionResult>;

  transferShoppingWalletToDownline(input: {
    senderUserId: string;
    recipientUserId?: string;
    recipientMemberCode?: string;
    amount: string;
  }): Promise<ShoppingWalletTransferResult>;

  topupShoppingWallet(input: {
    userId: string;
    amount: string;
    paymentMethod: string;
    note?: string;
    actorUserId?: string | null;
  }): Promise<ShoppingWalletTopupResult>;

  creditDiscountWalletFromApprovedOrder(input: {
    orderId: string;
  }): Promise<DiscountWalletCreditResult | null>;

  creditFirmWalletFromMatrixAutoOrder(input: {
    userId: string;
    matrixEventId: string;
    amount: string;
  }): Promise<FirmWalletCreditResult>;

  debitWithdrawableForMatrixAutoOrder(input: {
    userId: string;
    sourceBoardId: string;
    amount: string;
  }): Promise<MatrixAutoOrderDebitResult>;

  creditFirmWalletFromMatrixReentry(input: {
    userId: string;
    matrixEventId: string;
    amount: string;
  }): Promise<FirmWalletCreditResult>;

  debitWithdrawableForMatrixReentry(input: {
    userId: string;
    sourceBoardId: string;
    amount: string;
  }): Promise<MatrixReentryDebitResult>;

  requestWalletTopup(input: {
    userId: string;
    amount: string;
    paymentMethod: string;
    transferSlipUrl?: string;
    note?: string;
  }): Promise<WalletTopupRequestSummary>;

  listWalletTopupRequests(filters?: {
    userId?: string;
    status?: "pending" | "approved" | "rejected" | "cancelled";
  }): Promise<WalletTopupRequestSummary[]>;

  approveWalletTopupRequest(input: {
    requestId: string;
    actorUserId: string;
  }): Promise<WalletTopupRequestSummary>;

  rejectWalletTopupRequest(input: {
    requestId: string;
    actorUserId: string;
    rejectionReason: string;
  }): Promise<WalletTopupRequestSummary>;

  requestWithdraw(input: {
    userId: string;
    amount: string;
    bankName: string;
    bankBranch?: string;
    accountNumber: string;
    accountName: string;
    accountType?: string;
    note?: string;
  }): Promise<WithdrawRequestSummary>;

  listWithdrawRequests(filters?: {
    userId?: string;
    status?: "pending" | "approved" | "rejected" | "cancelled" | "exported" | "paid";
  }): Promise<WithdrawRequestSummary[]>;

  approveWithdrawRequest(input: {
    requestId: string;
    actorUserId: string;
  }): Promise<WithdrawRequestSummary>;

  rejectWithdrawRequest(input: {
    requestId: string;
    actorUserId: string;
    rejectionReason: string;
  }): Promise<WithdrawRequestSummary>;

  markWithdrawRequestExported(input: {
    requestIds: string[];
    actorUserId: string;
  }): Promise<WithdrawRequestSummary[]>;

  markWithdrawRequestPaid(input: {
    requestId: string;
    actorUserId: string;
  }): Promise<WithdrawRequestSummary>;

  createKycRequest(input: {
    userId: string;
    nationalId?: string;
    bankName?: string;
    bankBranch?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    bankAccountType?: string;
    personalIdImageUrl?: string;
    bankBookImageUrl?: string;
    selfieImageUrl?: string;
    note?: string;
  }): Promise<KycRequestSummary>;

  listKycRequests(filters?: {
    userId?: string;
    status?: "pending" | "approved" | "rejected";
  }): Promise<KycRequestSummary[]>;

  approveKycRequest(input: {
    requestId: string;
    actorUserId: string;
  }): Promise<KycRequestSummary>;

  rejectKycRequest(input: {
    requestId: string;
    actorUserId: string;
    rejectionReason: string;
  }): Promise<KycRequestSummary>;
}

@Injectable()
export class WalletsService implements WalletsServiceContract {
  constructor(
    private readonly walletsRepository: PrismaWalletsRepository,
    private readonly riskService: RiskService,
  ) {}

  async getWalletSummary(userId: string): Promise<WalletSummary> {
    return this.walletsRepository.getWalletSummary(userId);
  }

  async listWalletTransactions(
    userId: string,
  ): Promise<WalletTransactionSummary[]> {
    return this.walletsRepository.listWalletTransactions(userId);
  }

  async postLedgerEntry(input: WalletPostingInput): Promise<WalletPostingResult> {
    if (input.direction === "debit") {
      const walletState = await this.walletsRepository.getWalletState(input.userId);
      const withdrawableBalance = walletState?.withdrawableBalance ?? "0";
      const negativeCarryForwardCreated = maxDecimalString(
        subtractDecimalStrings(input.amount, withdrawableBalance),
        "0",
      );

      const result = {
        userId: input.userId,
        creditedBucket: null,
        negativeOffsetApplied: "0",
        negativeCarryForwardCreated,
        residualCreditedAmount: "0",
        payoutEligible: false,
      };

      return this.walletsRepository.recordWalletPosting(input, result);
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

    const result: WalletPostingResult = {
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

    return this.walletsRepository.recordWalletPosting(input, result);
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

  async convertCommissionToShoppingWallet(
    input: { userId: string; amount: string },
  ): Promise<CommissionToShoppingConversionResult> {
    const settings = readWalletSettings();

    if (!settings.commissionToShoppingEnabled) {
      throw new Error("CW to SW conversion is disabled.");
    }

    const feeAmount = multiplyDecimalStrings(
      input.amount,
      settings.commissionToShoppingFeeRate,
    );
    const netAmount = maxDecimalString(
      subtractDecimalStrings(input.amount, feeAmount),
      "0",
    );

    if (compareDecimalStrings(netAmount, "0") <= 0) {
      throw new Error("Net SW amount must be greater than zero.");
    }

    return this.walletsRepository.convertWithdrawableToShoppingWallet({
      userId: input.userId,
      grossAmount: input.amount,
      feeAmount,
      netAmount,
    });
  }

  async transferShoppingWalletToDownline(input: {
    senderUserId: string;
    recipientUserId?: string;
    recipientMemberCode?: string;
    amount: string;
  }): Promise<ShoppingWalletTransferResult> {
    const settings = readWalletSettings();

    if (!settings.walletTransferEnabled) {
      throw new Error("Wallet transfer is disabled.");
    }

    const recipientUserId =
      input.recipientUserId ??
      (input.recipientMemberCode
        ? await this.walletsRepository.findUserIdByMemberCode(
            input.recipientMemberCode,
          )
        : null);

    if (!recipientUserId) {
      throw new Error("Recipient member not found.");
    }

    if (recipientUserId === input.senderUserId) {
      throw new Error("Cannot transfer SW to self.");
    }

    const isDownline = await this.walletsRepository.isDownlineOfSponsor(
      input.senderUserId,
      recipientUserId,
    );

    if (!isDownline) {
      throw new Error("Recipient must be in the sender downline.");
    }

    const feeAmount = multiplyDecimalStrings(
      input.amount,
      settings.walletTransferFeeRate,
    );
    const netAmount = maxDecimalString(
      subtractDecimalStrings(input.amount, feeAmount),
      "0",
    );

    if (compareDecimalStrings(netAmount, "0") <= 0) {
      throw new Error("Net transfer amount must be greater than zero.");
    }

    return this.walletsRepository.transferShoppingWallet({
      senderUserId: input.senderUserId,
      recipientUserId,
      grossAmount: input.amount,
      feeAmount,
      netAmount,
    });
  }

  async topupShoppingWallet(input: {
    userId: string;
    amount: string;
    paymentMethod: string;
    note?: string;
    actorUserId?: string | null;
  }): Promise<ShoppingWalletTopupResult> {
    const settings = readWalletSettings();

    if (!settings.walletTopupEnabled) {
      throw new Error("Wallet top-up is disabled.");
    }

    this.assertAllowedPaymentMethod(
      input.paymentMethod,
      settings.walletTopupPaymentMethods,
      "Wallet top-up payment method is not allowed.",
    );

    return this.walletsRepository.topupShoppingWallet(input);
  }

  async creditDiscountWalletFromApprovedOrder(input: {
    orderId: string;
  }): Promise<DiscountWalletCreditResult | null> {
    return this.walletsRepository.creditDiscountWalletFromApprovedOrder(input);
  }

  async creditFirmWalletFromMatrixAutoOrder(input: {
    userId: string;
    matrixEventId: string;
    amount: string;
  }): Promise<FirmWalletCreditResult> {
    return this.walletsRepository.creditFirmWalletFromMatrixAutoOrder(input);
  }

  async debitWithdrawableForMatrixAutoOrder(input: {
    userId: string;
    sourceBoardId: string;
    amount: string;
  }): Promise<MatrixAutoOrderDebitResult> {
    const wallet = await this.walletsRepository.getWalletSummary(input.userId);

    if (compareDecimalStrings(wallet.withdrawableBalance, input.amount) < 0) {
      throw new Error("Insufficient balance for matrix auto order.");
    }

    return this.walletsRepository.debitWithdrawableForMatrixAutoOrder(input);
  }

  async creditFirmWalletFromMatrixReentry(input: {
    userId: string;
    matrixEventId: string;
    amount: string;
  }): Promise<FirmWalletCreditResult> {
    return this.creditFirmWalletFromMatrixAutoOrder(input);
  }

  async debitWithdrawableForMatrixReentry(input: {
    userId: string;
    sourceBoardId: string;
    amount: string;
  }): Promise<MatrixReentryDebitResult> {
    return this.debitWithdrawableForMatrixAutoOrder(input);
  }

  async requestWalletTopup(input: {
    userId: string;
    amount: string;
    paymentMethod: string;
    transferSlipUrl?: string;
    note?: string;
  }): Promise<WalletTopupRequestSummary> {
    const settings = readWalletSettings();

    if (!settings.walletTopupEnabled) {
      throw new Error("Wallet top-up is disabled.");
    }

    this.assertAllowedPaymentMethod(
      input.paymentMethod,
      settings.walletTopupPaymentMethods,
      "Wallet top-up payment method is not allowed.",
    );

    return this.walletsRepository.createWalletTopupRequest(input);
  }

  async listWalletTopupRequests(filters?: {
    userId?: string;
    status?: "pending" | "approved" | "rejected" | "cancelled";
  }): Promise<WalletTopupRequestSummary[]> {
    return this.walletsRepository.listWalletTopupRequests(filters);
  }

  async approveWalletTopupRequest(input: {
    requestId: string;
    actorUserId: string;
  }): Promise<WalletTopupRequestSummary> {
    return this.walletsRepository.approveWalletTopupRequest(input);
  }

  async rejectWalletTopupRequest(input: {
    requestId: string;
    actorUserId: string;
    rejectionReason: string;
  }): Promise<WalletTopupRequestSummary> {
    return this.walletsRepository.rejectWalletTopupRequest(input);
  }

  async requestWithdraw(input: {
    userId: string;
    amount: string;
    bankName: string;
    bankBranch?: string;
    accountNumber: string;
    accountName: string;
    accountType?: string;
    note?: string;
  }): Promise<WithdrawRequestSummary> {
    const settings = readWithdrawSettings();

    if (!settings.withdrawEnabled) {
      throw new Error("Withdraw request is disabled.");
    }

    if (compareDecimalStrings(input.amount, settings.minimumWithdrawAmount) < 0) {
      throw new Error("Withdraw amount is lower than the configured minimum.");
    }

    const wallet = await this.walletsRepository.getWalletSummary(input.userId);
    if (compareDecimalStrings(wallet.shoppingBalance, input.amount) < 0) {
      throw new Error("Insufficient SW balance.");
    }

    const taxAmount = multiplyDecimalStrings(input.amount, settings.withholdingTaxRate);
    const autoSweepAmount = multiplyDecimalStrings(input.amount, settings.autoSweepRate);
    const feeAmount = settings.feeFlatAmount;
    const netBankAmount = maxDecimalString(
      subtractDecimalStrings(
        subtractDecimalStrings(
          subtractDecimalStrings(input.amount, taxAmount),
          autoSweepAmount,
        ),
        feeAmount,
      ),
      "0",
    );

    return this.walletsRepository.createWithdrawRequest({
      ...input,
      taxAmount,
      autoSweepAmount,
      feeAmount,
      netBankAmount,
    });
  }

  async listWithdrawRequests(filters?: {
    userId?: string;
    status?: "pending" | "approved" | "rejected" | "cancelled" | "exported" | "paid";
  }): Promise<WithdrawRequestSummary[]> {
    return this.walletsRepository.listWithdrawRequests(filters);
  }

  async approveWithdrawRequest(input: {
    requestId: string;
    actorUserId: string;
  }): Promise<WithdrawRequestSummary> {
    return this.walletsRepository.approveWithdrawRequest(input);
  }

  async rejectWithdrawRequest(input: {
    requestId: string;
    actorUserId: string;
    rejectionReason: string;
  }): Promise<WithdrawRequestSummary> {
    return this.walletsRepository.rejectWithdrawRequest(input);
  }

  async markWithdrawRequestExported(input: {
    requestIds: string[];
    actorUserId: string;
  }): Promise<WithdrawRequestSummary[]> {
    void input.actorUserId;
    return this.walletsRepository.markWithdrawRequestsExported(input.requestIds);
  }

  async markWithdrawRequestPaid(input: {
    requestId: string;
    actorUserId: string;
  }): Promise<WithdrawRequestSummary> {
    return this.walletsRepository.markWithdrawRequestPaid(input);
  }

  async createKycRequest(input: {
    userId: string;
    nationalId?: string;
    bankName?: string;
    bankBranch?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    bankAccountType?: string;
    personalIdImageUrl?: string;
    bankBookImageUrl?: string;
    selfieImageUrl?: string;
    note?: string;
  }): Promise<KycRequestSummary> {
    return this.walletsRepository.createKycRequest(input);
  }

  async listKycRequests(filters?: {
    userId?: string;
    status?: "pending" | "approved" | "rejected";
  }): Promise<KycRequestSummary[]> {
    return this.walletsRepository.listKycRequests(filters);
  }

  async approveKycRequest(input: {
    requestId: string;
    actorUserId: string;
  }): Promise<KycRequestSummary> {
    return this.walletsRepository.approveKycRequest(input);
  }

  async rejectKycRequest(input: {
    requestId: string;
    actorUserId: string;
    rejectionReason: string;
  }): Promise<KycRequestSummary> {
    return this.walletsRepository.rejectKycRequest(input);
  }

  private assertAllowedPaymentMethod(
    paymentMethod: string,
    allowedMethods: string[],
    errorMessage: string,
  ) {
    const normalizedMethod = paymentMethod.trim().toLowerCase();

    if (!allowedMethods.includes(normalizedMethod)) {
      throw new Error(errorMessage);
    }
  }
}
