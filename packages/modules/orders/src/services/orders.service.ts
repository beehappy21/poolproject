import { Inject, Injectable, forwardRef } from "@nestjs/common";

export interface OrdersServiceContract {
  getApprovedOrder(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
  } | null>;

  listApprovedOrdersForPoolDate(poolDate: string): Promise<
    Array<{
      orderId: string;
      sourceUserId: string;
      approvedAt: string;
      totalPv: string;
    }>
  >;

  handleApprovedOrderEvent(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    approvalFinalInNormalFlow: true;
    includedInPoolFundingSource: true;
  }>;
}

import { ApprovedOrderCommissionFlowResult } from "../../../commissions/src/domain/commissions.types";
import { CommissionsService } from "../../../commissions/src/services/commissions.service";
import { CommissionsServiceContract } from "../../../commissions/src/services/commissions.service";
import { PoolService } from "../../../pool/src/services/pool.service";
import { PoolServiceContract } from "../../../pool/src/services/pool.service";
import { QualificationService } from "../../../qualification/src/services/qualification.service";
import { QualificationServiceContract } from "../../../qualification/src/services/qualification.service";
import { RiskService } from "../../../risk/src/services/risk.service";
import { RiskServiceContract } from "../../../risk/src/services/risk.service";
import { ApprovedOrderOrchestrationResult } from "../domain/orders.types";
import { PrismaOrdersRepository } from "../repositories/orders.repository";

@Injectable()
export class OrdersService implements OrdersServiceContract {
  constructor(
    private readonly ordersRepository: PrismaOrdersRepository,
    private readonly qualificationService: QualificationService,
    @Inject(forwardRef(() => CommissionsService))
    private readonly commissionsService: CommissionsService,
    @Inject(forwardRef(() => PoolService))
    private readonly poolService: PoolService,
    private readonly riskService: RiskService,
  ) {}

  async getApprovedOrder(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
  } | null> {
    return this.ordersRepository.findApprovedOrderById(orderId);
  }

  async listApprovedOrdersForPoolDate(poolDate: string): Promise<
    Array<{
      orderId: string;
      sourceUserId: string;
      approvedAt: string;
      totalPv: string;
    }>
  > {
    return this.ordersRepository.findApprovedOrdersForPoolDate(poolDate);
  }

  async handleApprovedOrderEvent(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    approvalFinalInNormalFlow: true;
    includedInPoolFundingSource: true;
  }> {
    const approvedOrder = await this.ordersRepository.findApprovedOrderById(
      orderId,
    );

    if (!approvedOrder) {
      throw new Error("Approved order not found.");
    }

    return {
      ...approvedOrder,
      approvalFinalInNormalFlow: true,
      includedInPoolFundingSource: true,
    };
  }

  async handleApprovedOrder(
    orderId: string,
  ): Promise<ApprovedOrderOrchestrationResult> {
    const approvedOrder = await this.handleApprovedOrderEvent(orderId);

    await this.qualificationService.evaluateMemberQualification({
      userId: approvedOrder.sourceUserId,
      evaluationAt: approvedOrder.approvedAt,
      cycles: [],
    });

    const commissionFlow =
      await this.commissionsService.handleApprovedOrderCommissionSource(orderId);

    await this.poolService.loadApprovedOrderFunding(
      approvedOrder.approvedAt.slice(0, 10),
    );

    const walletPostingInputs = await this.buildWalletPostingInputs(
      commissionFlow,
    );

    return {
      orderId: approvedOrder.orderId,
      sourceUserId: approvedOrder.sourceUserId,
      approvedAt: approvedOrder.approvedAt,
      approvalFinalInNormalFlow: true,
      poolContributionSource: "approved_orders_only",
      steps: [
        { step: "load_approved_order", status: "completed" },
        { step: "run_source_qualification", status: "completed" },
        { step: "build_commission_drafts", status: "completed" },
        { step: "register_pool_source", status: "completed" },
        { step: "prepare_wallet_postings", status: "completed" },
        { step: "evaluate_risk_holds", status: "completed" },
      ],
      commissionDrafts: {
        directStatus: commissionFlow.directDraft.finalization.commissionStatus,
        uniCount: commissionFlow.uniDrafts.length,
        hasFallback:
          commissionFlow.directDraft.finalization.commissionStatus ===
            "fallback" ||
          commissionFlow.uniDrafts.some(
            (draft) => draft.finalization.commissionStatus === "fallback",
          ),
      },
      walletPostingInputs,
    };
  }

  private async buildWalletPostingInputs(
    commissionFlow: ApprovedOrderCommissionFlowResult,
  ): Promise<ApprovedOrderOrchestrationResult["walletPostingInputs"]> {
    const drafts = [
      commissionFlow.directDraft,
      ...commissionFlow.uniDrafts,
    ].filter((draft) => draft.candidateUserId);

    const inputs: ApprovedOrderOrchestrationResult["walletPostingInputs"] = [];

    for (const draft of drafts) {
      const userId = draft.candidateUserId;

      if (!userId) {
        continue;
      }

      const holdDecision = await this.riskService.decidePayoutHold(userId);

      inputs.push({
        userId,
        refType: "commission",
        refId: draft.sourceOrderId,
        amount: "0",
        holdRequired:
          holdDecision.placePayoutHold ||
          draft.finalization.commissionStatus === "held" ||
          draft.finalization.commissionStatus === "fallback",
      });
    }

    return inputs;
  }
}
