export interface MatrixBoardSummary {
  boardId: string;
  boardNo: number;
  slotCount: number;
  filledSlots: number;
  openThresholdPv: string;
  accumulatedPv: string;
  status: string;
  openedAt: string | null;
  completedAt: string | null;
}

export interface MatrixCycleSummary {
  cycleId: string;
  userId: string;
  cycleNo: number;
  boardWidth: number;
  boardDepth: number;
  boardCount: number;
  organizationPvRate: string;
  levelRatesSnapshot: string[];
  totalAccumulatedPv: string;
  currentBoardNo: number;
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
}
