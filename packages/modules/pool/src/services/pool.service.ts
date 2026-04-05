import { Inject, Injectable, forwardRef } from "@nestjs/common";

import {
  DailyPoolFlowResult,
  PoolCloseResult,
  PoolEligibilityDecision,
  PoolEligibilityMemberSnapshot,
  PoolFundingInput,
  PoolFundingResult,
  PoolRecipientDraftResult,
  PoolSourceOrder,
} from "../domain/pool.types";
import {
  addDecimalStrings,
  compareDecimalStrings,
  divideDecimalStringByInt,
  minDecimalString,
  multiplyDecimalStrings,
  subtractDecimalStrings,
} from "../../../../shared/utils/src/money.util";
import { CommissionsService } from "../../../commissions/src/services/commissions.service";
import { MembersService } from "../../../members/src/services/members.service";
import { OrdersService } from "../../../orders/src/services/orders.service";
import { WalletsService } from "../../../wallets/src/services/wallets.service";
import { PrismaPoolRepository } from "../repositories/pool.repository";

const BANGKOK_UTC_OFFSET_HOURS = 7;

function parseDateOnlyParts(dateOnly: string) {
  const [year, month, day] = dateOnly.split("-").map((part) => Number(part));
  return { year, month, day };
}

export interface PoolServiceContract {
  listPoolCycles(filters?: {
    poolDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<
    | Array<{
        poolCycleId: string;
        poolDate: string;
        fundingTotalApprovedPv: string;
        poolFund: string;
        eligibleMemberCount: number;
        payoutPerMember: string;
        companyFallbackAmount: string;
        status: string;
      }>
    | {
        items: Array<{
          poolCycleId: string;
          poolDate: string;
          fundingTotalApprovedPv: string;
          poolFund: string;
          eligibleMemberCount: number;
          payoutPerMember: string;
          companyFallbackAmount: string;
          status: string;
        }>;
        total: number;
        page: number;
        pageSize: number;
      }
  >;

  computePoolFunding(input: PoolFundingInput): Promise<PoolFundingResult>;

  evaluatePoolEligibility(
    snapshots: PoolEligibilityMemberSnapshot[],
  ): Promise<PoolEligibilityDecision[]>;

  closePool(poolDate: string): Promise<PoolCloseResult>;

  loadApprovedOrderFunding(poolDate: string): Promise<PoolFundingInput>;

  handleDailyPoolFlow(
    poolDate: string,
    evaluationAt: string,
    snapshots: PoolEligibilityMemberSnapshot[],
  ): Promise<DailyPoolFlowResult>;

  getPoolCycle(poolDate: string): Promise<{
    poolCycleId: string;
    poolDate: string;
    fundingTotalApprovedPv: string;
    poolFund: string;
    eligibleMemberCount: number;
    payoutPerMember: string;
    companyFallbackAmount: string;
    status: string;
  } | null>;

  listPoolPayouts(poolDate: string): Promise<
    Array<{
      payoutId: string;
      userId: string;
      beneficiaryCycleId: string | null;
      payoutAmount: string;
      status: string;
      blockReason: string | null;
    }>
  >;

  listMemberPoolPayouts(userId: string): Promise<
    Array<{
      payoutId: string;
      poolDate: string;
      beneficiaryCycleId: string | null;
      payoutAmount: string;
      status: string;
      blockReason: string | null;
      createdAt: string;
    }>
  >;
}

@Injectable()
export class PoolService implements PoolServiceContract {
  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly membersService: MembersService,
    @Inject(forwardRef(() => CommissionsService))
    private readonly commissionsService: CommissionsService,
    private readonly poolRepository: PrismaPoolRepository,
    private readonly walletsService: WalletsService,
  ) {}

  async computePoolFunding(input: PoolFundingInput): Promise<PoolFundingResult> {
    const poolFund =
      input.approvedOrders && input.approvedOrders.length > 0
        ? input.approvedOrders.reduce(
            (total, order) =>
              addDecimalStrings(total, this.calculatePoolContributionForOrder(order)),
            "0",
          )
        : multiplyDecimalStrings(input.fundingTotalApprovedPv, input.poolRate);

    return {
      poolDate: input.poolDate,
      approvedOrderCount: input.approvedOrderCount,
      fundingTotalApprovedPv: input.fundingTotalApprovedPv,
      poolRate: input.poolRate,
      poolFund,
    };
  }

  async listPoolCycles(filters?: {
    poolDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.poolRepository.listPoolCycles(filters);
  }

  async evaluatePoolEligibility(
    snapshots: PoolEligibilityMemberSnapshot[],
  ): Promise<PoolEligibilityDecision[]> {
    return snapshots.map((snapshot) => ({
      userId: snapshot.userId,
      eligible: snapshot.memberActive && snapshot.activeDirectReferralCount >= 2,
      reasonCode:
        snapshot.memberActive && snapshot.activeDirectReferralCount >= 2
          ? "weekly_pool_qualified"
          : !snapshot.memberActive
            ? "missing_recent_b1_completion"
            : "missing_two_direct_referrals",
      memberActive: snapshot.memberActive,
      activeDirectReferralCount: snapshot.activeDirectReferralCount,
    }));
  }

  async closePool(poolDate: string): Promise<PoolCloseResult> {
    const existingCycle = await this.poolRepository.getPoolCycle(poolDate);

    if (existingCycle) {
      return {
        poolDate: existingCycle.poolDate,
        fundingTotalApprovedPv: existingCycle.fundingTotalApprovedPv,
        poolFund: existingCycle.poolFund,
        eligibleMemberCount: existingCycle.eligibleMemberCount,
        payoutPerMember: existingCycle.payoutPerMember,
        companyFallbackAmount: existingCycle.companyFallbackAmount,
      };
    }

    const approvedOrders =
      await this.ordersService.listApprovedOrdersForPoolDate(poolDate);
    const evaluationAt = this.resolvePoolEvaluationAt(poolDate);
    const funding = await this.computePoolFunding({
      poolDate,
      approvedOrderCount: approvedOrders.length,
      fundingTotalApprovedPv: this.sumApprovedOrderPv(approvedOrders),
      poolRate: "0.3",
      approvedOrders,
    });
    const eligibilitySnapshots = await this.poolRepository.listWeeklyEligibilitySnapshots({
      evaluationAt,
      qualifiedWindowStartAt: this.resolveQualifiedWindowStartAt(poolDate),
    });
    const flow = await this.handleDailyPoolFlow(
      poolDate,
      evaluationAt,
      eligibilitySnapshots.map((snapshot) => ({
        userId: snapshot.userId,
        memberActive: snapshot.memberActive,
        activeDirectReferralCount: snapshot.activeDirectReferralCount,
        evaluationAt,
      })),
    );
    const { poolCycleId } = await this.poolRepository.createOrUpdatePoolCycle({
      ...funding,
      evaluationAt,
      settingsSnapshot: JSON.stringify({
        poolRateMode: "weekly_fixed_rate",
        weeklyPoolRate: "0.3",
        timezone: "Asia/Bangkok",
        eligibilityRule: "direct_two_and_recent_b1",
      }),
      eligibleMemberCount: flow.eligibleRecipientCount,
      payoutPerMember: flow.payoutPerMember,
      companyFallbackAmount: flow.companyFallback.amount,
    });
    await this.poolRepository.saveEligibilitySnapshots(
      poolCycleId,
      flow.eligibilityDecisions,
    );
    await this.poolRepository.createPoolPayoutDrafts({
      poolCycleId,
      recipientDrafts: flow.recipientDrafts,
    });
    await this.postPoolWalletEntries(poolDate);

    return {
      poolDate,
      fundingTotalApprovedPv: funding.fundingTotalApprovedPv,
      poolFund: funding.poolFund,
      eligibleMemberCount: flow.eligibleRecipientCount,
      payoutPerMember: flow.payoutPerMember,
      companyFallbackAmount: flow.companyFallback.amount,
    };
  }

  async loadApprovedOrderFunding(poolDate: string): Promise<PoolFundingInput> {
    const approvedOrders =
      await this.ordersService.listApprovedOrdersForPoolDate(poolDate);

    return {
      poolDate,
      approvedOrderCount: approvedOrders.length,
      fundingTotalApprovedPv: this.sumApprovedOrderPv(approvedOrders),
      poolRate: "0.3",
      approvedOrders,
    };
  }

  async getPoolCycle(poolDate: string) {
    return this.poolRepository.getPoolCycle(poolDate);
  }

  async listPoolPayouts(poolDate: string) {
    return this.poolRepository.listPoolPayouts(poolDate);
  }

  async listMemberPoolPayouts(userId: string) {
    return this.poolRepository.listMemberPoolPayouts(userId);
  }

  async handleDailyPoolFlow(
    poolDate: string,
    evaluationAt: string,
    snapshots: PoolEligibilityMemberSnapshot[],
  ): Promise<DailyPoolFlowResult> {
    const approvedOrders =
      await this.ordersService.listApprovedOrdersForPoolDate(poolDate);
    const funding = await this.computePoolFunding({
      poolDate,
      approvedOrderCount: approvedOrders.length,
      fundingTotalApprovedPv: this.sumApprovedOrderPv(approvedOrders),
      poolRate: "0.3",
      approvedOrders,
    });
    const eligibilityDecisions = await this.evaluatePoolEligibility(snapshots);
    const eligibleUserIds = eligibilityDecisions
      .filter((decision) => decision.eligible)
      .map((decision) => decision.userId);

    if (eligibleUserIds.length === 0) {
      return {
        poolDate,
        evaluationAt,
        fundingSource: "approved_orders_only",
        approvedOrderIds: approvedOrders.map((order) => order.orderId),
        sameDayContributionRequired: false,
        hasRollup: false,
        fundingTotalApprovedPv: funding.fundingTotalApprovedPv,
        poolFund: funding.poolFund,
        payoutPerMember: "0",
        eligibleRecipientCount: 0,
        eligibilityDecisions,
        recipientDrafts: [],
        companyFallback: {
          fallbackToCompany: true,
          reasonCode: "no_eligible_pool_members",
          amount: funding.poolFund,
        },
      };
    }

    const payoutPerMember = divideDecimalStringByInt(
      funding.poolFund,
      eligibleUserIds.length,
    );

    if (compareDecimalStrings(payoutPerMember, "0") <= 0) {
      return {
        poolDate,
        evaluationAt,
        fundingSource: "approved_orders_only",
        approvedOrderIds: approvedOrders.map((order) => order.orderId),
        sameDayContributionRequired: false,
        hasRollup: false,
        fundingTotalApprovedPv: funding.fundingTotalApprovedPv,
        poolFund: funding.poolFund,
        payoutPerMember: "0",
        eligibleRecipientCount: eligibleUserIds.length,
        eligibilityDecisions,
        recipientDrafts: [],
        companyFallback: {
          fallbackToCompany: false,
          reasonCode: null,
          amount: "0",
        },
      };
    }

    const recipientDrafts = await Promise.all(
      eligibleUserIds.map((userId) =>
        this.buildRecipientDraft(evaluationAt, userId, payoutPerMember),
      ),
    );
    const recipientLevelFallbackAmount = recipientDrafts.reduce(
      (total, recipient) =>
        addDecimalStrings(total, recipient.fallbackAmount),
      "0",
    );

    return {
      poolDate,
      evaluationAt,
      fundingSource: "approved_orders_only",
      approvedOrderIds: approvedOrders.map((order) => order.orderId),
      sameDayContributionRequired: false,
      hasRollup: false,
      fundingTotalApprovedPv: funding.fundingTotalApprovedPv,
      poolFund: funding.poolFund,
      payoutPerMember,
      eligibleRecipientCount: eligibleUserIds.length,
      eligibilityDecisions,
      recipientDrafts,
      companyFallback: {
        fallbackToCompany:
          compareDecimalStrings(recipientLevelFallbackAmount, "0") > 0,
        reasonCode:
          compareDecimalStrings(recipientLevelFallbackAmount, "0") > 0
          ? "recipient_level_fallback"
          : null,
        amount: recipientLevelFallbackAmount,
      },
    };
  }

  private async buildRecipientDraft(
    evaluationAt: string,
    userId: string,
    requestedAmount: string,
  ): Promise<PoolRecipientDraftResult> {
    const candidateCycles = await this.membersService.getMemberCycles(
      userId,
      evaluationAt,
    );
    const orderedCycles = [...candidateCycles]
      .filter((cycle) => cycle.isReceivable && cycle.earningStatus === "active")
      .sort((left, right) => {
        if (left.activatedAt === right.activatedAt) {
          return left.cycleId.localeCompare(right.cycleId);
        }

        return left.activatedAt.localeCompare(right.activatedAt);
      });
    const partialCycle = orderedCycles.find(
      (cycle) =>
        compareDecimalStrings(
          this.resolveMaxPoolPayoutForCycle(cycle, requestedAmount),
          "0",
        ) > 0,
    );
    const approvedAmount = partialCycle
      ? this.resolveMaxPoolPayoutForCycle(partialCycle, requestedAmount)
      : "0";
    const fallbackAmount =
      compareDecimalStrings(requestedAmount, approvedAmount) > 0
        ? subtractDecimalStrings(requestedAmount, approvedAmount)
        : "0";
    const allocation =
      compareDecimalStrings(approvedAmount, "0") > 0
        ? await this.commissionsService.allocateBonusToCycle({
            beneficiaryUserId: userId,
            evaluationAt,
            bonusAmount: approvedAmount,
            sourceType: "pool",
            candidateCycles,
          })
        : {
            beneficiaryUserId: userId,
            assignedCycleId: null,
            fallbackToCompany: true,
            fallbackReason:
              orderedCycles.length > 0
                ? ("cap_blocked_all_receivable_cycles" as const)
                : ("no_receivable_cycle" as const),
          };

    return {
      userId,
      eligible: true,
      requestedAmount,
      amount: approvedAmount,
      fallbackAmount,
      candidateCycleIds: candidateCycles.map((cycle) => cycle.cycleId),
      allocation,
      finalization: allocation.fallbackToCompany
        ? {
            commissionStatus: "fallback",
            beneficiaryCycleId: null,
            fallbackReason: allocation.fallbackReason,
          }
        : {
            commissionStatus: "approved",
            beneficiaryCycleId: allocation.assignedCycleId,
            fallbackReason: null,
          },
    };
  }

  private resolveMaxPoolPayoutForCycle(
    cycle: {
      earningCap: string;
      earnedTotalInCycle: string;
      purchaseBase: string;
      poolCapMultiple?: string;
      commissionCapScope?: "pool_only" | "all_commissions";
      commissionCapMultiple?: string;
      poolEarnedToDate?: string;
    },
    requestedAmount: string,
  ): string {
    let remaining = subtractDecimalStrings(
      cycle.earningCap,
      cycle.earnedTotalInCycle,
    );

    if (
      cycle.commissionCapScope === "all_commissions" &&
      compareDecimalStrings(cycle.commissionCapMultiple ?? "0", "0") > 0 &&
      compareDecimalStrings(cycle.purchaseBase ?? "0", "0") > 0
    ) {
      const commissionCap = multiplyDecimalStrings(
        cycle.purchaseBase,
        cycle.commissionCapMultiple ?? "0",
      );
      remaining = minDecimalString(
        remaining,
        subtractDecimalStrings(commissionCap, cycle.earnedTotalInCycle),
      );
    }

    if (
      compareDecimalStrings(cycle.poolCapMultiple ?? "0", "0") > 0 &&
      compareDecimalStrings(cycle.purchaseBase ?? "0", "0") > 0
    ) {
      const poolCap = multiplyDecimalStrings(
        cycle.purchaseBase,
        cycle.poolCapMultiple ?? "0",
      );
      remaining = minDecimalString(
        remaining,
        subtractDecimalStrings(poolCap, cycle.poolEarnedToDate ?? "0"),
      );
    }

    if (compareDecimalStrings(remaining, "0") <= 0) {
      return "0";
    }

    return minDecimalString(remaining, requestedAmount);
  }

  private sumApprovedOrderPv(approvedOrders: PoolSourceOrder[]): string {
    return approvedOrders.reduce(
      (total, order) => addDecimalStrings(total, order.totalPv || "0"),
      "0",
    );
  }

  private async postPoolWalletEntries(poolDate: string): Promise<void> {
    const payouts = await this.poolRepository.listPoolPayouts(poolDate);

    for (const payout of payouts) {
      if (payout.status !== "approved") {
        continue;
      }

      await this.walletsService.postApprovedEarning({
        userId: payout.userId,
        refType: "pool",
        refId: payout.payoutId,
        amount: payout.payoutAmount,
        holdRequired: false,
        earningType: "pool",
      });
    }
  }

  private resolvePoolEvaluationAt(poolDate: string): string {
    const { year, month, day } = parseDateOnlyParts(poolDate);

    return new Date(
      Date.UTC(year, month - 1, day, 23 - BANGKOK_UTC_OFFSET_HOURS, 59, 59, 999),
    ).toISOString();
  }

  private calculatePoolContributionForOrder(order: PoolSourceOrder): string {
    return multiplyDecimalStrings(order.totalPv, "0.3");
  }

  private resolveQualifiedWindowStartAt(poolDate: string): string {
    const { year, month } = parseDateOnlyParts(poolDate);
    const previousMonthYear = month === 1 ? year - 1 : year;
    const previousMonth = month === 1 ? 12 : month - 1;

    return new Date(
      Date.UTC(previousMonthYear, previousMonth - 1, 1, 0 - BANGKOK_UTC_OFFSET_HOURS, 0, 0, 0),
    ).toISOString();
  }
}
