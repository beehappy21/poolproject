import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import {
  buildUtcDayRange,
  toDecimalString,
  toIdString,
  toIsoString,
} from "../../../../infrastructure/src/prisma/prisma.mappers";
import {
  addDecimalStrings,
  compareDecimalStrings,
  minDecimalString,
  subtractDecimalStrings,
  multiplyDecimalStrings,
  maxDecimalString,
} from "../../../../shared/utils/src/money.util";
import {
  readCommissionSettings,
  serializeCommissionSettingsSnapshot,
} from "../../../../shared/utils/src/commission-settings.util";
import {
  readMatrixSettings,
  serializeMatrixSettingsSnapshot,
} from "../../../../shared/utils/src/matrix-settings.util";
import { readWalletSettings } from "../../../../shared/utils/src/wallet-settings.util";

const BRANCH_PICKUP_LABEL = "branch_pickup";

function mapFulfillment(order: {
  shippingLabel?: string | null;
  shippingAddressLine?: string | null;
  shippingAddressNote?: string | null;
}) {
  const fulfillmentMethod =
    order.shippingLabel === BRANCH_PICKUP_LABEL ? "branch_pickup" : "delivery";

  return {
    fulfillmentMethod,
    pickupBranchName:
      fulfillmentMethod === "branch_pickup" ? order.shippingAddressLine ?? null : null,
    pickupBranchNote:
      fulfillmentMethod === "branch_pickup" ? order.shippingAddressNote ?? null : null,
  } as const;
}

export interface OrdersRepository {
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
        firstProductName: string | null;
        firstProductImageUrl: string | null;
        productItemCount: number;
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
          firstProductName: string | null;
          firstProductImageUrl: string | null;
          productItemCount: number;
          createdAt: string;
        }>;
        total: number;
        page: number;
        pageSize: number;
      }
  >;

  findOrderById(orderId: string): Promise<{
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

  findApprovedOrderById(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    commissionSettingsSnapshot: string | null;
    matrixSettingsSnapshot: string | null;
  } | null>;

  findApprovedOrdersForPoolDate(poolDate: string): Promise<
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
}

