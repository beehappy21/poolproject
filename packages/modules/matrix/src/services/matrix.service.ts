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
    const sponsorChain = await this.getSponsorChainIds(sourceUserId);
    const benchmarkBeneficiaryIds =
      await this.resolveLegacyBenchmarkBeneficiaryIds(sourceUserId);
    const beneficiaryUserIds: string[] = [
      sourceUserId,
      ...benchmarkBeneficiaryIds,
    ];

    for (const ancestorUserId of uplineUserIds) {
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
  }) {
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
          pendingEvents.find(
            (event) => event.sourceUser?.memberCode === nextExpectedSourceCode,
          ) || null;
        if (matchingPendingEvent) {
          return matchingPendingEvent;
        }

        const historicalEvent =
          events.find((event) => event.sourceUser?.memberCode === nextExpectedSourceCode) || null;
        if (historicalEvent) {
          return historicalEvent;
        }

        return null;
      }
    }

    return pendingEvents[0] || null;
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
      } else {
        await this.matrixRepository.markCycleCompleted(latestCycle.cycleId);
        completedCycleCount = 1;
      }

      if (targetBoard.boardNo === 1 && targetBoard.roundNo >= 2) {
        await this.maybeSpillCompletedReentryRoundToOwnNextBoard(
          latestCycle,
          {
            boardId: this.getBoardId(targetBoard),
            boardNo: targetBoard.boardNo,
            roundNo: targetBoard.roundNo,
            openThresholdPv: targetBoard.openThresholdPv.toString(),
          },
        );
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
        await this.maybePromoteOpenedReentryToUplineSameRound(
          input.beneficiaryUserId,
          deferredOpenedReentry.roundNo,
          deferredOpenedReentry.matrixEventId,
          this.resolveReentryRuntimeSettings(
            latestCycle.organizationPvRate.toString(),
            latestCycle.cwReentryAmount.toString(),
          ).reentryPvAmount,
        );
      }
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

      const nextEvent = await this.resolveNextPendingBoardEvent({
        beneficiaryUserId: input.beneficiaryUserId,
        board: targetBoard,
      });

      if (!nextEvent) {
        break;
      }

      const boardLevelRates = this.parseBoardLevelRatesSnapshot(
        latestCycle.levelRatesSnapshot,
        latestCycle.boardCount,
        latestCycle.boardDepth,
      );
      const levelRates = this.parseLevelRatesSnapshot(latestCycle.levelRatesSnapshot);
      const slotNo = targetBoard.filledSlots + 1;
      const levelNo = this.resolveLevelNo(
        slotNo,
        latestCycle.boardWidth,
        latestCycle.boardDepth,
      );
      const parentSlotNo =
        levelNo === 1
          ? null
          : this.resolveParentSlotNo(slotNo, latestCycle.boardWidth, latestCycle.boardDepth);
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
    const board =
      this.resolveOrderTargetBoard(cycle.boards) ??
      this.resolveCurrentBoard(cycle.boards, cycle.currentBoardNo, cycle.currentBoardRoundNo) ??
      this.resolveHighestPriorityOpenBoard(cycle.boards);

    if (!board) {
      throw new Error("Matrix board not found.");
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

  private resolveHighestPriorityOpenBoard(boards: MatrixBoardLike[]) {
    return [...boards]
      .filter((entry) => entry.status === "open")
      .sort((left, right) => {
        if (left.boardNo !== right.boardNo) {
          return left.boardNo - right.boardNo;
        }

        return right.roundNo - left.roundNo;
      })[0];
  }

  private resolveOrderTargetBoard(boards: MatrixBoardLike[]) {
    return [...boards]
      .filter(
        (entry) => entry.roundNo === 1 && entry.status === "open",
      )
      .sort((left, right) => {
        if (left.boardNo !== right.boardNo) {
          return left.boardNo - right.boardNo;
        }

        return left.roundNo - right.roundNo;
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
        boardId: nextBoard.id.toString(),
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
      boardId: nextBoard.id.toString(),
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

  private async maybePromoteOpenedReentryToUplineSameRound(
    userId: string,
    roundNo: number,
    matrixEventId: string,
    creditedPv: string,
  ) {
    const uplineUserIds = await this.membersService.getUplineCandidateIds(
      userId,
      new Date().toISOString(),
    );

    const directUplineUserId = uplineUserIds[0];
    if (!directUplineUserId) {
      return;
    }

    const uplineCycle = await this.getActiveCycle(directUplineUserId);
    if (!uplineCycle) {
      return;
    }

    const targetBoard = uplineCycle.boards.find(
      (entry) =>
        entry.boardNo === 1 &&
        entry.roundNo === roundNo &&
        entry.status === "OPEN" &&
        entry.filledSlots < entry.slotCount,
    );

    if (!targetBoard) {
      return;
    }

    await this.placeSyntheticPointIntoBoard({
      cycle: uplineCycle,
      board: targetBoard,
      beneficiaryUserId: directUplineUserId,
      sourceUserId: userId,
      sourcePv: creditedPv,
      creditedPv,
      sourceType: "REENTRY",
      sourceRoundNo: roundNo,
      sourceOrderId: null,
    });
  }

  private async maybeSpillCompletedReentryRoundToOwnNextBoard(
    cycle: MatrixCycleSummary,
    currentBoard: {
      boardId: string;
      boardNo: number;
      roundNo: number;
      openThresholdPv: string;
    },
  ) {
    const reentrySettings = this.resolveReentryRuntimeSettings(
      cycle.organizationPvRate.toString(),
      cycle.cwReentryAmount.toString(),
    );
    if (currentBoard.boardNo !== 1 || currentBoard.roundNo < 2) {
      return;
    }
    const targetBoardNo = currentBoard.roundNo;
    const targetBoard = cycle.boards.find(
      (entry) =>
        entry.boardNo === targetBoardNo &&
        entry.roundNo === 1 &&
          entry.status === "open" &&
          entry.filledSlots < entry.slotCount,
    );

    if (!targetBoard) {
      return;
    }

    await this.placeSyntheticPointIntoBoard({
      cycle,
      board: targetBoard,
      beneficiaryUserId: cycle.userId,
      sourceUserId: cycle.userId,
      sourcePv: reentrySettings.reentryPvAmount,
      creditedPv: reentrySettings.reentryPvAmount,
      sourceType: "REENTRY",
      sourceRoundNo: currentBoard.roundNo,
      sourceOrderId: null,
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
