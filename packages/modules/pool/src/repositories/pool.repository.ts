import {
  PoolEligibilityDecision,
  PoolEligibilityMemberSnapshot,
  PoolFundingResult,
} from "../domain/pool.types";

export interface PoolRepository {
  findApprovedOrderFunding(poolDate: string): Promise<{
    approvedOrderCount: number;
    fundingTotalApprovedPv: string;
  }>;

  createOrUpdatePoolCycle(input: PoolFundingResult): Promise<{ poolCycleId: string }>;

  saveEligibilitySnapshots(
    poolDate: string,
    decisions: PoolEligibilityDecision[],
    snapshots: PoolEligibilityMemberSnapshot[],
  ): Promise<void>;

  createPoolPayoutDrafts(input: {
    poolCycleId: string;
    payoutPerMember: string;
    eligibleUserIds: string[];
  }): Promise<void>;
}
