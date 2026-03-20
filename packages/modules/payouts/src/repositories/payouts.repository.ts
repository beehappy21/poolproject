import {
  PayoutReservationInput,
  PayoutSelectionCandidate,
} from "../domain/payouts.types";

export interface PayoutsRepository {
  findPayoutSelectionCandidates(): Promise<PayoutSelectionCandidate[]>;

  createPayoutBatchDraft(input: {
    chainId: string;
    tokenAddress: string;
  }): Promise<{ batchId: string }>;

  reservePayoutItems(input: PayoutReservationInput): Promise<void>;
}
