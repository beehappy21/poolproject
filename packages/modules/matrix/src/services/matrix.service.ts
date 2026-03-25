import { Injectable } from "@nestjs/common";

import { MembersService } from "../../../members/src/services/members.service";
import { MembersServiceContract } from "../../../members/src/services/members.service";
import {
  addDecimalStrings,
  compareDecimalStrings,
  multiplyDecimalStrings,
} from "../../../../shared/utils/src/money.util";
import { parseMatrixSettingsSnapshot } from "../../../../shared/utils/src/matrix-settings.util";
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
};

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
}

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
      };
    }

    const settings = parseMatrixSettingsSnapshot(input.matrixSettingsSnapshot);
    const sourceCycleBeforeProcessing = await this.getActiveCycle(input.sourceUserId);
    const qualifiesBoardOne =
      compareDecimalStrings(input.totalPv, settings.organizationPvRate) >= 0;

    if (qualifiesBoardOne) {
      await this.ensureQualifiedSourceCycle(input.sourceUserId, settings);
    }

    const sourceCycle =
      (qualifiesBoardOne
        ? await this.getActiveCycle(input.sourceUserId)
        : sourceCycleBeforeProcessing) ?? null;

    if (sourceCycle) {
      await this.matrixRepository.addPersonalCarryPv(sourceCycle.id.toString(), input.totalPv);
    }

    if (!qualifiesBoardOne) {
      return {
        orderId: input.orderId,
        sourceUserId: input.sourceUserId,
        affectedMemberCount: 0,
        payoutCount: 0,
        completedCycleCount: 0,
        skipped: false,
      };
    }

    const uplineUserIds = await this.membersService.getUplineCandidateIds(
      input.sourceUserId,
      input.approvedAt,
    );

    let affectedMemberCount = 0;
    let payoutCount = 0;
    let completedCycleCount = 0;

    for (const [index, beneficiaryUserId] of uplineUserIds.entries()) {
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
    }

    return {
      orderId: input.orderId,
      sourceUserId: input.sourceUserId,
      affectedMemberCount,
      payoutCount,
      completedCycleCount,
      skipped: false,
    };
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

  private async processAccumulationForBeneficiary(input: {
    beneficiaryUserId: string;
    sourceUserId: string;
    sourceOrderId: string;
    sourcePv: string;
    depthNo: number;
    sourceSettings: ReturnType<typeof parseMatrixSettingsSnapshot>;
  }): Promise<{ payoutCount: number; completedCycleCount: number }> {
    const cycle = await this.getActiveCycle(
      input.beneficiaryUserId,
    );
    if (!cycle) {
      return { payoutCount: 0, completedCycleCount: 0 };
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
    const currentBoard =
      this.resolveCurrentBoard(
        latestCycle.boards,
        latestCycle.currentBoardNo,
        latestCycle.currentBoardRoundNo,
      ) ?? this.resolveHighestPriorityOpenBoard(latestCycle.boards);

    if (!currentBoard) {
      return { payoutCount: 0, completedCycleCount: 0 };
    }

    if (currentBoard.status !== "open" || currentBoard.filledSlots >= currentBoard.slotCount) {
      return { payoutCount: 0, completedCycleCount: 0 };
    }

    const slotNo = currentBoard.filledSlots + 1;
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
      boardLevelRates[currentBoard.boardNo - 1]?.[levelNo - 1] ||
      levelRates[levelNo - 1] ||
      "0";
    const payoutAmount = multiplyDecimalStrings(latestCycle.organizationPvRate, rate);

    const payout = await this.matrixRepository.createPositionAndPayout({
      cycleId: latestCycle.cycleId,
      boardId: this.getBoardId(currentBoard),
      beneficiaryUserId: input.beneficiaryUserId,
      sourceUserId: input.sourceUserId,
      sourceOrderId: input.sourceOrderId,
      boardNo: currentBoard.boardNo,
      roundNo: currentBoard.roundNo,
      slotNo,
      levelNo,
      parentSlotNo,
      sourcePv: input.sourcePv,
      creditedPv,
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

    let completedCycleCount = 0;
    if (slotNo >= currentBoard.slotCount) {
      await this.matrixRepository.markBoardCompleted(this.getBoardId(currentBoard));

      if (currentBoard.boardNo < latestCycle.boardCount) {
        const nextBoardNo = currentBoard.boardNo + 1;
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

        await this.matrixRepository.updateCurrentBoard(latestCycle.cycleId, nextBoardNo, 1);
      } else {
        await this.matrixRepository.markCycleCompleted(latestCycle.cycleId);
        completedCycleCount = 1;
      }

      if (currentBoard.boardNo === 1) {
        await this.maybeOpenBoardOneNextRound(latestCycle, {
          boardId: this.getBoardId(currentBoard),
          boardNo: currentBoard.boardNo,
          roundNo: currentBoard.roundNo,
          openThresholdPv: currentBoard.openThresholdPv.toString(),
        });
      }
    }

    return {
      payoutCount: 1,
      completedCycleCount,
    };
  }

  private async ensureQualifiedSourceCycle(
    userId: string,
    settings: ReturnType<typeof parseMatrixSettingsSnapshot>,
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

  private parseLevelRatesSnapshot(snapshot: string): string[] {
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
    snapshot: string,
    boardCount: number,
    boardDepth: number,
  ): string[][] {
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
  ) {
    const nextRoundNo = currentBoard.roundNo + 1;
    const existingNextRound = cycle.boards.find(
      (entry) => entry.boardNo === 1 && entry.roundNo === nextRoundNo,
    );

    if (existingNextRound) {
      await this.matrixRepository.updateCurrentBoard(cycle.cycleId, 1, nextRoundNo);
      return;
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

      await this.matrixRepository.createAccumulationEvent({
        cycleId: cycle.cycleId,
        boardId: nextBoard.id.toString(),
        sourceUserId: cycle.userId,
        sourceType: "REENTRY",
        sourceRoundNo: nextRoundNo,
        depthNo: 0,
        sourcePv: cycle.organizationPvRate,
        creditedPv: cycle.organizationPvRate,
      });

      await this.matrixRepository.updateCurrentBoard(cycle.cycleId, 1, nextRoundNo);
      return;
    }

    const wallet = await this.walletsService.getWalletSummary(cycle.userId);
    if (compareDecimalStrings(wallet.withdrawableBalance, cycle.cwReentryAmount) < 0) {
      return;
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

    const reentryEvent = await this.matrixRepository.createAccumulationEvent({
      cycleId: cycle.cycleId,
      boardId: nextBoard.id.toString(),
      sourceUserId: cycle.userId,
      sourceType: "REENTRY",
      sourceRoundNo: nextRoundNo,
      depthNo: 0,
      sourcePv: cycle.organizationPvRate,
      creditedPv: cycle.organizationPvRate,
    });

    await this.walletsService.creditFirmWalletFromMatrixReentry({
      userId: cycle.userId,
      matrixEventId: reentryEvent.id.toString(),
      amount: cycle.cwReentryAmount,
    });

    await this.matrixRepository.updateCurrentBoard(cycle.cycleId, 1, nextRoundNo);
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
}
