import { Injectable } from "@nestjs/common";

import { MembersService } from "../../../members/src/services/members.service";
import { MembersServiceContract } from "../../../members/src/services/members.service";
import {
  addDecimalStrings,
  compareDecimalStrings,
  multiplyDecimalStrings,
  subtractDecimalStrings,
} from "../../../../shared/utils/src/money.util";
import {
  parseMatrixSettingsSnapshot,
  readMatrixSettings,
} from "../../../../shared/utils/src/matrix-settings.util";
import { WalletsService } from "../../../wallets/src/services/wallets.service";
import { MatrixCycleSummary, MatrixOrderProcessingResult } from "../domain/matrix.types";
import { PrismaMatrixRepository } from "../repositories/matrix.repository";

type MatrixBoardLike = {
  id?: bigint;
  boardId?: string;
  boardNo: number;
  roundNo: number;
  status: string;
  slotCount: number;
  filledSlots: number;
  openThresholdPv: { toString(): string } | string;
  positions?: Array<{
    sourceUserId: string | bigint | null;
    slotNo?: number;
    sourceMemberCode?: string | null;
  }>;
};

const MAX_MATRIX_UPLINE_PROPAGATION_DEPTH = 3;

export interface MatrixServiceContract {
  handleApprovedOrderMatrixSource(input: {
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    matrixSettingsSnapshot: string | null;
  }): Promise<MatrixOrderProcessingResult>;

  getMemberMatrixCycles(userId: string): Promise<MatrixCycleSummary[]>;

  getMatrixSummary(): Promise<{
    cycleCount: number;
    activeCycleCount: number;
    payoutCount: number;
    payoutTotal: string;
    latestCycles: Array<Record<string, unknown>>;
  }>;

