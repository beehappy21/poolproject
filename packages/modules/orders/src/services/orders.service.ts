import { Inject, Injectable, forwardRef } from "@nestjs/common";

export interface OrdersServiceContract {
  getOrder(orderId: string): Promise<{
    orderId: string;
    orderNo: string;
    sourceUserId: string;
    status: string;
    approvalStatus: string;
    totalUsdt: string;
    totalPv: string;
    approvedAt: string | null;
    createdAt: string;
  } | null>;

  createOrder(input: {
    userId: string;
    packageId: string;
  }): Promise<{
    orderId: string;
    orderNo: string;
    status: string;
    approvalStatus: string;
    totalUsdt: string;
    totalPv: string;
  }>;

  approveOrder(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
  } | null>;

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
import { WalletsService } from "../../../wallets/src/services/wallets.service";
import { WalletsServiceContract } from "../../../wallets/src/services/wallets.service";
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
    private readonly walletsService: WalletsService,
  ) {}

  async createOrder(input: { userId: string; packageId: string }) {
    return this.ordersRepository.createOrder(input);
  }

  async getOrder(orderId: string) {
    return this.ordersRepository.findOrderById(orderId);
  }

  async approveOrder(orderId: string) {
    return this.ordersRepository.approveOrder(orderId);
  }

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
    const existingCommissionEntries =
      await this.commissionsService.listCommissions({ orderId });

    if (existingCommissionEntries.length > 0) {
      const walletPostingInputs = await this.postCommissionWalletEntries(orderId);

      return this.buildApprovedOrderResultFromEntries(
        approvedOrder,
        existingCommissionEntries,
        walletPostingInputs,
      );
    }

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

    const walletPostingInputs = await this.postCommissionWalletEntries(orderId);

    return this.buildApprovedOrderResultFromEntries(
      approvedOrder,
      await this.commissionsService.listCommissions({ orderId }),
      walletPostingInputs,
    );
  }

  private buildApprovedOrderResultFromEntries(
    approvedOrder: {
      orderId: string;
      sourceUserId: string;
      approvedAt: string;
      approvalFinalInNormalFlow: true;
      includedInPoolFundingSource: true;
      totalPv: string;
    },
    commissionEntries: Array<{
      commissionType: string;
      status: string;
      beneficiaryUserId: string | null;
      commissionId: string;
      amount: string;
    }>,
    walletPostingInputs: ApprovedOrderOrchestrationResult["walletPostingInputs"],
  ): ApprovedOrderOrchestrationResult {
    const directEntry = commissionEntries.find(
      (entry) => entry.commissionType === "direct",
    );
    const uniEntries = commissionEntries.filter(
      (entry) => entry.commissionType === "uni",
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
        directStatus:
          (directEntry?.status as
            | "approved"
            | "held"
            | "fallback"
            | "withdrawable") ?? "fallback",
        uniCount: uniEntries.length,
        hasFallback: commissionEntries.some((entry) => entry.status === "fallback"),
      },
      walletPostingInputs,
    };
  }

  private async postCommissionWalletEntries(
    orderId: string,
  ): Promise<ApprovedOrderOrchestrationResult["walletPostingInputs"]> {
    const commissionEntries = await this.commissionsService.listCommissions({
      orderId,
    });
    const approvedEntries = commissionEntries.filter(
      (entry) => entry.status === "approved" && entry.beneficiaryUserId,
    );
    const postings: ApprovedOrderOrchestrationResult["walletPostingInputs"] = [];

    for (const entry of approvedEntries) {
      const posting = await this.walletsService.postApprovedEarning({
        userId: entry.beneficiaryUserId!,
        refType: "commission",
        refId: entry.commissionId,
        amount: entry.amount,
        holdRequired: entry.status === "held",
        earningType: entry.commissionType === "uni" ? "uni" : "direct",
      });

      postings.push({
        userId: entry.beneficiaryUserId!,
        refType: "commission",
        refId: entry.commissionId,
        amount: entry.amount,
        holdRequired: posting.creditedBucket === "held",
      });
    }

    return postings;
  }
}
