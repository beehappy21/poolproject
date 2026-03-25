import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { compareDecimalStrings } from "../../../../shared/utils/src/money.util";

export interface OrdersServiceContract {
  listOrders(filters?: {
    userId?: string;
    approvalStatus?: "pending" | "approved";
    bucket?:
      | "awaiting-payment"
      | "transfer-review"
      | "awaiting-shipment"
      | "shipped"
      | "delivered";
    orderNo?: string;
    page?: number;
    pageSize?: number;
  }): Promise<
    | Array<{
        orderId: string;
        orderNo: string;
        sourceUserId: string;
        status: string;
        approvalStatus: string;
        totalUsdt: string;
        totalPv: string;
        dcwAppliedUsdt: string;
        walletAppliedUsdt: string;
        cashDueUsdt: string;
        cashPaymentMethod: string | null;
        transferSubmittedAt: string | null;
        transferSlipUrl: string | null;
        transferSlipNote: string | null;
        approvedAt: string | null;
        shippedAt: string | null;
        deliveredAt: string | null;
        shipmentTrackingNo: string | null;
        shipmentCarrier: string | null;
        shipmentNote: string | null;
        fulfillmentMethod: "delivery" | "branch_pickup";
        pickupBranchName: string | null;
        pickupBranchNote: string | null;
        createdAt: string;
      }>
    | {
        items: Array<{
          orderId: string;
          orderNo: string;
          sourceUserId: string;
          status: string;
          approvalStatus: string;
          totalUsdt: string;
          totalPv: string;
          dcwAppliedUsdt: string;
          walletAppliedUsdt: string;
          cashDueUsdt: string;
          cashPaymentMethod: string | null;
          transferSubmittedAt: string | null;
          transferSlipUrl: string | null;
          transferSlipNote: string | null;
          approvedAt: string | null;
          shippedAt: string | null;
          deliveredAt: string | null;
          shipmentTrackingNo: string | null;
          shipmentCarrier: string | null;
          shipmentNote: string | null;
          fulfillmentMethod: "delivery" | "branch_pickup";
          pickupBranchName: string | null;
          pickupBranchNote: string | null;
          createdAt: string;
        }>;
        total: number;
        page: number;
        pageSize: number;
      }
  >;

  getOrder(orderId: string): Promise<{
    orderId: string;
    orderNo: string;
    sourceUserId: string;
    status: string;
    approvalStatus: string;
    totalUsdt: string;
    totalPv: string;
    dcwAppliedUsdt: string;
    walletAppliedUsdt: string;
    cashDueUsdt: string;
    cashPaymentMethod: string | null;
    transferSubmittedAt: string | null;
    transferSlipUrl: string | null;
    transferSlipNote: string | null;
    approvedAt: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    shipmentTrackingNo: string | null;
    shipmentCarrier: string | null;
    shipmentNote: string | null;
    fulfillmentMethod: "delivery" | "branch_pickup";
    pickupBranchName: string | null;
    pickupBranchNote: string | null;
    createdAt: string;
    items: Array<{
      orderItemId: string;
      packageId: string | null;
      packageCode: string | null;
      packageName: string | null;
      productDetailId: string | null;
      productCode: string | null;
      productName: string | null;
      productImageUrl: string | null;
      quantity: number;
      unitPriceUsdt: string;
      unitPv: string;
      lineTotalUsdt: string;
      lineTotalPv: string;
    }>;
    productItems: Array<{
      orderItemId: string;
      packageId: string | null;
      packageCode: string | null;
      packageName: string | null;
      productDetailId: string | null;
      productCode: string | null;
      productName: string | null;
      productImageUrl: string | null;
      quantity: number;
      unitPriceUsdt: string;
      unitPv: string;
      lineTotalUsdt: string;
      lineTotalPv: string;
    }>;
  } | null>;

  createOrder(input: {
    userId: string;
    packageId?: string;
    productDetailId?: string;
    quantity?: string;
    items?: Array<{
      packageId?: string;
      productDetailId?: string;
      quantity: string;
    }>;
    shippingAddressId?: string;
    fulfillmentMethod?: "delivery" | "branch_pickup";
    pickupBranchName?: string;
    pickupBranchNote?: string;
    pickupRecipientName?: string;
    pickupPhone?: string;
    pickupEmail?: string;
    discountWalletAmount?: string;
    shoppingWalletAmount?: string;
    firmWalletAmount?: string;
    cashPaymentMethod?: string;
  }): Promise<{
    orderId: string;
    orderNo: string;
    status: string;
    approvalStatus: string;
    totalUsdt: string;
    totalPv: string;
    dcwAppliedUsdt: string;
    walletAppliedUsdt: string;
    cashDueUsdt: string;
    cashPaymentMethod: string | null;
  }>;

  submitTransferSlip(input: {
    orderId: string;
    transferSlipUrl: string;
    transferSlipNote?: string;
  }): Promise<{
    orderId: string;
    status: string;
    approvalStatus: string;
    paidAt: string | null;
    transferSubmittedAt: string | null;
    transferSlipUrl: string | null;
    transferSlipNote: string | null;
  } | null>;

