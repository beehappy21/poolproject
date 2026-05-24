import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Query, Req, Res } from "@nestjs/common";
import { Roles } from "../../../auth/src/access-control/roles.decorator";

import {
  optionalString,
  requireNonEmptyString,
  requireDecimalString,
  optionalPositiveInteger,
  requirePositiveIntegerString,
  rethrowHttpError,
} from "../../../../../apps/api/src/http/request.util";
import { CommissionsService } from "../../../commissions/src/services/commissions.service";
import { OrdersService } from "../services/orders.service";

@Roles("admin")
@Controller("orders")
export class OrdersController {
  private static readonly RECEIPT_COMPANY_NAME = "บริษัท บีไลฟ์ แฮลตี้ จำกัด";
  private static readonly RECEIPT_COMPANY_NAME_EN = "B LIFE HEALTHY CO., LTD.";
  private static readonly RECEIPT_COMPANY_ADDRESS =
    "63/5 หมู่ที่ 7 ถนนบางกรวย-ไทรน้อย ตำบลไทรน้อย อำเภอไทรน้อย จ.นนทบุรี 11150";
  private static readonly RECEIPT_COMPANY_TAX_ID = "0105556153794";

  constructor(
    private readonly ordersService: OrdersService,
    private readonly commissionsService: CommissionsService,
  ) {}

  @Get()
  async listOrders(
    @Query("userId") userId?: string,
    @Query("approvalStatus") approvalStatus?: string,
    @Query("sourceType") sourceType?: string,
    @Query("bucket") bucket?: string,
    @Query("orderNo") orderNo?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const normalizedApprovalStatus = approvalStatus
      ? requireNonEmptyString(approvalStatus, "approvalStatus").toLowerCase()
      : undefined;

    if (
      normalizedApprovalStatus &&
      normalizedApprovalStatus !== "pending" &&
      normalizedApprovalStatus !== "approved"
    ) {
      throw new NotFoundException("approvalStatus must be pending or approved.");
    }

    const normalizedBucket = bucket
      ? requireNonEmptyString(bucket, "bucket").toLowerCase()
      : undefined;

    const normalizedSourceType = sourceType
      ? requireNonEmptyString(sourceType, "sourceType").toLowerCase()
      : undefined;

    if (
      normalizedBucket &&
      normalizedBucket !== "awaiting-payment" &&
      normalizedBucket !== "transfer-review" &&
      normalizedBucket !== "awaiting-shipment" &&
      normalizedBucket !== "shipped" &&
      normalizedBucket !== "delivered"
    ) {
      throw new NotFoundException(
        "bucket must be awaiting-payment, transfer-review, awaiting-shipment, shipped, or delivered.",
      );
    }

    if (
      normalizedSourceType &&
      normalizedSourceType !== "normal" &&
      normalizedSourceType !== "matrix_reentry"
    ) {
      throw new NotFoundException("sourceType must be normal or matrix_reentry.");
    }

    return this.ordersService.listOrders({
      userId: userId ? requirePositiveIntegerString(userId, "userId") : undefined,
      approvalStatus: normalizedApprovalStatus as "pending" | "approved" | undefined,
      sourceType: normalizedSourceType as "normal" | "matrix_reentry" | undefined,
      bucket: normalizedBucket as
        | "awaiting-payment"
        | "transfer-review"
        | "awaiting-shipment"
        | "shipped"
        | "delivered"
        | undefined,
      orderNo: orderNo ? requireNonEmptyString(orderNo, "orderNo") : undefined,
      page: optionalPositiveInteger(page, "page"),
      pageSize: optionalPositiveInteger(pageSize, "pageSize"),
    });
  }

