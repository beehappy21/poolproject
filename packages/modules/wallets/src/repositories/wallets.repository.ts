import {
  CommissionToShoppingConversionResult,
  DiscountWalletCreditResult,
  ShoppingWalletTopupResult,
  ShoppingWalletTransferResult,
  WalletSummary,
  WalletNegativeOffsetResult,
  WalletPostingInput,
  WalletPostingResult,
  WalletTopupRequestSummary,
  WalletTransactionSummary,
} from "../domain/wallets.types";
import { Prisma, PrismaClient, WalletTopupRequestStatus } from "@prisma/client";

export interface WalletsRepository {
  getWalletState(userId: string): Promise<{
    approvedBalance: string;
    heldBalance: string;
    withdrawableBalance: string;
    shoppingBalance: string;
    discountBalance: string;
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
}