  markOrderShipped(input: {
    orderId: string;
    shipmentTrackingNo?: string;
    shipmentCarrier?: string;
    shipmentNote?: string;
  }): Promise<{
    orderId: string;
    status: string;
    approvalStatus: string;
    shippedAt: string | null;
    shipmentTrackingNo: string | null;
    shipmentCarrier: string | null;
    shipmentNote: string | null;
  } | null>;

  markOrderDelivered(input: {
    orderId: string;
    shipmentNote?: string;
  }): Promise<{
    orderId: string;
    status: string;
    approvalStatus: string;
    deliveredAt: string | null;
    shipmentNote: string | null;
  } | null>;

  approveOrder(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    commissionSettingsSnapshot: string | null;
    matrixSettingsSnapshot: string | null;
  } | null>;

  getApprovedOrder(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    commissionSettingsSnapshot: string | null;
    matrixSettingsSnapshot: string | null;
  } | null>;

  listApprovedOrdersForPoolDate(poolDate: string): Promise<
    Array<{
      orderId: string;
      sourceUserId: string;
      approvedAt: string;
      totalPv: string;
      items: Array<{
        lineTotalPv: string;
        poolRateMode?: "default_50_percent" | "custom_rate" | "disabled";
        poolRate?: string;
      }>;
    }>
  >;

  handleApprovedOrderEvent(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    commissionSettingsSnapshot: string | null;
    matrixSettingsSnapshot: string | null;
    approvalFinalInNormalFlow: true;
    includedInPoolFundingSource: true;
  }>;
}

