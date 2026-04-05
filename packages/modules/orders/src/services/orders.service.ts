import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { parseCommissionSettingsSnapshot } from "../../../../shared/utils/src/commission-settings.util";
import { compareDecimalStrings } from "../../../../shared/utils/src/money.util";

export interface OrdersServiceContract {
  listOrders(filters?: {
    userId?: string;
    approvalStatus?: "pending" | "approved";
    sourceType?: "normal" | "matrix_reentry";
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
        orderSourceType: "normal" | "matrix_reentry";
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
          orderSourceType: "normal" | "matrix_reentry";
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
    orderSourceType: "normal" | "matrix_reentry";
    fulfillmentMethod: "delivery" | "branch_pickup";
    pickupBranchName: string | null;
    pickupBranchNote: string | null;
    createdAt: string;
    autoOrderAudit?: {
      matrixEventId: string;
      sourceBoardId: string | null;
      sourceBoardNo: number | null;
      sourceBoardRoundNo: number | null;
      generatedBoardId: string | null;
      generatedBoardNo: number | null;
      generatedRoundNo: number | null;
      sourcePv: string;
      creditedPv: string;
      firmCreditAmount: string | null;
      eventCreatedAt: string;
    } | null;
    reentryAudit: {
      matrixEventId: string;
      sourceBoardId: string | null;
      sourceBoardNo: number | null;
      sourceBoardRoundNo: number | null;
      generatedBoardId: string | null;
      generatedBoardNo: number | null;
      generatedRoundNo: number | null;
      sourcePv: string;
      creditedPv: string;
      firmCreditAmount: string | null;
      eventCreatedAt: string;
    } | null;
    items: Array<{
      orderItemId: string;
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
    productDetailId?: string;
    quantity?: string;
    items?: Array<{
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
    approvalFinalInNormalFlow: true;
    poolContributionSource: "approved_orders_only";
    steps: Array<{
      step:
        | "load_approved_order"
        | "run_source_qualification"
        | "build_commission_drafts"
        | "register_pool_source"
        | "prepare_wallet_postings"
        | "evaluate_risk_holds";
      status: "completed";
    }>;
    commissionDrafts: {
      directStatus: "approved" | "held" | "fallback" | "withdrawable";
      cashbackCount: number;
      directCount: number;
      uniCount: number;
      hasFallback: boolean;
    };
    matrixProcessing: {
      affectedMemberCount: number;
      payoutCount: number;
      completedCycleCount: number;
      skipped: boolean;
      openedAutoOrderCount: number;
      openedReentryCount: number;
    };
    walletPostingInputs: Array<{
      userId: string;
      refType: "commission";
      refId: string;
      amount: string;
      holdRequired: boolean;
    }>;
  } | null>;

  cancelOrder(input: {
    orderId: string;
    reason?: string;
  }): Promise<{
    orderId: string;
    status: string;
    approvalStatus: string;
    cancellationReason: string | null;
  } | null>;

  getApprovedOrder(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    commissionSettingsSnapshot: string | null;
    matrixSettingsSnapshot: string | null;
    items: Array<{
      productDetailId: string | null;
      packageId: string | null;
      quantity: number;
    }>;
  } | null>;

  listApprovedOrdersForPoolDate(poolDate: string): Promise<
    Array<{
      orderId: string;
      sourceUserId: string;
      approvedAt: string;
      totalPv: string;
      commissionSettingsSnapshot: string | null;
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
    items: Array<{
      productDetailId: string | null;
      packageId: string | null;
      quantity: number;
    }>;
    approvalFinalInNormalFlow: true;
    includedInPoolFundingSource: true;
  }>;
}

import { ApprovedOrderCommissionFlowResult } from "../../../commissions/src/domain/commissions.types";
import { CommissionsService } from "../../../commissions/src/services/commissions.service";
import { CommissionsServiceContract } from "../../../commissions/src/services/commissions.service";
import { MatrixService } from "../../../matrix/src/services/matrix.service";
import { MatrixServiceContract } from "../../../matrix/src/services/matrix.service";
import { MembersService } from "../../../members/src/services/members.service";
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
  private readonly approvedOrderLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly ordersRepository: PrismaOrdersRepository,
    private readonly membersService: MembersService,
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
    sourceType?: "normal" | "matrix_reentry";
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
    const approvedOrder = await this.ordersRepository.approveOrder(orderId);

    if (!approvedOrder) {
      return null;
    }

    return this.handleApprovedOrder(orderId);
  }

  async cancelOrder(input: { orderId: string; reason?: string }) {
    return this.ordersRepository.cancelOrder(input);
  }

  async createMatrixAutoOrderAuditArtifacts(input: {
    openedAutoOrders?: Array<{
      userId: string;
      matrixEventId: string;
      reorderId?: string;
      sourceBoardId: string;
      roundNo: number;
      autoOrderAmount: string;
      autoOrderPvAmount: string;
    }>;
    openedReentries?: Array<{
      userId: string;
      matrixEventId: string;
      reorderId?: string;
      sourceBoardId: string;
      roundNo: number;
      reentryAmount: string;
      reentryPvAmount: string;
    }>;
  }) {
    await this.createMatrixAutoOrderAuditOrders(input);
    return {
      createdCount: input.openedAutoOrders?.length ?? input.openedReentries?.length ?? 0,
    };
  }

  async createMatrixReentryAuditArtifacts(input: {
    openedAutoOrders?: Array<{
      userId: string;
      matrixEventId: string;
      reorderId?: string;
      sourceBoardId: string;
      roundNo: number;
      autoOrderAmount: string;
      autoOrderPvAmount: string;
    }>;
    openedReentries?: Array<{
      userId: string;
      matrixEventId: string;
      reorderId?: string;
      sourceBoardId: string;
      roundNo: number;
      reentryAmount: string;
      reentryPvAmount: string;
    }>;
  }) {
    return this.createMatrixAutoOrderAuditArtifacts(input);
  }

  async getApprovedOrder(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    orderSourceType: "normal" | "matrix_reentry";
    commissionSettingsSnapshot: string | null;
    matrixSettingsSnapshot: string | null;
    items: Array<{
      productDetailId: string | null;
      packageId: string | null;
      quantity: number;
    }>;
  } | null> {
    return this.ordersRepository.findApprovedOrderById(orderId);
  }

  async listApprovedOrdersForPoolDate(poolDate: string): Promise<
    Array<{
      orderId: string;
      sourceUserId: string;
      approvedAt: string;
      totalPv: string;
      commissionSettingsSnapshot: string | null;
      items: Array<{
        lineTotalPv: string;
        poolRateMode?: "default_50_percent" | "custom_rate" | "disabled";
        poolRate?: string;
      }>;
    }>
  > {
    const orders = await this.ordersRepository.findApprovedOrdersForPoolDate(poolDate);
    return orders.filter(
      (order) =>
        parseCommissionSettingsSnapshot(order.commissionSettingsSnapshot).appVisibility
          .pool !== false,
    );
  }

  async handleApprovedOrderEvent(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    orderSourceType: "normal" | "matrix_reentry";
    commissionSettingsSnapshot: string | null;
    matrixSettingsSnapshot: string | null;
    items: Array<{
      productDetailId: string | null;
      packageId: string | null;
      quantity: number;
    }>;
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
    return this.withApprovedOrderLock(orderId, async () => {
      const approvedOrder = await this.handleApprovedOrderEvent(orderId);
      if (approvedOrder.orderSourceType === "matrix_reentry") {
        return this.buildApprovedOrderResultFromEntries(
          approvedOrder,
          [],
          [],
          this.buildSkippedMatrixFlow(approvedOrder),
        );
      }

      const commissionSettings = parseCommissionSettingsSnapshot(
        approvedOrder.commissionSettingsSnapshot,
      );
      const existingCommissionEntries = this.asCommissionEntryArray(
        await this.commissionsService.listCommissions({ orderId }),
      );

      if (existingCommissionEntries.length > 0) {
        const matrixFlow =
          commissionSettings.appVisibility.matrix === false
            ? this.buildSkippedMatrixFlow(approvedOrder)
            : await this.matrixService.handleApprovedOrderMatrixSource({
                orderId: approvedOrder.orderId,
                sourceUserId: approvedOrder.sourceUserId,
                approvedAt: approvedOrder.approvedAt,
                totalPv: approvedOrder.totalPv,
                matrixSettingsSnapshot: approvedOrder.matrixSettingsSnapshot,
              });
        await this.createMatrixAutoOrderAuditOrders(matrixFlow);
        const walletPostingInputs = await this.postCommissionWalletEntries(orderId);
        await this.walletsService.creditDiscountWalletFromApprovedOrder({ orderId });

        return this.buildApprovedOrderResultFromEntries(
          approvedOrder,
          existingCommissionEntries,
          walletPostingInputs,
          matrixFlow,
        );
      }

      await this.activateSourceMemberCyclesFromApprovedOrder(approvedOrder);

      await this.qualificationService.evaluateMemberQualification({
        userId: approvedOrder.sourceUserId,
        evaluationAt: approvedOrder.approvedAt,
        cycles: [],
      });

      const commissionFlow =
        await this.commissionsService.handleApprovedOrderCommissionSource(orderId);
      const matrixFlow =
        commissionSettings.appVisibility.matrix === false
          ? this.buildSkippedMatrixFlow(approvedOrder)
          : await this.matrixService.handleApprovedOrderMatrixSource({
              orderId: approvedOrder.orderId,
              sourceUserId: approvedOrder.sourceUserId,
              approvedAt: approvedOrder.approvedAt,
              totalPv: approvedOrder.totalPv,
              matrixSettingsSnapshot: approvedOrder.matrixSettingsSnapshot,
            });
      await this.createMatrixAutoOrderAuditOrders(matrixFlow);

      if (commissionSettings.appVisibility.pool !== false) {
        await this.poolService.loadApprovedOrderFunding(
          approvedOrder.approvedAt.slice(0, 10),
        );
      }

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
    });
  }

  private async withApprovedOrderLock<T>(
    orderId: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const previous = this.approvedOrderLocks.get(orderId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    this.approvedOrderLocks.set(orderId, tail);

    await previous;

    try {
      return await work();
    } finally {
      release();
      if (this.approvedOrderLocks.get(orderId) === tail) {
        this.approvedOrderLocks.delete(orderId);
      }
    }
  }

  private buildSkippedMatrixFlow(approvedOrder: {
    orderId: string;
    sourceUserId: string;
  }) {
    return {
      orderId: approvedOrder.orderId,
      sourceUserId: approvedOrder.sourceUserId,
      affectedMemberCount: 0,
      payoutCount: 0,
      completedCycleCount: 0,
      skipped: true,
      openedAutoOrders: [],
      openedReentries: [],
    };
  }

  private async createMatrixAutoOrderAuditOrders(matrixFlow: {
    openedAutoOrders?: Array<{
      userId: string;
      matrixEventId: string;
      reorderId?: string;
      sourceBoardId: string;
      roundNo: number;
      autoOrderAmount: string;
      autoOrderPvAmount: string;
    }>;
    openedReentries?: Array<{
      userId: string;
      matrixEventId: string;
      reorderId?: string;
      sourceBoardId: string;
      roundNo: number;
      reentryAmount: string;
      reentryPvAmount: string;
    }>;
  }) {
    const openedAutoOrders =
      matrixFlow.openedAutoOrders ??
      matrixFlow.openedReentries?.map((entry) => ({
        ...entry,
        autoOrderAmount: entry.reentryAmount,
        autoOrderPvAmount: entry.reentryPvAmount,
      })) ??
      [];

    for (const openedAutoOrder of openedAutoOrders) {
      const autoOrder = await this.ordersRepository.createMatrixAutoOrderAuditOrder({
        userId: openedAutoOrder.userId,
        matrixEventId: openedAutoOrder.reorderId ?? openedAutoOrder.matrixEventId,
        sourceBoardId: openedAutoOrder.sourceBoardId,
        roundNo: openedAutoOrder.roundNo,
        amount: openedAutoOrder.autoOrderAmount,
        pv: openedAutoOrder.autoOrderPvAmount,
      });

      await this.walletsService.creditFirmWalletFromMatrixAutoOrder({
        userId: openedAutoOrder.userId,
        matrixEventId: openedAutoOrder.reorderId ?? openedAutoOrder.matrixEventId,
        amount: openedAutoOrder.autoOrderAmount,
      });

      if (openedAutoOrder.reorderId) {
        await this.matrixService.completeMatrixReorder({
          reorderId: openedAutoOrder.reorderId,
          orderId: autoOrder.orderId,
        });
      }

      // Newly-created auto orders must be fully settled before the next
      // normal invoice is processed, otherwise matrix/commission state drifts.
      if (!autoOrder.alreadyExists) {
        await this.handleApprovedOrder(autoOrder.orderId);
      }
    }
  }

  private buildApprovedOrderResultFromEntries(
    approvedOrder: {
      orderId: string;
      sourceUserId: string;
      approvedAt: string;
      commissionSettingsSnapshot: string | null;
      matrixSettingsSnapshot: string | null;
      items: Array<{
        productDetailId: string | null;
        packageId: string | null;
        quantity: number;
      }>;
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
      openedAutoOrders?: Array<{
        matrixEventId: string;
      }>;
      openedReentries?: Array<{
        matrixEventId: string;
      }>;
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
        openedAutoOrderCount:
          matrixFlow?.openedAutoOrders?.length ?? matrixFlow?.openedReentries?.length ?? 0,
        openedReentryCount: matrixFlow?.openedReentries?.length ?? 0,
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

  private async activateSourceMemberCyclesFromApprovedOrder(approvedOrder: {
    sourceUserId: string;
    approvedAt: string;
    items: Array<{
      productDetailId: string | null;
      packageId: string | null;
      quantity: number;
    }>;
  }): Promise<void> {
    for (const item of approvedOrder.items) {
      const quantity = Math.max(1, item.quantity || 1);

      for (let index = 0; index < quantity; index += 1) {
        if (item.productDetailId) {
          await this.membersService.activateProductCycle({
            memberId: approvedOrder.sourceUserId,
            productDetailId: item.productDetailId,
            activatedAt: approvedOrder.approvedAt,
          });
          continue;
        }

        if (item.packageId) {
          await this.membersService.activateProductCycle({
            memberId: approvedOrder.sourceUserId,
            packageId: item.packageId,
            activatedAt: approvedOrder.approvedAt,
          });
        }
      }
    }
  }
}
