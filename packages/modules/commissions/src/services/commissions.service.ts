import { Inject, Injectable, forwardRef } from "@nestjs/common";

// Active commission-calculation scope:
// - direct
// - team_2leg / team_3leg
// - matching
// - pool
// Do not use unrelated plans or older sandbox directions here, including
// unilevel, legacy/member003 research notes, or deprecated CommissionMainPlan
// assumptions, unless a later approved spec explicitly restores them.

import {
  ApprovedOrderCommissionFlowResult,
  BonusToCycleAllocationInput,
  BonusToCycleAllocationResult,
  CommissionReleaseStatus,
  CommissionCandidatePath,
  EndOfDayCommissionBatchResult,
  CommissionFinalizationInput,
  CommissionFinalizationResult,
  CommissionSourceType,
  DirectCommissionFinalizationResult,
  TeamSettlementBatchItemSnapshot,
  TeamSettlementBatchProcessResult,
  TeamSettlementBatchScaffoldResult,
  TeamSettlementBatchSnapshotResult,
  UserBuybackProgressSnapshot,
  BuybackProgressStatus,
} from "../domain/commissions.types";
import {
  addDecimalStrings,
  compareDecimalStrings,
  minDecimalString,
  multiplyDecimalStrings,
  subtractDecimalStrings,
} from "../../../../shared/utils/src/money.util";
import {
  parseCommissionSettingsSnapshot,
  readCommissionSettings,
} from "../../../../shared/utils/src/commission-settings.util";
import { MembersService } from "../../../members/src/services/members.service";
import { MembersServiceContract } from "../../../members/src/services/members.service";
import { OrdersService } from "../../../orders/src/services/orders.service";
import { OrdersServiceContract } from "../../../orders/src/services/orders.service";
import { PoolService } from "../../../pool/src/services/pool.service";
import { QualificationService } from "../../../qualification/src/services/qualification.service";
import { QualificationServiceContract } from "../../../qualification/src/services/qualification.service";
import { WalletsService } from "../../../wallets/src/services/wallets.service";
import { PrismaCommissionsRepository } from "../repositories/commissions.repository";

export interface CommissionsServiceContract {
  handleApprovedOrderCommissionSource(
    orderId: string,
  ): Promise<ApprovedOrderCommissionFlowResult>;

  resolveDirectBonusCandidatePath(
    input: CommissionCandidatePath,
  ): Promise<string[]>;

  resolveUniBonusCandidatePath(
    input: CommissionCandidatePath,
  ): Promise<string[]>;

  allocateBonusToCycle(
    input: BonusToCycleAllocationInput,
  ): Promise<BonusToCycleAllocationResult>;

  finalizeCommissionItem(
    input: CommissionFinalizationInput,
  ): Promise<CommissionFinalizationResult>;

  createCompanyFallback(input: {
    sourceType: CommissionSourceType;
    sourceRefId: string;
    amount: string;
    reasonCode: string;
  }): Promise<void>;

  clearOrderCommissionArtifacts(orderId: string): Promise<void>;

  listCommissions(filters?: {
    orderId?: string;
    beneficiaryUserId?: string;
    commissionType?: string;
    page?: number;
    pageSize?: number;
  }): Promise<
    | Array<{
        commissionId: string;
        orderId: string | null;
        sourceUserId: string;
        beneficiaryUserId: string | null;
        beneficiaryCycleId: string | null;
        commissionType: string;
        levelNo: number | null;
        rate: string;
        basePv: string;
        amount: string;
        grossAmount: string;
        finalPayableAmount: string;
        discardedAmount: string;
        releaseStatus: string;
        status: string;
        companyFallbackReason: string | null;
        createdAt: string;
      }>
    | {
        items: Array<{
          commissionId: string;
          orderId: string | null;
          sourceUserId: string;
          beneficiaryUserId: string | null;
          beneficiaryCycleId: string | null;
          commissionType: string;
          levelNo: number | null;
          rate: string;
          basePv: string;
          amount: string;
          grossAmount: string;
          finalPayableAmount: string;
          discardedAmount: string;
          releaseStatus: string;
          status: string;
          companyFallbackReason: string | null;
          createdAt: string;
        }>;
        total: number;
        page: number;
        pageSize: number;
      }
  >;

  listCompanyFallbacks(filters?: {
    sourceRefId?: string;
    sourceType?: string;
    page?: number;
    pageSize?: number;
  }): Promise<
    | Array<{
        fallbackId: string;
        sourceType: string;
        sourceRefId: string;
        bonusType: string;
        amount: string;
        reason: string;
        createdAt: string;
      }>
    | {
        items: Array<{
          fallbackId: string;
          sourceType: string;
          sourceRefId: string;
          bonusType: string;
          amount: string;
          reason: string;
          createdAt: string;
        }>;
        total: number;
        page: number;
        pageSize: number;
      }
  >;

  scaffoldTeamSettlementBatch(
    settlementDate: string,
  ): Promise<TeamSettlementBatchScaffoldResult>;

  processTeamSettlementBatch(
    settlementDate: string,
  ): Promise<TeamSettlementBatchProcessResult>;

  processEndOfDayCommissionBatch(
    settlementDate: string,
  ): Promise<EndOfDayCommissionBatchResult>;

  getTeamSettlementBatchSnapshot(
    settlementDate: string,
  ): Promise<TeamSettlementBatchSnapshotResult>;

  createPoolCommission(input: {
    poolCycleId: string;
    poolDate: string;
    beneficiaryUserId: string;
    evaluationAt: string;
    basePv: string;
    amount: string;
  }): Promise<{
    commissionId: string;
    beneficiaryUserId: string | null;
    beneficiaryCycleId: string | null;
    finalPayableAmount: string;
    releaseStatus: CommissionReleaseStatus;
    commissionStatus: CommissionFinalizationResult["commissionStatus"];
    fallbackReason: string | null;
  } | null>;

  handleQualifyingRepurchase(input: {
    beneficiaryUserId: string;
    approvedOrderId: string;
    approvedAt: string;
    orderTotalUsdt: string;
  }): Promise<{
    resetApplied: boolean;
    previousStatus: BuybackProgressStatus | null;
    releasedHeldCommissionCount: number;
  }>;

  handleApprovedSelfPurchaseQualification(input: {
    beneficiaryUserId: string;
    approvedOrderId: string;
    approvedAt: string;
  }): Promise<{
    qualificationLocked: boolean;
    alreadyQualified: boolean;
  }>;

  getUserBuybackProgress(
    beneficiaryUserId: string,
  ): Promise<UserBuybackProgressSnapshot | null>;
}