  @Post()
  async createOrder(
    @Body()
    body: {
      userId: string;
      packageId?: string;
      productDetailId?: string;
      quantity?: string;
      items?: Array<{
        packageId?: string;
        productDetailId?: string;
        quantity?: string;
      }>;
      productItems?: Array<{
        packageId?: string;
        productDetailId?: string;
        quantity?: string;
      }>;
      shippingAddressId?: string;
      fulfillmentMethod?: string;
      pickupBranchName?: string;
      pickupBranchNote?: string;
      pickupRecipientName?: string;
      pickupPhone?: string;
      pickupEmail?: string;
      discountWalletAmount?: string;
      shoppingWalletAmount?: string;
      firmWalletAmount?: string;
      cashPaymentMethod?: string;
    },
  ) {
    try {
      const rawItems = Array.isArray(body.productItems)
        ? body.productItems
        : body.items;

      const items = Array.isArray(rawItems)
        ? rawItems
            .filter((item) => optionalString(item?.packageId) || optionalString(item?.productDetailId))
            .map((item) => ({
              packageId: optionalString(item?.packageId)
                ? requirePositiveIntegerString(item?.packageId, "items.packageId")
                : undefined,
              productDetailId: optionalString(item?.productDetailId)
                ? requirePositiveIntegerString(
                    item?.productDetailId,
                    "items.productDetailId",
                  )
                : undefined,
              quantity: optionalString(item?.quantity)
                ? requirePositiveIntegerString(item?.quantity, "items.quantity")
                : "1",
            }))
        : undefined;

      return await this.ordersService.createOrder({
        userId: requirePositiveIntegerString(body.userId, "userId"),
        packageId: optionalString(body.packageId)
          ? requirePositiveIntegerString(body.packageId, "packageId")
          : undefined,
        productDetailId: optionalString(body.productDetailId)
          ? requirePositiveIntegerString(body.productDetailId, "productDetailId")
          : undefined,
        quantity: optionalString(body.quantity)
          ? requirePositiveIntegerString(body.quantity, "quantity")
          : undefined,
        items,
        shippingAddressId: optionalString(body.shippingAddressId)
          ? requirePositiveIntegerString(body.shippingAddressId, "shippingAddressId")
          : undefined,
        fulfillmentMethod:
          optionalString(body.fulfillmentMethod)?.trim().toLowerCase() === "branch_pickup"
            ? "branch_pickup"
            : "delivery",
        pickupBranchName: optionalString(body.pickupBranchName),
        pickupBranchNote: optionalString(body.pickupBranchNote),
        pickupRecipientName: optionalString(body.pickupRecipientName),
        pickupPhone: optionalString(body.pickupPhone),
        pickupEmail: optionalString(body.pickupEmail),
        discountWalletAmount: optionalString(body.discountWalletAmount)
          ? requireDecimalString(body.discountWalletAmount, "discountWalletAmount")
          : undefined,
        shoppingWalletAmount: optionalString(body.shoppingWalletAmount)
          ? requireDecimalString(body.shoppingWalletAmount, "shoppingWalletAmount")
          : undefined,
        firmWalletAmount: optionalString(body.firmWalletAmount)
          ? requireDecimalString(body.firmWalletAmount, "firmWalletAmount")
          : undefined,
        cashPaymentMethod: optionalString(body.cashPaymentMethod),
      });
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":orderId/submit-transfer-slip")
  async submitTransferSlip(
    @Param("orderId") orderId: string,
    @Body() body: { transferSlipUrl: string; transferSlipNote?: string },
  ) {
    try {
      const order = await this.ordersService.submitTransferSlip({
        orderId: requirePositiveIntegerString(orderId, "orderId"),
        transferSlipUrl: requireNonEmptyString(
          body.transferSlipUrl,
          "transferSlipUrl",
        ),
        transferSlipNote: body.transferSlipNote
          ? requireNonEmptyString(body.transferSlipNote, "transferSlipNote")
          : undefined,
      });

      if (!order) {
        throw new NotFoundException("Order not found.");
      }

      return order;
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":orderId/ship")
  async markOrderShipped(
    @Param("orderId") orderId: string,
    @Body()
    body: {
      shipmentTrackingNo?: string;
      shipmentCarrier?: string;
      shipmentNote?: string;
    },
  ) {
    try {
      const order = await this.ordersService.markOrderShipped({
        orderId: requirePositiveIntegerString(orderId, "orderId"),
        shipmentTrackingNo: body.shipmentTrackingNo
          ? requireNonEmptyString(body.shipmentTrackingNo, "shipmentTrackingNo")
          : undefined,
        shipmentCarrier: body.shipmentCarrier
          ? requireNonEmptyString(body.shipmentCarrier, "shipmentCarrier")
          : undefined,
        shipmentNote: body.shipmentNote
          ? requireNonEmptyString(body.shipmentNote, "shipmentNote")
          : undefined,
      });

      if (!order) {
        throw new NotFoundException("Order not found.");
      }

      return order;
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":orderId/cancel")
  async cancelOrder(
    @Param("orderId") orderId: string,
    @Body() body: { reason?: string },
  ) {
    try {
      const order = await this.ordersService.cancelOrder({
        orderId: requirePositiveIntegerString(orderId, "orderId"),
        reason: optionalString(body.reason),
      });

      if (!order) {
        throw new NotFoundException("Order not found.");
      }

      return order;
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":orderId/deliver")
  async markOrderDelivered(
    @Param("orderId") orderId: string,
    @Body()
    body: {
      shipmentNote?: string;
    },
  ) {
    try {
      const order = await this.ordersService.markOrderDelivered({
        orderId: requirePositiveIntegerString(orderId, "orderId"),
        shipmentNote: body.shipmentNote
          ? requireNonEmptyString(body.shipmentNote, "shipmentNote")
          : undefined,
      });

      if (!order) {
        throw new NotFoundException("Order not found.");
      }

      return order;
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":orderId/approve")
  async approveOrder(@Param("orderId") orderId: string) {
    const order = await this.ordersService.approveOrder(
      requirePositiveIntegerString(orderId, "orderId"),
    );

    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    return order;
  }

  @Get(":orderId")
  async getOrder(@Param("orderId") orderId: string) {
    const order = await this.ordersService.getOrder(
      requirePositiveIntegerString(orderId, "orderId"),
    );

    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    return order;
  }

  @Roles("member")
  @Get(":orderId/receipt")
  async getOrderReceipt(
    @Param("orderId") orderId: string,
    @Req() request: any,
    @Res() response: any,
  ) {
    const validatedOrderId = requirePositiveIntegerString(orderId, "orderId");
    const order = await this.ordersService.getOrder(validatedOrderId);

    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    if (String(request?.authUser?.userId ?? "") !== order.sourceUserId) {
      throw new ForbiddenException("You do not have access to this receipt.");
    }

    const html = this.renderReceiptHtml(order);

    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Content-Disposition", `inline; filename="receipt-${order.orderNo}.html"`);
    response.send(html);
  }

  @Get(":orderId/snapshot")
  async getOrderSnapshot(@Param("orderId") orderId: string) {
    const validatedOrderId = requirePositiveIntegerString(orderId, "orderId");
    const order = await this.ordersService.getOrder(validatedOrderId);

    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    const [commissions, companyFallbacks] = await Promise.all([
      this.commissionsService.listCommissions({ orderId: validatedOrderId }),
      this.commissionsService.listCompanyFallbacks({ sourceRefId: validatedOrderId }),
    ]);

    return {
      order,
      commissions,
      companyFallbacks,
    };
  }

  @Post(":orderId/process-approved")
  async processApprovedOrder(@Param("orderId") orderId: string) {
    try {
      return await this.ordersService.handleApprovedOrder(
        requirePositiveIntegerString(orderId, "orderId"),
      );
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  @Post(":orderId/reprocess")
  async reprocessApprovedOrder(@Param("orderId") orderId: string) {
    try {
      return await this.ordersService.handleApprovedOrder(
        requirePositiveIntegerString(orderId, "orderId"),
        { forceRecompute: true },
      );
    } catch (error) {
      rethrowHttpError(error);
    }
  }

  private renderReceiptHtml(order: Awaited<ReturnType<OrdersService["getOrder"]>>): string {
    const company = {
      name: OrdersController.RECEIPT_COMPANY_NAME,
      nameEn: OrdersController.RECEIPT_COMPANY_NAME_EN,
      address: OrdersController.RECEIPT_COMPANY_ADDRESS,
      taxId: OrdersController.RECEIPT_COMPANY_TAX_ID,
      logoUrl: "/bao-api/16.png",
    };

    const safeOrder = order!;
    const rows = (safeOrder.productItems || safeOrder.items || [])
      .map((item, index) => {
        return `
          <tr>
            <td data-label="ลำดับ">${index + 1}</td>
            <td data-label="สินค้า">${this.escapeHtml(item.productName || "สินค้า")}</td>
            <td class="num" data-label="จำนวน">${item.quantity}</td>
            <td class="num" data-label="ราคาต่อหน่วย">${this.escapeHtml(item.unitPriceUsdt)}</td>
            <td class="num" data-label="PV">${this.escapeHtml(item.unitPv)}</td>
            <td class="num" data-label="รวม">${this.escapeHtml(item.lineTotalUsdt)}</td>
          </tr>
        `;
      })
      .join("");

    const fulfillmentLabel =
      safeOrder.fulfillmentMethod === "branch_pickup" ? "รับที่สาขา" : "จัดส่งถึงที่";
    const addressLine =
      safeOrder.fulfillmentMethod === "branch_pickup"
        ? safeOrder.pickupBranchName || "-"
        : safeOrder.shippingAddressLine || "-";
    const addressNote =
      safeOrder.fulfillmentMethod === "branch_pickup"
        ? safeOrder.pickupBranchNote || "-"
        : safeOrder.shippingAddressNote || safeOrder.shipmentNote || "-";

    return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ใบเสร็จรับเงิน ${this.escapeHtml(safeOrder.orderNo)}</title>
  <style>
    :root { --ink:#1e293b; --muted:#64748b; --line:#d9e2ec; --accent:#0f766e; --soft:#ecfeff; --bg:#f8fafc; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Arial, Helvetica, sans-serif; color:var(--ink); background:var(--bg); }
    .page { max-width:960px; margin:24px auto; background:#fff; padding:32px; box-shadow:0 18px 50px rgba(15,23,42,.08); border-radius:24px; }
    .actions { display:flex; justify-content:flex-end; margin-bottom:16px; }
    .actions button { border:0; border-radius:999px; padding:10px 16px; background:var(--accent); color:#fff; cursor:pointer; }
    .topbar { display:flex; justify-content:space-between; gap:24px; margin-bottom:24px; }
    .brand { display:flex; gap:18px; flex:1; }
    .brand-logo { width:74px; height:74px; object-fit:contain; }
    .brand h1,.doc h2 { margin:0; }
    .brand h1 { font-size:28px; }
    .subtitle { margin:4px 0 8px; font-size:14px; color:var(--muted); letter-spacing:.05em; }
    .value { font-size:15px; line-height:1.55; word-break:break-word; }
    .meta,.recipient,.summary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; margin-bottom:24px; }
    .card { border:1px solid var(--line); border-radius:16px; padding:16px 18px; }
    .label { display:block; font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; }
    table { width:100%; border-collapse:collapse; margin-bottom:24px; }
    th,td { border-bottom:1px solid var(--line); padding:12px 10px; text-align:left; vertical-align:top; font-size:14px; }
    th { background:var(--soft); color:var(--accent); font-weight:700; }
    .num { text-align:right; white-space:nowrap; }
    .footer-note { color:var(--muted); font-size:13px; line-height:1.6; border-top:1px dashed var(--line); padding-top:16px; }
    @media (max-width: 640px) {
      body { background:#fff; }
      .page { margin:0; border-radius:0; box-shadow:none; padding:16px 14px 24px; }
      .actions { position:sticky; top:0; background:#fff; padding-bottom:12px; margin-bottom:12px; }
      .actions button { width:100%; }
      .topbar, .brand { flex-direction:column; gap:12px; }
      .brand-logo { width:56px; height:56px; }
      .brand h1, .doc h2 { font-size:22px; }
      .subtitle { font-size:12px; }
      .meta, .recipient, .summary { grid-template-columns:1fr; gap:12px; margin-bottom:16px; }
      .card { padding:14px; border-radius:14px; }
      .value { font-size:14px; }
      table, thead, tbody, tr, th, td { display:block; width:100%; }
      thead { display:none; }
      tbody { display:grid; gap:12px; }
      tr { border:1px solid var(--line); border-radius:14px; overflow:hidden; background:#fff; }
      td { display:flex; justify-content:space-between; gap:12px; padding:10px 12px; font-size:13px; text-align:left; }
      td::before { content:attr(data-label); color:var(--accent); font-weight:700; flex:0 0 96px; }
      td.num { text-align:left; white-space:normal; }
      td[colspan] { display:block; text-align:center; }
      td[colspan]::before { content:none; }
    }
    @media print { body { background:#fff; } .page { margin:0; box-shadow:none; max-width:none; } .actions { display:none; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="actions"><button type="button" onclick="window.print()">พิมพ์เอกสาร</button></div>
    <div class="topbar">
      <div class="brand">
        <img class="brand-logo" src="${company.logoUrl}" alt="B Life Healthy logo" />
        <div>
          <h1>${company.name}</h1>
          <div class="subtitle">${company.nameEn}</div>
          <div class="value">${company.address}</div>
          <div class="value">เลขประจำตัวผู้เสียภาษี ${company.taxId}</div>
        </div>
      </div>
      <div class="doc">
        <h2>ใบเสร็จรับเงิน</h2>
        <div class="value">เลขที่เอกสาร RC-${this.escapeHtml(safeOrder.orderId)}-${this.escapeHtml(safeOrder.orderNo)}</div>
        <div class="value">วันที่พิมพ์ ${this.escapeHtml(new Date().toLocaleString())}</div>
      </div>
    </div>
    <div class="meta">
      <div class="card">
        <span class="label">Order</span>
        <div class="value">Order ID: #${this.escapeHtml(safeOrder.orderId)}</div>
        <div class="value">Order No: ${this.escapeHtml(safeOrder.orderNo)}</div>
        <div class="value">สถานะ: ${this.escapeHtml(safeOrder.status)}</div>
      </div>
      <div class="card">
        <span class="label">Payment</span>
        <div class="value">วันที่สร้าง: ${this.escapeHtml(safeOrder.createdAt)}</div>
        <div class="value">วันที่ชำระ: ${this.escapeHtml(safeOrder.transferSubmittedAt || "-")}</div>
        <div class="value">วันที่อนุมัติ: ${this.escapeHtml(safeOrder.approvedAt || "-")}</div>
      </div>
    </div>
    <div class="recipient">
      <div class="card">
        <span class="label">Member</span>
        <div class="value">User ID ${this.escapeHtml(safeOrder.sourceUserId)}</div>
        <div class="value">วิธีรับสินค้า: ${fulfillmentLabel}</div>
      </div>
      <div class="card">
        <span class="label">Address / Note</span>
        <div class="value">${this.escapeHtml(addressLine)}</div>
        <div class="value">หมายเหตุ: ${this.escapeHtml(addressNote)}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:64px;">ลำดับ</th>
          <th>สินค้า</th>
          <th class="num">จำนวน</th>
          <th class="num">ราคาต่อหน่วย</th>
          <th class="num">PV</th>
          <th class="num">รวม</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="6">ไม่พบรายการสินค้า</td></tr>'}</tbody>
    </table>
    <div class="summary">
      <div class="card">
        <span class="label">Summary</span>
        <div class="value">จำนวนรายการสินค้า ${this.escapeHtml(String((safeOrder.productItems || safeOrder.items || []).length))}</div>
        <div class="value">PV รวม ${this.escapeHtml(safeOrder.totalPv)}</div>
      </div>
      <div class="card">
        <span class="label">Amount</span>
        <div class="value">ยอดสุทธิ <strong>${this.escapeHtml(safeOrder.totalUsdt)}</strong> บาท</div>
      </div>
    </div>
    <div class="footer-note">เอกสารนี้สร้างจากระบบสมาชิกเพื่อใช้อ้างอิงคำสั่งซื้อและการชำระเงินของสมาชิก</div>
  </div>
</body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
