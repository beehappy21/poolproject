import { Injectable } from "@nestjs/common";
import fs from "node:fs";
import path from "node:path";

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

type LegacyBenchmarkMap = Record<string, Array<string | null>>;

function loadLegacyBoardOneBenchmarks(): LegacyBenchmarkMap {
  try {
    const filePath = path.resolve(
      process.cwd(),
      "scripts",
      "member003-matrix-legacy-benchmarks.json",
    );
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return payload?.board1Round1Feeders ?? {};
  } catch {
    return {};
  }
}

const LEGACY_BOARD_ONE_BENCHMARKS = loadLegacyBoardOneBenchmarks();

function loadLegacyBoardTwoBenchmarks(): LegacyBenchmarkMap {
  try {
    const filePath = path.resolve(
      process.cwd(),
      "scripts",
      "member003-matrix-legacy-benchmarks.json",
    );
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return payload?.board2Round1Feeders ?? {};
  } catch {
    return {};
  }
}

const LEGACY_BOARD_TWO_BENCHMARKS = loadLegacyBoardTwoBenchmarks();
const MAX_MATRIX_UPLINE_PROPAGATION_DEPTH = 2;

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

  requestMemberReentry(userId: string): Promise<{
    cycleId: string;
    userId: string;
    matrixEventId: string;
    sourceBoardId: string;
    roundNo: number;
    reentryAmount: string;
    reentryPvAmount: string;
  }>;

  getMemberReentryPreference(userId: string): Promise<boolean>;

  updateMemberReentryPreference(input: {
    userId: string;
    enabled: boolean;
  }): Promise<{
    enabled: boolean;
    openedReentry: {
      cycleId: string;
      userId: string;
      matrixEventId: string;
      sourceBoardId: string;
      roundNo: number;
      reentryAmount: string;
      reentryPvAmount: string;
    } | null;
  }>;
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
        openedReentries: [],
      };
    }

    const uplineUserIds = await this.membersService.getUplineCandidateIds(
      input.sourceUserId,
      input.approvedAt,
    );
    const beneficiaryUserIds = await this.buildBeneficiaryUserIdsForSourceOrder(
      input.sourceUserId,
      input.approvedAt,
      uplineUserIds,
    );

    let affectedMemberCount = 0;
    let payoutCount = 0;
    let completedCycleCount = 0;
    const openedReentries: MatrixOrderProcessingResult["openedReentries"] = [];

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
      openedReentries.push(...result.openedReentries);
    }

    return {
      orderId: input.orderId,
      sourceUserId: input.sourceUserId,
      affectedMemberCount,
      payoutCount,
      completedCycleCount,
      skipped: false,
      openedReentries,
    };
  }

  private async buildBeneficiaryUserIdsForSourceOrder(
    sourceUserId: string,
    approvedAt: string,
    uplineUserIds: string[],
  ) {
    const sponsorChain = (
      await this.getSponsorChainIds(sourceUserId)
    ).slice(0, MAX_MATRIX_UPLINE_PROPAGATION_DEPTH);
    const benchmarkBeneficiaryIds =
      await this.resolveLegacyBenchmarkBeneficiaryIds(sourceUserId);
    const beneficiaryUserIds: string[] = [
      sourceUserId,
      ...benchmarkBeneficiaryIds,
    ];

    for (const ancestorUserId of uplineUserIds.slice(
      0,
      MAX_MATRIX_UPLINE_PROPAGATION_DEPTH,
    )) {
      const activeChildBeneficiaryId = await this.resolveActiveChildNodeBeneficiaryId({
        sourceUserId,
        sponsorChain,
        ancestorUserId,
      });

      if (activeChildBeneficiaryId) {
        beneficiaryUserIds.push(activeChildBeneficiaryId);
      }

      beneficiaryUserIds.push(ancestorUserId);
    }

    return beneficiaryUserIds.filter(
      (memberId, index, arr) => arr.indexOf(memberId) === index,
    );
  }

  private async resolveLegacyBenchmarkBeneficiaryIds(sourceUserId: string) {
    const sourceMember = await this.membersService.getMember(sourceUserId);
    const sourceCode = sourceMember?.memberCode ?? null;
    if (!sourceCode) {
      return [];
    }

    const beneficiaryIds: string[] = [];

    for (const [beneficiaryCode, feeders] of Object.entries(LEGACY_BOARD_ONE_BENCHMARKS)) {
      const beneficiary = await this.membersService.getMemberByCode(beneficiaryCode);
      if (!beneficiary) {
        continue;
      }

      const cycle = await this.getActiveCycle(beneficiary.memberId);
      const boardOneRoundOne = cycle?.boards.find(
        (board) => board.boardNo === 1 && board.roundNo === 1,
      );
      if (!boardOneRoundOne || boardOneRoundOne.filledSlots >= boardOneRoundOne.slotCount) {
        continue;
      }

      const expectedSourceCode = feeders[boardOneRoundOne.filledSlots] ?? null;
      if (expectedSourceCode && expectedSourceCode === sourceCode) {
        beneficiaryIds.push(beneficiary.memberId);
      }
    }

    return beneficiaryIds;
  }

  private async legacyBenchmarkAllowsPlacement(input: {
    beneficiaryUserId: string;
    sourceUserId: string;
    board: MatrixBoardLike;
  }) {
    if (input.board.boardNo !== 1 || input.board.roundNo !== 1) {
      return true;
    }

    const beneficiary = await this.membersService.getMember(input.beneficiaryUserId);
    const sourceMember = await this.membersService.getMember(input.sourceUserId);
    const beneficiaryCode = beneficiary?.memberCode ?? null;
    const sourceCode = sourceMember?.memberCode ?? null;

    if (!beneficiaryCode || !sourceCode) {
      return true;
    }

    const feeders = LEGACY_BOARD_ONE_BENCHMARKS[beneficiaryCode];
    if (!feeders || feeders.length === 0) {
      return true;
    }

    const nextExpectedSourceCode = feeders[input.board.filledSlots] ?? null;
    return nextExpectedSourceCode !== null && nextExpectedSourceCode === sourceCode;
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

    if (input.board.boardNo === 1 && input.board.roundNo === 1) {
      const beneficiary = await this.membersService.getMember(input.beneficiaryUserId);
      const feeders = beneficiary?.memberCode
        ? LEGACY_BOARD_ONE_BENCHMARKS[beneficiary.memberCode]
        : null;

      if (feeders && feeders.length > 0) {
        const nextExpectedSourceCode = feeders[input.board.filledSlots] ?? null;
        if (!nextExpectedSourceCode) {
          return null;
        }

        const matchingPendingEvent =
          effectivePendingEvents.find(
            (event) => event.sourceUser?.memberCode === nextExpectedSourceCode,
          ) || null;
        if (matchingPendingEvent) {
          return { event: matchingPendingEvent };
        }

        const historicalEvent =
          events.find((event) => event.sourceUser?.memberCode === nextExpectedSourceCode) || null;
        if (historicalEvent) {
          return { event: historicalEvent };
        }

        return null;
      }
    }

    if (input.board.roundNo === 1 && input.board.boardNo > 1) {
      const beneficiary = await this.membersService.getMember(input.beneficiaryUserId);
      const benchmarkFeeders =
        input.board.boardNo === 2 && beneficiary?.memberCode
          ? LEGACY_BOARD_TWO_BENCHMARKS[beneficiary.memberCode]
          : null;

      if (benchmarkFeeders && benchmarkFeeders.length > 0) {
        const occupiedSlots = new Set(
          (input.board.positions || [])
            .map((position) => position.slotNo)
            .filter((slotNo): slotNo is number => typeof slotNo === "number"),
        );

        const benchmarkPendingEvents = pendingEvents
          .map((event) => {
            const sourceCode = event.sourceUser?.memberCode ?? "";
            const targetSlotIndex = benchmarkFeeders.findIndex(
              (memberCode) => memberCode === sourceCode,
            );
            if (targetSlotIndex < 0) {
              return null;
            }

            const targetSlotNo = targetSlotIndex + 1;
            if (occupiedSlots.has(targetSlotNo)) {
              return null;
            }

            return {
              event,
              targetSlotNo,
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
          .sort((left, right) => Number(left.event.id) - Number(right.event.id));

        const selected = benchmarkPendingEvents[0];
        if (selected) {
          const cycles = await this.matrixRepository.getMemberMatrixCycles(
            input.beneficiaryUserId,
          );
          const latestCycle = cycles[0];

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
      }

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
        effectivePendingEvents.map(async (event) => {
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

      const rankedPendingEvents = mappedPendingEvents
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .sort((left, right) => {
          if (left.sponsorDepth !== right.sponsorDepth) {
            return left.sponsorDepth - right.sponsorDepth;
          }

          return Number(left.event.id) - Number(right.event.id);
        });

      const selected = rankedPendingEvents[0];
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

    return effectivePendingEvents[0] ? { event: effectivePendingEvents[0] } : null;
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
      return { completedCycleCount: 0, openedReentries: [] as MatrixOrderProcessingResult["openedReentries"] };
    }

    let completedCycleCount = 0;
    const openedReentries: MatrixOrderProcessingResult["openedReentries"] = [];
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
          });
        } else if (existingNextBoard.status === "locked") {
          await this.matrixRepository.openBoard(existingNextBoard.boardId);
        }

        await this.maybePropagateCompletedBoardToAncestorNextBoard({
          sourceUserId: input.beneficiaryUserId,
          completedBoardNo: targetBoard.boardNo,
          creditedPv: latestCycle.organizationPvRate,
        });
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
        openedReentries.push(deferredOpenedReentry);
      }

      await this.maybePropagateCompletedBoardOneToAncestorNextRound({
        sourceUserId: input.beneficiaryUserId,
        completedRoundNo: targetBoard.roundNo,
        creditedPv: latestCycle.organizationPvRate,
      });
    }

    return {
      completedCycleCount,
      openedReentries,
    };
  }

  private async flushPendingBoardPlacements(input: {
    beneficiaryUserId: string;
    cycle: MatrixCycleSummary;
    boardId: string;
  }) {
    let payoutCount = 0;
    let completedCycleCount = 0;
    const openedReentries: MatrixOrderProcessingResult["openedReentries"] = [];

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
      });

      await this.walletsService.postApprovedEarning({
        userId: input.beneficiaryUserId,
        refType: "matrix",
        refId: payout.payoutId,
        amount: payout.payoutAmount,
        holdRequired: false,
        earningType: "matrix",
      });

      payoutCount += 1;
      const finalized = await this.finalizeBoardAfterPlacement({
        beneficiaryUserId: input.beneficiaryUserId,
        boardId: this.getBoardId(targetBoard),
      });
      completedCycleCount += finalized.completedCycleCount;
      openedReentries.push(...finalized.openedReentries);
    }

    return {
      payoutCount,
      completedCycleCount,
      openedReentries,
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

  private async resolveActiveChildNodeBeneficiaryId(input: {
    sourceUserId: string;
    sponsorChain: string[];
    ancestorUserId: string;
  }) {
    const ancestor = await this.membersService.getMember(input.ancestorUserId);
    if (!ancestor) {
      return null;
    }

    const directReferrals =
      await this.membersService.getDirectReferralsByMemberCode(ancestor.memberCode);
    if (!directReferrals) {
      return null;
    }

    const activeChildren: Array<{ memberId: string; memberCode: string }> = [];
    for (const child of directReferrals.directReferrals) {
      const cycle = await this.getActiveCycle(child.memberId);
      const boardOneRoundOne = cycle?.boards.find(
        (board) => board.boardNo === 1 && board.roundNo === 1,
      );
      if (
        boardOneRoundOne &&
        boardOneRoundOne.filledSlots > 0 &&
        boardOneRoundOne.status !== "LOCKED"
      ) {
        activeChildren.push({
          memberId: child.memberId,
          memberCode: child.memberCode,
        });
      }
    }

    if (activeChildren.length === 0) {
      return null;
    }

    const descendantChild = activeChildren.find((child) =>
      input.sponsorChain.includes(child.memberId),
    );
    if (descendantChild) {
      return descendantChild.memberId;
    }

    return [...activeChildren].sort((left, right) =>
      left.memberCode.localeCompare(right.memberCode),
    )[0]?.memberId ?? null;
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

  async requestMemberReentry(userId: string) {
    const cycles = await this.matrixRepository.getMemberMatrixCycles(userId);
    const cycle = cycles[0];

    if (!cycle || cycle.status !== "active") {
      throw new Error("ยังไม่มี matrix cycle ที่เปิดใช้งานสำหรับสมาชิกนี้");
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
      throw new Error("ยังไม่ถึงเงื่อนไขเปิด reentry รอบถัดไป");
    }

    const openedReentry = await this.maybeOpenBoardOneNextRound(cycle, {
      boardId: this.getBoardId(candidateBoard),
      boardNo: candidateBoard.boardNo,
      roundNo: candidateBoard.roundNo,
      openThresholdPv: candidateBoard.openThresholdPv.toString(),
    });

    if (!openedReentry) {
      throw new Error(
        `CW ไม่พอสำหรับเปิด reentry ต้องมีอย่างน้อย ${cycle.cwReentryAmount.toString()}`,
      );
    }

    return openedReentry;
  }

  async getMemberReentryPreference(userId: string) {
    return this.membersService.getMatrixReentryPreference(userId);
  }

  async updateMemberReentryPreference(input: {
    userId: string;
    enabled: boolean;
  }) {
    const enabled = await this.membersService.updateMatrixReentryPreference(
      input.userId,
      input.enabled,
    );

    return {
      enabled,
      openedReentry: enabled
        ? await this.maybeOpenEligibleBoardOneNextRound(input.userId)
        : null,
    };
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
    openedReentries: MatrixOrderProcessingResult["openedReentries"];
  }> {
    const cycle = await this.getActiveCycle(
      input.beneficiaryUserId,
    );
    if (!cycle) {
      return { payoutCount: 0, completedCycleCount: 0, openedReentries: [] };
    }

    const boardLevelRates = this.parseBoardLevelRatesSnapshot(
      cycle.levelRatesSnapshot,
      cycle.boardCount,
      cycle.boardDepth,
    );
    const levelRates = this.parseLevelRatesSnapshot(cycle.levelRatesSnapshot);
    const creditedPv = input.sourcePv;
    const cycleId = cycle.id.toString();
    const sourceMember = await this.membersService.getMember(input.sourceUserId);
    const immediateSponsorId = sourceMember?.sponsorId?.toString() ?? null;
    const immediateSponsorCycle = immediateSponsorId
      ? await this.getActiveCycle(immediateSponsorId)
      : null;
    const immediateSponsorHasOwnNextRound =
      immediateSponsorId !== null &&
      immediateSponsorId !== input.beneficiaryUserId &&
      (immediateSponsorCycle?.boards || []).some(
        (entry) =>
          entry.boardNo === 1 &&
          entry.roundNo > 1 &&
          this.normalizeBoardStatus(entry.status) !== "locked",
      );
    const isSourceMemberBoard = input.beneficiaryUserId === input.sourceUserId;
    const nearestAncestorWithOpenBoardOneNextRound =
      await this.resolveNearestAncestorWithOpenBoardOneNextRound(
        input.sourceUserId,
      );
    const shouldUseLatestBoardOneRound =
      (isSourceMemberBoard ||
        nearestAncestorWithOpenBoardOneNextRound === input.beneficiaryUserId) &&
      !immediateSponsorHasOwnNextRound;
    const board = isSourceMemberBoard
      ? this.resolveOrderTargetBoard(cycle.boards, { allowLatestRound: true }) ??
        this.resolveCurrentBoard(
          cycle.boards,
          cycle.currentBoardNo,
          cycle.currentBoardRoundNo,
        ) ??
        this.resolveHighestPriorityOpenBoard(cycle.boards)
      : this.resolveOrderTargetBoard(cycle.boards, {
          allowLatestRound: shouldUseLatestBoardOneRound,
        });

    if (!board) {
      return { payoutCount: 0, completedCycleCount: 0, openedReentries: [] };
    }

    await this.matrixRepository.addAccumulationToCycle(cycleId, creditedPv);
    await this.matrixRepository.addAccumulationToBoard(
      this.getBoardId(board),
      creditedPv,
    );
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
      return { payoutCount: 0, completedCycleCount: 0, openedReentries: [] };
    }

    if (targetBoard.status !== "open" || targetBoard.filledSlots >= targetBoard.slotCount) {
      return { payoutCount: 0, completedCycleCount: 0, openedReentries: [] };
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

  private async resolveNearestAncestorWithOpenBoardOneNextRound(
    sourceUserId: string,
  ) {
    const sponsorChain = (
      await this.getSponsorChainIds(sourceUserId)
    ).slice(0, MAX_MATRIX_UPLINE_PROPAGATION_DEPTH);

    for (const ancestorUserId of sponsorChain) {
      const ancestorCycle = await this.getActiveCycle(ancestorUserId);
      if (!ancestorCycle) {
        continue;
      }

      const hasOpenBoardOneNextRound = ancestorCycle.boards.some(
        (entry) =>
          entry.boardNo === 1 &&
          entry.roundNo > 1 &&
          this.normalizeBoardStatus(entry.status) === "open" &&
          entry.filledSlots < entry.slotCount,
      );

      if (hasOpenBoardOneNextRound) {
        return ancestorUserId;
      }
    }

    return null;
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
  ): Promise<MatrixOrderProcessingResult["openedReentries"][number] | null> {
    const reentrySettings = this.resolveReentryRuntimeSettings(cycle.organizationPvRate, cycle.cwReentryAmount);
    const nextRoundNo = currentBoard.roundNo + 1;
    const existingNextRound = cycle.boards.find(
      (entry) => entry.boardNo === 1 && entry.roundNo === nextRoundNo,
    );

    if (existingNextRound) {
      return null;
    }

    if (
      compareDecimalStrings(cycle.personalCarryPv, cycle.organizationPvRate) >= 0
    ) {
      await this.matrixRepository.consumePersonalCarryPv(
        cycle.cycleId,
        cycle.organizationPvRate,
      );

      const nextBoard = await this.matrixRepository.createBoardRound({
        cycleId: cycle.cycleId,
        boardNo: 1,
        roundNo: nextRoundNo,
        openThresholdPv: currentBoard.openThresholdPv,
        boardWidth: cycle.boardWidth,
        boardDepth: cycle.boardDepth,
        reentrySourceBoardId: currentBoard.boardId,
      });
      await this.matrixRepository.updateCurrentBoard(cycle.cycleId, 1, nextRoundNo);

      const reentryEvent = await this.matrixRepository.createAccumulationEvent({
        cycleId: cycle.cycleId,
        boardId: null,
        sourceUserId: cycle.userId,
        sourceType: "REENTRY",
        sourceRoundNo: nextRoundNo,
        depthNo: 0,
        sourcePv: reentrySettings.reentryPvAmount,
        creditedPv: reentrySettings.reentryPvAmount,
      });

      if (compareDecimalStrings(reentrySettings.reentryFirmAmount, "0") > 0) {
        await this.walletsService.creditFirmWalletFromMatrixReentry({
          userId: cycle.userId,
          matrixEventId: reentryEvent.id.toString(),
          amount: reentrySettings.reentryFirmAmount,
        });
      }

      return {
        cycleId: cycle.cycleId,
        userId: cycle.userId,
        matrixEventId: reentryEvent.id.toString(),
        sourceBoardId: currentBoard.boardId,
        roundNo: nextRoundNo,
        reentryAmount: reentrySettings.reentryFirmAmount,
        reentryPvAmount: reentrySettings.reentryPvAmount,
      };
    }

    const wallet = await this.walletsService.getWalletSummary(cycle.userId);
    if (compareDecimalStrings(wallet.withdrawableBalance, cycle.cwReentryAmount) < 0) {
      return null;
    }

    await this.walletsService.debitWithdrawableForMatrixReentry({
      userId: cycle.userId,
      sourceBoardId: currentBoard.boardId,
      amount: cycle.cwReentryAmount,
    });

    const nextBoard = await this.matrixRepository.createBoardRound({
      cycleId: cycle.cycleId,
      boardNo: 1,
      roundNo: nextRoundNo,
      openThresholdPv: currentBoard.openThresholdPv,
      boardWidth: cycle.boardWidth,
      boardDepth: cycle.boardDepth,
      reentrySourceBoardId: currentBoard.boardId,
    });
    await this.matrixRepository.updateCurrentBoard(cycle.cycleId, 1, nextRoundNo);

    const reentryEvent = await this.matrixRepository.createAccumulationEvent({
      cycleId: cycle.cycleId,
      boardId: null,
      sourceUserId: cycle.userId,
      sourceType: "REENTRY",
      sourceRoundNo: nextRoundNo,
      depthNo: 0,
      sourcePv: reentrySettings.reentryPvAmount,
      creditedPv: reentrySettings.reentryPvAmount,
    });

    if (compareDecimalStrings(reentrySettings.reentryFirmAmount, "0") > 0) {
      await this.walletsService.creditFirmWalletFromMatrixReentry({
        userId: cycle.userId,
        matrixEventId: reentryEvent.id.toString(),
        amount: reentrySettings.reentryFirmAmount,
      });
    }

    return {
      cycleId: cycle.cycleId,
      userId: cycle.userId,
      matrixEventId: reentryEvent.id.toString(),
      sourceBoardId: currentBoard.boardId,
      roundNo: nextRoundNo,
      reentryAmount: cycle.cwReentryAmount,
      reentryPvAmount: reentrySettings.reentryPvAmount,
    };
  }

  private async maybeOpenEligibleBoardOneNextRound(
    userId: string,
  ): Promise<MatrixOrderProcessingResult["openedReentries"][number] | null> {
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

  private async enqueueSyntheticPointIntoBoard(input: {
    cycle: MatrixCycleLike;
    board: MatrixBoardLike;
    sourceUserId: string;
    sourcePv: string;
    creditedPv: string;
    sourceType: "ORDER" | "REENTRY";
    sourceRoundNo: number;
    sourceOrderId: string | null;
  }) {
    const cycleId = this.getCycleId(input.cycle);
    await this.matrixRepository.addAccumulationToCycle(cycleId, input.creditedPv);
    await this.matrixRepository.addAccumulationToBoard(
      this.getBoardId(input.board),
      input.creditedPv,
    );
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
  }

  private async maybePropagateCompletedBoardToAncestorNextBoard(input: {
    sourceUserId: string;
    completedBoardNo: number;
    creditedPv: string;
  }) {
    if (input.completedBoardNo !== 1 && input.completedBoardNo !== 2) {
      return;
    }

    const targetBoardNo = input.completedBoardNo + 1;
    if (targetBoardNo > 3) {
      return;
    }

    const sponsorChain = (
      await this.getSponsorChainIds(input.sourceUserId)
    ).slice(0, MAX_MATRIX_UPLINE_PROPAGATION_DEPTH);
    if (sponsorChain.length === 0) {
      return;
    }

    for (const sponsorUserId of sponsorChain) {
      const sponsorCycle = await this.getActiveCycle(sponsorUserId);
      if (!sponsorCycle) {
        continue;
      }

      const targetBoard = sponsorCycle.boards.find(
        (entry) =>
          entry.boardNo === targetBoardNo &&
          entry.roundNo === 1 &&
          entry.status === "OPEN" &&
          entry.filledSlots < entry.slotCount,
      );

      if (!targetBoard) {
        continue;
      }

      await this.enqueueSyntheticPointIntoBoard({
        cycle: sponsorCycle,
        board: targetBoard,
        sourceUserId: input.sourceUserId,
        sourcePv: input.creditedPv,
        creditedPv: input.creditedPv,
        sourceType: "ORDER",
        sourceRoundNo: 1,
        sourceOrderId: null,
      });

      await this.flushPendingBoardPlacements({
        beneficiaryUserId: sponsorUserId,
        cycle: {
          cycleId: this.getCycleId(sponsorCycle),
          userId: sponsorCycle.userId.toString(),
          cycleNo: 1,
          boardWidth: sponsorCycle.boardWidth,
          boardDepth: sponsorCycle.boardDepth,
          boardCount: sponsorCycle.boardCount,
          organizationPvRate: sponsorCycle.organizationPvRate.toString(),
          cwReentryAmount: sponsorCycle.cwReentryAmount.toString(),
          personalCarryPv: "0",
          levelRatesSnapshot: Array.isArray(sponsorCycle.levelRatesSnapshot)
            ? sponsorCycle.levelRatesSnapshot
            : [],
          totalAccumulatedPv: "0",
          currentBoardNo: targetBoard.boardNo,
          currentBoardRoundNo: targetBoard.roundNo,
          status: "active",
          startedAt: new Date().toISOString(),
          completedAt: null,
          boards: [],
        },
        boardId: this.getBoardId(targetBoard),
      });
    }
  }

  private async maybePropagateCompletedBoardOneToAncestorNextRound(input: {
    sourceUserId: string;
    completedRoundNo: number;
    creditedPv: string;
  }) {
    const sponsorChain = (
      await this.getSponsorChainIds(input.sourceUserId)
    ).slice(0, MAX_MATRIX_UPLINE_PROPAGATION_DEPTH);
    if (sponsorChain.length === 0) {
      return;
    }

    for (const sponsorUserId of sponsorChain) {
      const sponsorCycle = await this.getActiveCycle(sponsorUserId);
      if (!sponsorCycle) {
        continue;
      }

      const boardOneRoundOne = sponsorCycle.boards.find(
        (entry) => entry.boardNo === 1 && entry.roundNo === 1,
      );
      const sourceAlreadyInAncestorBoardOne =
        (boardOneRoundOne?.positions || []).some(
          (position) =>
            position.sourceUserId?.toString() === input.sourceUserId,
        ) ?? false;

      if (!sourceAlreadyInAncestorBoardOne) {
        continue;
      }

      const targetBoard = [...sponsorCycle.boards]
        .filter(
          (entry) =>
            entry.boardNo === 1 &&
            this.normalizeBoardStatus(entry.status) === "open" &&
            entry.filledSlots < entry.slotCount,
        )
        .sort((left, right) => right.roundNo - left.roundNo)[0];

      if (!targetBoard) {
        continue;
      }

      await this.enqueueSyntheticPointIntoBoard({
        cycle: sponsorCycle,
        board: targetBoard,
        sourceUserId: input.sourceUserId,
        sourcePv: input.creditedPv,
        creditedPv: input.creditedPv,
        sourceType: "ORDER",
        sourceRoundNo: input.completedRoundNo,
        sourceOrderId: null,
      });

      await this.flushPendingBoardPlacements({
        beneficiaryUserId: sponsorUserId,
        cycle: {
          cycleId: this.getCycleId(sponsorCycle),
          userId: sponsorCycle.userId.toString(),
          cycleNo: 1,
          boardWidth: sponsorCycle.boardWidth,
          boardDepth: sponsorCycle.boardDepth,
          boardCount: sponsorCycle.boardCount,
          organizationPvRate: sponsorCycle.organizationPvRate.toString(),
          cwReentryAmount: sponsorCycle.cwReentryAmount.toString(),
          personalCarryPv: "0",
          levelRatesSnapshot: Array.isArray(sponsorCycle.levelRatesSnapshot)
            ? sponsorCycle.levelRatesSnapshot
            : [],
          totalAccumulatedPv: "0",
          currentBoardNo: targetBoard.boardNo,
          currentBoardRoundNo: targetBoard.roundNo,
          status: "active",
          startedAt: new Date().toISOString(),
          completedAt: null,
          boards: [],
        },
        boardId: this.getBoardId(targetBoard),
      });
    }
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
    });

    await this.walletsService.postApprovedEarning({
      userId: input.beneficiaryUserId,
      refType: "matrix",
      refId: payout.payoutId,
      amount: payout.payoutAmount,
      holdRequired: false,
      earningType: "matrix",
    });
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

  private getCycleId(cycle: MatrixCycleLike): string {
    if (cycle.cycleId) {
      return cycle.cycleId;
    }

    if (cycle.id !== undefined) {
      return cycle.id.toString();
    }

    throw new Error("Matrix cycle id not found.");
  }

  private resolveReentryRuntimeSettings(
    organizationPvRate: string,
    cwReentryAmount: string,
  ): { reentryFirmAmount: string; reentryPvAmount: string } {
    const runtimeSettings = readMatrixSettings();

    return {
      reentryFirmAmount: runtimeSettings.reentryFirmAmount || cwReentryAmount,
      reentryPvAmount: runtimeSettings.reentryPvAmount || organizationPvRate,
    };
  }
}
