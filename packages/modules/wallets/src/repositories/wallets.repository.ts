import {
  WalletSummary,
  WalletNegativeOffsetResult,
  WalletPostingInput,
  WalletPostingResult,
  WalletTransactionSummary,
} from "../domain/wallets.types";

export interface WalletsRepository {
  getWalletState(userId: string): Promise<{
    approvedBalance: string;
    heldBalance: string;
    withdrawableBalance: string;
    negativeOffsetBalance: string;
    payoutLockStatus: "unlocked" | "hold" | "locked";
  } | null>;

  getWalletSummary(userId: string): Promise<WalletSummary>;

  listWalletTransactions(userId: string): Promise<WalletTransactionSummary[]>;

  recordWalletPosting(
    input: WalletPostingInput,
    result: WalletPostingResult,
  ): Promise<WalletPostingResult>;

  applyNegativeOffsetResult(
    userId: string,
    result: WalletNegativeOffsetResult,
  ): Promise<void>;

  hasActivePayoutHold(userId: string): Promise<boolean>;
}

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import {
  addDecimalStrings,
  compareDecimalStrings,
  maxDecimalString,
  minDecimalString,
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

  private resolveTransactionType(input: WalletPostingInput) {
    if (input.direction === "debit") {
      return "REVERSAL_DEBIT" as const;
    }

    if (input.earningType === "pool" || input.refType === "pool") {
      return "POOL_CREDIT" as const;
    }

    if (input.earningType === "uni") {
      return "UNI_CREDIT" as const;
    }

    return "DIRECT_CREDIT" as const;
  }
}
