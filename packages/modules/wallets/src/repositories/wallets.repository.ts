import {
  KycRequestSummary,
  CommissionToShoppingConversionResult,
  DiscountWalletCreditResult,
  FirmWalletCreditResult,
  FirmOrderWalletCreditResult,
  MatrixAutoOrderDebitResult,
  MatrixReentryDebitResult,
  ShoppingWalletTopupResult,
  ShoppingWalletTransferResult,
  WithdrawRequestSummary,
  WalletSummary,
  WalletNegativeOffsetResult,
  WalletPostingInput,
  WalletPostingResult,
  WalletTopupRequestSummary,
  WalletTransactionSummary,
} from "../domain/wallets.types";
import {
  KycRequestStatus,
  Prisma,
  PrismaClient,
  WalletTopupRequestStatus,
  WithdrawRequestStatus,
} from "@prisma/client";

export interface WalletsRepository {
  getWalletState(userId: string): Promise<{
    approvedBalance: string;
    heldBalance: string;
    withdrawableBalance: string;
    shoppingBalance: string;
    discountBalance: string;
    firmBalance: string;
    negativeOffsetBalance: string;
    payoutLockStatus: "unlocked" | "hold" | "locked";
  } | null>;

  getWalletSummary(userId: string): Promise<WalletSummary>;

  listWalletTransactions(userId: string): Promise<WalletTransactionSummary[]>;

  recordWalletPosting(
    input: WalletPostingInput,
    result: WalletPostingResult,
  ): Promise<WalletPostingResult>;

  releaseHeldCommissionCredit(input: {
    userId: string;
    commissionId: string;
    amount: string;
  }): Promise<void>;

  applyNegativeOffsetResult(
    userId: string,
    result: WalletNegativeOffsetResult,
  ): Promise<void>;

  hasActivePayoutHold(userId: string): Promise<boolean>;

  convertWithdrawableToShoppingWallet(input: {
    userId: string;
    grossAmount: string;
    feeAmount: string;
    netAmount: string;
  }): Promise<CommissionToShoppingConversionResult>;

