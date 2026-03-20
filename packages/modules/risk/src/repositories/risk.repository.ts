import {
  HoldDecisionResult,
  ManualReviewCaseSummary,
  RiskFlagDecisionInput,
} from "../domain/risk.types";

export interface RiskRepository {
  findOpenRiskFlags(input: RiskFlagDecisionInput): Promise<
    Array<{
      riskFlagId: string;
      flagType: string;
      severity: "low" | "medium" | "high" | "critical";
    }>
  >;

  saveHoldDecision(
    userId: string,
    result: HoldDecisionResult,
  ): Promise<void>;

  createManualReviewCase(userId: string): Promise<ManualReviewCaseSummary>;
}
