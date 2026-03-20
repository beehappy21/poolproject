import {
  PayoutBatchDraftInput,
  PayoutBatchDraftResult,
  PayoutBatchReconciliationResult,
  PayoutBatchSubmissionResult,
  PayoutReservationInput,
  PayoutReservationResult,
  PayoutSelectionCandidate,
  PayoutSelectionResult,
} from "../domain/payouts.types";
import { PayoutsRepository } from "../repositories/payouts.repository";
import { RiskServiceContract } from "../../../risk/src/services/risk.service";
import { WalletsServiceContract } from "../../../wallets/src/services/wallets.service";

export interface PayoutsServiceContract {
  selectPayoutCandidates(
    candidates: PayoutSelectionCandidate[],
  ): Promise<PayoutSelectionResult>;

  reservePayoutItems(
    input: PayoutReservationInput,
  ): Promise<PayoutReservationResult>;

  releaseReservedPayoutItems(batchId: string): Promise<void>;

  createPayoutBatchDraft(input: {
    chainId: string;
    tokenAddress: string;
  }): Promise<PayoutBatchDraftResult>;

  buildPayoutBatchDraftInput(input: {
    chainId: string;
    tokenAddress: string;
    candidates: PayoutSelectionCandidate[];
  }): Promise<PayoutBatchDraftInput>;

  markBatchSubmitted(batchId: string): Promise<PayoutBatchSubmissionResult>;

  reconcileBatch(
    batchId: string,
    status: "confirmed" | "failed",
  ): Promise<PayoutBatchReconciliationResult>;
}

export class PayoutsService implements PayoutsServiceContract {
  constructor(
    private readonly payoutsRepository: PayoutsRepository,
    private readonly walletsService: WalletsServiceContract,
    private readonly riskService: RiskServiceContract,
  ) {}

  async selectPayoutCandidates(
    candidates: PayoutSelectionCandidate[],
  ): Promise<PayoutSelectionResult> {
    const selected: PayoutSelectionCandidate[] = [];
    const excluded: Array<{ refId: string; reasonCode: string }> = [];

    for (const candidate of candidates) {
      const riskDecision = await this.riskService.decidePayoutHold(
        candidate.userId,
      );

      if (
        candidate.holdStatus !== "none" ||
        candidate.payoutLockStatus !== "unlocked" ||
        riskDecision.placePayoutHold
      ) {
        excluded.push({
          refId: candidate.refId,
          reasonCode: "payout_hold_or_lock_active",
        });
        continue;
      }

      selected.push(candidate);
    }

    return { selected, excluded };
  }

  async reservePayoutItems(
    input: PayoutReservationInput,
  ): Promise<PayoutReservationResult> {
    let reservedItemCount = 0;

    for (const item of input.items) {
      const reservation = await this.walletsService.reserveBalanceForPayout({
        userId: item.userId,
        refType: item.refType,
        refId: item.refId,
        amount: item.amount,
      });

      if (reservation.reserved) {
        reservedItemCount += 1;
      }
    }

    return {
      batchId: input.batchId,
      reservedItemCount,
    };
  }

  async releaseReservedPayoutItems(batchId: string): Promise<void> {
    void batchId;
  }

  async createPayoutBatchDraft(input: {
    chainId: string;
    tokenAddress: string;
  }): Promise<PayoutBatchDraftResult> {
    const result = await this.payoutsRepository.createPayoutBatchDraft(input);

    return {
      batchId: result.batchId,
      status: "draft",
    };
  }

  async buildPayoutBatchDraftInput(input: {
    chainId: string;
    tokenAddress: string;
    candidates: PayoutSelectionCandidate[];
  }): Promise<PayoutBatchDraftInput> {
    const selection = await this.selectPayoutCandidates(input.candidates);

    return {
      chainId: input.chainId,
      tokenAddress: input.tokenAddress,
      items: selection.selected,
    };
  }

  async markBatchSubmitted(
    batchId: string,
  ): Promise<PayoutBatchSubmissionResult> {
    return {
      batchId,
      status: "submitted",
    };
  }

  async reconcileBatch(
    batchId: string,
    status: "confirmed" | "failed",
  ): Promise<PayoutBatchReconciliationResult> {
    if (status === "failed") {
      const candidates = await this.payoutsRepository.findPayoutSelectionCandidates();

      await Promise.all(
        candidates.map((candidate) =>
          this.walletsService.releaseReservedBalance({
            userId: candidate.userId,
            batchId,
          }),
        ),
      );

      return {
        batchId,
        status,
        releasedItemCount: candidates.length,
      };
    }

    return {
      batchId,
      status,
      releasedItemCount: 0,
    };
  }
}
