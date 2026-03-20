import { Injectable } from "@nestjs/common";

import {
  HoldDecisionResult,
  ManualReviewCaseSummary,
  RiskFlagDecisionInput,
} from "../domain/risk.types";

export interface RiskServiceContract {
  evaluateRiskFlags(input: RiskFlagDecisionInput): Promise<HoldDecisionResult>;

  openManualReviewCase(userId: string): Promise<ManualReviewCaseSummary>;

  decidePayoutHold(userId: string): Promise<HoldDecisionResult>;
}

@Injectable()
export class RiskService implements RiskServiceContract {
  async evaluateRiskFlags(
    input: RiskFlagDecisionInput,
  ): Promise<HoldDecisionResult> {
    return {
      userId: input.userId,
      placePayoutHold: false,
      holdReasonCode: null,
      manualReviewRequired: false,
    };
  }

  async openManualReviewCase(userId: string): Promise<ManualReviewCaseSummary> {
    return {
      reviewCaseId: `manual-review-${userId}`,
      caseType: "risk_review",
      status: "open",
    };
  }

  async decidePayoutHold(userId: string): Promise<HoldDecisionResult> {
    return {
      userId,
      placePayoutHold: false,
      holdReasonCode: null,
      manualReviewRequired: false,
    };
  }
}
