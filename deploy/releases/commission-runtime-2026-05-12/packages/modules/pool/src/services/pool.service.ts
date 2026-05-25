import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common";

// Active commission-calculation scope:
// - direct
// - team_2leg / team_3leg
// - matching
// - pool
// Pool runtime must follow only the currently approved four-plan commission
// direction. Do not pull in unrelated unilevel, legacy/member003 sandbox, or
// deprecated plan assumptions unless a later approved spec says otherwise.

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
import { readCommissionSettings } from "../../../../shared/utils/src/commission-settings.util";
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

function getBangkokDayOfWeek(dateOnly: string) {
  const { year, month, day } = parseDateOnlyParts(dateOnly);
  const bangkokMiddayUtc = new Date(
    Date.UTC(year, month - 1, day, 12 - BANGKOK_UTC_OFFSET_HOURS, 0, 0, 0),
  );

  return bangkokMiddayUtc.getUTCDay();
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

  closePool(
    poolDate: string,
    options?: {
      forceReprocess?: boolean;
    },
  ): Promise<PoolCloseResult>;

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
      commissionLedgerId: string | null;
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
        : input.fundingTotalApprovedPv;

    return {
      poolDate: input.poolDate,
      approvedOrderCount: input.approvedOrderCount,
      fundingTotalApprovedPv: input.fundingTotalApprovedPv,
      poolRate: "1",
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
    const commissionSettings = readCommissionSettings();
    const minDirects = commissionSettings.poolMinActivePackageBuyerDirects;

    return snapshots.map((snapshot) => ({
      userId: snapshot.userId,
      eligible:
        snapshot.memberActive &&
        snapshot.hasPassedInitialQualification &&
        snapshot.roundStatus !== "blocked_after_expiry",
      reasonCode:
        snapshot.memberActive &&
        snapshot.hasPassedInitialQualification &&
        snapshot.roundStatus !== "blocked_after_expiry"
          ? "daily_pool_qualified"
          : !snapshot.memberActive
            ? "no_receivable_cycle"
            : snapshot.roundStatus === "blocked_after_expiry"
              ? "repurchase_grace_expired"
            : !snapshot.hasPassedInitialQualification
              ? !snapshot.hasOwnApprovedOrder
                ? "initial_qualification_missing_own_purchase"
                : snapshot.activeDirectBuyerCount < minDirects
                  ? "initial_qualification_missing_three_direct_buyers"
                  : "initial_qualification_not_locked"
              : "pool_eligibility_failed",
      memberActive: snapshot.memberActive,
      activeDirectReferralCount: snapshot.activeDirectReferralCount,
    }));
  }

  async closePool(
    poolDate: string,
    options?: {
      forceReprocess?: boolean;
    },
  ): Promise<PoolCloseResult> {
    const existingCycle = await this.poolRepository.getPoolCycle(poolDate);
    if (existingCycle && options?.forceReprocess !== true) {
      return {
        poolDate: existingCycle.poolDate,
        fundingTotalApprovedPv: existingCycle.fundingTotalApprovedPv,
        poolFund: existingCycle.poolFund,
        eligibleMemberCount: existingCycle.eligibleMemberCount,
        payoutPerMember: existingCycle.payoutPerMember,
        companyFallbackAmount: existingCycle.companyFallbackAmount,
        reprocessed: true,
      };
    }
    const approvedOrders =
      await this.ordersService.listApprovedOrdersForPoolDate(poolDate);
    const evaluationAt = this.resolvePoolEvaluationAt(poolDate);
    const funding = await this.computePoolFunding({
      poolDate,
      approvedOrderCount: approvedOrders.length,
      fundingTotalApprovedPv: this.sumApprovedOrderPv(approvedOrders),
      approvedOrders,
    });
    const eligibilitySnapshots = await this.poolRepository.listWeeklyEligibilitySnapshots({
      poolDate,
      evaluationAt,
    });
    const flow = await this.handleDailyPoolFlow(
      poolDate,
      evaluationAt,
      eligibilitySnapshots,
    );
    const { poolCycleId } = await this.poolRepository.createOrUpdatePoolCycle({
      ...funding,
      evaluationAt,
      settingsSnapshot: JSON.stringify({
        poolFundingRule: "approved_pool_enabled_pv_full_amount",
        timezone: "Asia/Bangkok",
        eligibilityRule: "cycle_active_and_locked_initial_qualification",
        recipientPayoutRule: "pay_if_recipient_can_receive_commission_up_to_cycle_purchase_base_cap",
        recipientCyclePoolCapRate: readCommissionSettings().poolMaxEntitlementShareRate,
      }),
      eligibleMemberCount: flow.eligibleRecipientCount,
      payoutPerMember: flow.payoutPerMember,
      companyFallbackAmount: flow.companyFallback.amount,
    });
    await this.poolRepository.saveEligibilitySnapshots(
      poolCycleId,
      flow.eligibilityDecisions,
    );
    const poolCommissionResults = await Promise.all(
      flow.recipientDrafts.map(async (recipient) => {
        const commission =
          compareDecimalStrings(recipient.amount, "0") > 0
            ? await this.commissionsService.createPoolCommission({
                poolCycleId,
                poolDate,
                beneficiaryUserId: recipient.userId,
                evaluationAt,
                basePv: recipient.amount,
                amount: recipient.amount,
              })
            : null;

        return {
          userId: recipient.userId,
          beneficiaryCycleId:
            commission?.beneficiaryCycleId ??
            recipient.finalization.beneficiaryCycleId ??
            null,
          commissionLedgerId: commission?.commissionId ?? null,
          payoutAmount: commission?.finalPayableAmount ?? recipient.amount,
          status:
            commission?.commissionStatus ??
            recipient.finalization.commissionStatus,
          blockReason:
            commission?.fallbackReason ?? recipient.finalization.fallbackReason ?? null,
        };
      }),
    );
    await this.poolRepository.createPoolPayoutDrafts({
      poolCycleId,
      recipientDrafts: poolCommissionResults,
    });
    const finalizedPayoutAmount = poolCommissionResults.reduce(
      (total, payout) => addDecimalStrings(total, payout.payoutAmount),
      "0",
    );
    const finalizedCompanyFallbackAmount =
      compareDecimalStrings(funding.poolFund, finalizedPayoutAmount) > 0
        ? subtractDecimalStrings(funding.poolFund, finalizedPayoutAmount)
        : "0";
    await this.poolRepository.updatePoolCycleCloseSummary({
      poolCycleId,
      companyFallbackAmount: finalizedCompanyFallbackAmount,
    });
    await this.postPoolWalletEntries(poolDate);

    return {
      poolDate,
      fundingTotalApprovedPv: funding.fundingTotalApprovedPv,
      poolFund: funding.poolFund,
      eligibleMemberCount: flow.eligibleRecipientCount,
      payoutPerMember: flow.payoutPerMember,
      companyFallbackAmount: finalizedCompanyFallbackAmount,
      reprocessed: !!existingCycle,
    };
  }

  async loadApprovedOrderFunding(poolDate: string): Promise<PoolFundingInput> {
    const approvedOrders =
      await this.ordersService.listApprovedOrdersForPoolDate(poolDate);

    return {
      poolDate,
      approvedOrderCount: approvedOrders.length,
      fundingTotalApprovedPv: this.sumApprovedOrderPv(approvedOrders),
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
      approvedOrders,
    });
    const eligibilityDecisions = await this.evaluatePoolEligibility(snapshots);
    const snapshotByUserId = new Map(
      snapshots.map((snapshot) => [snapshot.userId, snapshot] as const),
    );
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
        this.buildRecipientDraft(
          evaluationAt,
          userId,
          payoutPerMember,
          snapshotByUserId.get(userId) ?? null,
        ),
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
    snapshot: PoolEligibilityMemberSnapshot | null,
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
    const cappedRequestedAmount =
      this.resolveMemberRequestedPoolAmount(snapshot, requestedAmount);
    const partialCycle = orderedCycles.find(
      (cycle) =>
        compareDecimalStrings(
          this.resolveMaxPoolPayoutForCycle(
            cycle,
            cappedRequestedAmount,
          ),
          "0",
        ) > 0,
    );
    const approvedAmount = partialCycle
      ? this.resolveMaxPoolPayoutForCycle(partialCycle, cappedRequestedAmount)
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
    const perPayoutCycleCap =
      compareDecimalStrings(cycle.purchaseBase ?? "0", "0") > 0
        ? multiplyDecimalStrings(
            cycle.purchaseBase,
            readCommissionSettings().poolMaxEntitlementShareRate,
          )
        : "0";

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

    if (compareDecimalStrings(perPayoutCycleCap, "0") <= 0) {
      return "0";
    }

    return minDecimalString(
      minDecimalString(remaining, requestedAmount),
      perPayoutCycleCap,
    );
  }

  private sumApprovedOrderPv(approvedOrders: PoolSourceOrder[]): string {
    return approvedOrders.reduce(
      (total, order) =>
        addDecimalStrings(total, this.calculatePoolContributionForOrder(order)),
      "0",
    );
  }

  private resolveMemberRequestedPoolAmount(
    snapshot: PoolEligibilityMemberSnapshot | null,
    requestedAmount: string,
  ): string {
    return snapshot ? requestedAmount : requestedAmount;
  }

  private async postPoolWalletEntries(poolDate: string): Promise<void> {
    const payouts = await this.poolRepository.listPoolPayouts(poolDate);

    for (const payout of payouts) {
      if (
        (payout.status !== "approved" && payout.status !== "held") ||
        !payout.commissionLedgerId
      ) {
        continue;
      }

      await this.walletsService.postApprovedEarning({
        userId: payout.userId,
        refType: "commission",
        refId: payout.commissionLedgerId,
        amount: payout.payoutAmount,
        holdRequired: payout.status === "held",
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
    if (!order.items) {
      return order.totalPv;
    }

    return order.items.reduce((total, item) => {
      if (item.poolRateMode?.toLowerCase() === "disabled") {
        return total;
      }

      return addDecimalStrings(total, item.lineTotalPv);
    }, "0");
  }
}
