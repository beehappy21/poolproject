export interface MatrixBoardSummary {
  boardId: string;
  boardNo: number;
  roundNo: number;
  slotCount: number;
  filledSlots: number;
  openThresholdPv: string;
  accumulatedPv: string;
  status: string;
  openedAt: string | null;
  completedAt: string | null;
  positions?: MatrixPositionSummary[];
}

export interface MatrixPositionSummary {
  positionId: string;
  slotNo: number;
  levelNo: number;
  roundNo: number;
  parentSlotNo: number | null;
  sourceUserId: string | null;
  sourceMemberCode: string | null;
  sourceMemberName: string | null;
  sourcePv: string;
  creditedPv: string;
  status: string;
  assignedAt: string;
}

export interface MatrixCycleSummary {
  cycleId: string;
  userId: string;
  cycleNo: number;
  boardWidth: number;
  boardDepth: number;
  boardCount: number;
  organizationPvRate: string;
  autoOrderAmount?: string;
  cwReentryAmount: string;
  personalCarryPv: string;
  levelRatesSnapshot: string | string[];
  totalAccumulatedPv: string;
  currentBoardNo: number;
  currentBoardRoundNo: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  boards: MatrixBoardSummary[];
}

export interface MatrixOrderProcessingResult {
  orderId: string;
  sourceUserId: string;
  affectedMemberCount: number;
  payoutCount: number;
  completedCycleCount: number;
  skipped: boolean;
  openedAutoOrders: Array<{
    cycleId: string;
    userId: string;
    matrixEventId: string;
    reorderId?: string;
    sourceBoardId: string;
    roundNo: number;
    autoOrderAmount: string;
    autoOrderPvAmount: string;
  }>;
  openedReentries?: Array<{
    cycleId: string;
    userId: string;
    matrixEventId: string;
    sourceBoardId: string;
    roundNo: number;
    reentryAmount: string;
    reentryPvAmount: string;
  }>;
}