@Injectable()
export class CommissionsService implements CommissionsServiceContract {
  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly membersService: MembersService,
    private readonly qualificationService: QualificationService,
    private readonly commissionsRepository: PrismaCommissionsRepository,
    @Inject(forwardRef(() => PoolService))
    private readonly poolService: PoolService,
    private readonly walletsService: WalletsService,
  ) {}

  async handleApprovedOrderCommissionSource(
    orderId: string,
  ): Promise<ApprovedOrderCommissionFlowResult> {
    const sourceOrder =
      await this.ordersService.handleApprovedOrderEvent(orderId);
    const commissionSettings = parseCommissionSettingsSnapshot(
      sourceOrder.commissionSettingsSnapshot,
    );
    const candidateUserIds = await this.membersService.getUplineCandidateIds(
      sourceOrder.sourceUserId,
      sourceOrder.approvedAt,
    );
    const cashbackDrafts: ApprovedOrderCommissionFlowResult["cashbackDrafts"] = [];

    const directCandidateUserIds =
      commissionSettings.appVisibility.direct === false
        ? []
        : await this.resolveDirectBonusCandidatePath({
            sourceUserId: sourceOrder.sourceUserId,
            evaluationAt: sourceOrder.approvedAt,
            candidateUserIds,
            directLevelCount: commissionSettings.directLevelRates.length,
          });

    const directDrafts =
      commissionSettings.appVisibility.direct === false
        ? []
        : await this.buildDirectDrafts(
            sourceOrder.orderId,
            sourceOrder.sourceUserId,
            sourceOrder.approvedAt,
            sourceOrder.totalPv,
            candidateUserIds,
            directCandidateUserIds,
            commissionSettings,
          );
    const uniDrafts: ApprovedOrderCommissionFlowResult["uniDrafts"] = [];

    return {
      sourceOrderId: sourceOrder.orderId,
      cashbackDrafts,
      directDrafts,
      uniDrafts,
    };
  }

  async resolveDirectBonusCandidatePath(
    input: CommissionCandidatePath & { directLevelCount?: number },
  ): Promise<string[]> {
    const maxLevels = input.directLevelCount ?? 1;
    const activeCandidateUserIds: string[] = [];

    for (const candidateUserId of input.candidateUserIds) {
      // Direct eligibility depends on whether the candidate still has
      // receivable commission cycles available for cap allocation.
      const receivableCycleIds = await this.qualificationService.getReceivableCycles(
        candidateUserId,
        input.evaluationAt,
      );

      if (receivableCycleIds.length > 0) {
        activeCandidateUserIds.push(candidateUserId);
      }

      if (activeCandidateUserIds.length >= maxLevels) {
        break;
      }
    }

    return activeCandidateUserIds;
  }

  async resolveUniBonusCandidatePath(
    input: CommissionCandidatePath & { uniLevelCount?: number },
  ): Promise<string[]> {
    const maxLevels = input.uniLevelCount ?? 1;
    const activeCandidateUserIds: string[] = [];

    for (const candidateUserId of input.candidateUserIds) {
      const cycles = await this.membersService.getMemberCycles(
        candidateUserId,
        input.evaluationAt,
      );
      const qualification =
        await this.qualificationService.evaluateMemberQualification({
          userId: candidateUserId,
          evaluationAt: input.evaluationAt,
          cycles,
        });

      if (qualification.memberActive) {
        activeCandidateUserIds.push(candidateUserId);
      }

      if (activeCandidateUserIds.length >= maxLevels) {
        break;
      }
    }

    return activeCandidateUserIds;
  }

  async allocateBonusToCycle(
    input: BonusToCycleAllocationInput,
  ): Promise<BonusToCycleAllocationResult> {
    const candidateCycles =
      input.candidateCycles.length > 0
        ? input.candidateCycles
        : await this.commissionsRepository.findCandidateCyclesForAllocation(
            input,
          );

    const selection =
      await this.qualificationService.selectCandidateCycles({
        userId: input.beneficiaryUserId,
        evaluationAt: input.evaluationAt,
        cycles: candidateCycles,
      });

    for (const cycleId of selection.orderedCandidateCycleIds) {
      const cycle = candidateCycles.find(
        (candidateCycle) => candidateCycle.cycleId === cycleId,
      );

      if (!cycle) {
        continue;
      }

      const capCheck =
        await this.qualificationService.evaluateCycleCapCheck({
          cycle,
          bonusAmount: input.bonusAmount,
          sourceType: input.sourceType,
        });

      if (capCheck.canAbsorbFullAmount) {
        return {
          beneficiaryUserId: input.beneficiaryUserId,
          assignedCycleId: cycle.cycleId,
          fallbackToCompany: false,
          fallbackReason: null,
        };
      }
    }

    return {
      beneficiaryUserId: input.beneficiaryUserId,
      assignedCycleId: null,
      fallbackToCompany: true,
      fallbackReason:
        selection.orderedCandidateCycleIds.length > 0
          ? "cap_blocked_all_receivable_cycles"
          : "no_receivable_cycle",
    };
  }

  async finalizeCommissionItem(
    input: CommissionFinalizationInput,
  ): Promise<CommissionFinalizationResult> {
    if (!input.beneficiaryUserId) {
      return this.buildMissingBeneficiaryFinalization(input.amount);
    }

    const commissionConfig =
      input.commissionConfig ?? this.readCommissionConfigFallback();
    const grossAmount = input.grossAmount ?? input.amount;
    const shouldApplyDailyCap = this.shouldApplyDailyCap(input);
    const finalPayableAmount = shouldApplyDailyCap
      ? await this.resolveCappedFinalPayableAmount(
          input,
          grossAmount,
          commissionConfig,
        )
      : grossAmount;
    const discardedAmount = shouldApplyDailyCap
      ? this.maxZeroDecimal(
          subtractDecimalStrings(grossAmount, finalPayableAmount),
        )
      : "0";
    if (compareDecimalStrings(finalPayableAmount, "0") <= 0) {
      return {
        commissionStatus: "approved",
        beneficiaryCycleId: null,
        fallbackReason: null,
        grossAmount,
        finalPayableAmount: "0",
        discardedAmount,
        releaseStatus: "withdrawable",
      };
    }

    const candidateCycles = await this.membersService.getMemberCycles(
      input.beneficiaryUserId,
      input.evaluationAt,
    );
    const allocation = await this.allocateBonusToCycle({
      beneficiaryUserId: input.beneficiaryUserId,
      evaluationAt: input.evaluationAt,
      bonusAmount: finalPayableAmount,
      sourceType: input.sourceType,
      candidateCycles,
    });

    if (allocation.fallbackToCompany) {
      return this.buildFinalizationFromAllocation(
        allocation,
        grossAmount,
        finalPayableAmount,
        discardedAmount,
        "withdrawable",
      );
    }

    const buybackDecision = await this.evaluateBuybackRelease({
      beneficiaryUserId: input.beneficiaryUserId,
      evaluationAt: input.evaluationAt,
      finalPayableAmount,
      buybackThresholdAmount: commissionConfig.buybackThresholdAmount,
      buybackGraceDays: commissionConfig.buybackGraceDays,
      sourceType: input.sourceType,
      sourceRefId: input.sourceRefId,
    });

    return this.buildFinalizationFromAllocation(
      allocation,
      grossAmount,
      finalPayableAmount,
      discardedAmount,
      buybackDecision.releaseStatus,
    );
  }

  async createCompanyFallback(input: {
    sourceType: CommissionSourceType;
    sourceRefId: string;
    amount: string;
    reasonCode: string;
  }): Promise<void> {
    await this.commissionsRepository.createCompanyFallbackEntry(input);
  }

  async clearOrderCommissionArtifacts(orderId: string): Promise<void> {
    await this.commissionsRepository.clearOrderCommissionArtifacts(orderId);
  }

  async listCommissions(filters?: {
    orderId?: string;
    beneficiaryUserId?: string;
    commissionType?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.commissionsRepository.listCommissionEntries(filters);
  }

  async listCompanyFallbacks(filters?: {
    sourceRefId?: string;
    sourceType?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.commissionsRepository.listCompanyFallbackEntries(filters);
  }

  async getUserBuybackProgress(
    beneficiaryUserId: string,
  ): Promise<UserBuybackProgressSnapshot | null> {
    return this.commissionsRepository.getUserBuybackProgress(beneficiaryUserId);
  }

  async handleQualifyingRepurchase(input: {
    beneficiaryUserId: string;
    approvedOrderId: string;
    approvedAt: string;
    orderTotalUsdt: string;
  }): Promise<{
    resetApplied: boolean;
    previousStatus: BuybackProgressStatus | null;
    releasedHeldCommissionCount: number;
  }> {
    const settings = readCommissionSettings();
    if (
      compareDecimalStrings(
        input.orderTotalUsdt,
        settings.buybackRepurchaseAmount,
      ) < 0
    ) {
      return {
        resetApplied: false,
        previousStatus: null,
        releasedHeldCommissionCount: 0,
      };
    }

    const existing =
      await this.commissionsRepository.getUserBuybackProgress(
        input.beneficiaryUserId,
      );

    if (
      !existing ||
      (existing.status !== "held_pending_repurchase" &&
        existing.status !== "blocked_after_expiry")
    ) {
      return {
        resetApplied: false,
        previousStatus: existing?.status ?? null,
        releasedHeldCommissionCount: 0,
      };
    }

    const releasedHeldCommissions =
      existing.status === "held_pending_repurchase"
        ? await this.commissionsRepository.markHeldCommissionsReleased({
            beneficiaryUserId: input.beneficiaryUserId,
            releasedAt: input.approvedAt,
          })
        : [];

    for (const commission of releasedHeldCommissions) {
      await this.walletsService.releaseHeldCommissionCredit({
        userId: input.beneficiaryUserId,
        commissionId: commission.commissionId,
        amount: commission.amount,
      });
    }

    const nextCycleId =
      existing.currentBuybackCycleId && existing.currentBuybackCycleId.length > 0
        ? `${existing.currentBuybackCycleId}:renewed:${input.approvedOrderId}`
        : `order:${input.approvedOrderId}`;

    await this.commissionsRepository.upsertUserBuybackProgress({
      beneficiaryUserId: input.beneficiaryUserId,
      accumulatedAmount: "0",
      status: "clear",
      thresholdReachedAt: null,
      graceExpiresAt: null,
      blockedAt: null,
      currentBuybackCycleId: nextCycleId,
      lastQualifyingOrderId: input.approvedOrderId,
    });

    await this.commissionsRepository.createBuybackEvent({
      beneficiaryUserId: input.beneficiaryUserId,
      triggerAmount: input.orderTotalUsdt,
      remainingAccumulatedAmount: "0",
      status: "RELEASED_AFTER_REPURCHASE",
      message: "Qualifying self repurchase opened the next commission round.",
      referenceType: "repurchase_order",
      referenceId: input.approvedOrderId,
    });

    return {
      resetApplied: true,
      previousStatus: existing.status,
      releasedHeldCommissionCount: releasedHeldCommissions.length,
    };
  }

  async handleApprovedSelfPurchaseQualification(input: {
    beneficiaryUserId: string;
    approvedOrderId: string;
    approvedAt: string;
  }): Promise<{
    qualificationLocked: boolean;
    alreadyQualified: boolean;
  }> {
    const existing =
      await this.commissionsRepository.getUserBuybackProgress(
        input.beneficiaryUserId,
      );

    if (existing?.lastQualifyingOrderId) {
      return {
        qualificationLocked: false,
        alreadyQualified: true,
      };
    }

    const qualificationSnapshot =
      await this.commissionsRepository.getInitialQualificationSnapshot({
        beneficiaryUserId: input.beneficiaryUserId,
        evaluationAt: input.approvedAt,
      });

    const qualifiesInitially =
      qualificationSnapshot.hasOwnApprovedOrder &&
      qualificationSnapshot.activeDirectReferralCount >= 3 &&
      qualificationSnapshot.activeDirectBuyerCount >= 3;

    if (!qualifiesInitially) {
      return {
        qualificationLocked: false,
        alreadyQualified: false,
      };
    }

    await this.commissionsRepository.upsertUserBuybackProgress({
      beneficiaryUserId: input.beneficiaryUserId,
      accumulatedAmount: existing?.accumulatedAmount ?? "0",
      status: existing?.status ?? "clear",
      thresholdReachedAt: existing?.thresholdReachedAt ?? null,
      graceExpiresAt: existing?.graceExpiresAt ?? null,
      blockedAt: existing?.blockedAt ?? null,
      currentBuybackCycleId:
        existing?.currentBuybackCycleId ??
        qualificationSnapshot.qualifyingCycleId ??
        `qualified:${input.approvedOrderId}`,
      lastQualifyingOrderId: input.approvedOrderId,
    });

    await this.commissionsRepository.createBuybackEvent({
      beneficiaryUserId: input.beneficiaryUserId,
      triggerAmount: "0",
      remainingAccumulatedAmount: existing?.accumulatedAmount ?? "0",
      status: "INITIAL_QUALIFICATION_LOCKED",
      message:
        "Member passed the first pool qualification gate and opened the initial commission round.",
      referenceType: "qualification_order",
      referenceId: input.approvedOrderId,
    });

    return {
      qualificationLocked: true,
      alreadyQualified: false,
    };
  }

  async scaffoldTeamSettlementBatch(
    settlementDate: string,
  ): Promise<TeamSettlementBatchScaffoldResult> {
    const commissionSettings = readCommissionSettings();
    const candidates =
      await this.commissionsRepository.listTeamSettlementCandidates(
        settlementDate,
      );
    const grouped = new Map<
      string,
      TeamSettlementBatchScaffoldResult["items"][number]
    >();

    for (const candidate of candidates) {
      if (!candidate.uplineUserId || !candidate.placementSide) {
        continue;
      }

      const existing = grouped.get(candidate.uplineUserId) ?? {
        userId: candidate.uplineUserId,
        availablePvByLeg: {
          LEFT: { memberCount: 0, totalPv: "0" },
          MIDDLE: { memberCount: 0, totalPv: "0" },
          RIGHT: { memberCount: 0, totalPv: "0" },
        },
        plannedPaidPvByLeg: {
          LEFT: "0",
          MIDDLE: "0",
          RIGHT: "0",
        },
        carryForwardPvByLeg: {
          LEFT: "0",
          MIDDLE: "0",
          RIGHT: "0",
        },
        payablePv: "0",
        bonusAmount: "0",
        status: "planned" as const,
      };

      existing.availablePvByLeg[candidate.placementSide].memberCount += 1;
      existing.availablePvByLeg[candidate.placementSide].totalPv =
        addDecimalStrings(
          existing.availablePvByLeg[candidate.placementSide].totalPv,
          candidate.totalPv,
        );
      grouped.set(candidate.uplineUserId, existing);
    }

    const items = [...grouped.values()]
      .map((item) =>
        this.buildTeamSettlementScaffoldItem(item, {
          teamTwoLegRate: commissionSettings.teamTwoLegRate,
          teamThreeLegRate: commissionSettings.teamThreeLegRate,
        }),
      )
      .sort((left, right) => left.userId.localeCompare(right.userId));

    return this.commissionsRepository.replaceTeamSettlementBatchScaffold({
      settlementDate,
      items,
    });
  }

  async processTeamSettlementBatch(
    settlementDate: string,
  ): Promise<TeamSettlementBatchProcessResult> {
    const commissionSettings = readCommissionSettings();
    const evaluationAt = `${settlementDate}T12:00:00+07:00`;
    await this.scaffoldTeamSettlementBatch(settlementDate);
    const items =
      await this.commissionsRepository.listTeamSettlementBatchItems(
        settlementDate,
      );
    const processedStatuses: Array<{
      itemId: string;
      status: TeamSettlementBatchItemSnapshot["status"];
    }> = [];

    for (const item of items) {
      if (item.status !== "planned") {
        processedStatuses.push({
          itemId: item.itemId,
          status: item.status,
        });
        continue;
      }

      const sourceType =
        this.resolveTeamCommissionSourceType(item.plannedPaidPvByLeg);
      const shouldCreateLedger =
        !!sourceType &&
        compareDecimalStrings(item.payablePv, "0") > 0 &&
        compareDecimalStrings(item.bonusAmount, "0") > 0;

      if (!shouldCreateLedger || !sourceType) {
        processedStatuses.push({
          itemId: item.itemId,
          status: "carried_forward",
        });
        continue;
      }

      const rate =
        sourceType === "team_3leg"
          ? commissionSettings.teamThreeLegRate
          : commissionSettings.teamTwoLegRate;
      const existingTeamCommission =
        await this.commissionsRepository.findExistingCommissionBySource({
          sourceType,
          sourceRefId: item.itemId,
        });
      const teamCommission =
        existingTeamCommission ??
        (await this.createTeamCommissionFromBatchItem({
          item,
          sourceType,
          rate,
          settlementDate,
          evaluationAt,
          commissionConfig: {
            dailyCommissionCapAmount: commissionSettings.dailyCommissionCapAmount,
            buybackThresholdAmount: commissionSettings.buybackThresholdAmount,
            buybackGraceDays: commissionSettings.buybackGraceDays,
          },
        }));

      if (
        teamCommission &&
        commissionSettings.appVisibility.matching !== false &&
        teamCommission.commissionStatus !== "fallback" &&
        compareDecimalStrings(teamCommission.finalPayableAmount, "0") > 0
      ) {
        await this.createMatchingCommissionsFromTeam({
          sourceCommissionLedgerId: teamCommission.commissionId,
          sourceUserId: item.userId,
          evaluationAt,
          settlementDate,
          matchingBaseAmount: teamCommission.finalPayableAmount,
          matchingLevelRates: commissionSettings.matchingLevelRates,
        });
      }

      processedStatuses.push({
        itemId: item.itemId,
        status: "processed",
      });
    }

    return this.commissionsRepository.markTeamSettlementBatchProcessed({
      settlementDate,
      items: processedStatuses,
    });
  }

  async processEndOfDayCommissionBatch(
    settlementDate: string,
  ): Promise<EndOfDayCommissionBatchResult> {
    const teamSettlement =
      await this.processTeamSettlementBatch(settlementDate);
    const pool = await this.poolService.closePool(settlementDate, {
      forceReprocess: true,
    });

    return {
      settlementDate,
      teamSettlement,
      pool,
    };
  }

  async getTeamSettlementBatchSnapshot(
    settlementDate: string,
  ): Promise<TeamSettlementBatchSnapshotResult> {
    return this.commissionsRepository.getTeamSettlementBatchSnapshot(
      settlementDate,
    );
  }

  async createPoolCommission(input: {
    poolCycleId: string;
    poolDate: string;
    beneficiaryUserId: string;
    evaluationAt: string;
    basePv: string;
    amount: string;
  }): Promise<{
    commissionId: string;
    beneficiaryUserId: string | null;
    beneficiaryCycleId: string | null;
    finalPayableAmount: string;
    releaseStatus: CommissionReleaseStatus;
    commissionStatus: CommissionFinalizationResult["commissionStatus"];
    fallbackReason: string | null;
  } | null> {
    const existingCommission =
      await this.commissionsRepository.findExistingCommissionBySource({
        sourceType: "pool",
        sourceRefId: input.poolCycleId,
        beneficiaryUserId: input.beneficiaryUserId,
      });

    if (existingCommission) {
      return {
        commissionId: existingCommission.commissionId,
        beneficiaryUserId: existingCommission.beneficiaryUserId,
        beneficiaryCycleId: existingCommission.beneficiaryCycleId,
        finalPayableAmount: existingCommission.finalPayableAmount,
        releaseStatus: existingCommission.releaseStatus,
        commissionStatus: existingCommission.commissionStatus,
        fallbackReason: existingCommission.fallbackReason,
      };
    }

    const commissionConfig = this.readCommissionConfigFallback();
    const finalization = await this.finalizeCommissionItem({
      sourceType: "pool",
      sourceRefId: input.poolCycleId,
      sourceUserId: input.beneficiaryUserId,
      beneficiaryUserId: input.beneficiaryUserId,
      evaluationAt: input.evaluationAt,
      basePv: input.basePv,
      rate: "1",
      amount: input.amount,
      metadata: {
        poolDate: input.poolDate,
        poolCycleId: input.poolCycleId,
      },
      commissionConfig,
    });

    const persisted = await this.persistCommissionItem(
      {
        sourceType: "pool",
        sourceRefId: input.poolCycleId,
        sourceUserId: input.beneficiaryUserId,
        beneficiaryUserId: input.beneficiaryUserId,
        evaluationAt: input.evaluationAt,
        basePv: input.basePv,
        rate: "1",
        amount: input.amount,
        metadata: {
          poolDate: input.poolDate,
          poolCycleId: input.poolCycleId,
        },
        commissionConfig,
      },
      finalization,
    );

    if (!persisted) {
      return null;
    }

    return {
      commissionId: persisted.commissionId,
      beneficiaryUserId: input.beneficiaryUserId,
      beneficiaryCycleId: finalization.beneficiaryCycleId,
      finalPayableAmount: finalization.finalPayableAmount,
      releaseStatus: finalization.releaseStatus,
      commissionStatus: finalization.commissionStatus,
      fallbackReason: finalization.fallbackReason,
    };
  }

  private buildTeamSettlementScaffoldItem(
    item: TeamSettlementBatchScaffoldResult["items"][number],
    rates: {
      teamTwoLegRate: string;
      teamThreeLegRate: string;
    },
  ): TeamSettlementBatchScaffoldResult["items"][number] {
    const leftPv = item.availablePvByLeg.LEFT.totalPv;
    const middlePv = item.availablePvByLeg.MIDDLE.totalPv;
    const rightPv = item.availablePvByLeg.RIGHT.totalPv;
    const positiveLegs = ([
      ["LEFT", leftPv],
      ["MIDDLE", middlePv],
      ["RIGHT", rightPv],
    ] as const).filter(([, totalPv]) => compareDecimalStrings(totalPv, "0") > 0);

    let plannedPaidPvByLeg: TeamSettlementBatchScaffoldResult["items"][number]["plannedPaidPvByLeg"] =
      {
        LEFT: "0",
        MIDDLE: "0",
        RIGHT: "0",
      };
    let payablePv = "0";
    let bonusAmount = "0";

    if (positiveLegs.length >= 3) {
      payablePv = positiveLegs.reduce(
        (currentMin, [, totalPv]) => minDecimalString(currentMin, totalPv),
        positiveLegs[0][1],
      );
      plannedPaidPvByLeg = {
        LEFT: payablePv,
        MIDDLE: payablePv,
        RIGHT: payablePv,
      };
      bonusAmount = multiplyDecimalStrings(payablePv, rates.teamThreeLegRate);
    } else if (positiveLegs.length >= 2) {
      const payableLegs = positiveLegs
        .sort((left, right) => compareDecimalStrings(left[1], right[1]))
        .slice(0, 2);
      payablePv = minDecimalString(payableLegs[0][1], payableLegs[1][1]);
      plannedPaidPvByLeg = {
        LEFT: "0",
        MIDDLE: "0",
        RIGHT: "0",
      };
      for (const [leg] of payableLegs) {
        plannedPaidPvByLeg[leg] = payablePv;
      }
      bonusAmount = multiplyDecimalStrings(payablePv, rates.teamTwoLegRate);
    }

    return {
      ...item,
      plannedPaidPvByLeg,
      carryForwardPvByLeg: {
        LEFT: this.maxZeroDecimal(
          subtractDecimalStrings(leftPv, plannedPaidPvByLeg.LEFT),
        ),
        MIDDLE: this.maxZeroDecimal(
          subtractDecimalStrings(middlePv, plannedPaidPvByLeg.MIDDLE),
        ),
        RIGHT: this.maxZeroDecimal(
          subtractDecimalStrings(rightPv, plannedPaidPvByLeg.RIGHT),
        ),
      },
      payablePv,
      bonusAmount,
    };
  }

  private resolveTeamCommissionSourceType(
    plannedPaidPvByLeg: TeamSettlementBatchItemSnapshot["plannedPaidPvByLeg"],
  ): "team_2leg" | "team_3leg" | null {
    const payableLegCount = Object.values(plannedPaidPvByLeg).filter(
      (value) => compareDecimalStrings(value, "0") > 0,
    ).length;

    if (payableLegCount >= 3) {
      return "team_3leg";
    }

    if (payableLegCount >= 2) {
      return "team_2leg";
    }

    return null;
  }

  private async createTeamCommissionFromBatchItem(input: {
    item: TeamSettlementBatchItemSnapshot;
    sourceType: "team_2leg" | "team_3leg";
    rate: string;
    settlementDate: string;
    evaluationAt: string;
    commissionConfig: Required<
      NonNullable<CommissionFinalizationInput["commissionConfig"]>
    >;
  }): Promise<{
    commissionId: string;
    beneficiaryUserId: string | null;
    finalPayableAmount: string;
    releaseStatus: CommissionReleaseStatus;
    commissionStatus: CommissionFinalizationResult["commissionStatus"];
  } | null> {
    const finalization = await this.finalizeCommissionItem({
      sourceType: input.sourceType,
      sourceRefId: input.item.itemId,
      sourceUserId: input.item.userId,
      beneficiaryUserId: input.item.userId,
      evaluationAt: input.evaluationAt,
      basePv: input.item.payablePv,
      rate: input.rate,
      amount: input.item.bonusAmount,
      metadata: {
        settlementDate: input.settlementDate,
        teamSettlementBatchItemId: input.item.itemId,
        availablePvByLeg: input.item.availablePvByLeg,
        plannedPaidPvByLeg: input.item.plannedPaidPvByLeg,
        carryForwardPvByLeg: input.item.carryForwardPvByLeg,
      },
      commissionConfig: input.commissionConfig,
    });

    const persisted = await this.persistCommissionItem(
      {
        sourceType: input.sourceType,
        sourceRefId: input.item.itemId,
        sourceUserId: input.item.userId,
        beneficiaryUserId: input.item.userId,
        evaluationAt: input.evaluationAt,
        basePv: input.item.payablePv,
        rate: input.rate,
        amount: input.item.bonusAmount,
        metadata: {
          settlementDate: input.settlementDate,
          teamSettlementBatchItemId: input.item.itemId,
          availablePvByLeg: input.item.availablePvByLeg,
          plannedPaidPvByLeg: input.item.plannedPaidPvByLeg,
          carryForwardPvByLeg: input.item.carryForwardPvByLeg,
        },
        commissionConfig: input.commissionConfig,
      },
      finalization,
    );

    if (!persisted) {
      return null;
    }

    return {
      commissionId: persisted.commissionId,
      beneficiaryUserId: input.item.userId,
      finalPayableAmount: finalization.finalPayableAmount,
      releaseStatus: finalization.releaseStatus,
      commissionStatus: finalization.commissionStatus,
    };
  }

  private async createMatchingCommissionsFromTeam(input: {
    sourceCommissionLedgerId: string;
    sourceUserId: string;
    evaluationAt: string;
    settlementDate: string;
    matchingBaseAmount: string;
    matchingLevelRates: string[];
  }): Promise<void> {
    if (compareDecimalStrings(input.matchingBaseAmount, "0") <= 0) {
      return;
    }

    const candidateUserIds = await this.membersService.getUplineCandidateIds(
      input.sourceUserId,
      input.evaluationAt,
    );
    const matchingCandidateUserIds =
      await this.resolveDirectBonusCandidatePath({
        sourceUserId: input.sourceUserId,
        evaluationAt: input.evaluationAt,
        candidateUserIds,
        directLevelCount: input.matchingLevelRates.length,
      });

    for (const [index, rate] of input.matchingLevelRates.entries()) {
      const beneficiaryUserId = matchingCandidateUserIds[index] ?? null;
      const amount = multiplyDecimalStrings(input.matchingBaseAmount, rate);

      if (this.shouldSkipCommission(rate, amount)) {
        continue;
      }

      const levelNo = index + 1;
      const sourceType =
        levelNo === 1 ? ("matching_l1" as const) : ("matching_l2" as const);
      const existingMatchingCommission =
        await this.commissionsRepository.findExistingCommissionBySource({
          sourceType,
          sourceRefId: input.sourceCommissionLedgerId,
          sourceCommissionLedgerId: input.sourceCommissionLedgerId,
          levelNo,
        });

      if (existingMatchingCommission) {
        continue;
      }

      const finalization =
        beneficiaryUserId
          ? await this.finalizeCommissionItem({
              sourceType,
              sourceRefId: input.sourceCommissionLedgerId,
              sourceUserId: input.sourceUserId,
              beneficiaryUserId,
              evaluationAt: input.evaluationAt,
              basePv: input.matchingBaseAmount,
              rate,
              amount,
              levelNo,
              sourceCommissionLedgerId: input.sourceCommissionLedgerId,
              metadata: {
                settlementDate: input.settlementDate,
                sourceTeamCommissionLedgerId: input.sourceCommissionLedgerId,
                matchingBaseAmount: input.matchingBaseAmount,
              },
            })
          : this.buildUniMissingBeneficiaryFinalization(amount);

      await this.persistCommissionItem(
        {
          sourceType,
          sourceRefId: input.sourceCommissionLedgerId,
          sourceUserId: input.sourceUserId,
          beneficiaryUserId,
          evaluationAt: input.evaluationAt,
          basePv: input.matchingBaseAmount,
          rate,
          amount,
          levelNo,
          sourceCommissionLedgerId: input.sourceCommissionLedgerId,
          metadata: {
            settlementDate: input.settlementDate,
            sourceTeamCommissionLedgerId: input.sourceCommissionLedgerId,
            matchingBaseAmount: input.matchingBaseAmount,
          },
        },
        finalization,
      );
    }
  }

  private async buildCashbackDrafts(
    sourceOrderId: string,
    sourceUserId: string,
    evaluationAt: string,
    totalPv: string,
    commissionSettings: ReturnType<typeof parseCommissionSettingsSnapshot>,
  ) {
    const basePv = totalPv;
    const rate = commissionSettings.cashbackRate;
    const amount = multiplyDecimalStrings(basePv, rate);

    if (
      compareDecimalStrings(rate, "0") <= 0 ||
      compareDecimalStrings(amount, "0") <= 0
    ) {
      return [];
    }

    const commissionConfig = {
      dailyCommissionCapAmount: commissionSettings.dailyCommissionCapAmount,
      buybackThresholdAmount: commissionSettings.buybackThresholdAmount,
      buybackGraceDays: commissionSettings.buybackGraceDays,
    };
    const finalization = await this.finalizeCommissionItem({
      sourceType: "cashback",
      sourceRefId: sourceOrderId,
      sourceUserId,
      beneficiaryUserId: sourceUserId,
      evaluationAt,
      basePv,
      rate,
      amount,
      commissionConfig,
    });

    await this.persistCommissionItem(
      {
        sourceType: "cashback",
        sourceRefId: sourceOrderId,
        sourceUserId,
        beneficiaryUserId: sourceUserId,
        evaluationAt,
        basePv,
        rate,
        amount,
        commissionConfig,
      },
      finalization,
    );

    return [
      {
        sourceType: "cashback" as const,
        sourceOrderId,
        beneficiaryUserId:
          finalization.commissionStatus === "fallback" ? null : sourceUserId,
        rate,
        basePv,
        amount,
        allocation: null,
        finalization,
      },
    ];
  }

  private async buildDirectDraft(
    sourceOrderId: string,
    sourceUserId: string,
    evaluationAt: string,
    totalPv: string,
    candidateUserIds: string[],
    levelNo: number,
    rate: string,
    candidateUserId: string | null,
    commissionSettings: ReturnType<typeof parseCommissionSettingsSnapshot>,
  ): Promise<
    | {
        sourceType: "direct";
        sourceOrderId: string;
        level: number;
        levelNo: number;
        basePv: string;
        rate: string;
        amount: string;
        beneficiaryUserId: string | null;
        candidateUserId: string | null;
        rollupApplied: boolean;
        rollupDepth: number;
        allocation: BonusToCycleAllocationResult | null;
        finalization: DirectCommissionFinalizationResult;
      }
    | null
  > {
    const basePv = totalPv;
    const amount = multiplyDecimalStrings(basePv, rate);

    if (this.shouldSkipCommission(rate, amount)) {
      return null;
    }

    const candidateIndex = candidateUserId
      ? candidateUserIds.indexOf(candidateUserId)
      : -1;
    const rollupDepth = candidateIndex >= 0 ? Math.max(candidateIndex - (levelNo - 1), 0) : 0;
    const rollupApplied = rollupDepth > 0;
    const commissionConfig = {
      dailyCommissionCapAmount: commissionSettings.dailyCommissionCapAmount,
      buybackThresholdAmount: commissionSettings.buybackThresholdAmount,
      buybackGraceDays: commissionSettings.buybackGraceDays,
    };

    if (!candidateUserId) {
      const finalization = this.buildDirectFallbackFinalization(
        "no_active_sponsor",
        amount,
      );
      await this.persistCommissionItem({
        sourceType: "direct",
        sourceRefId: sourceOrderId,
        sourceUserId,
        beneficiaryUserId: null,
        evaluationAt,
        basePv,
        rate,
        amount,
        levelNo,
        commissionConfig,
      }, finalization);

      return {
        sourceType: "direct" as const,
        sourceOrderId,
        level: levelNo,
        levelNo,
        basePv,
        rate,
        amount,
        beneficiaryUserId: null,
        candidateUserId: null,
        rollupApplied: false,
        rollupDepth: 0,
        allocation: null,
        finalization,
      };
    }

    const finalization = this.toDirectFinalizationResult(
      await this.finalizeCommissionItem({
        sourceType: "direct",
        sourceRefId: sourceOrderId,
        sourceUserId,
        beneficiaryUserId: candidateUserId,
        evaluationAt,
        basePv,
        rate,
        amount,
        levelNo,
        commissionConfig,
      }),
    );
    await this.persistCommissionItem(
      {
        sourceType: "direct",
        sourceRefId: sourceOrderId,
        sourceUserId,
        beneficiaryUserId: candidateUserId,
        evaluationAt,
        basePv,
        rate,
        amount,
        levelNo,
        commissionConfig,
      },
      finalization,
    );

    return {
      sourceType: "direct" as const,
      sourceOrderId,
      level: levelNo,
      levelNo,
      basePv,
      rate,
      amount,
      beneficiaryUserId:
        finalization.commissionStatus === "fallback" ? null : candidateUserId,
      candidateUserId,
      rollupApplied,
      rollupDepth,
      allocation: null,
      finalization,
    };
  }

  private async buildDirectDrafts(
    sourceOrderId: string,
    sourceUserId: string,
    evaluationAt: string,
    totalPv: string,
    candidateUserIds: string[],
    directCandidateUserIds: string[],
    commissionSettings: ReturnType<typeof parseCommissionSettingsSnapshot>,
  ) {
    const directLevelRates = commissionSettings.directLevelRates;
    const drafts = await Promise.all(
      directLevelRates.map((rate, index) =>
        this.buildDirectDraft(
          sourceOrderId,
          sourceUserId,
          evaluationAt,
          totalPv,
          candidateUserIds,
          index + 1,
          rate,
          directCandidateUserIds[index] ?? null,
          commissionSettings,
        ),
      ),
    );

    return drafts.filter(
      (
        draft,
      ): draft is NonNullable<Awaited<ReturnType<typeof this.buildDirectDraft>>> =>
        draft !== null,
    );
  }

  private buildMissingBeneficiaryFinalization(
    grossAmount: string,
  ): CommissionFinalizationResult {
    return {
      commissionStatus: "fallback",
      beneficiaryCycleId: null,
      fallbackReason: "no_beneficiary_user",
      grossAmount,
      finalPayableAmount: "0",
      discardedAmount: grossAmount,
      releaseStatus: "withdrawable",
    };
  }

  private buildFinalizationFromAllocation(
    allocation: BonusToCycleAllocationResult,
    grossAmount: string,
    finalPayableAmount: string,
    discardedAmount: string,
    releaseStatus: CommissionReleaseStatus,
  ): CommissionFinalizationResult {
    if (allocation.fallbackToCompany) {
      return {
        commissionStatus: "fallback",
        beneficiaryCycleId: null,
        fallbackReason: allocation.fallbackReason,
        grossAmount,
        finalPayableAmount,
        discardedAmount,
        releaseStatus,
      };
    }

    return {
      commissionStatus:
        releaseStatus === "withdrawable" ? "approved" : "held",
      beneficiaryCycleId: allocation.assignedCycleId,
      fallbackReason: null,
      grossAmount,
      finalPayableAmount,
      discardedAmount,
      releaseStatus,
    };
  }

  private buildDirectFinalizationFromAllocation(
    allocation: BonusToCycleAllocationResult,
    grossAmount: string,
    finalPayableAmount: string,
    discardedAmount: string,
    releaseStatus: CommissionReleaseStatus,
  ): DirectCommissionFinalizationResult {
    if (allocation.fallbackToCompany) {
      return this.buildDirectFallbackFinalization(
        allocation.fallbackReason,
        grossAmount,
      );
    }

    return {
      commissionStatus:
        releaseStatus === "withdrawable" ? "approved" : "held",
      beneficiaryCycleId: allocation.assignedCycleId,
      fallbackReason: null,
      grossAmount,
      finalPayableAmount,
      discardedAmount,
      releaseStatus,
    };
  }

  private buildDirectFallbackFinalization(
    fallbackReason: "no_active_sponsor" | BonusToCycleAllocationResult["fallbackReason"],
    grossAmount: string,
  ): DirectCommissionFinalizationResult {
    return {
      commissionStatus: "fallback",
      beneficiaryCycleId: null,
      fallbackReason,
      grossAmount,
      finalPayableAmount: grossAmount,
      discardedAmount: "0",
      releaseStatus: "withdrawable",
    };
  }

  private toDirectFinalizationResult(
    finalization: CommissionFinalizationResult,
  ): DirectCommissionFinalizationResult {
    return {
      ...finalization,
      fallbackReason:
        (finalization.fallbackReason as DirectCommissionFinalizationResult["fallbackReason"]) ??
        null,
    };
  }

  private async buildUniDraft(
    sourceOrderId: string,
    sourceUserId: string,
    evaluationAt: string,
    totalPv: string,
    candidateUserIds: string[],
    candidateUserId: string | null,
    levelNo: number,
    rate: string,
    commissionSettings: ReturnType<typeof parseCommissionSettingsSnapshot>,
  ): Promise<
    | {
        sourceType: "uni";
        sourceOrderId: string;
        level: number;
        levelNo: number;
        beneficiaryUserId: string | null;
        candidateUserId: string | null;
        rate: string;
        amount: string;
        rollupApplied: boolean;
        allocation: BonusToCycleAllocationResult | null;
        finalization: CommissionFinalizationResult;
      }
    | null
  > {
    const basePv = totalPv;
    const amount = multiplyDecimalStrings(basePv, rate);

    if (this.shouldSkipCommission(rate, amount)) {
      return null;
    }

    const candidateIndex = candidateUserId
      ? candidateUserIds.indexOf(candidateUserId)
      : -1;
    const rollupApplied = candidateIndex >= 0 ? candidateIndex > levelNo - 1 : false;
    const commissionConfig = {
      dailyCommissionCapAmount: commissionSettings.dailyCommissionCapAmount,
      buybackThresholdAmount: commissionSettings.buybackThresholdAmount,
      buybackGraceDays: commissionSettings.buybackGraceDays,
    };
    const finalization =
      candidateUserId
        ? await this.finalizeCommissionItem({
            sourceType: "uni",
            sourceRefId: sourceOrderId,
            sourceUserId,
            beneficiaryUserId: candidateUserId,
            evaluationAt,
            basePv,
            rate,
            amount,
            levelNo,
            commissionConfig,
          })
        : this.buildUniMissingBeneficiaryFinalization(amount);
    await this.persistCommissionItem(
      {
        sourceType: "uni",
        sourceRefId: sourceOrderId,
        sourceUserId,
        beneficiaryUserId: candidateUserId,
        evaluationAt,
        basePv,
        rate,
        amount,
        levelNo,
        commissionConfig,
      },
      finalization,
    );

    return {
      sourceType: "uni" as const,
      sourceOrderId,
      level: levelNo,
      levelNo,
      beneficiaryUserId:
        finalization.commissionStatus === "fallback" ? null : candidateUserId,
      candidateUserId,
      rate,
      amount,
      rollupApplied,
      allocation: null,
      finalization,
    };
  }

  private async buildUniDrafts(
    sourceOrderId: string,
    sourceUserId: string,
    evaluationAt: string,
    totalPv: string,
    candidateUserIds: string[],
    uniCandidateUserIds: string[],
    commissionSettings: ReturnType<typeof parseCommissionSettingsSnapshot>,
  ) {
    const uniLevelRates = commissionSettings.uniLevelRates;
    const drafts = await Promise.all(
      uniLevelRates.map((rate, index) =>
        this.buildUniDraft(
          sourceOrderId,
          sourceUserId,
          evaluationAt,
          totalPv,
          candidateUserIds,
          uniCandidateUserIds[index] ?? null,
          index + 1,
          rate,
          commissionSettings,
        ),
      ),
    );

    return drafts.filter(
      (
        draft,
      ): draft is NonNullable<Awaited<ReturnType<typeof this.buildUniDraft>>> =>
        draft !== null,
    );
  }

  private shouldSkipCommission(rate: string, amount: string): boolean {
    return (
      compareDecimalStrings(rate, "0") <= 0 ||
      compareDecimalStrings(amount, "0") <= 0
    );
  }

  private buildUniMissingBeneficiaryFinalization(
    grossAmount: string,
  ): CommissionFinalizationResult {
    return {
      commissionStatus: "fallback",
      beneficiaryCycleId: null,
      fallbackReason: "no_active_upline",
      grossAmount,
      finalPayableAmount: grossAmount,
      discardedAmount: "0",
      releaseStatus: "withdrawable",
    };
  }

  private async persistCommissionItem(
    input: CommissionFinalizationInput,
    finalization: CommissionFinalizationResult,
  ): Promise<{ commissionId: string } | null> {
    if (this.shouldSkipCommission(input.rate, input.amount)) {
      return null;
    }

    if (finalization.releaseStatus === "blocked_after_expiry") {
      return null;
    }

    const { commissionId } =
      await this.commissionsRepository.createCommissionDraft({
        ...input,
        grossAmount: finalization.grossAmount,
        finalPayableAmount: finalization.finalPayableAmount,
        discardedAmount: finalization.discardedAmount,
        releaseStatus: finalization.releaseStatus,
      });

    await this.commissionsRepository.finalizeCommissionEntry(
      commissionId,
      finalization,
    );

    if (
      input.beneficiaryUserId &&
      finalization.commissionStatus !== "fallback" &&
      compareDecimalStrings(finalization.finalPayableAmount, "0") > 0 &&
      this.shouldApplyDailyCap(input)
    ) {
      const commissionConfig =
        input.commissionConfig ?? this.readCommissionConfigFallback();

      await this.commissionsRepository.incrementDailyCommissionCapUsage({
        beneficiaryUserId: input.beneficiaryUserId,
        capDate: this.toBangkokBusinessDate(input.evaluationAt),
        capAmount: commissionConfig.dailyCommissionCapAmount,
        amount: finalization.finalPayableAmount,
      });
    }

    if (finalization.commissionStatus === "fallback" && finalization.fallbackReason) {
      if (compareDecimalStrings(finalization.finalPayableAmount, "0") <= 0) {
        return { commissionId };
      }

      await this.createCompanyFallback({
        sourceType: input.sourceType,
        sourceRefId: input.sourceRefId,
        amount: finalization.finalPayableAmount,
        reasonCode: finalization.fallbackReason,
      });
    }

    return { commissionId };
  }

  private readCommissionConfigFallback(): Required<
    NonNullable<CommissionFinalizationInput["commissionConfig"]>
  > {
    const settings = readCommissionSettings();

    return {
      dailyCommissionCapAmount: settings.dailyCommissionCapAmount,
      buybackThresholdAmount: settings.buybackThresholdAmount,
      buybackGraceDays: settings.buybackGraceDays,
    };
  }

  private shouldApplyDailyCap(input: CommissionFinalizationInput): boolean {
    if (input.applyDailyCap !== undefined) {
      return input.applyDailyCap;
    }

    return input.sourceType === "team_2leg" || input.sourceType === "team_3leg";
  }

  private async resolveCappedFinalPayableAmount(
    input: CommissionFinalizationInput,
    grossAmount: string,
    commissionConfig: Required<
      NonNullable<CommissionFinalizationInput["commissionConfig"]>
    >,
  ): Promise<string> {
    const capSnapshot =
      await this.commissionsRepository.getDailyCommissionCapSnapshot({
        beneficiaryUserId: input.beneficiaryUserId!,
        capDate: this.toBangkokBusinessDate(input.evaluationAt),
        capAmount: commissionConfig.dailyCommissionCapAmount,
      });
    const remainingCap = this.maxZeroDecimal(
      subtractDecimalStrings(capSnapshot.capAmount, capSnapshot.usedAmount),
    );

    return minDecimalString(grossAmount, remainingCap);
  }

  private toBangkokBusinessDate(value: string): string {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date(value));
    const year = parts.find((part) => part.type === "year")?.value ?? "1970";
    const month = parts.find((part) => part.type === "month")?.value ?? "01";
    const day = parts.find((part) => part.type === "day")?.value ?? "01";

    return `${year}-${month}-${day}`;
  }

  private maxZeroDecimal(value: string): string {
    return compareDecimalStrings(value, "0") >= 0 ? value : "0";
  }

  private async evaluateBuybackRelease(input: {
    beneficiaryUserId: string;
    evaluationAt: string;
    finalPayableAmount: string;
    buybackThresholdAmount: string;
    buybackGraceDays: number;
    sourceType: CommissionSourceType;
    sourceRefId: string;
  }): Promise<{
    releaseStatus: CommissionReleaseStatus;
    progress: UserBuybackProgressSnapshot | null;
  }> {
    const existing =
      await this.commissionsRepository.getUserBuybackProgress(
        input.beneficiaryUserId,
      );

    if (existing?.status === "blocked_after_expiry") {
      return {
        releaseStatus: "blocked_after_expiry",
        progress: existing,
      };
    }

    if (existing?.status === "held_pending_repurchase") {
      if (
        existing.graceExpiresAt &&
        new Date(input.evaluationAt) >= new Date(existing.graceExpiresAt)
      ) {
        const blockedProgress =
          await this.commissionsRepository.upsertUserBuybackProgress({
            beneficiaryUserId: input.beneficiaryUserId,
            accumulatedAmount: existing.accumulatedAmount,
            status: "blocked_after_expiry",
            thresholdReachedAt: existing.thresholdReachedAt,
            graceExpiresAt: existing.graceExpiresAt,
            blockedAt: input.evaluationAt,
            currentBuybackCycleId: existing.currentBuybackCycleId ?? null,
            lastQualifyingOrderId: existing.lastQualifyingOrderId ?? null,
          });
        await this.commissionsRepository.markHeldCommissionsBlocked({
          beneficiaryUserId: input.beneficiaryUserId,
          blockedAt: input.evaluationAt,
        });
        await this.commissionsRepository.createBuybackEvent({
          beneficiaryUserId: input.beneficiaryUserId,
          triggerAmount: input.finalPayableAmount,
          remainingAccumulatedAmount: blockedProgress.accumulatedAmount,
          status: "BLOCKED_AFTER_EXPIRY",
          message: "Buyback grace period expired before repurchase completion.",
          referenceType: input.sourceType,
          referenceId: input.sourceRefId,
        });

        return {
          releaseStatus: "blocked_after_expiry",
          progress: blockedProgress,
        };
      }

      return {
        releaseStatus: "held_pending_repurchase",
        progress: existing,
      };
    }

    const nextAccumulatedAmount = addDecimalStrings(
      existing?.accumulatedAmount ?? "0",
      input.finalPayableAmount,
    );

    if (
      compareDecimalStrings(nextAccumulatedAmount, input.buybackThresholdAmount) >=
      0
    ) {
      const nextCycleId =
        existing?.currentBuybackCycleId && existing.currentBuybackCycleId.length > 0
          ? existing.currentBuybackCycleId
          : `threshold:${input.sourceType}:${input.sourceRefId}`;
      const heldProgress = await this.commissionsRepository.upsertUserBuybackProgress({
        beneficiaryUserId: input.beneficiaryUserId,
        accumulatedAmount: nextAccumulatedAmount,
        status: "held_pending_repurchase",
        thresholdReachedAt: input.evaluationAt,
        graceExpiresAt: this.addBangkokCalendarDays(
          input.evaluationAt,
          input.buybackGraceDays,
        ),
        blockedAt: null,
        currentBuybackCycleId: nextCycleId,
        lastQualifyingOrderId: existing?.lastQualifyingOrderId ?? null,
      });
      await this.commissionsRepository.createBuybackEvent({
        beneficiaryUserId: input.beneficiaryUserId,
        triggerAmount: input.finalPayableAmount,
        remainingAccumulatedAmount: heldProgress.accumulatedAmount,
        status: "HELD_PENDING_REPURCHASE",
        message: "Commission held pending member-initiated repurchase.",
        referenceType: input.sourceType,
        referenceId: input.sourceRefId,
      });

      return {
        releaseStatus: "held_pending_repurchase",
        progress: heldProgress,
      };
    }

    if (existing) {
      await this.commissionsRepository.upsertUserBuybackProgress({
        beneficiaryUserId: input.beneficiaryUserId,
        accumulatedAmount: nextAccumulatedAmount,
        status: "clear",
        thresholdReachedAt: null,
        graceExpiresAt: null,
        blockedAt: null,
        currentBuybackCycleId:
          existing.currentBuybackCycleId ??
          existing.lastQualifyingOrderId ??
          null,
        lastQualifyingOrderId: existing.lastQualifyingOrderId ?? null,
      });
    } else {
      await this.commissionsRepository.upsertUserBuybackProgress({
        beneficiaryUserId: input.beneficiaryUserId,
        accumulatedAmount: nextAccumulatedAmount,
        status: "clear",
        thresholdReachedAt: null,
        graceExpiresAt: null,
        blockedAt: null,
        currentBuybackCycleId: null,
        lastQualifyingOrderId: null,
      });
    }

    return {
      releaseStatus: "withdrawable",
      progress: existing,
    };
  }

  private addBangkokCalendarDays(value: string, days: number): string {
    const date = new Date(value);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
  }
}