import { ApprovedOrderCommissionFlowResult } from "../../../commissions/src/domain/commissions.types";
import { CommissionsService } from "../../../commissions/src/services/commissions.service";
import { CommissionsServiceContract } from "../../../commissions/src/services/commissions.service";
import { MatrixService } from "../../../matrix/src/services/matrix.service";
import { MatrixServiceContract } from "../../../matrix/src/services/matrix.service";
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
    private readonly matrixService: MatrixService,
    private readonly riskService: RiskService,
    private readonly walletsService: WalletsService,
  ) {}

  async createOrder(input: {
    userId: string;
    packageId?: string;
    productDetailId?: string;
    quantity?: string;
    items?: Array<{
      packageId?: string;
      productDetailId?: string;
      quantity: string;
    }>;
    shippingAddressId?: string;
    fulfillmentMethod?: "delivery" | "branch_pickup";
    pickupBranchName?: string;
    pickupBranchNote?: string;
    pickupRecipientName?: string;
    pickupPhone?: string;
    pickupEmail?: string;
    discountWalletAmount?: string;
    shoppingWalletAmount?: string;
    firmWalletAmount?: string;
    cashPaymentMethod?: string;
  }) {
    return this.ordersRepository.createOrder(input);
  }

  async submitTransferSlip(input: {
    orderId: string;
    transferSlipUrl: string;
    transferSlipNote?: string;
  }) {
    return this.ordersRepository.submitTransferSlip(input);
  }

  async listOrders(filters?: {
    userId?: string;
    approvalStatus?: "pending" | "approved";
    bucket?:
      | "awaiting-payment"
      | "transfer-review"
      | "awaiting-shipment"
      | "shipped"
      | "delivered";
    orderNo?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.ordersRepository.listOrders(filters);
  }

  async getOrder(orderId: string) {
    return this.ordersRepository.findOrderById(orderId);
  }

  async markOrderShipped(input: {
    orderId: string;
    shipmentTrackingNo?: string;
    shipmentCarrier?: string;
    shipmentNote?: string;
  }) {
    return this.ordersRepository.markOrderShipped(input);
  }

  async markOrderDelivered(input: {
    orderId: string;
    shipmentNote?: string;
  }) {
    return this.ordersRepository.markOrderDelivered(input);
  }

  async approveOrder(orderId: string) {
    return this.ordersRepository.approveOrder(orderId);
  }

  async getApprovedOrder(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    commissionSettingsSnapshot: string | null;
    matrixSettingsSnapshot: string | null;
  } | null> {
    return this.ordersRepository.findApprovedOrderById(orderId);
  }

  async listApprovedOrdersForPoolDate(poolDate: string): Promise<
    Array<{
      orderId: string;
      sourceUserId: string;
      approvedAt: string;
      totalPv: string;
      items: Array<{
        lineTotalPv: string;
        poolRateMode?: "default_50_percent" | "custom_rate" | "disabled";
        poolRate?: string;
      }>;
    }>
  > {
    return this.ordersRepository.findApprovedOrdersForPoolDate(poolDate);
  }

  async handleApprovedOrderEvent(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    commissionSettingsSnapshot: string | null;
    matrixSettingsSnapshot: string | null;
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
    const existingCommissionEntries = this.asCommissionEntryArray(
      await this.commissionsService.listCommissions({ orderId }),
    );

    if (existingCommissionEntries.length > 0) {
      const matrixFlow = await this.matrixService.handleApprovedOrderMatrixSource({
        orderId: approvedOrder.orderId,
        sourceUserId: approvedOrder.sourceUserId,
        approvedAt: approvedOrder.approvedAt,
        totalPv: approvedOrder.totalPv,
        matrixSettingsSnapshot: approvedOrder.matrixSettingsSnapshot,
      });
      const walletPostingInputs = await this.postCommissionWalletEntries(orderId);
      await this.walletsService.creditDiscountWalletFromApprovedOrder({ orderId });

      return this.buildApprovedOrderResultFromEntries(
        approvedOrder,
        existingCommissionEntries,
        walletPostingInputs,
        matrixFlow,
      );
    }

    await this.qualificationService.evaluateMemberQualification({
      userId: approvedOrder.sourceUserId,
      evaluationAt: approvedOrder.approvedAt,
      cycles: [],
    });

    const commissionFlow =
      await this.commissionsService.handleApprovedOrderCommissionSource(orderId);
    const matrixFlow = await this.matrixService.handleApprovedOrderMatrixSource({
      orderId: approvedOrder.orderId,
      sourceUserId: approvedOrder.sourceUserId,
      approvedAt: approvedOrder.approvedAt,
      totalPv: approvedOrder.totalPv,
      matrixSettingsSnapshot: approvedOrder.matrixSettingsSnapshot,
    });

    await this.poolService.loadApprovedOrderFunding(
      approvedOrder.approvedAt.slice(0, 10),
    );

    const walletPostingInputs = await this.postCommissionWalletEntries(orderId);
    await this.walletsService.creditDiscountWalletFromApprovedOrder({ orderId });

    return this.buildApprovedOrderResultFromEntries(
      approvedOrder,
      this.asCommissionEntryArray(
        await this.commissionsService.listCommissions({ orderId }),
      ),
      walletPostingInputs,
      matrixFlow,
    );
  }

  private buildApprovedOrderResultFromEntries(
    approvedOrder: {
      orderId: string;
      sourceUserId: string;
      approvedAt: string;
      commissionSettingsSnapshot: string | null;
      matrixSettingsSnapshot: string | null;
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
    matrixFlow?: {
      affectedMemberCount: number;
      payoutCount: number;
      completedCycleCount: number;
      skipped: boolean;
    },
  ): ApprovedOrderOrchestrationResult {
    const directEntries = commissionEntries.filter(
      (entry) => entry.commissionType === "direct",
    );
    const cashbackEntries = commissionEntries.filter(
      (entry) => entry.commissionType === "cashback",
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
          (directEntries[0]?.status as
            | "approved"
            | "held"
            | "fallback"
            | "withdrawable") ?? "fallback",
        cashbackCount: cashbackEntries.length,
        directCount: directEntries.length,
        uniCount: uniEntries.length,
        hasFallback: commissionEntries.some((entry) => entry.status === "fallback"),
      },
      matrixProcessing: {
        affectedMemberCount: matrixFlow?.affectedMemberCount ?? 0,
        payoutCount: matrixFlow?.payoutCount ?? 0,
        completedCycleCount: matrixFlow?.completedCycleCount ?? 0,
        skipped: matrixFlow?.skipped ?? false,
      },
      walletPostingInputs,
    };
  }

  private async postCommissionWalletEntries(
    orderId: string,
  ): Promise<ApprovedOrderOrchestrationResult["walletPostingInputs"]> {
    const commissionEntries = this.asCommissionEntryArray(
      await this.commissionsService.listCommissions({
        orderId,
      }),
    );
    const approvedEntries = commissionEntries.filter(
      (entry) =>
        entry.status === "approved" &&
        entry.beneficiaryUserId &&
        compareDecimalStrings(entry.amount, "0") > 0,
    );
    const postings: ApprovedOrderOrchestrationResult["walletPostingInputs"] = [];

    for (const entry of approvedEntries) {
      const posting = await this.walletsService.postApprovedEarning({
        userId: entry.beneficiaryUserId!,
        refType: "commission",
        refId: entry.commissionId,
        amount: entry.amount,
        holdRequired: entry.status === "held",
        earningType:
          entry.commissionType === "uni"
            ? "uni"
            : entry.commissionType === "cashback"
              ? "cashback"
              : "direct",
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

  private asCommissionEntryArray(
    result:
      | Array<{
          commissionType: string;
          status: string;
          beneficiaryUserId: string | null;
          commissionId: string;
          amount: string;
        }>
      | {
          items: Array<{
            commissionType: string;
            status: string;
            beneficiaryUserId: string | null;
            commissionId: string;
            amount: string;
          }>;
            total: number;
            page: number;
            pageSize: number;
        },
  ) {
    return Array.isArray(result) ? result : result.items;
  }
}
