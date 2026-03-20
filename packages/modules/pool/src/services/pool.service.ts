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
  multiplyDecimalStrings,
} from "../../../../shared/utils/src/money.util";
import { readCommissionSettings } from "../../../../shared/utils/src/commission-settings.util";
import { CommissionsService } from "../../../commissions/src/services/commissions.service";
import { CommissionsServiceContract } from "../../../commissions/src/services/commissions.service";
import { MembersService } from "../../../members/src/services/members.service";
import { MembersServiceContract } from "../../../members/src/services/members.service";
import { OrdersService } from "../../../orders/src/services/orders.service";
import { OrdersServiceContract } from "../../../orders/src/services/orders.service";
import { QualificationService } from "../../../qualification/src/services/qualification.service";
import { QualificationServiceContract } from "../../../qualification/src/services/qualification.service";
import { WalletsService } from "../../../wallets/src/services/wallets.service";
import { WalletsServiceContract } from "../../../wallets/src/services/wallets.service";
import { PrismaPoolRepository } from "../repositories/pool.repository";

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
}

@Injectable()
export class PoolService implements PoolServiceContract {
  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly qualificationService: QualificationService,
    private readonly membersService: MembersService,
    @Inject(forwardRef(() => CommissionsService))
    private readonly commissionsService: CommissionsService,
    private readonly poolRepository: PrismaPoolRepository,
    private readonly walletsService: WalletsService,
  ) {}

  async computePoolFunding(input: PoolFundingInput): Promise<PoolFundingResult> {
    const poolFund = multiplyDecimalStrings(
      input.fundingTotalApprovedPv,
      input.poolRate,
    );

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
    return Promise.all(
      snapshots.map((snapshot) =>
        this.qualificationService.evaluatePoolEligibility({
          userId: snapshot.userId,
          evaluationAt: snapshot.poolDate ?? "",
        }).then((result) => ({
          userId: result.userId,
          eligible: result.eligible,
          reasonCode: result.reasonCode,
        })),
      ),
    );
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
    const { poolRate } = readCommissionSettings();
    const funding = await this.computePoolFunding({
      poolDate,
      approvedOrderCount: approvedOrders.length,
      fundingTotalApprovedPv: this.sumApprovedOrderPv(approvedOrders),
      poolRate,
    });
    const uniqueUserIds = await this.membersService.getMemberIdsWithActiveCycles(
      `${poolDate}T00:00:00.000Z`,
    );
    const flow = await this.handleDailyPoolFlow(
      poolDate,
      uniqueUserIds.map((userId) => ({
        userId,
        memberActive: false,
        activeDirectReferralCount: 0,
        poolDate,
      })),
    );
    const { poolCycleId } = await this.poolRepository.createOrUpdatePoolCycle({
      ...funding,
      eligibleMemberCount: flow.eligibleRecipientCount,
      payoutPerMember: flow.payoutPerMember,
      companyFallbackAmount: flow.companyFallback.amount,
    });
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
    const { poolRate } = readCommissionSettings();

    return {
      poolDate,
      approvedOrderCount: approvedOrders.length,
      fundingTotalApprovedPv: this.sumApprovedOrderPv(approvedOrders),
      poolRate,
    };
  }

  async getPoolCycle(poolDate: string) {
    return this.poolRepository.getPoolCycle(poolDate);
  }

  async listPoolPayouts(poolDate: string) {
    return this.poolRepository.listPoolPayouts(poolDate);
  }

  async handleDailyPoolFlow(
    poolDate: string,
    snapshots: PoolEligibilityMemberSnapshot[],
  ): Promise<DailyPoolFlowResult> {
    const approvedOrders =
      await this.ordersService.listApprovedOrdersForPoolDate(poolDate);
    const { poolRate } = readCommissionSettings();
    const funding = await this.computePoolFunding({
      poolDate,
      approvedOrderCount: approvedOrders.length,
      fundingTotalApprovedPv: this.sumApprovedOrderPv(approvedOrders),
      poolRate,
    });
    const eligibilityDecisions = await this.evaluatePoolEligibility(snapshots);
    const eligibleUserIds = eligibilityDecisions
      .filter((decision) => decision.eligible)
      .map((decision) => decision.userId);

    if (eligibleUserIds.length === 0) {
      return {
        poolDate,
        fundingSource: "approved_orders_only",
        approvedOrderIds: approvedOrders.map((order) => order.orderId),
        sameDayContributionRequired: false,
        hasRollup: false,
        fundingTotalApprovedPv: funding.fundingTotalApprovedPv,
        poolFund: funding.poolFund,
        payoutPerMember: "0",
        eligibleRecipientCount: 0,
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
    const recipientDrafts = await Promise.all(
      eligibleUserIds.map((userId) =>
        this.buildRecipientDraft(poolDate, userId, payoutPerMember),
      ),
    );
    const recipientLevelFallbackAmount = recipientDrafts.reduce(
      (total, recipient) =>
        recipient.finalization.commissionStatus === "fallback"
          ? addDecimalStrings(total, recipient.amount)
          : total,
      "0",
    );

    return {
      poolDate,
      fundingSource: "approved_orders_only",
      approvedOrderIds: approvedOrders.map((order) => order.orderId),
      sameDayContributionRequired: false,
      hasRollup: false,
      fundingTotalApprovedPv: funding.fundingTotalApprovedPv,
      poolFund: funding.poolFund,
      payoutPerMember,
      eligibleRecipientCount: eligibleUserIds.length,
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
    poolDate: string,
    userId: string,
    amount: string,
  ): Promise<PoolRecipientDraftResult> {
    const candidateCycles = await this.membersService.getMemberCycles(
      userId,
      poolDate,
    );
    const allocation = await this.commissionsService.allocateBonusToCycle({
      beneficiaryUserId: userId,
      evaluationAt: poolDate,
      bonusAmount: amount,
      candidateCycles,
    });

    return {
      userId,
      eligible: true,
      amount,
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
}