@Injectable()
export class PrismaOrdersRepository implements OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    const bucketWhere =
      filters?.bucket === "awaiting-payment"
        ? {
            status: "PENDING" as const,
            approvalStatus: "PENDING" as const,
            paidAt: null,
          }
        : filters?.bucket === "transfer-review"
          ? {
              status: "PAID" as const,
              approvalStatus: "PENDING" as const,
              paidAt: { not: null },
            }
          : filters?.bucket === "awaiting-shipment"
            ? {
                status: "APPROVED" as const,
                approvalStatus: "APPROVED" as const,
                shippedAt: null,
              }
            : filters?.bucket === "shipped"
              ? {
                  approvalStatus: "APPROVED" as const,
                  shippedAt: { not: null },
                  deliveredAt: null,
                }
            : filters?.bucket === "delivered"
              ? {
                  approvalStatus: "APPROVED" as const,
                  deliveredAt: { not: null },
                }
          : {};

    const where = {
      userId: filters?.userId ? BigInt(filters.userId) : undefined,
      approvalStatus: filters?.approvalStatus
        ? (filters.approvalStatus.toUpperCase() as "PENDING" | "APPROVED")
        : undefined,
      orderNo: filters?.orderNo
        ? { contains: filters.orderNo, mode: "insensitive" as const }
        : undefined,
      ...bucketWhere,
    };
    const orders = await this.prisma.order.findMany({
      where,
      orderBy:
        filters?.bucket === "transfer-review"
          ? [{ paidAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]
          : filters?.bucket === "awaiting-shipment"
            ? [{ approvedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]
            : filters?.bucket === "shipped"
              ? [{ shippedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]
              : filters?.bucket === "delivered"
                ? [{ deliveredAt: "desc" }, { shippedAt: "desc" }, { id: "desc" }]
          : [{ createdAt: "desc" }, { id: "desc" }],
      skip:
        filters?.page && filters?.pageSize
          ? (filters.page - 1) * filters.pageSize
          : undefined,
      take: filters?.pageSize ?? 100,
      select: {
        id: true,
        orderNo: true,
        userId: true,
        status: true,
        approvalStatus: true,
        totalUsdt: true,
        totalPv: true,
        dcwAppliedUsdt: true,
        walletAppliedUsdt: true,
        cashDueUsdt: true,
        cashPaymentMethod: true,
        transferSubmittedAt: true,
        transferSlipUrl: true,
        transferSlipNote: true,
        approvedAt: true,
        shippedAt: true,
        deliveredAt: true,
        shipmentTrackingNo: true,
        shipmentCarrier: true,
        shipmentNote: true,
        shippingLabel: true,
        shippingAddressLine: true,
        shippingAddressNote: true,
        createdAt: true,
        orderItems: {
          select: {
            id: true,
            productId: true,
            package: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const productDetailIds = Array.from(
      new Set(
        orders
          .flatMap((order) => order.orderItems.map((item) => item.productId))
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const productDetails = productDetailIds.length
      ? await this.prisma.productDetail.findMany({
          where: {
            id: {
              in: productDetailIds.map((value) => BigInt(value)),
            },
          },
          select: {
            id: true,
            name: true,
            primaryImageUrl: true,
          },
        })
      : [];

    const productDetailMap = new Map(
      productDetails.map((detail) => [
        detail.id.toString(),
        {
          name: detail.name,
          imageUrl: detail.primaryImageUrl ?? null,
        },
      ]),
    );

    const items = orders.map((order) => {
      const firstOrderItem = order.orderItems[0];
      const firstProductDetail = firstOrderItem?.productId
        ? productDetailMap.get(firstOrderItem.productId)
        : null;

      return {
        ...mapFulfillment(order),
        orderId: order.id.toString(),
        orderNo: order.orderNo,
        sourceUserId: order.userId.toString(),
        status: order.status.toLowerCase(),
        approvalStatus: order.approvalStatus.toLowerCase(),
        totalUsdt: order.totalUsdt.toString(),
        totalPv: order.totalPv.toString(),
        dcwAppliedUsdt: order.dcwAppliedUsdt.toString(),
        walletAppliedUsdt: order.walletAppliedUsdt.toString(),
        cashDueUsdt: order.cashDueUsdt.toString(),
        cashPaymentMethod: order.cashPaymentMethod ?? null,
        transferSubmittedAt: order.transferSubmittedAt?.toISOString() ?? null,
        transferSlipUrl: order.transferSlipUrl ?? null,
        transferSlipNote: order.transferSlipNote ?? null,
        approvedAt: order.approvedAt?.toISOString() ?? null,
        shippedAt: order.shippedAt?.toISOString() ?? null,
        deliveredAt: order.deliveredAt?.toISOString() ?? null,
        shipmentTrackingNo: order.shipmentTrackingNo ?? null,
        shipmentCarrier: order.shipmentCarrier ?? null,
        shipmentNote: order.shipmentNote ?? null,
        firstProductName:
          firstProductDetail?.name ?? firstOrderItem?.package?.name ?? null,
        firstProductImageUrl: firstProductDetail?.imageUrl ?? null,
        productItemCount: order.orderItems.length,
        createdAt: order.createdAt.toISOString(),
      };
    });

    if (!filters?.page || !filters?.pageSize) {
      return items;
    }

    const total = await this.prisma.order.count({ where });

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async findOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(orderId) },
      select: {
        id: true,
        orderNo: true,
        userId: true,
        status: true,
        approvalStatus: true,
        totalUsdt: true,
        totalPv: true,
        dcwAppliedUsdt: true,
        walletAppliedUsdt: true,
        cashDueUsdt: true,
        cashPaymentMethod: true,
        transferSubmittedAt: true,
        transferSlipUrl: true,
        transferSlipNote: true,
        approvedAt: true,
        shippedAt: true,
        deliveredAt: true,
        shipmentTrackingNo: true,
        shipmentCarrier: true,
        shipmentNote: true,
        shippingLabel: true,
        shippingAddressLine: true,
        shippingAddressNote: true,
        createdAt: true,
        orderItems: {
          select: {
            id: true,
            packageId: true,
            productId: true,
            qty: true,
            unitPriceUsdt: true,
            unitPv: true,
            lineTotalUsdt: true,
            lineTotalPv: true,
            package: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return null;
    }

    const productDetailIds = Array.from(
      new Set(
        order.orderItems
          .map((item) => item.productId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const productDetails = productDetailIds.length
      ? await this.prisma.productDetail.findMany({
          where: {
            id: {
              in: productDetailIds.map((value) => BigInt(value)),
            },
          },
          select: {
            id: true,
            code: true,
            name: true,
            primaryImageUrl: true,
          },
        })
      : [];

    const productDetailMap = new Map(
      productDetails.map((detail) => [
        detail.id.toString(),
        {
          productDetailId: detail.id.toString(),
          productCode: detail.code,
          productName: detail.name,
          productImageUrl: detail.primaryImageUrl ?? null,
        },
      ]),
    );

    const productItems = order.orderItems.map((item) => {
      const detail = item.productId ? productDetailMap.get(item.productId) : null;

      return {
        orderItemId: item.id.toString(),
        packageId: item.packageId?.toString() ?? null,
        packageCode: item.package?.code ?? null,
        packageName: item.package?.name ?? null,
        productDetailId: detail?.productDetailId ?? item.productId ?? null,
        productCode: detail?.productCode ?? null,
        productName: detail?.productName ?? item.package?.name ?? null,
        productImageUrl: detail?.productImageUrl ?? null,
        quantity: item.qty,
        unitPriceUsdt: item.unitPriceUsdt.toString(),
        unitPv: item.unitPv.toString(),
        lineTotalUsdt: item.lineTotalUsdt.toString(),
        lineTotalPv: item.lineTotalPv.toString(),
      };
    });

    return {
          ...mapFulfillment(order),
          orderId: order.id.toString(),
          orderNo: order.orderNo,
          sourceUserId: order.userId.toString(),
          status: order.status.toLowerCase(),
          approvalStatus: order.approvalStatus.toLowerCase(),
          totalUsdt: order.totalUsdt.toString(),
          totalPv: order.totalPv.toString(),
          dcwAppliedUsdt: order.dcwAppliedUsdt.toString(),
          walletAppliedUsdt: order.walletAppliedUsdt.toString(),
          cashDueUsdt: order.cashDueUsdt.toString(),
          cashPaymentMethod: order.cashPaymentMethod ?? null,
          transferSubmittedAt: order.transferSubmittedAt?.toISOString() ?? null,
          transferSlipUrl: order.transferSlipUrl ?? null,
          transferSlipNote: order.transferSlipNote ?? null,
          approvedAt: order.approvedAt?.toISOString() ?? null,
          shippedAt: order.shippedAt?.toISOString() ?? null,
          deliveredAt: order.deliveredAt?.toISOString() ?? null,
          shipmentTrackingNo: order.shipmentTrackingNo ?? null,
          shipmentCarrier: order.shipmentCarrier ?? null,
          shipmentNote: order.shipmentNote ?? null,
          createdAt: order.createdAt.toISOString(),
          items: productItems,
          productItems,
        }
      ;
  }

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
    cashPaymentMethod?: string;
  }) {
    const userId = BigInt(input.userId);
    const requestedItems =
      input.items && input.items.length > 0
        ? input.items
        : [
            {
              packageId: input.packageId,
              productDetailId: input.productDetailId,
              quantity: input.quantity ?? "1",
            },
          ];
    const unresolvedItems = requestedItems.map((item) => ({
      packageId: item.packageId,
      productDetailId: item.productDetailId,
      quantity: Math.max(1, Number.parseInt(item.quantity ?? "1", 10) || 1),
    }));

    const missingPackageProductDetailIds = Array.from(
      new Set(
        unresolvedItems
          .filter((item) => !item.packageId && item.productDetailId)
          .map((item) => item.productDetailId as string),
      ),
    );

    const packageFallbacks = missingPackageProductDetailIds.length
      ? await this.prisma.packageItem.findMany({
          where: {
            productDetailId: {
              in: missingPackageProductDetailIds.map((value) => BigInt(value)),
            },
            package: {
              status: "ACTIVE",
            },
          },
          orderBy: [
            { package: { createdAt: "asc" } },
            { package: { id: "asc" } },
          ],
          select: {
            productDetailId: true,
            packageId: true,
          },
        })
      : [];
    const packageFallbackMap = new Map<string, string>();

    packageFallbacks.forEach((item) => {
      const productDetailId = item.productDetailId.toString();
      if (!packageFallbackMap.has(productDetailId)) {
        packageFallbackMap.set(productDetailId, item.packageId.toString());
      }
    });

    const normalizedItems = unresolvedItems.map((item) => ({
      packageId:
        item.packageId ||
        (item.productDetailId
          ? packageFallbackMap.get(item.productDetailId)
          : undefined),
      productDetailId: item.productDetailId,
      quantity: item.quantity,
    }));

    if (normalizedItems.some((item) => !item.packageId)) {
      throw new Error("Product is not yet connected to an active package.");
    }
    const packageIds = normalizedItems.map((item) => BigInt(item.packageId as string));
    const packages = await this.prisma.package.findMany({
      where: { id: { in: packageIds } },
      select: {
        id: true,
        priceUsdt: true,
        pv: true,
        poolRateMode: true,
        poolRate: true,
        dcwSpendEnabled: true,
        dcwUsageAmount: true,
        dcwCashRewardRate: true,
        dcwShoppingRewardRate: true,
      },
    });
    const packageMap = new Map(packages.map((pkg) => [pkg.id.toString(), pkg]));

    if (packages.length !== normalizedItems.length) {
      throw new Error("Package not found.");
    }

    const walletSettings = readWalletSettings();
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { shoppingBalance: true, discountBalance: true },
    });
    const isBranchPickup = input.fulfillmentMethod === "branch_pickup";
    const shippingAddress = isBranchPickup
      ? null
      : input.shippingAddressId
      ? await this.prisma.memberShippingAddress.findFirst({
          where: {
            id: BigInt(input.shippingAddressId),
            userId,
          },
          select: {
            id: true,
            label: true,
            recipientName: true,
            phone: true,
            email: true,
            countryCode: true,
            countryName: true,
            provinceCode: true,
            provinceName: true,
            districtCode: true,
            districtName: true,
            subdistrictCode: true,
            subdistrictName: true,
            postalCode: true,
            addressLine: true,
            note: true,
          },
        })
      : await this.prisma.memberShippingAddress.findFirst({
          where: {
            userId,
            isDefault: true,
          },
          select: {
            id: true,
            label: true,
            recipientName: true,
            phone: true,
            email: true,
            countryCode: true,
            countryName: true,
            provinceCode: true,
            provinceName: true,
            districtCode: true,
            districtName: true,
            subdistrictCode: true,
            subdistrictName: true,
            postalCode: true,
            addressLine: true,
            note: true,
          },
        });

    if (isBranchPickup && !input.pickupBranchName?.trim()) {
      throw new Error("Pickup branch name is required.");
    }

    if (!isBranchPickup && input.shippingAddressId && !shippingAddress) {
      throw new Error("Shipping address not found.");
    }
    const orderItemCreates = normalizedItems.map((item) => {
      if (!item.packageId) {
        throw new Error("Order item is missing a package bridge.");
      }

      const pkg = packageMap.get(item.packageId)!;
      const lineTotalUsdt = multiplyDecimalStrings(
        pkg.priceUsdt.toString(),
        item.quantity.toString(),
      );
      const lineTotalPv = multiplyDecimalStrings(
        pkg.pv.toString(),
        item.quantity.toString(),
      );

      return {
        packageId: pkg.id,
        productId: item.productDetailId ?? null,
        qty: item.quantity,
        unitPriceUsdt: pkg.priceUsdt,
        unitPv: pkg.pv,
        poolRateMode: pkg.poolRateMode,
        unitPoolRate: pkg.poolRate,
        dcwSpendEnabled: pkg.dcwSpendEnabled,
        unitDcwUsageAmount: pkg.dcwUsageAmount,
        unitDcwCashRewardRate: pkg.dcwCashRewardRate,
        unitDcwShoppingRewardRate: pkg.dcwShoppingRewardRate,
        lineTotalUsdt,
        lineTotalPv,
      } satisfies Prisma.OrderItemUncheckedCreateWithoutOrderInput;
    });

    const packagePriceUsdt = orderItemCreates.reduce(
      (sum, item) => addDecimalStrings(sum, item.lineTotalUsdt.toString()),
      "0",
    );
    const packagePv = orderItemCreates.reduce(
      (sum, item) => addDecimalStrings(sum, item.lineTotalPv.toString()),
      "0",
    );
    const packageDcwLimit = orderItemCreates.reduce((sum, item) => {
      const limit = multiplyDecimalStrings(
        item.unitDcwUsageAmount.toString(),
        item.qty.toString(),
      );
      return addDecimalStrings(sum, limit);
    }, "0");
    const requestedDiscountAmount = input.discountWalletAmount ?? "0";
    const availableDiscount = wallet?.discountBalance.toString() ?? "0";
    const dcwAllowedForPackage =
      walletSettings.discountWalletSpendEnabled &&
      orderItemCreates.every((item) => item.dcwSpendEnabled);

    if (
      compareDecimalStrings(requestedDiscountAmount, "0") > 0 &&
      !dcwAllowedForPackage
    ) {
      throw new Error("Discount wallet is not allowed for this package.");
    }

    const dcwAppliedUsdt = dcwAllowedForPackage
      ? minDecimalString(
          minDecimalString(requestedDiscountAmount, availableDiscount),
          packageDcwLimit,
        )
      : "0";
    const remainingAfterDiscount = subtractDecimalStrings(
      packagePriceUsdt,
      dcwAppliedUsdt,
    );
    const requestedShoppingAmount =
      input.shoppingWalletAmount ?? remainingAfterDiscount;
    const availableShopping = wallet?.shoppingBalance.toString() ?? "0";
    const walletAppliedUsdt = walletSettings.shoppingWalletSpendEnabled
      ? minDecimalString(
          minDecimalString(requestedShoppingAmount, availableShopping),
          remainingAfterDiscount,
        )
      : "0";
    const cashDueUsdt = subtractDecimalStrings(
      remainingAfterDiscount,
      walletAppliedUsdt,
    );
    const normalizedCashPaymentMethod = input.cashPaymentMethod?.trim().toLowerCase();

    if (compareDecimalStrings(cashDueUsdt, "0") > 0) {
      const effectiveCashPaymentMethod =
        normalizedCashPaymentMethod ??
        walletSettings.orderCashPaymentMethods[0] ??
        "bank_transfer";

      if (!walletSettings.orderCashPaymentMethods.includes(effectiveCashPaymentMethod)) {
        throw new Error("Cash payment method is not allowed.");
      }

      input.cashPaymentMethod = effectiveCashPaymentMethod;
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNo: `ORD-${Date.now()}`,
          userId,
          shippingAddressId: isBranchPickup ? null : shippingAddress?.id ?? null,
          shippingLabel: isBranchPickup
            ? BRANCH_PICKUP_LABEL
            : shippingAddress?.label ?? null,
          shippingRecipientName: isBranchPickup
            ? input.pickupRecipientName?.trim() || null
            : shippingAddress?.recipientName ?? null,
          shippingPhone: isBranchPickup
            ? input.pickupPhone?.trim() || null
            : shippingAddress?.phone ?? null,
          shippingEmail: isBranchPickup
            ? input.pickupEmail?.trim() || null
            : shippingAddress?.email ?? null,
          shippingCountryCode: isBranchPickup ? null : shippingAddress?.countryCode ?? null,
          shippingCountryName: isBranchPickup ? null : shippingAddress?.countryName ?? null,
          shippingProvinceCode: isBranchPickup ? null : shippingAddress?.provinceCode ?? null,
          shippingProvinceName: isBranchPickup ? null : shippingAddress?.provinceName ?? null,
          shippingDistrictCode: isBranchPickup ? null : shippingAddress?.districtCode ?? null,
          shippingDistrictName: isBranchPickup ? null : shippingAddress?.districtName ?? null,
          shippingSubdistrictCode: isBranchPickup ? null : shippingAddress?.subdistrictCode ?? null,
          shippingSubdistrictName: isBranchPickup ? null : shippingAddress?.subdistrictName ?? null,
          shippingPostalCode: isBranchPickup ? null : shippingAddress?.postalCode ?? null,
          shippingAddressLine: isBranchPickup
            ? input.pickupBranchName?.trim() || null
            : shippingAddress?.addressLine ?? null,
          shippingAddressNote: isBranchPickup
            ? input.pickupBranchNote?.trim() || null
            : shippingAddress?.note ?? null,
          subtotalUsdt: packagePriceUsdt,
          totalUsdt: packagePriceUsdt,
          totalPv: packagePv,
          dcwAppliedUsdt,
          walletAppliedUsdt,
          cashDueUsdt,
          cashPaymentMethod:
            compareDecimalStrings(cashDueUsdt, "0") > 0
              ? input.cashPaymentMethod ?? walletSettings.orderCashPaymentMethods[0] ?? "bank_transfer"
              : null,
          paidAt:
            compareDecimalStrings(cashDueUsdt, "0") <= 0 ? new Date() : null,
          approvalStatus: "PENDING",
          status:
            compareDecimalStrings(cashDueUsdt, "0") <= 0 ? "PAID" : "PENDING",
          orderItems: {
            create: orderItemCreates,
          },
        },
      });

      if (compareDecimalStrings(dcwAppliedUsdt, "0") > 0) {
        const currentWallet = await tx.wallet.upsert({
          where: { userId },
          update: {},
          create: { userId },
          select: { discountBalance: true },
        });

        if (
          compareDecimalStrings(
            currentWallet.discountBalance.toString(),
            dcwAppliedUsdt,
          ) < 0
        ) {
          throw new Error("Insufficient discount wallet balance.");
        }

        await tx.wallet.update({
          where: { userId },
          data: {
            discountBalance: subtractDecimalStrings(
              currentWallet.discountBalance.toString(),
              dcwAppliedUsdt,
            ),
          },
        });

        await tx.walletTransaction.create({
          data: {
            userId,
            txType: "DCW_PURCHASE_DEBIT",
            direction: "DEBIT",
            balanceBucket: "DISCOUNT",
            refType: "order",
            refId: createdOrder.id,
            amount: dcwAppliedUsdt,
            status: "POSTED",
            note: "Discount wallet used for order purchase",
          },
        });
      }

      if (compareDecimalStrings(walletAppliedUsdt, "0") > 0) {
        const currentWallet = await tx.wallet.upsert({
          where: { userId },
          update: {},
          create: { userId },
          select: { shoppingBalance: true, discountBalance: true },
        });

        if (
          compareDecimalStrings(
            currentWallet.shoppingBalance.toString(),
            walletAppliedUsdt,
          ) < 0
        ) {
          throw new Error("Insufficient SW balance.");
        }

        await tx.wallet.update({
          where: { userId },
          data: {
            shoppingBalance: subtractDecimalStrings(
              currentWallet.shoppingBalance.toString(),
              walletAppliedUsdt,
            ),
            discountBalance: currentWallet.discountBalance.toString(),
          },
        });

        await tx.walletTransaction.create({
          data: {
            userId,
            txType: "ORDER_PURCHASE_DEBIT",
            direction: "DEBIT",
            balanceBucket: "SHOPPING",
            refType: "order",
            refId: createdOrder.id,
            amount: walletAppliedUsdt,
            status: "POSTED",
            note: "Shopping wallet used for order purchase",
          },
        });
      }

      return createdOrder;
    });

    return {
      orderId: order.id.toString(),
      orderNo: order.orderNo,
      status: order.status.toLowerCase(),
      approvalStatus: order.approvalStatus.toLowerCase(),
      totalUsdt: order.totalUsdt.toString(),
      totalPv: order.totalPv.toString(),
      dcwAppliedUsdt: order.dcwAppliedUsdt.toString(),
      walletAppliedUsdt: order.walletAppliedUsdt.toString(),
      cashDueUsdt: order.cashDueUsdt.toString(),
      cashPaymentMethod: order.cashPaymentMethod ?? null,
    };
  }

  async submitTransferSlip(input: {
    orderId: string;
    transferSlipUrl: string;
    transferSlipNote?: string;
  }) {
    const submittedAt = new Date();
    const order = await this.prisma.order.update({
      where: { id: BigInt(input.orderId) },
      data: {
        paidAt: submittedAt,
        transferSubmittedAt: submittedAt,
        transferSlipUrl: input.transferSlipUrl,
        transferSlipNote: input.transferSlipNote ?? null,
        approvalStatus: "PENDING",
        status: "PAID",
      },
      select: {
        id: true,
        status: true,
        approvalStatus: true,
        paidAt: true,
        transferSubmittedAt: true,
        transferSlipUrl: true,
        transferSlipNote: true,
      },
    });

    return order
      ? {
          orderId: order.id.toString(),
          status: order.status.toLowerCase(),
          approvalStatus: order.approvalStatus.toLowerCase(),
          paidAt: order.paidAt?.toISOString() ?? null,
          transferSubmittedAt: order.transferSubmittedAt?.toISOString() ?? null,
          transferSlipUrl: order.transferSlipUrl ?? null,
          transferSlipNote: order.transferSlipNote ?? null,
        }
      : null;
  }

  async markOrderShipped(input: {
    orderId: string;
    shipmentTrackingNo?: string;
    shipmentCarrier?: string;
    shipmentNote?: string;
  }) {
    const shippedAt = new Date();
    const order = await this.prisma.order.update({
      where: { id: BigInt(input.orderId) },
      data: {
        shippedAt,
        shipmentTrackingNo: input.shipmentTrackingNo ?? null,
        shipmentCarrier: input.shipmentCarrier ?? null,
        shipmentNote: input.shipmentNote ?? null,
      },
      select: {
        id: true,
        status: true,
        approvalStatus: true,
        shippedAt: true,
        shipmentTrackingNo: true,
        shipmentCarrier: true,
        shipmentNote: true,
      },
    });

    return order
      ? {
          orderId: order.id.toString(),
          status: order.status.toLowerCase(),
          approvalStatus: order.approvalStatus.toLowerCase(),
          shippedAt: order.shippedAt?.toISOString() ?? null,
          shipmentTrackingNo: order.shipmentTrackingNo ?? null,
          shipmentCarrier: order.shipmentCarrier ?? null,
          shipmentNote: order.shipmentNote ?? null,
        }
      : null;
  }

  async markOrderDelivered(input: {
    orderId: string;
    shipmentNote?: string;
  }) {
    const deliveredAt = new Date();
    const order = await this.prisma.order.update({
      where: { id: BigInt(input.orderId) },
      data: {
        deliveredAt,
        shipmentNote: input.shipmentNote ?? undefined,
      },
      select: {
        id: true,
        status: true,
        approvalStatus: true,
        deliveredAt: true,
        shipmentNote: true,
      },
    });

    return order
      ? {
          orderId: order.id.toString(),
          status: order.status.toLowerCase(),
          approvalStatus: order.approvalStatus.toLowerCase(),
          deliveredAt: order.deliveredAt?.toISOString() ?? null,
          shipmentNote: order.shipmentNote ?? null,
        }
      : null;
  }

  async approveOrder(orderId: string) {
    const approvedAt = new Date();
    const commissionSettingsSnapshot = serializeCommissionSettingsSnapshot(
      readCommissionSettings(),
    );
    const matrixSettingsSnapshot = serializeMatrixSettingsSnapshot(readMatrixSettings());
    const order = await this.prisma.order.update({
      where: { id: BigInt(orderId) },
      data: {
        paidAt: approvedAt,
        approvedAt,
        commissionSettingsSnapshot,
        matrixSettingsSnapshot,
        approvalStatus: "APPROVED",
        status: "APPROVED",
      },
      select: {
        id: true,
        userId: true,
        approvedAt: true,
        totalPv: true,
        commissionSettingsSnapshot: true,
        matrixSettingsSnapshot: true,
      },
    });

    return order
      ? {
          orderId: order.id.toString(),
          sourceUserId: order.userId.toString(),
          approvedAt: order.approvedAt?.toISOString() ?? "",
          totalPv: order.totalPv.toString(),
          commissionSettingsSnapshot: order.commissionSettingsSnapshot,
          matrixSettingsSnapshot: order.matrixSettingsSnapshot,
        }
      : null;
  }

  async findApprovedOrderById(orderId: string): Promise<{
    orderId: string;
    sourceUserId: string;
    approvedAt: string;
    totalPv: string;
    commissionSettingsSnapshot: string | null;
    matrixSettingsSnapshot: string | null;
  } | null> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: BigInt(orderId),
        approvalStatus: "APPROVED",
        approvedAt: { not: null },
      },
      select: {
        id: true,
        userId: true,
        approvedAt: true,
        totalPv: true,
        commissionSettingsSnapshot: true,
        matrixSettingsSnapshot: true,
      },
    });

    return order
      ? {
          orderId: order.id.toString(),
          sourceUserId: order.userId.toString(),
          approvedAt: order.approvedAt?.toISOString() ?? "",
          totalPv: order.totalPv.toString(),
          commissionSettingsSnapshot: order.commissionSettingsSnapshot,
          matrixSettingsSnapshot: order.matrixSettingsSnapshot,
        }
      : null;
  }

  async findApprovedOrdersForPoolDate(poolDate: string): Promise<
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
    const range = buildUtcDayRange(poolDate);
    const orderItemSelect = {
      lineTotalPv: true,
      poolRateMode: true,
      unitPoolRate: true,
    } satisfies Prisma.OrderItemSelect;
    const orders = await this.prisma.order.findMany({
      where: {
        approvalStatus: "APPROVED",
        approvedAt: range,
      },
      orderBy: [{ approvedAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        userId: true,
        approvedAt: true,
        totalPv: true,
        orderItems: {
          select: orderItemSelect,
        },
      },
    });

    return orders.map((order) => ({
      orderId: toIdString(order.id),
      sourceUserId: toIdString(order.userId),
      approvedAt: toIsoString(order.approvedAt),
      totalPv: toDecimalString(order.totalPv),
      items: order.orderItems.map((item) => ({
        lineTotalPv: toDecimalString(item.lineTotalPv),
        poolRateMode: item.poolRateMode?.toString().toLowerCase() as
          | "default_50_percent"
          | "custom_rate"
          | "disabled"
          | undefined,
        poolRate: toDecimalString(item.unitPoolRate),
      })),
    }));
  }
}