  listMatrixPayouts(filters?: {
    beneficiaryUserId?: string;
    sourceOrderId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<
    | Array<Record<string, unknown>>
    | {
        items: Array<Record<string, unknown>>;
        total: number;
        page: number;
        pageSize: number;
      }
  >;

  requestMemberAutoOrder(userId: string): Promise<{
    cycleId: string;
    userId: string;
    matrixEventId: string;
    sourceBoardId: string;
    roundNo: number;
    autoOrderAmount: string;
    autoOrderPvAmount: string;
    reentryAmount?: string;
    reentryPvAmount?: string;
  }>;

  requestMemberReentry(userId: string): Promise<{
    cycleId: string;
    userId: string;
    matrixEventId: string;
    sourceBoardId: string;
    roundNo: number;
    autoOrderAmount: string;
    autoOrderPvAmount: string;
    reentryAmount?: string;
    reentryPvAmount?: string;
  }>;

  getMemberAutoOrderPreference(userId: string): Promise<boolean>;
  getMemberReentryPreference(userId: string): Promise<boolean>;

  updateMemberAutoOrderPreference(input: {
    userId: string;
    enabled: boolean;
  }): Promise<{
    enabled: boolean;
    openedAutoOrder: {
      cycleId: string;
      userId: string;
      matrixEventId: string;
      sourceBoardId: string;
      roundNo: number;
      autoOrderAmount: string;
      autoOrderPvAmount: string;
      reentryAmount?: string;
      reentryPvAmount?: string;
    } | null;
    openedReentry?: {
      cycleId: string;
      userId: string;
      matrixEventId: string;
      sourceBoardId: string;
      roundNo: number;
      reentryAmount: string;
      reentryPvAmount: string;
    } | null;
  }>;

  updateMemberReentryPreference(input: {
    userId: string;
    enabled: boolean;
  }): Promise<{
    enabled: boolean;
    openedAutoOrder: {
      cycleId: string;
      userId: string;
      matrixEventId: string;
      sourceBoardId: string;
      roundNo: number;
      autoOrderAmount: string;
      autoOrderPvAmount: string;
      reentryAmount?: string;
      reentryPvAmount?: string;
    } | null;
    openedReentry?: {
      cycleId: string;
      userId: string;
      matrixEventId: string;
      sourceBoardId: string;
      roundNo: number;
      reentryAmount: string;
      reentryPvAmount: string;
    } | null;
  }>;

  completeMatrixReorder(input: {
    reorderId: string;
    orderId: string;
  }): Promise<void>;
}

type MatrixCycleLike = {
  cycleId?: string;
  id?: bigint;
  userId: string | bigint;
  boardWidth: number;
  boardDepth: number;
  boardCount: number;
  levelRatesSnapshot: string | string[];
};

@Injectable()
export class MatrixService implements MatrixServiceContract {
  constructor(
    private readonly matrixRepository: PrismaMatrixRepository,
    private readonly membersService: MembersService,
    private readonly walletsService: WalletsService,
  ) {}

  async handleApprovedOrderMatrixSource(input: {
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    matrixSettingsSnapshot: string | null;
  }): Promise<MatrixOrderProcessingResult> {
    if (await this.matrixRepository.hasAccumulationForOrder(input.orderId)) {
      return {
        orderId: input.orderId,
        sourceUserId: input.sourceUserId,
        affectedMemberCount: 0,
        payoutCount: 0,
        completedCycleCount: 0,
        skipped: true,
        openedAutoOrders: [],
        openedReentries: [],
      };
    }

    const settings = parseMatrixSettingsSnapshot(input.matrixSettingsSnapshot);
    let sourceCycle = await this.getActiveCycle(input.sourceUserId);

    if (sourceCycle) {
      await this.matrixRepository.addPersonalCarryPv(sourceCycle.id.toString(), input.totalPv);
    } else {
      const updatedSource = await this.matrixRepository.addUserMatrixPersonalPv(
        input.sourceUserId,
        input.totalPv,
      );

      if (
        compareDecimalStrings(
          updatedSource.matrixPersonalPv.toString(),
          settings.organizationPvRate,
        ) < 0
      ) {
        return {
          orderId: input.orderId,
          sourceUserId: input.sourceUserId,
          affectedMemberCount: 0,
          payoutCount: 0,
          completedCycleCount: 0,
          skipped: false,
          openedAutoOrders: [],
          openedReentries: [],
        };
      }

      sourceCycle = await this.ensureQualifiedSourceCycle(input.sourceUserId, settings, {
        personalCarryPv: subtractDecimalStrings(
          updatedSource.matrixPersonalPv.toString(),
          settings.organizationPvRate,
        ),
      });
      await this.matrixRepository.resetUserMatrixPersonalPv(input.sourceUserId);
    }

    if (!sourceCycle) {
      return {
        orderId: input.orderId,
        sourceUserId: input.sourceUserId,
        affectedMemberCount: 0,
        payoutCount: 0,
        completedCycleCount: 0,
        skipped: false,
        openedAutoOrders: [],
        openedReentries: [],
      };
    }

    const beneficiaryUserIds = await this.buildBeneficiaryUserIdsForSourceOrder(
      input.sourceUserId,
    );

    let affectedMemberCount = 0;
    let payoutCount = 0;
    let completedCycleCount = 0;
    const openedAutoOrders: MatrixOrderProcessingResult["openedAutoOrders"] = [];

    for (const [index, beneficiaryUserId] of beneficiaryUserIds.entries()) {
      const result = await this.processAccumulationForBeneficiary({
        beneficiaryUserId,
        sourceUserId: input.sourceUserId,
        sourceOrderId: input.orderId,
        sourcePv: input.totalPv,
        depthNo: index + 1,
        sourceSettings: settings,
      });

      affectedMemberCount += 1;
      payoutCount += result.payoutCount;
      completedCycleCount += result.completedCycleCount;
      openedAutoOrders.push(...result.openedAutoOrders);
    }

    return {
      orderId: input.orderId,
      sourceUserId: input.sourceUserId,
      affectedMemberCount,
      payoutCount,
      completedCycleCount,
      skipped: false,
      openedAutoOrders,
      openedReentries: openedAutoOrders.map((entry) => ({
        ...entry,
        reentryAmount: entry.autoOrderAmount,
        reentryPvAmount: entry.autoOrderPvAmount,
      })),
    };
  }

  private async buildBeneficiaryUserIdsForSourceOrder(
    sourceUserId: string,
  ) {
    const sponsorChain = await this.getSponsorChainIds(sourceUserId);

    return [sourceUserId, ...sponsorChain]
      .slice(0, MAX_MATRIX_UPLINE_PROPAGATION_DEPTH + 1)
      .filter((memberId, index, arr) => arr.indexOf(memberId) === index);
  }

  private async resolveNextPendingBoardEvent(input: {
    beneficiaryUserId: string;
    board: MatrixBoardLike;
  }): Promise<{
    event: Awaited<ReturnType<PrismaMatrixRepository["listBoardAccumulationEvents"]>>[number];
    slotNo?: number;
    levelNo?: number;
    parentSlotNo?: number | null;
  } | null> {
    const boardId = this.getBoardId(input.board);
    const events = await this.matrixRepository.listBoardAccumulationEvents(boardId);
    const placedCounts = new Map<string, number>();

    for (const position of input.board.positions || []) {
      if (!position.sourceUserId) {
        continue;
      }
      const sourceUserId = position.sourceUserId.toString();
      placedCounts.set(
        sourceUserId,
        (placedCounts.get(sourceUserId) || 0) + 1,
      );
    }

    const pendingEvents = [];
    const seenCounts = new Map<string, number>();
    for (const event of events) {
      const sourceUserId = event.sourceUserId.toString();
      const seen = (seenCounts.get(sourceUserId) || 0) + 1;
      seenCounts.set(sourceUserId, seen);

      if (seen > (placedCounts.get(sourceUserId) || 0)) {
        pendingEvents.push(event);
      }
    }

    if (pendingEvents.length === 0) {
      return null;
    }

    const effectivePendingEvents =
      input.board.boardNo === 1 && input.board.roundNo > 1
        ? pendingEvents.some((event) => !event.sourceOrderId)
          ? pendingEvents.filter((event) => !event.sourceOrderId)
          : pendingEvents
        : pendingEvents;
    const rankedPendingEvents = await this.rankPendingEventsForBeneficiary(
      input.beneficiaryUserId,
      effectivePendingEvents,
    );

    if (input.board.boardNo === 1) {
      const placedSlotByUserId = new Map<string, number>();
      for (const position of input.board.positions || []) {
        if (!position.sourceUserId || position.slotNo === undefined) {
          continue;
        }
        const sourceUserId = position.sourceUserId.toString();
        if (!placedSlotByUserId.has(sourceUserId)) {
          placedSlotByUserId.set(sourceUserId, position.slotNo);
        }
      }

      const occupiedSlots = new Set(
        (input.board.positions || [])
          .map((position) => position.slotNo)
          .filter((slotNo): slotNo is number => typeof slotNo === "number"),
      );

      const slotCount = input.board.slotCount;
      const placementCandidates = await Promise.all(
        rankedPendingEvents.map(async (event, index) => {
          const targetSlotNo = await this.resolveBoardOneTargetSlot({
            beneficiaryUserId: input.beneficiaryUserId,
            sourceUserId: event.sourceUserId.toString(),
            placedSlotByUserId,
            occupiedSlots,
            slotCount,
          });

          if (!targetSlotNo) {
            return null;
          }

          const levelNo = this.resolveLevelNo(targetSlotNo, 2, this.resolveBoardDepthFromSlotCount(slotCount));
          const parentSlotNo = this.resolveParentSlotNo(
            targetSlotNo,
            2,
            this.resolveBoardDepthFromSlotCount(slotCount),
          );

          return {
            event,
            index,
            slotNo: targetSlotNo,
            levelNo,
            parentSlotNo,
          };
        }),
      );

      const selected = placementCandidates
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .sort((left, right) => {
          if (left.slotNo !== right.slotNo) {
            return left.slotNo - right.slotNo;
          }

          const leftId = Number(left.event.id);
          const rightId = Number(right.event.id);
          if (leftId !== rightId) {
            return leftId - rightId;
          }

          return left.index - right.index;
        })[0];

      if (selected) {
        return {
          event: selected.event,
          slotNo: selected.slotNo,
          levelNo: selected.levelNo,
          parentSlotNo: selected.parentSlotNo,
        };
      }

      return null;
    }

    if (input.board.roundNo === 1 && input.board.boardNo > 1) {
      const cycles = await this.matrixRepository.getMemberMatrixCycles(
        input.beneficiaryUserId,
      );
      const latestCycle = cycles[0];
      const previousBoard = latestCycle?.boards.find(
        (entry) =>
          entry.boardNo === input.board.boardNo - 1 &&
          entry.roundNo === 1,
      );

      const previousSlotPriority = new Map<string, number>();
      for (const position of previousBoard?.positions || []) {
        if (!position.sourceMemberCode) {
          continue;
        }
        if (!previousSlotPriority.has(position.sourceMemberCode)) {
          previousSlotPriority.set(position.sourceMemberCode, position.slotNo);
        }
      }

      const occupiedSlots = new Set(
        (input.board.positions || []).map((position) => position.slotNo),
      );

      const mappedPendingEvents = await Promise.all(
        rankedPendingEvents.map(async (event) => {
          const sourceCode = event.sourceUser?.memberCode ?? "";
          const targetSlotNo = previousSlotPriority.get(sourceCode) ?? null;
          if (!targetSlotNo || occupiedSlots.has(targetSlotNo)) {
            return null;
          }

          const sponsorChain = await this.getSponsorChainIds(event.sourceUserId.toString());
          const sponsorDepthIndex = sponsorChain.indexOf(input.beneficiaryUserId);
          return {
            event,
            targetSlotNo,
            sponsorDepth: sponsorDepthIndex >= 0 ? sponsorDepthIndex + 1 : Number.MAX_SAFE_INTEGER,
          };
        }),
      );

      const rankedMappedPendingEvents = mappedPendingEvents
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .sort((left, right) => {
          if (left.sponsorDepth !== right.sponsorDepth) {
            return left.sponsorDepth - right.sponsorDepth;
          }

          return Number(left.event.id) - Number(right.event.id);
        });

      const selected = rankedMappedPendingEvents[0];
      if (!selected) {
        return null;
      }

      return {
        event: selected.event,
        slotNo: selected.targetSlotNo,
        levelNo: latestCycle
          ? this.resolveLevelNo(
              selected.targetSlotNo,
              latestCycle.boardWidth,
              latestCycle.boardDepth,
            )
          : 1,
        parentSlotNo: latestCycle
          ? this.resolveParentSlotNo(
              selected.targetSlotNo,
              latestCycle.boardWidth,
              latestCycle.boardDepth,
            )
          : null,
      };
    }

    return rankedPendingEvents[0] ? { event: rankedPendingEvents[0] } : null;
  }

  private async resolveBoardOneTargetSlot(input: {
    beneficiaryUserId: string;
    sourceUserId: string;
    placedSlotByUserId: Map<string, number>;
    occupiedSlots: Set<number>;
    slotCount: number;
  }): Promise<number | null> {
    const sponsorChain = await this.getSponsorChainIds(input.sourceUserId);
    const directSponsorId = sponsorChain[0] ?? null;

    if (directSponsorId && input.placedSlotByUserId.has(directSponsorId)) {
      return this.findFirstAvailableDescendantSlot({
        anchorSlotNo: input.placedSlotByUserId.get(directSponsorId) ?? null,
        occupiedSlots: input.occupiedSlots,
        slotCount: input.slotCount,
      });
    }

    const relevantAncestors = sponsorChain.filter(
      (ancestorId) =>
        ancestorId === input.beneficiaryUserId || input.placedSlotByUserId.has(ancestorId),
    );

    for (const ancestorId of relevantAncestors) {
      const anchorSlotNo =
        ancestorId === input.beneficiaryUserId
          ? null
          : (input.placedSlotByUserId.get(ancestorId) ?? null);
      const candidateSlotNo = this.findFirstAvailableDescendantSlot({
        anchorSlotNo,
        occupiedSlots: input.occupiedSlots,
        slotCount: input.slotCount,
      });

      if (candidateSlotNo !== null) {
        return candidateSlotNo;
      }
    }

    return this.findFirstAvailableDescendantSlot({
      anchorSlotNo: null,
      occupiedSlots: input.occupiedSlots,
      slotCount: input.slotCount,
    });
  }

  private findFirstAvailableDescendantSlot(input: {
    anchorSlotNo: number | null;
    occupiedSlots: Set<number>;
    slotCount: number;
  }): number | null {
    for (const candidateSlotNo of this.listSubtreeSlots(input.anchorSlotNo, input.slotCount)) {
      if (!input.occupiedSlots.has(candidateSlotNo)) {
        return candidateSlotNo;
      }
    }

    return null;
  }

  private listSubtreeSlots(anchorSlotNo: number | null, slotCount: number): number[] {
    const slots: number[] = [];
    const queue = anchorSlotNo === null ? this.getRootChildSlots(slotCount) : this.getChildSlots(anchorSlotNo, slotCount);

    while (queue.length > 0) {
      const slotNo = queue.shift();
      if (!slotNo) {
        continue;
      }
      slots.push(slotNo);
      queue.push(...this.getChildSlots(slotNo, slotCount));
    }

    return slots;
  }

  private getRootChildSlots(slotCount: number): number[] {
    return [1, 2].filter((slotNo) => slotNo <= slotCount);
  }

  private getChildSlots(slotNo: number, slotCount: number): number[] {
    const leftChild = slotNo * 2 + 1;
    const rightChild = leftChild + 1;

    return [leftChild, rightChild].filter((childSlotNo) => childSlotNo <= slotCount);
  }

  private async finalizeBoardAfterPlacement(input: {
    beneficiaryUserId: string;
    boardId: string;
  }) {
    const refreshedCycles = await this.matrixRepository.getMemberMatrixCycles(
      input.beneficiaryUserId,
    );
    const latestCycle = refreshedCycles[0];
    const targetBoard = latestCycle?.boards.find(
      (entry) => this.getBoardId(entry) === input.boardId,
    );

    if (!latestCycle || !targetBoard) {
      return {
        completedCycleCount: 0,
        openedAutoOrders: [] as MatrixOrderProcessingResult["openedAutoOrders"],
        openedReentries: [] as MatrixOrderProcessingResult["openedReentries"],
      };
    }

    let completedCycleCount = 0;
    const openedAutoOrders: MatrixOrderProcessingResult["openedAutoOrders"] = [];
    if (targetBoard.status === "open" && targetBoard.filledSlots >= targetBoard.slotCount) {
      await this.matrixRepository.markBoardCompleted(this.getBoardId(targetBoard));

      if (targetBoard.boardNo < latestCycle.boardCount) {
        const nextBoardNo = targetBoard.boardNo + 1;
        const existingNextBoard = latestCycle.boards.find(
          (entry) => entry.boardNo === nextBoardNo && entry.roundNo === 1,
        );

        if (!existingNextBoard) {
          await this.matrixRepository.createBoardRound({
            cycleId: latestCycle.cycleId,
            boardNo: nextBoardNo,
            roundNo: 1,
            openThresholdPv:
              latestCycle.boards.find((entry) => entry.boardNo === nextBoardNo)?.openThresholdPv ??
              latestCycle.organizationPvRate,
            boardWidth: latestCycle.boardWidth,
            boardDepth: latestCycle.boardDepth,
            boardDepths: this.resolveBoardDepthsFromSnapshot(
              latestCycle.levelRatesSnapshot,
              latestCycle.boardCount,
              latestCycle.boardDepth,
            ),
          });
        } else if (existingNextBoard.status === "locked") {
          await this.matrixRepository.openBoard(existingNextBoard.boardId);
        }

      } else {
        await this.matrixRepository.markCycleCompleted(latestCycle.cycleId);
        completedCycleCount = 1;
      }

    }

    if (
      targetBoard.filledSlots >= targetBoard.slotCount &&
      targetBoard.boardNo === 1
    ) {
      const deferredOpenedReentry = await this.maybeOpenEligibleBoardOneNextRound(
        input.beneficiaryUserId,
      );
      if (deferredOpenedReentry) {
        openedAutoOrders.push(deferredOpenedReentry);
      }

    }

    return {
      completedCycleCount,
      openedAutoOrders,
      openedReentries: openedAutoOrders.map((entry) => ({
        ...entry,
        reentryAmount: entry.autoOrderAmount,
        reentryPvAmount: entry.autoOrderPvAmount,
      })),
    };
  }

  private async flushPendingBoardPlacements(input: {
    beneficiaryUserId: string;
    cycle: MatrixCycleSummary;
    boardId: string;
  }) {
    let payoutCount = 0;
    let completedCycleCount = 0;
    const openedAutoOrders: MatrixOrderProcessingResult["openedAutoOrders"] = [];

    while (true) {
      const refreshedCycles = await this.matrixRepository.getMemberMatrixCycles(
        input.beneficiaryUserId,
      );
      const latestCycle = refreshedCycles[0];
      const targetBoard = latestCycle?.boards.find(
        (entry) => this.getBoardId(entry) === input.boardId,
      );

      if (!latestCycle || !targetBoard) {
        break;
      }

      if (targetBoard.status !== "open" || targetBoard.filledSlots >= targetBoard.slotCount) {
        break;
      }

      const nextPlacement = await this.resolveNextPendingBoardEvent({
        beneficiaryUserId: input.beneficiaryUserId,
        board: targetBoard,
      });

      if (!nextPlacement) {
        break;
      }

      const nextEvent = nextPlacement.event;

      const boardLevelRates = this.parseBoardLevelRatesSnapshot(
        latestCycle.levelRatesSnapshot,
        latestCycle.boardCount,
        latestCycle.boardDepth,
      );
      const levelRates = this.parseLevelRatesSnapshot(latestCycle.levelRatesSnapshot);
      const slotNo = nextPlacement.slotNo ?? targetBoard.filledSlots + 1;
      const levelNo =
        nextPlacement.levelNo ??
        this.resolveLevelNo(slotNo, latestCycle.boardWidth, latestCycle.boardDepth);
      const parentSlotNo =
        nextPlacement.parentSlotNo ??
        (levelNo === 1
          ? null
          : this.resolveParentSlotNo(slotNo, latestCycle.boardWidth, latestCycle.boardDepth));
      const rate =
        boardLevelRates[targetBoard.boardNo - 1]?.[levelNo - 1] ||
        levelRates[levelNo - 1] ||
        "0";
      const payoutAmount = multiplyDecimalStrings(
        latestCycle.organizationPvRate,
        rate,
      );
      const holdbackDecision = await this.resolveHoldbackPosting({
        beneficiaryUserId: input.beneficiaryUserId,
        boardNo: targetBoard.boardNo,
        roundNo: targetBoard.roundNo,
        grossPayoutAmount: payoutAmount,
        targetAmount: this.resolveAutoOrderRuntimeSettings(
          latestCycle.organizationPvRate,
          latestCycle.cwReentryAmount,
        ).reentryFirmAmount,
      });

      const payout = await this.matrixRepository.createPositionAndPayout({
        cycleId: latestCycle.cycleId,
        boardId: this.getBoardId(targetBoard),
        beneficiaryUserId: input.beneficiaryUserId,
        sourceUserId: nextEvent.sourceUserId.toString(),
        sourceOrderId: nextEvent.sourceOrderId?.toString() ?? null,
        boardNo: targetBoard.boardNo,
        roundNo: targetBoard.roundNo,
        slotNo,
        levelNo,
        parentSlotNo,
        sourcePv: nextEvent.sourcePv.toString(),
        creditedPv: nextEvent.creditedPv.toString(),
        rate,
        payoutAmount,
        paidAmount: holdbackDecision.paidAmount,
        holdbackAmount: holdbackDecision.holdbackAmount,
      });

      if (compareDecimalStrings(holdbackDecision.paidAmount, "0") > 0) {
        await this.walletsService.postApprovedEarning({
          userId: input.beneficiaryUserId,
          refType: "matrix",
          refId: payout.payoutId,
          amount: holdbackDecision.paidAmount,
          holdRequired: false,
          earningType: "matrix",
        });
      }

      payoutCount += 1;
      const finalized = await this.finalizeBoardAfterPlacement({
        beneficiaryUserId: input.beneficiaryUserId,
        boardId: this.getBoardId(targetBoard),
      });
      completedCycleCount += finalized.completedCycleCount;
      openedAutoOrders.push(...finalized.openedAutoOrders);
    }

    return {
      payoutCount,
      completedCycleCount,
      openedAutoOrders,
      openedReentries: openedAutoOrders.map((entry) => ({
        ...entry,
        reentryAmount: entry.autoOrderAmount,
        reentryPvAmount: entry.autoOrderPvAmount,
      })),
    };
  }

  private async getSponsorChainIds(memberId: string) {
    const chain: string[] = [];
    let currentMemberId: string | null = memberId;
    const seen = new Set<string>();

    while (currentMemberId && !seen.has(currentMemberId)) {
      seen.add(currentMemberId);
      const member = await this.membersService.getMember(currentMemberId);
      const sponsorId = member?.sponsorId ?? null;
      if (!sponsorId) {
        break;
      }
      chain.push(sponsorId);
      currentMemberId = sponsorId;
    }

    return chain;
  }

  private async isWithinPlacementSubtree(ownerUserId: string, sourceUserId: string) {
    if (ownerUserId === sourceUserId) {
      return true;
    }

    let currentMemberId: string | null = sourceUserId;
    const seen = new Set<string>();

    while (currentMemberId && !seen.has(currentMemberId)) {
      seen.add(currentMemberId);
      const member = await this.membersService.getMember(currentMemberId);
      const uplineUserId = member?.uplineUserId ?? null;
      if (!uplineUserId) {
        return false;
      }
      if (uplineUserId === ownerUserId) {
        return true;
      }
      currentMemberId = uplineUserId;
    }

    return false;
  }

  private async rankPendingEventsForBeneficiary<
    T extends {
      id: string | bigint;
      sourceUserId: string | bigint;
      sourceOrderId?: string | bigint | null;
    },
  >(beneficiaryUserId: string, events: T[]) {
    const annotated = await Promise.all(
      events.map(async (event, index) => ({
        event,
        index,
        inLineage: await this.isWithinPlacementSubtree(
          beneficiaryUserId,
          event.sourceUserId.toString(),
        ),
      })),
    );

    return annotated
      .sort((left, right) => {
        if (left.inLineage !== right.inLineage) {
          return left.inLineage ? -1 : 1;
        }

        const leftId = Number(left.event.id);
        const rightId = Number(right.event.id);
        if (leftId !== rightId) {
          return leftId - rightId;
        }

        return left.index - right.index;
      })
      .map((entry) => entry.event);
  }

  async getMemberMatrixCycles(userId: string): Promise<MatrixCycleSummary[]> {
    return this.matrixRepository.getMemberMatrixCycles(userId);
  }

  async getMatrixSummary() {
    return this.matrixRepository.getMatrixSummary();
  }

  async listMatrixPayouts(filters?: {
    beneficiaryUserId?: string;
    sourceOrderId?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.matrixRepository.listMatrixPayouts(filters);
  }

  async requestMemberAutoOrder(
    userId: string,
  ): Promise<{
    cycleId: string;
    userId: string;
    matrixEventId: string;
    sourceBoardId: string;
    roundNo: number;
    autoOrderAmount: string;
    autoOrderPvAmount: string;
    reentryAmount?: string;
    reentryPvAmount?: string;
  }> {
    void userId;
    throw new Error(
      "ปิด auto order/reentry แบบเดิมไว้ก่อน จนกว่าจะรองรับ holdback และ pending_next_round_requirement ตามกติกาใหม่",
    );
  }

  async requestMemberReentry(
    userId: string,
  ): Promise<{
    cycleId: string;
    userId: string;
    matrixEventId: string;
    sourceBoardId: string;
    roundNo: number;
    autoOrderAmount: string;
    autoOrderPvAmount: string;
    reentryAmount?: string;
    reentryPvAmount?: string;
  }> {
    return this.requestMemberAutoOrder(userId);
  }

  async getMemberAutoOrderPreference(userId: string) {
    return this.membersService.getMatrixReentryPreference(userId);
  }

  async getMemberReentryPreference(userId: string) {
    return this.getMemberAutoOrderPreference(userId);
  }

  async updateMemberAutoOrderPreference(input: {
    userId: string;
    enabled: boolean;
  }) {
    const enabled = await this.membersService.updateMatrixReentryPreference(
      input.userId,
      input.enabled,
    );

    const openedAutoOrder = enabled
      ? await this.maybeOpenEligibleBoardOneNextRound(input.userId)
      : null;

    return {
      enabled,
      openedAutoOrder,
      openedReentry: openedAutoOrder
        ? {
            ...openedAutoOrder,
            reentryAmount: openedAutoOrder.autoOrderAmount,
            reentryPvAmount: openedAutoOrder.autoOrderPvAmount,
          }
        : null,
    };
  }

  async updateMemberReentryPreference(input: {
    userId: string;
    enabled: boolean;
  }) {
    return this.updateMemberAutoOrderPreference(input);
  }

  private async processAccumulationForBeneficiary(input: {
    beneficiaryUserId: string;
    sourceUserId: string;
    sourceOrderId: string;
    sourcePv: string;
    depthNo: number;
    sourceSettings: ReturnType<typeof parseMatrixSettingsSnapshot>;
  }): Promise<{
    payoutCount: number;
    completedCycleCount: number;
    openedAutoOrders: MatrixOrderProcessingResult["openedAutoOrders"];
    openedReentries: MatrixOrderProcessingResult["openedReentries"];
  }> {
    const cycle = await this.getActiveCycle(
      input.beneficiaryUserId,
    );
    if (!cycle) {
      return {
        payoutCount: 0,
        completedCycleCount: 0,
        openedAutoOrders: [],
        openedReentries: [],
      };
    }

    const boardLevelRates = this.parseBoardLevelRatesSnapshot(
      cycle.levelRatesSnapshot,
      cycle.boardCount,
      cycle.boardDepth,
    );
    const levelRates = this.parseLevelRatesSnapshot(cycle.levelRatesSnapshot);
    const creditedPv = input.sourcePv;
    const cycleId = cycle.id.toString();
    const isSourceMemberBoard = input.beneficiaryUserId === input.sourceUserId;
    const board = isSourceMemberBoard
      ? this.resolveOrderTargetBoard(cycle.boards, { allowLatestRound: true }) ??
        this.resolveCurrentBoard(
          cycle.boards,
          cycle.currentBoardNo,
          cycle.currentBoardRoundNo,
        ) ??
        this.resolveHighestPriorityOpenBoard(cycle.boards)
      : this.resolveOrderTargetBoard(cycle.boards);

    if (!board) {
      return {
        payoutCount: 0,
        completedCycleCount: 0,
        openedAutoOrders: [],
        openedReentries: [],
      };
    }

    await this.matrixRepository.addAccumulationToCycle(cycleId, creditedPv);
    await this.matrixRepository.addAccumulationToBoard(
      this.getBoardId(board),
      creditedPv,
    );

    if (isSourceMemberBoard) {
      return {
        payoutCount: 0,
        completedCycleCount: 0,
        openedAutoOrders: [],
        openedReentries: [],
      };
    }

    await this.matrixRepository.createAccumulationEvent({
      cycleId,
      boardId: this.getBoardId(board),
      sourceUserId: input.sourceUserId,
      sourceOrderId: input.sourceOrderId,
      sourceType: "ORDER",
      sourceRoundNo: board.roundNo,
      depthNo: input.depthNo,
      sourcePv: input.sourcePv,
      creditedPv,
    });

    const refreshedCycles = await this.matrixRepository.getMemberMatrixCycles(
      input.beneficiaryUserId,
    );
    const latestCycle = refreshedCycles[0];
    const targetBoard = latestCycle.boards.find(
      (entry) => this.getBoardId(entry) === this.getBoardId(board),
    );

    if (!targetBoard) {
      return {
        payoutCount: 0,
        completedCycleCount: 0,
        openedAutoOrders: [],
        openedReentries: [],
      };
    }

    if (targetBoard.status !== "open" || targetBoard.filledSlots >= targetBoard.slotCount) {
      return {
        payoutCount: 0,
        completedCycleCount: 0,
        openedAutoOrders: [],
        openedReentries: [],
      };
    }

    return this.flushPendingBoardPlacements({
      beneficiaryUserId: input.beneficiaryUserId,
      cycle: latestCycle,
      boardId: this.getBoardId(targetBoard),
    });
  }

  private async ensureQualifiedSourceCycle(
    userId: string,
    settings: ReturnType<typeof parseMatrixSettingsSnapshot>,
    options?: {
      personalCarryPv?: string;
    },
  ) {
    const existing = await this.getActiveCycle(userId);
    if (existing) {
      return existing;
    }

    return this.matrixRepository.createCycle({
      userId,
      cycleNo: ((await this.matrixRepository.getLatestCycle(userId))?.cycleNo || 0) + 1,
      boardWidth: settings.boardWidth,
      boardDepth: settings.boardDepth,
      boardDepths: settings.boardDepths,
      boardCount: settings.boardCount,
      organizationPvRate: settings.organizationPvRate,
      cwReentryAmount: settings.cwReentryAmount,
      personalCarryPv: options?.personalCarryPv ?? "0",
      levelRatesSnapshot: JSON.stringify(settings.boardLevelRates),
      boardOpenPvThresholds: settings.boardOpenPvThresholds,
    });
  }

  private async getActiveCycle(
    beneficiaryUserId: string,
  ) {
    const latestCycle = await this.matrixRepository.getLatestCycle(beneficiaryUserId);

    if (latestCycle && latestCycle.status === "ACTIVE") {
      return latestCycle;
    }

    return null;
  }

  private parseLevelRatesSnapshot(snapshot: string | string[]): string[] {
    if (Array.isArray(snapshot)) {
      return snapshot.filter((value): value is string => typeof value === "string");
    }
    try {
      const parsed = JSON.parse(snapshot);
      if (Array.isArray(parsed) && parsed.every((entry) => Array.isArray(entry))) {
        return parsed[0]?.filter((value) => typeof value === "string") ?? [];
      }
      return Array.isArray(parsed)
        ? parsed.filter((value) => typeof value === "string")
        : [];
    } catch {
      return [];
    }
  }

  private parseBoardLevelRatesSnapshot(
    snapshot: string | string[],
    boardCount: number,
    boardDepth: number,
  ): string[][] {
    if (Array.isArray(snapshot)) {
      return Array.from({ length: boardCount }, () =>
        snapshot.length > 0 ? [...snapshot] : Array.from({ length: boardDepth }, () => "0"),
      );
    }
    try {
      const parsed = JSON.parse(snapshot);
      if (Array.isArray(parsed) && parsed.every((entry) => Array.isArray(entry))) {
        return parsed.map((rates) =>
          rates.filter((value): value is string => typeof value === "string"),
        );
      }

      const fallback = Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [];
      return Array.from({ length: boardCount }, () =>
        fallback.length > 0 ? [...fallback] : Array.from({ length: boardDepth }, () => "0"),
      );
    } catch {
      return Array.from({ length: boardCount }, () =>
        Array.from({ length: boardDepth }, () => "0"),
      );
    }
  }

  private resolveBoardDepthsFromSnapshot(
    snapshot: string | string[],
    boardCount: number,
    fallbackDepth: number,
  ) {
    const boardLevelRates = this.parseBoardLevelRatesSnapshot(
      snapshot,
      boardCount,
      fallbackDepth,
    );

    return Array.from({ length: boardCount }, (_, index) =>
      boardLevelRates[index]?.length || fallbackDepth,
    );
  }

  private resolveCurrentBoard(
    boards: MatrixBoardLike[],
    boardNo: number,
    roundNo: number,
  ) {
    return boards.find(
      (entry) => entry.boardNo === boardNo && entry.roundNo === roundNo,
    );
  }

  private normalizeBoardStatus(status: string | null | undefined) {
    return (status || "").toLowerCase();
  }

  private resolveHighestPriorityOpenBoard(boards: MatrixBoardLike[]) {
    return [...boards]
      .filter((entry) => this.normalizeBoardStatus(entry.status) === "open")
      .sort((left, right) => {
        if (left.boardNo !== right.boardNo) {
          return left.boardNo - right.boardNo;
        }

        return right.roundNo - left.roundNo;
      })[0];
  }

  private resolveOrderTargetBoard(
    boards: MatrixBoardLike[],
    options?: {
      allowLatestRound?: boolean;
    },
  ) {
    return [...boards]
      .filter(
        (entry) =>
          entry.boardNo === 1 &&
          (options?.allowLatestRound ? true : entry.roundNo === 1) &&
          this.normalizeBoardStatus(entry.status) === "open",
      )
      .sort((left, right) => {
        return right.roundNo - left.roundNo;
      })[0];
  }

  private getBoardId(board: MatrixBoardLike): string {
    if (board.boardId) {
      return board.boardId;
    }

    if (board.id !== undefined) {
      return board.id.toString();
    }

    throw new Error("Matrix board id not found.");
  }

  private async maybeOpenBoardOneNextRound(
    cycle: MatrixCycleSummary,
    currentBoard: {
      boardId: string;
      boardNo: number;
      roundNo: number;
      openThresholdPv: string;
    },
  ): Promise<NonNullable<MatrixOrderProcessingResult["openedAutoOrders"]>[number] | null> {
    const runtimeSettings = this.resolveAutoOrderRuntimeSettings(
      cycle.organizationPvRate,
      cycle.cwReentryAmount,
    );
    const targetRoundNo = currentBoard.roundNo + 1;
    const holdbackAccount = await this.matrixRepository.getHoldbackAccount({
      userId: cycle.userId,
      boardNo: currentBoard.boardNo,
      targetRoundNo,
    });

    if (!holdbackAccount) {
      return null;
    }

    if (
      compareDecimalStrings(
        holdbackAccount.accumulatedAmount.toString(),
        holdbackAccount.targetAmount.toString(),
      ) < 0
    ) {
      return null;
    }

    if (holdbackAccount.status !== "CONSUMED") {
      await this.matrixRepository.markHoldbackAccountStatus(
        holdbackAccount.id.toString(),
        "TARGET_REACHED",
      );
    }

    const reorder = await this.matrixRepository.createOrGetPendingReorder({
      userId: cycle.userId,
      triggerBoardId: currentBoard.boardId,
      holdbackAccountId: holdbackAccount.id.toString(),
      requiredPv: runtimeSettings.reentryPvAmount,
    });

    if (reorder.status === "COMPLETED") {
      return null;
    }

    return {
      cycleId: cycle.cycleId,
      userId: cycle.userId,
      matrixEventId: reorder.id.toString(),
      reorderId: reorder.id.toString(),
      sourceBoardId: currentBoard.boardId,
      roundNo: targetRoundNo,
      autoOrderAmount: runtimeSettings.reentryFirmAmount,
      autoOrderPvAmount: runtimeSettings.reentryPvAmount,
    };
  }

  private async maybeOpenEligibleBoardOneNextRound(
    userId: string,
  ): Promise<NonNullable<MatrixOrderProcessingResult["openedAutoOrders"]>[number] | null> {
    const reentryEnabled = await this.membersService.getMatrixReentryPreference(userId);
    if (!reentryEnabled) {
      return null;
    }

    const cycles = await this.matrixRepository.getMemberMatrixCycles(userId);
    const cycle = cycles[0];

    if (!cycle || cycle.status !== "active") {
      return null;
    }

    const candidateBoard = [...(cycle.boards || [])]
      .filter((board) => board.boardNo === 1 && board.status === "completed")
      .sort((left, right) => right.roundNo - left.roundNo)
      .find((board) => {
        const nextRoundNo = board.roundNo + 1;
        return !(cycle.boards || []).some(
          (entry) => entry.boardNo === 1 && entry.roundNo === nextRoundNo,
        );
      });

    if (!candidateBoard) {
      return null;
    }

    return this.maybeOpenBoardOneNextRound(cycle, {
      boardId: this.getBoardId(candidateBoard),
      boardNo: candidateBoard.boardNo,
      roundNo: candidateBoard.roundNo,
      openThresholdPv: candidateBoard.openThresholdPv.toString(),
    });
  }

  private async placeSyntheticPointIntoBoard(input: {
    cycle: MatrixCycleLike;
    board: MatrixBoardLike;
    beneficiaryUserId: string;
    sourceUserId: string;
    sourcePv: string;
    creditedPv: string;
    sourceType: "REENTRY";
    sourceRoundNo: number;
    sourceOrderId: string | null;
  }) {
    const boardLevelRates = this.parseBoardLevelRatesSnapshot(
      input.cycle.levelRatesSnapshot,
      input.cycle.boardCount,
      input.cycle.boardDepth,
    );
    const levelRates = this.parseLevelRatesSnapshot(input.cycle.levelRatesSnapshot);
    const slotNo = input.board.filledSlots + 1;
    const levelNo = this.resolveLevelNo(slotNo, input.cycle.boardWidth, input.cycle.boardDepth);
    const parentSlotNo =
      levelNo === 1
        ? null
        : this.resolveParentSlotNo(slotNo, input.cycle.boardWidth, input.cycle.boardDepth);
    const rate =
      boardLevelRates[input.board.boardNo - 1]?.[levelNo - 1] ||
      levelRates[levelNo - 1] ||
      "0";
    const payoutAmount = multiplyDecimalStrings(input.creditedPv, rate);

    const cycleId = this.getCycleId(input.cycle);
    await this.matrixRepository.addAccumulationToCycle(cycleId, input.creditedPv);
    await this.matrixRepository.addAccumulationToBoard(this.getBoardId(input.board), input.creditedPv);
    await this.matrixRepository.createAccumulationEvent({
      cycleId,
      boardId: this.getBoardId(input.board),
      sourceUserId: input.sourceUserId,
      sourceOrderId: input.sourceOrderId,
      sourceType: input.sourceType,
      sourceRoundNo: input.sourceRoundNo,
      depthNo: 0,
      sourcePv: input.sourcePv,
      creditedPv: input.creditedPv,
    });

    const payout = await this.matrixRepository.createPositionAndPayout({
      cycleId,
      boardId: this.getBoardId(input.board),
      beneficiaryUserId: input.beneficiaryUserId,
      sourceUserId: input.sourceUserId,
      sourceOrderId: input.sourceOrderId,
      boardNo: input.board.boardNo,
      roundNo: input.board.roundNo,
      slotNo,
      levelNo,
      parentSlotNo,
      sourcePv: input.sourcePv,
      creditedPv: input.creditedPv,
      rate,
      payoutAmount,
      paidAmount: payoutAmount,
      holdbackAmount: "0",
    });

    await this.walletsService.postApprovedEarning({
      userId: input.beneficiaryUserId,
      refType: "matrix",
      refId: payout.payoutId,
      amount: payout.paidAmount,
      holdRequired: false,
      earningType: "matrix",
    });
  }

  private async resolveHoldbackPosting(input: {
    beneficiaryUserId: string;
    boardNo: number;
    roundNo: number;
    grossPayoutAmount: string;
    targetAmount: string;
  }): Promise<{
    paidAmount: string;
    holdbackAmount: string;
    holdbackAccountId: string | null;
  }> {
    if (input.boardNo !== 1) {
      return {
        paidAmount: input.grossPayoutAmount,
        holdbackAmount: "0",
        holdbackAccountId: null,
      };
    }

    const targetRoundNo = input.roundNo + 1;
    const account = await this.matrixRepository.getOrCreateHoldbackAccount({
      userId: input.beneficiaryUserId,
      boardNo: input.boardNo,
      targetRoundNo,
      targetAmount: input.targetAmount,
    });

    const currentAmount = account.accumulatedAmount.toString();
    const targetAmount = account.targetAmount.toString();
    const remainingAmount =
      compareDecimalStrings(targetAmount, currentAmount) > 0
        ? subtractDecimalStrings(targetAmount, currentAmount)
        : "0";

    if (compareDecimalStrings(remainingAmount, "0") <= 0) {
      if (account.status !== "TARGET_REACHED" && account.status !== "CONSUMED") {
        await this.matrixRepository.markHoldbackAccountStatus(
          account.id.toString(),
          "TARGET_REACHED",
        );
      }

      return {
        paidAmount: input.grossPayoutAmount,
        holdbackAmount: "0",
        holdbackAccountId: account.id.toString(),
      };
    }

    const holdbackCandidateAmount = multiplyDecimalStrings(
      input.grossPayoutAmount,
      "0.6",
    );
    const holdbackAmount =
      compareDecimalStrings(holdbackCandidateAmount, remainingAmount) > 0
        ? remainingAmount
        : holdbackCandidateAmount;
    const paidAmount = subtractDecimalStrings(input.grossPayoutAmount, holdbackAmount);

    if (compareDecimalStrings(holdbackAmount, "0") > 0) {
      const updated = await this.matrixRepository.applyHoldbackAmount(
        account.id.toString(),
        holdbackAmount,
      );

      if (
        compareDecimalStrings(
          updated.accumulatedAmount.toString(),
          updated.targetAmount.toString(),
        ) >= 0 &&
        updated.status !== "TARGET_REACHED" &&
        updated.status !== "CONSUMED"
      ) {
        await this.matrixRepository.markHoldbackAccountStatus(
          account.id.toString(),
          "TARGET_REACHED",
        );
      }
    }

    return {
      paidAmount,
      holdbackAmount,
      holdbackAccountId: account.id.toString(),
    };
  }

  private resolveLevelNo(slotNo: number, width: number, depth: number): number {
    let offset = 0;

    for (let level = 1; level <= depth; level += 1) {
      offset += width ** level;
      if (slotNo <= offset) {
        return level;
      }
    }

    return depth;
  }

  private resolveParentSlotNo(slotNo: number, width: number, depth: number): number | null {
    const levelNo = this.resolveLevelNo(slotNo, width, depth);

    if (levelNo <= 1) {
      return null;
    }

    const levelStart = this.getLevelStart(levelNo, width);
    const parentLevelStart = this.getLevelStart(levelNo - 1, width);
    const indexWithinLevel = slotNo - levelStart;

    return parentLevelStart + Math.floor(indexWithinLevel / width);
  }

  private getLevelStart(levelNo: number, width: number): number {
    let total = 1;

    for (let level = 1; level < levelNo; level += 1) {
      total += width ** level;
    }

    return total;
  }

  private resolveBoardDepthFromSlotCount(slotCount: number, width = 2): number {
    let total = 0;
    let depth = 0;

    while (total < slotCount) {
      depth += 1;
      total += width ** depth;
    }

    return depth;
  }

  private getCycleId(cycle: MatrixCycleLike): string {
    if (cycle.cycleId) {
      return cycle.cycleId;
    }

    if (cycle.id !== undefined) {
      return cycle.id.toString();
    }

    throw new Error("Matrix cycle id not found.");
  }

  private resolveAutoOrderRuntimeSettings(
    organizationPvRate: string,
    cwReentryAmount: string,
  ): { reentryFirmAmount: string; reentryPvAmount: string } {
    const runtimeSettings = readMatrixSettings();

    return {
      reentryFirmAmount:
        runtimeSettings.autoOrderFirmAmount ||
        runtimeSettings.reentryFirmAmount ||
        cwReentryAmount,
      reentryPvAmount:
        runtimeSettings.autoOrderPvAmount ||
        runtimeSettings.reentryPvAmount ||
        organizationPvRate,
    };
  }

  async completeMatrixReorder(input: { reorderId: string; orderId: string }): Promise<void> {
    const reorder = await this.matrixRepository.getMatrixReorder(input.reorderId);
    if (!reorder) {
      throw new Error("Matrix reorder not found.");
    }

    await this.matrixRepository.markReorderOrderCreated({
      reorderId: input.reorderId,
      orderId: input.orderId,
    });

    const nextRoundNo = reorder.holdbackAccount.targetRoundNo;
    const latestCycle = await this.matrixRepository.getLatestCycle(reorder.userId.toString());

    if (!latestCycle) {
      throw new Error("Matrix cycle not found for reorder completion.");
    }

    const existingNextBoard = latestCycle.boards.find(
      (board) => board.boardNo === 1 && board.roundNo === nextRoundNo,
    );

    if (!existingNextBoard) {
      await this.matrixRepository.createBoardRound({
        cycleId: latestCycle.id.toString(),
        boardNo: 1,
        roundNo: nextRoundNo,
        openThresholdPv: reorder.triggerBoard.openThresholdPv.toString(),
        boardWidth: latestCycle.boardWidth,
        boardDepth: latestCycle.boardDepth,
        boardDepths: this.resolveBoardDepthsFromSnapshot(
          latestCycle.levelRatesSnapshot,
          latestCycle.boardCount,
          latestCycle.boardDepth,
        ),
        reentrySourceBoardId: reorder.triggerBoardId.toString(),
      });
    }

    await this.matrixRepository.updateCurrentBoard(latestCycle.id.toString(), 1, nextRoundNo);
    await this.matrixRepository.markReorderCompleted(input.reorderId);
    await this.matrixRepository.markHoldbackAccountStatus(
      reorder.holdbackAccountId.toString(),
      "CONSUMED",
    );
  }
}
