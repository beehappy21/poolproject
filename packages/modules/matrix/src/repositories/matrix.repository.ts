import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import {
  toDecimalString,
  toIdString,
  toIsoString,
} from "../../../../infrastructure/src/prisma/prisma.mappers";
import { MatrixCycleSummary } from "../domain/matrix.types";

function parseLevelRatesSnapshot(snapshot: string): string[] {
  try {
    const parsed = JSON.parse(snapshot);
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

@Injectable()
export class PrismaMatrixRepository {
  constructor(private readonly prisma: PrismaService) {}

  async hasAccumulationForOrder(orderId: string): Promise<boolean> {
    const count = await this.prisma.matrixAccumulationEvent.count({
      where: { sourceOrderId: BigInt(orderId) },
    });

    return count > 0;
  }

  async getLatestCycle(userId: string) {
    return this.prisma.matrixCycle.findFirst({
      where: { userId: BigInt(userId) },
      orderBy: [{ cycleNo: "desc" }],
      include: {
        boards: {
          orderBy: [{ boardNo: "asc" }],
          include: {
            positions: {
              orderBy: [{ levelNo: "asc" }, { slotNo: "asc" }],
              include: {
                sourceUser: {
                  select: {
                    memberCode: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createCycle(input: {
    userId: string;
    cycleNo: number;
    boardWidth: number;
    boardDepth: number;
    boardCount: number;
    organizationPvRate: string;
    cwReentryAmount: string;
    personalCarryPv?: string;
    levelRatesSnapshot: string;
    boardOpenPvThresholds: string[];
  }) {
    return this.prisma.matrixCycle.create({
      data: {
        userId: BigInt(input.userId),
        cycleNo: input.cycleNo,
        boardWidth: input.boardWidth,
        boardDepth: input.boardDepth,
        boardCount: input.boardCount,
        organizationPvRate: input.organizationPvRate,
        cwReentryAmount: input.cwReentryAmount,
        personalCarryPv: input.personalCarryPv ?? "0",
        levelRatesSnapshot: input.levelRatesSnapshot,
        currentBoardNo: 1,
        currentBoardRoundNo: 1,
        boards: {
          create: input.boardOpenPvThresholds.map((threshold, index) => ({
            boardNo: index + 1,
            roundNo: 1,
            openThresholdPv: threshold,
            slotCount: this.getSlotCountPerBoard(input.boardWidth, input.boardDepth),
            status: index === 0 ? "OPEN" : "LOCKED",
            openedAt: index === 0 ? new Date() : null,
          })),
        },
      },
      include: {
        boards: {
          orderBy: [{ boardNo: "asc" }],
          include: {
            positions: {
              orderBy: [{ levelNo: "asc" }, { slotNo: "asc" }],
              include: {
                sourceUser: {
                  select: {
                    memberCode: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async addAccumulationToCycle(cycleId: string, creditedPv: string) {
    return this.prisma.matrixCycle.update({
      where: { id: BigInt(cycleId) },
      data: {
        totalAccumulatedPv: {
          increment: creditedPv,
        },
      },
    });
  }

  async addPersonalCarryPv(cycleId: string, amount: string) {
    return this.prisma.matrixCycle.update({
      where: { id: BigInt(cycleId) },
      data: {
        personalCarryPv: {
          increment: amount,
        },
      },
    });
  }

  async addUserMatrixPersonalPv(userId: string, amount: string) {
    return this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        matrixPersonalPv: {
          increment: amount,
        },
      },
      select: {
        id: true,
        matrixPersonalPv: true,
      },
    });
  }

  async resetUserMatrixPersonalPv(userId: string) {
    return this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        matrixPersonalPv: "0",
      },
      select: {
        id: true,
        matrixPersonalPv: true,
      },
    });
  }

  async consumePersonalCarryPv(cycleId: string, amount: string) {
    return this.prisma.matrixCycle.update({
      where: { id: BigInt(cycleId) },
      data: {
        personalCarryPv: {
          decrement: amount,
        },
      },
    });
  }

  async addAccumulationToBoard(boardId: string, creditedPv: string) {
    return this.prisma.matrixBoard.update({
      where: { id: BigInt(boardId) },
      data: {
        accumulatedPv: {
          increment: creditedPv,
        },
      },
    });
  }

  async openBoard(boardId: string) {
    return this.prisma.matrixBoard.update({
      where: { id: BigInt(boardId) },
      data: {
        status: "OPEN",
        openedAt: new Date(),
      },
    });
  }

  async markBoardCompleted(boardId: string) {
    return this.prisma.matrixBoard.update({
      where: { id: BigInt(boardId) },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  async updateCurrentBoard(cycleId: string, boardNo: number, roundNo = 1) {
    return this.prisma.matrixCycle.update({
      where: { id: BigInt(cycleId) },
      data: { currentBoardNo: boardNo, currentBoardRoundNo: roundNo },
    });
  }

  async createBoardRound(input: {
    cycleId: string;
    boardNo: number;
    roundNo: number;
    openThresholdPv: string;
    boardWidth: number;
    boardDepth: number;
    reentrySourceBoardId?: string | null;
  }) {
    return this.prisma.matrixBoard.create({
      data: {
        cycleId: BigInt(input.cycleId),
        boardNo: input.boardNo,
        roundNo: input.roundNo,
        openThresholdPv: input.openThresholdPv,
        slotCount: this.getSlotCountPerBoard(input.boardWidth, input.boardDepth),
        status: "OPEN",
        openedAt: new Date(),
        reentrySourceBoardId: input.reentrySourceBoardId
          ? BigInt(input.reentrySourceBoardId)
          : null,
      },
    });
  }

  async markCycleCompleted(cycleId: string) {
    return this.prisma.matrixCycle.update({
      where: { id: BigInt(cycleId) },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        resetAt: new Date(),
      },
    });
  }

  async createAccumulationEvent(input: {
    cycleId: string;
    boardId?: string | null;
    sourceUserId: string;
    sourceOrderId?: string | null;
    sourceType?: "ORDER" | "REENTRY";
    sourceRoundNo?: number | null;
    depthNo: number;
    sourcePv: string;
    creditedPv: string;
  }) {
    return this.prisma.matrixAccumulationEvent.create({
      data: {
        cycleId: BigInt(input.cycleId),
        boardId: input.boardId ? BigInt(input.boardId) : null,
        sourceUserId: BigInt(input.sourceUserId),
        sourceOrderId: input.sourceOrderId ? BigInt(input.sourceOrderId) : null,
        sourceType: input.sourceType ?? "ORDER",
        sourceRoundNo: input.sourceRoundNo ?? null,
        depthNo: input.depthNo,
        sourcePv: input.sourcePv,
        creditedPv: input.creditedPv,
      },
    });
  }

  async createPositionAndPayout(input: {
    cycleId: string;
    boardId: string;
    beneficiaryUserId: string;
    sourceUserId: string;
    sourceOrderId?: string | null;
    boardNo: number;
    roundNo: number;
    slotNo: number;
    levelNo: number;
    parentSlotNo: number | null;
    sourcePv: string;
    creditedPv: string;
    rate: string;
    payoutAmount: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const position = await tx.matrixPosition.create({
        data: {
          boardId: BigInt(input.boardId),
          slotNo: input.slotNo,
          levelNo: input.levelNo,
          parentSlotNo: input.parentSlotNo,
          sourceUserId: BigInt(input.sourceUserId),
          sourceOrderId: input.sourceOrderId ? BigInt(input.sourceOrderId) : null,
          sourcePv: input.sourcePv,
          creditedPv: input.creditedPv,
          roundNo: input.roundNo,
          status: "FILLED",
        },
        select: { id: true },
      });

      await tx.matrixBoard.update({
        where: { id: BigInt(input.boardId) },
        data: {
          filledSlots: {
            increment: 1,
          },
        },
      });

      const payout = await tx.matrixPayout.create({
        data: {
          cycleId: BigInt(input.cycleId),
          boardId: BigInt(input.boardId),
          positionId: position.id,
          beneficiaryUserId: BigInt(input.beneficiaryUserId),
          sourceUserId: BigInt(input.sourceUserId),
          sourceOrderId: input.sourceOrderId ? BigInt(input.sourceOrderId) : null,
          boardNo: input.boardNo,
          roundNo: input.roundNo,
          levelNo: input.levelNo,
          rate: input.rate,
          basePv: input.sourcePv,
          payoutAmount: input.payoutAmount,
          status: "APPROVED",
        },
        select: { id: true },
      });

      return {
        positionId: toIdString(position.id),
        payoutId: toIdString(payout.id),
        payoutAmount: input.payoutAmount,
      };
    });
  }

  async getMemberMatrixCycles(userId: string): Promise<MatrixCycleSummary[]> {
    const cycles = await this.prisma.matrixCycle.findMany({
      where: { userId: BigInt(userId) },
      orderBy: [{ cycleNo: "desc" }],
      include: {
        boards: {
          orderBy: [{ boardNo: "asc" }],
          include: {
            positions: {
              orderBy: [{ levelNo: "asc" }, { slotNo: "asc" }],
              include: {
                sourceUser: {
                  select: {
                    memberCode: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return cycles.map((cycle) => ({
      cycleId: toIdString(cycle.id),
      userId: toIdString(cycle.userId),
      cycleNo: cycle.cycleNo,
      boardWidth: cycle.boardWidth,
      boardDepth: cycle.boardDepth,
      boardCount: cycle.boardCount,
      organizationPvRate: toDecimalString(cycle.organizationPvRate),
      cwReentryAmount: toDecimalString(cycle.cwReentryAmount),
      personalCarryPv: toDecimalString(cycle.personalCarryPv),
      levelRatesSnapshot: parseLevelRatesSnapshot(cycle.levelRatesSnapshot),
      totalAccumulatedPv: toDecimalString(cycle.totalAccumulatedPv),
      currentBoardNo: cycle.currentBoardNo,
      currentBoardRoundNo: cycle.currentBoardRoundNo,
      status: cycle.status.toLowerCase(),
      startedAt: toIsoString(cycle.startedAt),
      completedAt: cycle.completedAt ? toIsoString(cycle.completedAt) : null,
      boards: cycle.boards.map((board) => ({
        boardId: toIdString(board.id),
        boardNo: board.boardNo,
        roundNo: board.roundNo,
        slotCount: board.slotCount,
        filledSlots: board.filledSlots,
        openThresholdPv: toDecimalString(board.openThresholdPv),
        accumulatedPv: toDecimalString(board.accumulatedPv),
        status: board.status.toLowerCase(),
        openedAt: board.openedAt ? toIsoString(board.openedAt) : null,
        completedAt: board.completedAt ? toIsoString(board.completedAt) : null,
        positions: board.positions.map((position) => ({
          positionId: toIdString(position.id),
          slotNo: position.slotNo,
          levelNo: position.levelNo,
          roundNo: position.roundNo,
          parentSlotNo: position.parentSlotNo,
          sourceUserId: position.sourceUserId ? toIdString(position.sourceUserId) : null,
          sourceMemberCode: position.sourceUser?.memberCode ?? null,
          sourceMemberName: position.sourceUser?.name ?? null,
          sourcePv: toDecimalString(position.sourcePv),
          creditedPv: toDecimalString(position.creditedPv),
          status: position.status.toLowerCase(),
          assignedAt: toIsoString(position.assignedAt),
        })),
      })),
    }));
  }

  async getMatrixSummary() {
    const [cycleCount, activeCycleCount, payoutCount, payoutTotal, latestCycles] =
      await Promise.all([
        this.prisma.matrixCycle.count(),
        this.prisma.matrixCycle.count({ where: { status: "ACTIVE" } }),
        this.prisma.matrixPayout.count(),
        this.prisma.matrixPayout.aggregate({
          _sum: {
            payoutAmount: true,
          },
        }),
        this.prisma.matrixCycle.findMany({
          orderBy: [{ updatedAt: "desc" }],
          take: 12,
          include: {
            user: {
              select: {
                memberCode: true,
                name: true,
              },
            },
            boards: {
              orderBy: [{ boardNo: "asc" }],
            },
          },
        }),
      ]);

    return {
      cycleCount,
      activeCycleCount,
      payoutCount,
      payoutTotal: toDecimalString(payoutTotal._sum.payoutAmount),
      latestCycles: latestCycles.map((cycle) => ({
        cycleId: toIdString(cycle.id),
        userId: toIdString(cycle.userId),
        memberCode: cycle.user.memberCode,
        name: cycle.user.name,
        cycleNo: cycle.cycleNo,
        totalAccumulatedPv: toDecimalString(cycle.totalAccumulatedPv),
        currentBoardNo: cycle.currentBoardNo,
        status: cycle.status.toLowerCase(),
        boards: cycle.boards.map((board) => ({
          boardNo: board.boardNo,
          filledSlots: board.filledSlots,
          slotCount: board.slotCount,
          accumulatedPv: toDecimalString(board.accumulatedPv),
          openThresholdPv: toDecimalString(board.openThresholdPv),
          status: board.status.toLowerCase(),
        })),
      })),
    };
  }

  async listMatrixPayouts(filters?: {
    beneficiaryUserId?: string;
    sourceOrderId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where = {
      beneficiaryUserId: filters?.beneficiaryUserId
        ? BigInt(filters.beneficiaryUserId)
        : undefined,
      sourceOrderId: filters?.sourceOrderId ? BigInt(filters.sourceOrderId) : undefined,
    };
    const payouts = await this.prisma.matrixPayout.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip:
        filters?.page && filters?.pageSize
          ? (filters.page - 1) * filters.pageSize
          : undefined,
      take: filters?.pageSize ?? undefined,
      select: {
        id: true,
        cycleId: true,
        boardNo: true,
        levelNo: true,
        beneficiaryUserId: true,
        sourceUserId: true,
        sourceOrderId: true,
        rate: true,
        basePv: true,
        payoutAmount: true,
        status: true,
        createdAt: true,
      },
    });
    const items = payouts.map((payout) => ({
      payoutId: toIdString(payout.id),
      cycleId: toIdString(payout.cycleId),
      boardNo: payout.boardNo,
      levelNo: payout.levelNo,
      beneficiaryUserId: toIdString(payout.beneficiaryUserId),
      sourceUserId: payout.sourceUserId ? toIdString(payout.sourceUserId) : null,
      sourceOrderId: payout.sourceOrderId ? toIdString(payout.sourceOrderId) : null,
      rate: toDecimalString(payout.rate),
      basePv: toDecimalString(payout.basePv),
      amount: toDecimalString(payout.payoutAmount),
      status: payout.status.toLowerCase(),
      createdAt: toIsoString(payout.createdAt),
    }));

    if (!filters?.page || !filters?.pageSize) {
      return items;
    }

    const total = await this.prisma.matrixPayout.count({ where });

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  private getSlotCountPerBoard(width: number, depth: number): number {
    let total = 0;

    for (let level = 1; level <= depth; level += 1) {
      total += width ** level;
    }

    return total;
  }
}