  transferShoppingWallet(input: {
    senderUserId: string;
    recipientUserId: string;
    grossAmount: string;
    feeAmount: string;
    netAmount: string;
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

  creditFirmWalletFromApprovedOrder(input: {
    orderId: string;
  }): Promise<FirmOrderWalletCreditResult | null>;

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

  spendShoppingWallet(input: {
    userId: string;
    orderId: string;
    amount: string;
    note?: string;
  }): Promise<void>;

  findUserIdByMemberCode(memberCode: string): Promise<string | null>;

  isDownlineOfSponsor(
    sponsorUserId: string,
    memberUserId: string,
  ): Promise<boolean>;

  createWalletTopupRequest(input: {
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

  createWithdrawRequest(input: {
    userId: string;
    amount: string;
    bankName: string;
    bankBranch?: string;
    accountNumber: string;
    accountName: string;
    accountType?: string;
    taxAmount: string;
    autoSweepAmount: string;
    feeAmount: string;
    netBankAmount: string;
    note?: string;
  }): Promise<WithdrawRequestSummary>;

  findLatestApprovedKycRequest(userId: string): Promise<KycRequestSummary | null>;

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

  cancelWithdrawRequest(input: {
    requestId: string;
    actorUserId: string;
    reason?: string;
  }): Promise<WithdrawRequestSummary>;

  markWithdrawRequestsExported(requestIds: string[]): Promise<WithdrawRequestSummary[]>;

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

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import {
  addDecimalStrings,
  compareDecimalStrings,
  floorDecimalString,
  maxDecimalString,
  minDecimalString,
  multiplyDecimalStrings,
  subtractDecimalStrings,
} from "../../../../shared/utils/src/money.util";

@Injectable()
export class PrismaWalletsRepository implements WalletsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletState(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: BigInt(userId) },
      select: {
        approvedBalance: true,
        heldBalance: true,
        withdrawableBalance: true,
        shoppingBalance: true,
        discountBalance: true,
        firmBalance: true,
        negativeOffsetBalance: true,
        payoutLockStatus: true,
      },
    });

    if (!wallet) {
      return null;
    }

    return {
      approvedBalance: wallet.approvedBalance.toString(),
      heldBalance: wallet.heldBalance.toString(),
      withdrawableBalance: wallet.withdrawableBalance.toString(),
      shoppingBalance: wallet.shoppingBalance.toString(),
      discountBalance: wallet.discountBalance.toString(),
      firmBalance: wallet.firmBalance.toString(),
      negativeOffsetBalance: wallet.negativeOffsetBalance.toString(),
      payoutLockStatus: wallet.payoutLockStatus.toLowerCase() as
        | "unlocked"
        | "hold"
        | "locked",
    };
  }

  async getWalletSummary(userId: string): Promise<WalletSummary> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: BigInt(userId) },
      select: {
        id: true,
        userId: true,
        approvedBalance: true,
        heldBalance: true,
        withdrawableBalance: true,
        shoppingBalance: true,
        discountBalance: true,
        firmBalance: true,
        negativeOffsetBalance: true,
        payoutLockStatus: true,
      },
    });

    if (!wallet) {
      return {
        walletId: "",
        userId,
        approvedBalance: "0",
        heldBalance: "0",
        withdrawableBalance: "0",
        shoppingBalance: "0",
        discountBalance: "0",
        firmBalance: "0",
        negativeOffsetBalance: "0",
        payoutLockStatus: "unlocked",
      };
    }

    return {
      walletId: wallet.id.toString(),
      userId: wallet.userId.toString(),
      approvedBalance: wallet.approvedBalance.toString(),
      heldBalance: wallet.heldBalance.toString(),
      withdrawableBalance: wallet.withdrawableBalance.toString(),
      shoppingBalance: wallet.shoppingBalance.toString(),
      discountBalance: wallet.discountBalance.toString(),
      firmBalance: wallet.firmBalance.toString(),
      negativeOffsetBalance: wallet.negativeOffsetBalance.toString(),
      payoutLockStatus: wallet.payoutLockStatus.toLowerCase() as
        | "unlocked"
        | "hold"
        | "locked",
    };
  }

  async listWalletTransactions(userId: string): Promise<WalletTransactionSummary[]> {
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { userId: BigInt(userId) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        txType: true,
        direction: true,
        balanceBucket: true,
        refType: true,
        refId: true,
        counterpartyUserId: true,
        note: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    return transactions.map((transaction) => ({
      transactionId: transaction.id.toString(),
      txType: transaction.txType.toLowerCase(),
      direction: transaction.direction.toLowerCase(),
      balanceBucket: transaction.balanceBucket.toLowerCase(),
      refType: transaction.refType.toLowerCase(),
      refId: transaction.refId.toString(),
      counterpartyUserId: transaction.counterpartyUserId?.toString() ?? null,
      note: transaction.note ?? null,
      amount: transaction.amount.toString(),
      status: transaction.status.toLowerCase(),
      createdAt: transaction.createdAt.toISOString(),
    }));
  }

  async recordWalletPosting(
    input: WalletPostingInput,
    result: WalletPostingResult,
  ): Promise<WalletPostingResult> {
    const transactionType = this.resolveTransactionType(input);
    const existingTransaction = await this.prisma.walletTransaction.findFirst({
      where: {
        userId: BigInt(input.userId),
        txType: transactionType,
        refType: input.refType.toUpperCase(),
        refId: BigInt(input.refId),
        status: "POSTED",
      },
      select: { id: true },
    });

    if (existingTransaction) {
      return result;
    }

    await this.prisma.$transaction(async (tx) => {
      const existingWallet = await tx.wallet.upsert({
        where: { userId: BigInt(input.userId) },
        update: {},
        create: { userId: BigInt(input.userId) },
        select: {
          approvedBalance: true,
          heldBalance: true,
          withdrawableBalance: true,
          shoppingBalance: true,
          discountBalance: true,
          negativeOffsetBalance: true,
        },
      });

      const approvedDelta =
        input.direction === "debit"
          ? `-${minDecimalString(existingWallet.withdrawableBalance.toString(), input.amount)}`
          : result.residualCreditedAmount;
      const heldDelta =
        result.creditedBucket === "held" ? result.residualCreditedAmount : "0";
      const withdrawableDelta =
        input.direction === "debit"
          ? `-${minDecimalString(existingWallet.withdrawableBalance.toString(), input.amount)}`
          : result.creditedBucket === "withdrawable"
            ? result.residualCreditedAmount
            : "0";
      const negativeOffsetDelta =
        input.direction === "debit"
          ? result.negativeCarryForwardCreated
          : `-${result.negativeOffsetApplied}`;

      await tx.wallet.update({
        where: { userId: BigInt(input.userId) },
          data: {
            approvedBalance: maxDecimalString(
              addDecimalStrings(existingWallet.approvedBalance.toString(), approvedDelta),
            "0",
          ),
          heldBalance: maxDecimalString(
            addDecimalStrings(existingWallet.heldBalance.toString(), heldDelta),
            "0",
          ),
            withdrawableBalance: maxDecimalString(
              addDecimalStrings(
                existingWallet.withdrawableBalance.toString(),
                withdrawableDelta,
              ),
              "0",
            ),
            shoppingBalance: existingWallet.shoppingBalance.toString(),
            discountBalance: existingWallet.discountBalance.toString(),
            negativeOffsetBalance: maxDecimalString(
              addDecimalStrings(
                existingWallet.negativeOffsetBalance.toString(),
              negativeOffsetDelta,
            ),
            "0",
          ),
        },
      });

      if (
        input.direction !== "debit" &&
        compareDecimalStrings(result.negativeOffsetApplied, "0") > 0
      ) {
        await tx.walletTransaction.create({
          data: {
            userId: BigInt(input.userId),
            txType: "NEGATIVE_OFFSET_APPLY",
            direction: "DEBIT",
            balanceBucket: "NEGATIVE_OFFSET",
            refType: input.refType.toUpperCase(),
            refId: BigInt(input.refId),
            amount: result.negativeOffsetApplied,
            status: "POSTED",
          },
        });
      }

      if (
        input.direction === "debit" ||
        compareDecimalStrings(result.residualCreditedAmount, "0") > 0
      ) {
        await tx.walletTransaction.create({
          data: {
            userId: BigInt(input.userId),
            txType: transactionType,
            direction: input.direction === "debit" ? "DEBIT" : "CREDIT",
            balanceBucket:
              input.direction === "debit"
                ? "WITHDRAWABLE"
                : result.creditedBucket === "held"
                  ? "HELD"
                  : "WITHDRAWABLE",
            refType: input.refType.toUpperCase(),
            refId: BigInt(input.refId),
            amount:
              input.direction === "debit"
                ? input.amount
                : result.residualCreditedAmount,
            status: "POSTED",
          },
        });
      }
    });

    return result;
  }

  async releaseHeldCommissionCredit(input: {
    userId: string;
    commissionId: string;
    amount: string;
  }): Promise<void> {
    const existingRelease = await this.prisma.walletTransaction.findFirst({
      where: {
        userId: BigInt(input.userId),
        txType: "BUYBACK_RELEASE",
        refType: "COMMISSION",
        refId: BigInt(input.commissionId),
        status: "POSTED",
      },
      select: { id: true },
    });

    if (existingRelease) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: BigInt(input.userId) },
        update: {},
        create: { userId: BigInt(input.userId) },
        select: {
          approvedBalance: true,
          heldBalance: true,
          withdrawableBalance: true,
          shoppingBalance: true,
          discountBalance: true,
          negativeOffsetBalance: true,
        },
      });

      const releasableAmount = minDecimalString(
        wallet.heldBalance.toString(),
        input.amount,
      );

      if (compareDecimalStrings(releasableAmount, "0") <= 0) {
        return;
      }

      await tx.wallet.update({
        where: { userId: BigInt(input.userId) },
        data: {
          approvedBalance: wallet.approvedBalance.toString(),
          heldBalance: maxDecimalString(
            subtractDecimalStrings(wallet.heldBalance.toString(), releasableAmount),
            "0",
          ),
          withdrawableBalance: maxDecimalString(
            addDecimalStrings(
              wallet.withdrawableBalance.toString(),
              releasableAmount,
            ),
            "0",
          ),
          shoppingBalance: wallet.shoppingBalance.toString(),
          discountBalance: wallet.discountBalance.toString(),
          negativeOffsetBalance: wallet.negativeOffsetBalance.toString(),
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: BigInt(input.userId),
          txType: "BUYBACK_RELEASE",
          direction: "CREDIT",
          balanceBucket: "WITHDRAWABLE",
          refType: "COMMISSION",
          refId: BigInt(input.commissionId),
          amount: releasableAmount,
          status: "POSTED",
        },
      });
    });
  }

  async applyNegativeOffsetResult(
    userId: string,
    result: WalletNegativeOffsetResult,
  ): Promise<void> {
    await this.prisma.wallet.upsert({
      where: { userId: BigInt(userId) },
      update: {
        negativeOffsetBalance: maxDecimalString(result.remainingNegativeOffset, "0"),
      },
      create: {
        userId: BigInt(userId),
        negativeOffsetBalance: maxDecimalString(result.remainingNegativeOffset, "0"),
      },
    });
  }

  async hasActivePayoutHold(userId: string): Promise<boolean> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: BigInt(userId) },
      select: { payoutLockStatus: true },
    });

    return wallet?.payoutLockStatus === "HOLD";
  }

  async convertWithdrawableToShoppingWallet(input: {
    userId: string;
    grossAmount: string;
    feeAmount: string;
    netAmount: string;
  }): Promise<CommissionToShoppingConversionResult> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: BigInt(input.userId) },
        update: {},
        create: { userId: BigInt(input.userId) },
        select: {
          withdrawableBalance: true,
          shoppingBalance: true,
        },
      });

      if (
        compareDecimalStrings(wallet.withdrawableBalance.toString(), input.grossAmount) < 0
      ) {
        throw new Error("Insufficient withdrawable balance.");
      }

      const nextWithdrawable = subtractDecimalStrings(
        wallet.withdrawableBalance.toString(),
        input.grossAmount,
      );
      const nextShopping = addDecimalStrings(
        wallet.shoppingBalance.toString(),
        input.netAmount,
      );

      await tx.wallet.update({
        where: { userId: BigInt(input.userId) },
        data: {
          withdrawableBalance: nextWithdrawable,
          shoppingBalance: nextShopping,
        },
      });

      const conversionTransactions: Prisma.WalletTransactionCreateManyInput[] = [
        {
          userId: BigInt(input.userId),
          txType: "COMMISSION_CONVERT_OUT",
          direction: "DEBIT",
          balanceBucket: "WITHDRAWABLE",
          refType: "wallet",
          refId: 0n,
          amount: input.netAmount,
          status: "POSTED",
          note: "Convert CW to SW",
        },
      ];

      if (compareDecimalStrings(input.feeAmount, "0") > 0) {
        conversionTransactions.push({
          userId: BigInt(input.userId),
          txType: "CONVERT_FEE_DEBIT",
          direction: "DEBIT",
          balanceBucket: "WITHDRAWABLE",
          refType: "wallet",
          refId: 0n,
          amount: input.feeAmount,
          status: "POSTED",
          note: "CW conversion fee",
        });
      }

      conversionTransactions.push({
        userId: BigInt(input.userId),
        txType: "SHOPPING_WALLET_CONVERT_IN",
        direction: "CREDIT",
        balanceBucket: "SHOPPING",
        refType: "wallet",
        refId: 0n,
        amount: input.netAmount,
        status: "POSTED",
        note: "SW credit from CW conversion",
      });

      await tx.walletTransaction.createMany({ data: conversionTransactions });

      return {
        userId: input.userId,
        grossAmount: input.grossAmount,
        feeAmount: input.feeAmount,
        netShoppingAmount: input.netAmount,
        withdrawableBalance: nextWithdrawable,
        shoppingBalance: nextShopping,
      };
    });
  }

  async transferShoppingWallet(input: {
    senderUserId: string;
    recipientUserId: string;
    grossAmount: string;
    feeAmount: string;
    netAmount: string;
  }): Promise<ShoppingWalletTransferResult> {
    return this.prisma.$transaction(async (tx) => {
      const [senderWallet, recipientWallet] = await Promise.all([
        tx.wallet.upsert({
          where: { userId: BigInt(input.senderUserId) },
          update: {},
          create: { userId: BigInt(input.senderUserId) },
          select: { shoppingBalance: true },
        }),
        tx.wallet.upsert({
          where: { userId: BigInt(input.recipientUserId) },
          update: {},
          create: { userId: BigInt(input.recipientUserId) },
          select: { shoppingBalance: true },
        }),
      ]);

      if (compareDecimalStrings(senderWallet.shoppingBalance.toString(), input.grossAmount) < 0) {
        throw new Error("Insufficient SW balance.");
      }

      const nextSenderShopping = subtractDecimalStrings(
        senderWallet.shoppingBalance.toString(),
        input.grossAmount,
      );
      const nextRecipientShopping = addDecimalStrings(
        recipientWallet.shoppingBalance.toString(),
        input.netAmount,
      );

      await tx.wallet.update({
        where: { userId: BigInt(input.senderUserId) },
        data: { shoppingBalance: nextSenderShopping },
      });
      await tx.wallet.update({
        where: { userId: BigInt(input.recipientUserId) },
        data: { shoppingBalance: nextRecipientShopping },
      });

      const transferTransactions: Prisma.WalletTransactionCreateManyInput[] = [
        {
          userId: BigInt(input.senderUserId),
          txType: "WALLET_TRANSFER_OUT",
          direction: "DEBIT",
          balanceBucket: "SHOPPING",
          refType: "wallet",
          refId: 0n,
          counterpartyUserId: BigInt(input.recipientUserId),
          amount: input.netAmount,
          status: "POSTED",
          note: "SW transfer to downline",
        },
      ];

      if (compareDecimalStrings(input.feeAmount, "0") > 0) {
        transferTransactions.push({
          userId: BigInt(input.senderUserId),
          txType: "TRANSFER_FEE_DEBIT",
          direction: "DEBIT",
          balanceBucket: "SHOPPING",
          refType: "wallet",
          refId: 0n,
          counterpartyUserId: BigInt(input.recipientUserId),
          amount: input.feeAmount,
          status: "POSTED",
          note: "SW transfer fee",
        });
      }

      transferTransactions.push({
        userId: BigInt(input.recipientUserId),
        txType: "WALLET_TRANSFER_IN",
        direction: "CREDIT",
        balanceBucket: "SHOPPING",
        refType: "wallet",
        refId: 0n,
        counterpartyUserId: BigInt(input.senderUserId),
        amount: input.netAmount,
        status: "POSTED",
        note: "SW transfer from upline",
      });

      await tx.walletTransaction.createMany({ data: transferTransactions });

      return {
        senderUserId: input.senderUserId,
        recipientUserId: input.recipientUserId,
        grossAmount: input.grossAmount,
        feeAmount: input.feeAmount,
        netAmount: input.netAmount,
        senderShoppingBalance: nextSenderShopping,
        recipientShoppingBalance: nextRecipientShopping,
      };
    });
  }

  async topupShoppingWallet(input: {
    userId: string;
    amount: string;
    paymentMethod: string;
    note?: string;
    actorUserId?: string | null;
  }): Promise<ShoppingWalletTopupResult> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: BigInt(input.userId) },
        update: {},
        create: { userId: BigInt(input.userId) },
        select: { shoppingBalance: true },
      });

      const nextShopping = addDecimalStrings(
        wallet.shoppingBalance.toString(),
        input.amount,
      );

      await tx.wallet.update({
        where: { userId: BigInt(input.userId) },
        data: { shoppingBalance: nextShopping },
      });

      await tx.walletTransaction.create({
        data: {
          userId: BigInt(input.userId),
          txType: "TOPUP_CREDIT",
          direction: "CREDIT",
          balanceBucket: "SHOPPING",
          refType: "wallet",
          refId: 0n,
          counterpartyUserId: input.actorUserId ? BigInt(input.actorUserId) : null,
          amount: input.amount,
          status: "POSTED",
          note: input.note
            ? `${input.paymentMethod}: ${input.note}`
            : `Top-up via ${input.paymentMethod}`,
        },
      });

      return {
        userId: input.userId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        shoppingBalance: nextShopping,
      };
    });
  }

  async creditDiscountWalletFromApprovedOrder(input: {
    orderId: string;
  }): Promise<DiscountWalletCreditResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: BigInt(input.orderId) },
        select: {
          id: true,
          userId: true,
          approvalStatus: true,
          cashDueUsdt: true,
          walletAppliedUsdt: true,
          orderItems: {
            select: {
              unitDcwCashRewardRate: true,
              unitDcwShoppingRewardRate: true,
            },
            take: 1,
          },
        },
      });

      if (!order || order.approvalStatus !== "APPROVED") {
        return null;
      }

      const wallet = await tx.wallet.upsert({
        where: { userId: order.userId },
        update: {},
        create: { userId: order.userId },
        select: { discountBalance: true },
      });
      const existingCredit = await tx.walletTransaction.findFirst({
        where: {
          userId: order.userId,
          txType: "DCW_CREDIT",
          refType: "order",
          refId: order.id,
          status: "POSTED",
        },
        select: { id: true },
      });

      if (existingCredit) {
        return {
          userId: order.userId.toString(),
          amount: "0",
          discountBalance: wallet.discountBalance.toString(),
          sourceOrderId: order.id.toString(),
        };
      }

      const firstItem = order.orderItems[0];
      const cashRewardRate = firstItem?.unitDcwCashRewardRate?.toString() ?? "0";
      const shoppingRewardRate =
        firstItem?.unitDcwShoppingRewardRate?.toString() ?? "0";
      const totalEligibleAmount = addDecimalStrings(
        order.cashDueUsdt.toString(),
        order.walletAppliedUsdt.toString(),
      );
      const rewardAmount =
        cashRewardRate === shoppingRewardRate
          ? floorDecimalString(
              multiplyDecimalStrings(totalEligibleAmount, cashRewardRate),
            )
          : cashRewardRate === "0"
            ? floorDecimalString(
                multiplyDecimalStrings(totalEligibleAmount, shoppingRewardRate),
              )
            : shoppingRewardRate === "0"
              ? floorDecimalString(
                  multiplyDecimalStrings(totalEligibleAmount, cashRewardRate),
                )
              : floorDecimalString(
                  addDecimalStrings(
                    multiplyDecimalStrings(
                      order.cashDueUsdt.toString(),
                      cashRewardRate,
                    ),
                    multiplyDecimalStrings(
                      order.walletAppliedUsdt.toString(),
                      shoppingRewardRate,
                    ),
                  ),
                );

      if (compareDecimalStrings(rewardAmount, "0") <= 0) {
        return {
          userId: order.userId.toString(),
          amount: "0",
          discountBalance: wallet.discountBalance.toString(),
          sourceOrderId: order.id.toString(),
        };
      }

      const nextDiscountBalance = addDecimalStrings(
        wallet.discountBalance.toString(),
        rewardAmount,
      );

      await tx.wallet.update({
        where: { userId: order.userId },
        data: { discountBalance: nextDiscountBalance },
      });

      await tx.walletTransaction.create({
        data: {
          userId: order.userId,
          txType: "DCW_CREDIT",
          direction: "CREDIT",
          balanceBucket: "DISCOUNT",
          refType: "order",
          refId: order.id,
          amount: rewardAmount,
          status: "POSTED",
          note: "Discount wallet reward from approved order",
        },
      });

      return {
        userId: order.userId.toString(),
        amount: rewardAmount,
        discountBalance: nextDiscountBalance,
        sourceOrderId: order.id.toString(),
      };
    });
  }

  async creditFirmWalletFromApprovedOrder(input: {
    orderId: string;
  }): Promise<FirmOrderWalletCreditResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: BigInt(input.orderId) },
        select: {
          id: true,
          userId: true,
          approvalStatus: true,
          orderItems: {
            select: {
              qty: true,
              productId: true,
              packageId: true,
              unitPriceUsdt: true,
            },
          },
        },
      });

      if (!order || order.approvalStatus !== "APPROVED") {
        return null;
      }

      const wallet = await tx.wallet.upsert({
        where: { userId: order.userId },
        update: {},
        create: { userId: order.userId },
        select: { firmBalance: true },
      });

      const existingCredit = await tx.walletTransaction.findFirst({
        where: {
          userId: order.userId,
          txType: "FIRM_ORDER_CREDIT",
          refType: "order",
          refId: order.id,
          status: "POSTED",
        },
        select: { id: true },
      });

      if (existingCredit) {
        return {
          userId: order.userId.toString(),
          amount: "0",
          firmBalance: wallet.firmBalance.toString(),
          sourceOrderId: order.id.toString(),
        };
      }

      const productDetailIds = Array.from(
        new Set(
          order.orderItems
            .map((item) => item.productId)
            .filter((value): value is string => Boolean(value)),
        ),
      );
      const packageIds = Array.from(
        new Set(
          order.orderItems
            .map((item) => item.packageId)
            .filter((value): value is bigint => value !== null),
        ),
      );
      const productDetails = productDetailIds.length > 0
        ? ((await tx.productDetail.findMany({
            where: {
              id: {
                in: productDetailIds.map((value) => BigInt(value)),
              },
            },
            select: {
              id: true,
              firmEnabled: true,
              product: {
                select: {
                  category: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
            },
          })) as Array<{
            id: bigint;
            firmEnabled: boolean;
            product: {
              category: {
                code: string;
              };
            };
          }>)
        : [];
      const packages = packageIds.length > 0
        ? ((await tx.package.findMany({
            where: {
              id: {
                in: packageIds,
              },
            },
            select: {
              id: true,
              packageItems: {
                select: {
                  qty: true,
                  unitMemberPriceUsdt: true,
                  productDetail: {
                    select: {
                      firmEnabled: true,
                      product: {
                        select: {
                          category: {
                            select: {
                              code: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          })) as Array<{
            id: bigint;
            packageItems: Array<{
              qty: number;
              unitMemberPriceUsdt: { toString(): string };
              productDetail: {
                firmEnabled: boolean;
                product: {
                  category: {
                    code: string;
                  };
                };
              };
            }>;
          }>)
        : [];

      const productDetailRewardMap = new Map(
        productDetails.map((detail) => [detail.id.toString(), detail]),
      );
      const packageRewardMap = new Map(
        packages.map((pkg) => [pkg.id.toString(), pkg]),
      );
      const rewardAmount = order.orderItems.reduce((total, item) => {
        if (item.productId) {
          const detail = productDetailRewardMap.get(item.productId);
          const categoryCode = detail?.product.category.code?.trim().toLowerCase() ?? "";

          if (!detail?.firmEnabled || categoryCode !== "firm") {
            return total;
          }

          return addDecimalStrings(
            total,
            multiplyDecimalStrings(
              item.unitPriceUsdt.toString(),
              item.qty.toString(),
            ),
          );
        }

        if (!item.packageId) {
          return total;
        }

        const pkg = packageRewardMap.get(item.packageId.toString());
        if (!pkg) {
          return total;
        }

        const packageReward = pkg.packageItems.reduce((packageTotal, packageItem) => {
          const categoryCode =
            packageItem.productDetail.product.category.code?.trim().toLowerCase() ?? "";
          if (!packageItem.productDetail.firmEnabled || categoryCode !== "firm") {
            return packageTotal;
          }

          return addDecimalStrings(
            packageTotal,
            multiplyDecimalStrings(
              packageItem.unitMemberPriceUsdt.toString(),
              packageItem.qty.toString(),
            ),
          );
        }, "0");

        return addDecimalStrings(
          total,
          multiplyDecimalStrings(packageReward, item.qty.toString()),
        );
      }, "0");

      if (compareDecimalStrings(rewardAmount, "0") <= 0) {
        return {
          userId: order.userId.toString(),
          amount: "0",
          firmBalance: wallet.firmBalance.toString(),
          sourceOrderId: order.id.toString(),
        };
      }

      const nextFirmBalance = addDecimalStrings(
        wallet.firmBalance.toString(),
        rewardAmount,
      );

      await tx.wallet.update({
        where: { userId: order.userId },
        data: { firmBalance: nextFirmBalance },
      });

      await tx.walletTransaction.create({
        data: {
          userId: order.userId,
          txType: "FIRM_ORDER_CREDIT",
          direction: "CREDIT",
          balanceBucket: "FIRM",
          refType: "order",
          refId: order.id,
          amount: rewardAmount,
          status: "POSTED",
          note: "Firm wallet credit from approved order",
        },
      });

      return {
        userId: order.userId.toString(),
        amount: rewardAmount,
        firmBalance: nextFirmBalance,
        sourceOrderId: order.id.toString(),
      };
    });
  }

  async creditFirmWalletFromMatrixAutoOrder(input: {
    userId: string;
    matrixEventId: string;
    amount: string;
  }): Promise<FirmWalletCreditResult> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: BigInt(input.userId) },
        update: {},
        create: { userId: BigInt(input.userId) },
        select: { firmBalance: true },
      });

      const existingCredit = await tx.walletTransaction.findFirst({
        where: {
          userId: BigInt(input.userId),
          txType: "FIRM_REENTRY_CREDIT",
          refType: "matrix",
          refId: BigInt(input.matrixEventId),
          status: "POSTED",
        },
        select: { id: true },
      });

      if (existingCredit) {
        return {
          userId: input.userId,
          amount: "0",
          firmBalance: wallet.firmBalance.toString(),
          sourceMatrixEventId: input.matrixEventId,
        };
      }

      const nextFirmBalance = addDecimalStrings(
        wallet.firmBalance.toString(),
        input.amount,
      );

      await tx.wallet.update({
        where: { userId: BigInt(input.userId) },
        data: { firmBalance: nextFirmBalance },
      });

      await tx.walletTransaction.create({
        data: {
          userId: BigInt(input.userId),
          txType: "FIRM_REENTRY_CREDIT",
          direction: "CREDIT",
          balanceBucket: "FIRM",
          refType: "matrix",
          refId: BigInt(input.matrixEventId),
          amount: input.amount,
          status: "POSTED",
          note: "Firm wallet credit from matrix auto order",
        },
      });

      return {
        userId: input.userId,
        amount: input.amount,
        firmBalance: nextFirmBalance,
        sourceMatrixEventId: input.matrixEventId,
      };
    });
  }

  async debitWithdrawableForMatrixAutoOrder(input: {
    userId: string;
    sourceBoardId: string;
    amount: string;
  }): Promise<MatrixAutoOrderDebitResult> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: BigInt(input.userId) },
        update: {},
        create: { userId: BigInt(input.userId) },
        select: {
          approvedBalance: true,
          withdrawableBalance: true,
        },
      });

      const existingDebit = await tx.walletTransaction.findFirst({
        where: {
          userId: BigInt(input.userId),
          txType: "MATRIX_REENTRY_DEBIT",
          refType: "matrix",
          refId: BigInt(input.sourceBoardId),
          status: "POSTED",
        },
        select: { id: true },
      });

      if (existingDebit) {
        return {
          userId: input.userId,
          amount: "0",
          withdrawableBalance: wallet.withdrawableBalance.toString(),
          sourceBoardId: input.sourceBoardId,
        };
      }

      if (compareDecimalStrings(wallet.withdrawableBalance.toString(), input.amount) < 0) {
        throw new Error("Insufficient balance for matrix auto order.");
      }

      const nextWithdrawableBalance = subtractDecimalStrings(
        wallet.withdrawableBalance.toString(),
        input.amount,
      );
      const nextApprovedBalance = maxDecimalString(
        subtractDecimalStrings(wallet.approvedBalance.toString(), input.amount),
        "0",
      );

      await tx.wallet.update({
        where: { userId: BigInt(input.userId) },
        data: {
          approvedBalance: nextApprovedBalance,
          withdrawableBalance: nextWithdrawableBalance,
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: BigInt(input.userId),
          txType: "MATRIX_REENTRY_DEBIT",
          direction: "DEBIT",
          balanceBucket: "WITHDRAWABLE",
          refType: "matrix",
          refId: BigInt(input.sourceBoardId),
          amount: input.amount,
          status: "POSTED",
          note: "CW debit for matrix auto order",
        },
      });

      return {
        userId: input.userId,
        amount: input.amount,
        withdrawableBalance: nextWithdrawableBalance,
        sourceBoardId: input.sourceBoardId,
      };
    });
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

  async spendShoppingWallet(input: {
    userId: string;
    orderId: string;
    amount: string;
    note?: string;
  }): Promise<void> {
    if (compareDecimalStrings(input.amount, "0") <= 0) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: BigInt(input.userId) },
        update: {},
        create: { userId: BigInt(input.userId) },
        select: { shoppingBalance: true, discountBalance: true },
      });

      if (compareDecimalStrings(wallet.shoppingBalance.toString(), input.amount) < 0) {
        throw new Error("Insufficient SW balance.");
      }

      await tx.wallet.update({
        where: { userId: BigInt(input.userId) },
        data: {
          shoppingBalance: subtractDecimalStrings(
            wallet.shoppingBalance.toString(),
            input.amount,
          ),
          discountBalance: wallet.discountBalance.toString(),
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: BigInt(input.userId),
          txType: "ORDER_PURCHASE_DEBIT",
          direction: "DEBIT",
          balanceBucket: "SHOPPING",
          refType: "order",
          refId: BigInt(input.orderId),
          amount: input.amount,
          status: "POSTED",
          note: input.note ?? "Shopping wallet used for order",
        },
      });
    });
  }

  async findUserIdByMemberCode(memberCode: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { memberCode },
      select: { id: true },
    });

    return user?.id.toString() ?? null;
  }

  async isDownlineOfSponsor(
    sponsorUserId: string,
    memberUserId: string,
  ): Promise<boolean> {
    let currentUserId: bigint | null = BigInt(memberUserId);
    const sponsorId = BigInt(sponsorUserId);

    while (currentUserId) {
      const currentMember: { sponsorId: bigint | null } | null =
        await this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { sponsorId: true },
        });

      if (!currentMember?.sponsorId) {
        return false;
      }

      if (currentMember.sponsorId === sponsorId) {
        return true;
      }

      currentUserId = currentMember.sponsorId;
    }

    return false;
  }

  async createWalletTopupRequest(input: {
    userId: string;
    amount: string;
    paymentMethod: string;
    transferSlipUrl?: string;
    note?: string;
  }): Promise<WalletTopupRequestSummary> {
    const prismaClient = this.prisma as PrismaClient;
    const request = await prismaClient.walletTopupRequest.create({
      data: {
        userId: BigInt(input.userId),
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        transferSlipUrl: input.transferSlipUrl ?? null,
        note: input.note ?? null,
        status: "PENDING",
      },
    });

    return this.toWalletTopupRequestSummary(request);
  }

  async listWalletTopupRequests(filters?: {
    userId?: string;
    status?: "pending" | "approved" | "rejected" | "cancelled";
  }): Promise<WalletTopupRequestSummary[]> {
    const prismaClient = this.prisma as PrismaClient;
    const requests = await prismaClient.walletTopupRequest.findMany({
      where: {
        userId: filters?.userId ? BigInt(filters.userId) : undefined,
        status: filters?.status
          ? (filters.status.toUpperCase() as WalletTopupRequestStatus)
          : undefined,
      },
      orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
    });

    return requests.map((request) => this.toWalletTopupRequestSummary(request));
  }

  async approveWalletTopupRequest(input: {
    requestId: string;
    actorUserId: string;
  }): Promise<WalletTopupRequestSummary> {
    return this.prisma.$transaction(async (tx) => {
      const txClient = tx as PrismaClient;
      const existingRequest = await txClient.walletTopupRequest.findUnique({
        where: { id: BigInt(input.requestId) },
      });

      if (!existingRequest) {
        throw new Error("Wallet top-up request not found.");
      }

      if (existingRequest.status !== "PENDING") {
        throw new Error("Wallet top-up request is not pending.");
      }

      const wallet = await txClient.wallet.upsert({
        where: { userId: existingRequest.userId },
        update: {},
        create: { userId: existingRequest.userId },
        select: { shoppingBalance: true },
      });

      const nextShoppingBalance = addDecimalStrings(
        wallet.shoppingBalance.toString(),
        existingRequest.amount.toString(),
      );

      await txClient.wallet.update({
        where: { userId: existingRequest.userId },
        data: { shoppingBalance: nextShoppingBalance },
      });

      await txClient.walletTransaction.create({
        data: {
          userId: existingRequest.userId,
          txType: "TOPUP_CREDIT",
          direction: "CREDIT",
          balanceBucket: "SHOPPING",
          refType: "wallet_topup_request",
          refId: existingRequest.id,
          counterpartyUserId: BigInt(input.actorUserId),
          amount: existingRequest.amount,
          status: "POSTED",
          note: existingRequest.note
            ? `${existingRequest.paymentMethod}: ${existingRequest.note}`
            : `Top-up approval via ${existingRequest.paymentMethod}`,
        },
      });

      const approvedRequest = await txClient.walletTopupRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedByUserId: BigInt(input.actorUserId),
          rejectionReason: null,
        },
      });

      return this.toWalletTopupRequestSummary(approvedRequest);
    });
  }

  async rejectWalletTopupRequest(input: {
    requestId: string;
    actorUserId: string;
    rejectionReason: string;
  }): Promise<WalletTopupRequestSummary> {
    const prismaClient = this.prisma as PrismaClient;
    const existingRequest = await prismaClient.walletTopupRequest.findUnique({
      where: { id: BigInt(input.requestId) },
    });

    if (!existingRequest) {
      throw new Error("Wallet top-up request not found.");
    }

    if (existingRequest.status !== "PENDING") {
      throw new Error("Wallet top-up request is not pending.");
    }

    const rejectedRequest = await prismaClient.walletTopupRequest.update({
      where: { id: existingRequest.id },
      data: {
        status: "REJECTED",
        approvedByUserId: BigInt(input.actorUserId),
        rejectionReason: input.rejectionReason,
      },
    });

    return this.toWalletTopupRequestSummary(rejectedRequest);
  }

  async createWithdrawRequest(input: {
    userId: string;
    amount: string;
    bankName: string;
    bankBranch?: string;
    accountNumber: string;
    accountName: string;
    accountType?: string;
    taxAmount: string;
    autoSweepAmount: string;
    feeAmount: string;
    netBankAmount: string;
    note?: string;
  }): Promise<WithdrawRequestSummary> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: BigInt(input.userId) },
        update: {},
        create: { userId: BigInt(input.userId) },
        select: { shoppingBalance: true },
      });

      if (compareDecimalStrings(wallet.shoppingBalance.toString(), input.amount) < 0) {
        throw new Error("Insufficient SW balance.");
      }

      const nextShoppingBalance = subtractDecimalStrings(
        wallet.shoppingBalance.toString(),
        input.amount,
      );

      await tx.wallet.update({
        where: { userId: BigInt(input.userId) },
        data: { shoppingBalance: nextShoppingBalance },
      });

      const request = await tx.withdrawRequest.create({
        data: {
          userId: BigInt(input.userId),
          amount: input.amount,
          bankName: input.bankName,
          bankBranch: input.bankBranch ?? null,
          accountNumber: input.accountNumber,
          accountName: input.accountName,
          accountType: input.accountType ?? null,
          taxAmount: input.taxAmount,
          autoSweepAmount: input.autoSweepAmount,
          feeAmount: input.feeAmount,
          netBankAmount: input.netBankAmount,
          note: input.note ?? null,
          status: "PENDING",
        },
        include: {
          user: {
            select: {
              memberCode: true,
              name: true,
            },
          },
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: BigInt(input.userId),
          txType: "MANUAL_ADJUSTMENT",
          direction: "DEBIT",
          balanceBucket: "SHOPPING",
          refType: "withdraw_request",
          refId: request.id,
          amount: input.amount,
          status: "POSTED",
          note: "SW reserved for withdraw request",
        },
      });

      return this.toWithdrawRequestSummary(request);
    });
  }

  async listWithdrawRequests(filters?: {
    userId?: string;
    status?: "pending" | "approved" | "rejected" | "cancelled" | "exported" | "paid";
  }): Promise<WithdrawRequestSummary[]> {
    const prismaClient = this.prisma as PrismaClient;
    const requests = await prismaClient.withdrawRequest.findMany({
      where: {
        userId: filters?.userId ? BigInt(filters.userId) : undefined,
        status: filters?.status
          ? (filters.status.toUpperCase() as WithdrawRequestStatus)
          : undefined,
      },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
          },
        },
      },
      orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
    });

    return requests.map((request) => this.toWithdrawRequestSummary(request));
  }

  async approveWithdrawRequest(input: {
    requestId: string;
    actorUserId: string;
  }): Promise<WithdrawRequestSummary> {
    const prismaClient = this.prisma as PrismaClient;
    const existingRequest = await prismaClient.withdrawRequest.findUnique({
      where: { id: BigInt(input.requestId) },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
          },
        },
      },
    });

    if (!existingRequest) {
      throw new Error("Withdraw request not found.");
    }

    if (existingRequest.status !== "PENDING") {
      throw new Error("Withdraw request is not pending.");
    }

    const approvedRequest = await prismaClient.withdrawRequest.update({
      where: { id: existingRequest.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedByUserId: BigInt(input.actorUserId),
        rejectionReason: null,
      },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
          },
        },
      },
    });

    return this.toWithdrawRequestSummary(approvedRequest);
  }

  async rejectWithdrawRequest(input: {
    requestId: string;
    actorUserId: string;
    rejectionReason: string;
  }): Promise<WithdrawRequestSummary> {
    return this.prisma.$transaction(async (tx) => {
      const existingRequest = await tx.withdrawRequest.findUnique({
        where: { id: BigInt(input.requestId) },
      });

      if (!existingRequest) {
        throw new Error("Withdraw request not found.");
      }

      if (
        existingRequest.status !== "PENDING" &&
        existingRequest.status !== "APPROVED" &&
        existingRequest.status !== "EXPORTED"
      ) {
        throw new Error("Withdraw request is not actionable.");
      }

      await this.restoreWithdrawAmountIfReserved(tx as PrismaClient, existingRequest.id, input.actorUserId);

      const rejectedRequest = await tx.withdrawRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: "REJECTED",
          approvedAt: null,
          approvedByUserId: BigInt(input.actorUserId),
          rejectionReason: input.rejectionReason,
        },
        include: {
          user: {
            select: {
              memberCode: true,
              name: true,
            },
          },
        },
      });

      return this.toWithdrawRequestSummary(rejectedRequest);
    });
  }

  async cancelWithdrawRequest(input: {
    requestId: string;
    actorUserId: string;
    reason?: string;
  }): Promise<WithdrawRequestSummary> {
    return this.prisma.$transaction(async (tx) => {
      const existingRequest = await tx.withdrawRequest.findUnique({
        where: { id: BigInt(input.requestId) },
      });

      if (!existingRequest) {
        throw new Error("Withdraw request not found.");
      }

      if (
        existingRequest.status !== "PENDING" &&
        existingRequest.status !== "APPROVED" &&
        existingRequest.status !== "EXPORTED"
      ) {
        throw new Error("Withdraw request is not actionable.");
      }

      await this.restoreWithdrawAmountIfReserved(tx as PrismaClient, existingRequest.id, input.actorUserId);

      const cancelledRequest = await tx.withdrawRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: "CANCELLED",
          approvedByUserId: BigInt(input.actorUserId),
          rejectionReason: input.reason ?? "Cancelled by admin and refunded to wallet",
        },
        include: {
          user: {
            select: {
              memberCode: true,
              name: true,
            },
          },
        },
      });

      return this.toWithdrawRequestSummary(cancelledRequest);
    });
  }

  async markWithdrawRequestsExported(requestIds: string[]): Promise<WithdrawRequestSummary[]> {
    const ids = requestIds.map((requestId) => BigInt(requestId));
    const prismaClient = this.prisma as PrismaClient;
    await prismaClient.withdrawRequest.updateMany({
      where: {
        id: { in: ids },
        status: {
          in: ["APPROVED", "EXPORTED"],
        },
      },
      data: {
        status: "EXPORTED",
        exportedAt: new Date(),
      },
    });

    const requests = await prismaClient.withdrawRequest.findMany({
      where: { id: { in: ids } },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    return requests.map((request) => this.toWithdrawRequestSummary(request));
  }

  async markWithdrawRequestPaid(input: {
    requestId: string;
    actorUserId: string;
  }): Promise<WithdrawRequestSummary> {
    const prismaClient = this.prisma as PrismaClient;
    const existingRequest = await prismaClient.withdrawRequest.findUnique({
      where: { id: BigInt(input.requestId) },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
          },
        },
      },
    });

    if (!existingRequest) {
      throw new Error("Withdraw request not found.");
    }

    if (existingRequest.status !== "APPROVED" && existingRequest.status !== "EXPORTED") {
      throw new Error("Withdraw request is not ready to mark paid.");
    }

    const paidRequest = await prismaClient.withdrawRequest.update({
      where: { id: existingRequest.id },
      data: {
        status: "PAID",
        approvedByUserId: BigInt(input.actorUserId),
        paidAt: new Date(),
      },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
          },
        },
      },
    });

    return this.toWithdrawRequestSummary(paidRequest);
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
    const prismaClient = this.prisma as PrismaClient;
    const request = await prismaClient.kycRequest.create({
      data: {
        userId: BigInt(input.userId),
        nationalId: input.nationalId ?? null,
        bankName: input.bankName ?? null,
        bankBranch: input.bankBranch ?? null,
        bankAccountNumber: input.bankAccountNumber ?? null,
        bankAccountName: input.bankAccountName ?? null,
        bankAccountType: input.bankAccountType ?? null,
        personalIdImageUrl: input.personalIdImageUrl ?? null,
        bankBookImageUrl: input.bankBookImageUrl ?? null,
        selfieImageUrl: input.selfieImageUrl ?? null,
        note: input.note ?? null,
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
          },
        },
      },
    });

    return this.toKycRequestSummary(request);
  }

  async listKycRequests(filters?: {
    userId?: string;
    status?: "pending" | "approved" | "rejected";
  }): Promise<KycRequestSummary[]> {
    const prismaClient = this.prisma as PrismaClient;
    const requests = await prismaClient.kycRequest.findMany({
      where: {
        userId: filters?.userId ? BigInt(filters.userId) : undefined,
        status: filters?.status
          ? (filters.status.toUpperCase() as KycRequestStatus)
          : undefined,
      },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
          },
        },
      },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    });

    return requests.map((request) => this.toKycRequestSummary(request));
  }

  async findLatestApprovedKycRequest(userId: string): Promise<KycRequestSummary | null> {
    const request = await this.prisma.kycRequest.findFirst({
      where: {
        userId: BigInt(userId),
        status: "APPROVED",
      },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
          },
        },
      },
      orderBy: [{ approvedAt: "desc" }, { submittedAt: "desc" }, { id: "desc" }],
    });

    return request ? this.toKycRequestSummary(request) : null;
  }

  private async restoreWithdrawAmountIfReserved(
    tx: PrismaClient,
    withdrawRequestId: bigint,
    actorUserId: string,
  ): Promise<void> {
    const existingRefund = await tx.walletTransaction.findFirst({
      where: {
        refType: "withdraw_request",
        refId: withdrawRequestId,
        direction: "CREDIT",
        balanceBucket: "SHOPPING",
      },
    });

    if (existingRefund) {
      return;
    }

    const reserveTransaction = await tx.walletTransaction.findFirst({
      where: {
        refType: "withdraw_request",
        refId: withdrawRequestId,
        direction: "DEBIT",
        balanceBucket: "SHOPPING",
      },
    });

    if (!reserveTransaction) {
      return;
    }

    const wallet = await tx.wallet.upsert({
      where: { userId: reserveTransaction.userId },
      update: {},
      create: { userId: reserveTransaction.userId },
      select: { shoppingBalance: true },
    });

    const nextShoppingBalance = addDecimalStrings(
      wallet.shoppingBalance.toString(),
      reserveTransaction.amount.toString(),
    );

    await tx.wallet.update({
      where: { userId: reserveTransaction.userId },
      data: { shoppingBalance: nextShoppingBalance },
    });

    await tx.walletTransaction.create({
      data: {
        userId: reserveTransaction.userId,
        txType: "MANUAL_ADJUSTMENT",
        direction: "CREDIT",
        balanceBucket: "SHOPPING",
        refType: "withdraw_request",
        refId: withdrawRequestId,
        counterpartyUserId: BigInt(actorUserId),
        amount: reserveTransaction.amount,
        status: "POSTED",
        note: "SW refunded for cancelled withdraw request",
      },
    });
  }

  async approveKycRequest(input: {
    requestId: string;
    actorUserId: string;
  }): Promise<KycRequestSummary> {
    const prismaClient = this.prisma as PrismaClient;
    const existingRequest = await prismaClient.kycRequest.findUnique({
      where: { id: BigInt(input.requestId) },
    });

    if (!existingRequest) {
      throw new Error("KYC request not found.");
    }

    if (existingRequest.status !== "PENDING" && existingRequest.status !== "REJECTED") {
      throw new Error("KYC request is not actionable.");
    }

    const approvedRequest = await prismaClient.kycRequest.update({
      where: { id: existingRequest.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedByUserId: BigInt(input.actorUserId),
        rejectionReason: null,
      },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
          },
        },
      },
    });

    return this.toKycRequestSummary(approvedRequest);
  }

  async rejectKycRequest(input: {
    requestId: string;
    actorUserId: string;
    rejectionReason: string;
  }): Promise<KycRequestSummary> {
    const prismaClient = this.prisma as PrismaClient;
    const existingRequest = await prismaClient.kycRequest.findUnique({
      where: { id: BigInt(input.requestId) },
    });

    if (!existingRequest) {
      throw new Error("KYC request not found.");
    }

    const rejectedRequest = await prismaClient.kycRequest.update({
      where: { id: existingRequest.id },
      data: {
        status: "REJECTED",
        approvedByUserId: BigInt(input.actorUserId),
        rejectionReason: input.rejectionReason,
      },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
          },
        },
      },
    });

    return this.toKycRequestSummary(rejectedRequest);
  }

  private resolveTransactionType(input: WalletPostingInput) {
    if (input.direction === "debit") {
      return "REVERSAL_DEBIT" as const;
    }

    if (input.earningType === "pool" || input.refType === "pool") {
      return "POOL_CREDIT" as const;
    }

    if (input.earningType === "matrix" || input.refType === "matrix") {
      return "MATRIX_CREDIT" as const;
    }

    if (input.earningType === "uni") {
      return "UNI_CREDIT" as const;
    }

    if (input.earningType === "cashback") {
      return "CASHBACK_CREDIT" as const;
    }

    return "DIRECT_CREDIT" as const;
  }

  private toWalletTopupRequestSummary(request: {
    id: bigint;
    userId: bigint;
    amount: Prisma.Decimal;
    paymentMethod: string;
    transferSlipUrl: string | null;
    note: string | null;
    status: WalletTopupRequestStatus;
    requestedAt: Date;
    approvedAt: Date | null;
    approvedByUserId: bigint | null;
    rejectionReason: string | null;
  }): WalletTopupRequestSummary {
    return {
      requestId: request.id.toString(),
      userId: request.userId.toString(),
      amount: request.amount.toString(),
      paymentMethod: request.paymentMethod,
      transferSlipUrl: request.transferSlipUrl ?? null,
      note: request.note ?? null,
      status: request.status.toLowerCase() as
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled",
      requestedAt: request.requestedAt.toISOString(),
      approvedAt: request.approvedAt?.toISOString() ?? null,
      approvedByUserId: request.approvedByUserId?.toString() ?? null,
      rejectionReason: request.rejectionReason ?? null,
    };
  }

  private toWithdrawRequestSummary(request: {
    id: bigint;
    userId: bigint;
    amount: Prisma.Decimal;
    bankName: string;
    bankBranch: string | null;
    accountNumber: string;
    accountName: string;
    accountType: string | null;
    taxAmount: Prisma.Decimal;
    autoSweepAmount: Prisma.Decimal;
    feeAmount: Prisma.Decimal;
    netBankAmount: Prisma.Decimal;
    note: string | null;
    status: WithdrawRequestStatus;
    requestedAt: Date;
    approvedAt: Date | null;
    approvedByUserId: bigint | null;
    exportedAt: Date | null;
    paidAt: Date | null;
    rejectionReason: string | null;
    user: {
      memberCode: string;
      name: string;
    };
  }): WithdrawRequestSummary {
    return {
      requestId: request.id.toString(),
      userId: request.userId.toString(),
      memberCode: request.user.memberCode,
      memberName: request.user.name,
      requestedAt: request.requestedAt.toISOString(),
      amount: request.amount.toString(),
      bankName: request.bankName,
      bankBranch: request.bankBranch ?? null,
      accountNumber: request.accountNumber,
      accountName: request.accountName,
      accountType: request.accountType ?? null,
      taxAmount: request.taxAmount.toString(),
      autoSweepAmount: request.autoSweepAmount.toString(),
      feeAmount: request.feeAmount.toString(),
      netBankAmount: request.netBankAmount.toString(),
      note: request.note ?? null,
      status: request.status.toLowerCase() as
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "exported"
        | "paid",
      approvedAt: request.approvedAt?.toISOString() ?? null,
      approvedByUserId: request.approvedByUserId?.toString() ?? null,
      exportedAt: request.exportedAt?.toISOString() ?? null,
      paidAt: request.paidAt?.toISOString() ?? null,
      rejectionReason: request.rejectionReason ?? null,
    };
  }

  private toKycRequestSummary(request: {
    id: bigint;
    userId: bigint;
    nationalId: string | null;
    bankName: string | null;
    bankBranch: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
    bankAccountType: string | null;
    personalIdImageUrl: string | null;
    bankBookImageUrl: string | null;
    selfieImageUrl: string | null;
    note: string | null;
    status: KycRequestStatus;
    submittedAt: Date;
    approvedAt: Date | null;
    approvedByUserId: bigint | null;
    rejectionReason: string | null;
    user: {
      memberCode: string;
      name: string;
    };
  }): KycRequestSummary {
    return {
      requestId: request.id.toString(),
      userId: request.userId.toString(),
      memberCode: request.user.memberCode,
      memberName: request.user.name,
      nationalId: request.nationalId ?? null,
      bankName: request.bankName ?? null,
      bankBranch: request.bankBranch ?? null,
      bankAccountNumber: request.bankAccountNumber ?? null,
      bankAccountName: request.bankAccountName ?? null,
      bankAccountType: request.bankAccountType ?? null,
      personalIdImageUrl: request.personalIdImageUrl ?? null,
      bankBookImageUrl: request.bankBookImageUrl ?? null,
      selfieImageUrl: request.selfieImageUrl ?? null,
      note: request.note ?? null,
      status: request.status.toLowerCase() as "pending" | "approved" | "rejected",
      submittedAt: request.submittedAt.toISOString(),
      approvedAt: request.approvedAt?.toISOString() ?? null,
      approvedByUserId: request.approvedByUserId?.toString() ?? null,
      rejectionReason: request.rejectionReason ?? null,
    };
  }
}
