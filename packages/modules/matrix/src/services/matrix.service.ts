import { Injectable } from "@nestjs/common";

import { MembersService } from "../../../members/src/services/members.service";
import { MembersServiceContract } from "../../../members/src/services/members.service";
import {
  addDecimalStrings,
  compareDecimalStrings,
  multiplyDecimalStrings,
} from "../../../../shared/utils/src/money.util";
import { readMatrixSettings } from "../../../../shared/utils/src/matrix-settings.util";
import { WalletsService } from "../../../wallets/src/services/wallets.service";
import { MatrixCycleSummary, MatrixOrderProcessingResult } from "../domain/matrix.types";
import { PrismaMatrixRepository } from "../repositories/matrix.repository";

export interface MatrixServiceContract {
  handleApprovedOrderMatrixSource(input: {
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
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

    const settings = readMatrixSettings();
    const creditedPv = multiplyDecimalStrings(
      input.totalPv,
      settings.organizationPvRate,
    );
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
        creditedPv,
        depthNo: index + 1,
        settings,
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
    creditedPv: string;
    depthNo: number;
    settings: ReturnType<typeof readMatrixSettings>;
  }): Promise<{ payoutCount: number; completedCycleCount: number }> {
    const cycle = await this.getOrCreateActiveCycle(
      input.beneficiaryUserId,
      input.settings,
    );
    const cycleId = cycle.id.toString();
    const board = cycle.boards.find((entry) => entry.boardNo === cycle.currentBoardNo);

    if (!board) {
      throw new Error("Matrix board not found.");
    }

    await this.matrixRepository.addAccumulationToCycle(cycleId, input.creditedPv);
    await this.matrixRepository.addAccumulationToBoard(
      board.id.toString(),
      input.creditedPv,
    );
    await this.matrixRepository.createAccumulationEvent({
      cycleId,
      boardId: board.id.toString(),
      sourceUserId: input.sourceUserId,
      sourceOrderId: input.sourceOrderId,
      depthNo: input.depthNo,
      sourcePv: input.sourcePv,
      creditedPv: input.creditedPv,
    });

    const refreshedCycles = await this.matrixRepository.getMemberMatrixCycles(
      input.beneficiaryUserId,
    );
    const latestCycle = refreshedCycles[0];
    const currentBoard = latestCycle.boards.find(
      (entry) => entry.boardNo === latestCycle.currentBoardNo,
    );

    if (!currentBoard) {
      return { payoutCount: 0, completedCycleCount: 0 };
    }

    if (
      currentBoard.status === "locked" &&
      compareDecimalStrings(
        latestCycle.totalAccumulatedPv,
        currentBoard.openThresholdPv,
      ) >= 0
    ) {
      await this.matrixRepository.openBoard(currentBoard.boardId);
      currentBoard.status = "open";
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
    const rate = input.settings.levelRates[levelNo - 1] || "0";
    const payoutAmount = multiplyDecimalStrings(input.sourcePv, rate);

    const payout = await this.matrixRepository.createPositionAndPayout({
      cycleId: latestCycle.cycleId,
      boardId: currentBoard.boardId,
      beneficiaryUserId: input.beneficiaryUserId,
      sourceUserId: input.sourceUserId,
      sourceOrderId: input.sourceOrderId,
      boardNo: currentBoard.boardNo,
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

    let completedCycleCount = 0;
    if (slotNo >= currentBoard.slotCount) {
      await this.matrixRepository.markBoardCompleted(currentBoard.boardId);

      if (currentBoard.boardNo >= latestCycle.boardCount) {
        await this.matrixRepository.markCycleCompleted(latestCycle.cycleId);
        completedCycleCount = 1;
      } else {
        const nextBoardNo = currentBoard.boardNo + 1;
        await this.matrixRepository.updateCurrentBoard(latestCycle.cycleId, nextBoardNo);
        const postUpdateCycles = await this.matrixRepository.getMemberMatrixCycles(
          input.beneficiaryUserId,
        );
        const nextCycle = postUpdateCycles[0];
        const nextBoard = nextCycle?.boards.find((entry) => entry.boardNo === nextBoardNo);

        if (
          nextBoard &&
          nextBoard.status === "locked" &&
          compareDecimalStrings(nextCycle.totalAccumulatedPv, nextBoard.openThresholdPv) >= 0
        ) {
          await this.matrixRepository.openBoard(nextBoard.boardId);
        }
      }
    }

    return {
      payoutCount: 1,
      completedCycleCount,
    };
  }

  private async getOrCreateActiveCycle(
    beneficiaryUserId: string,
    settings: ReturnType<typeof readMatrixSettings>,
  ) {
    const latestCycle = await this.matrixRepository.getLatestCycle(beneficiaryUserId);

    if (latestCycle && latestCycle.status === "ACTIVE") {
      return latestCycle;
    }

    return this.matrixRepository.createCycle({
      userId: beneficiaryUserId,
      cycleNo: (latestCycle?.cycleNo || 0) + 1,
      boardWidth: settings.boardWidth,
      boardDepth: settings.boardDepth,
      boardCount: settings.boardCount,
      organizationPvRate: settings.organizationPvRate,
      boardOpenPvThresholds: settings.boardOpenPvThresholds,
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
}
