const state = {
  token: localStorage.getItem("adminAccessToken") || "",
  currentUserId: "",
};

const adminView = document.body.dataset.adminView || "dashboard";
const sessionCard = document.getElementById("sessionCard");
const loginForm = document.getElementById("loginForm");
const refreshButton = document.getElementById("refreshButton");
const logoutButton = document.getElementById("logoutButton");
const statusLine = document.getElementById("statusLine");
const memberSearchInput = document.getElementById("memberSearchInput");
const memberSortSelect = document.getElementById("memberSortSelect");
const orderUserFilterInput = document.getElementById("orderUserFilterInput");
const orderSortSelect = document.getElementById("orderSortSelect");
const commissionOrderFilterInput = document.getElementById("commissionOrderFilterInput");
const commissionBeneficiaryFilterInput = document.getElementById("commissionBeneficiaryFilterInput");
const poolPayoutDateInput = document.getElementById("poolPayoutDateInput");
const loadPoolPayoutsButton = document.getElementById("loadPoolPayoutsButton");
const focusLatestOrderButton = document.getElementById("focusLatestOrderButton");
const focusPendingOrdersButton = document.getElementById("focusPendingOrdersButton");
const focusLatestCommissionButton = document.getElementById("focusLatestCommissionButton");
const reloadPoolTodayButton = document.getElementById("reloadPoolTodayButton");
const orderStatusFilter = document.getElementById("orderStatusFilter");
const fallbackTypeFilter = document.getElementById("fallbackTypeFilter");
const memberDetailForm = document.getElementById("memberDetailForm");
const memberDetailOutput = document.getElementById("memberDetailOutput");
const actionOutput = document.getElementById("actionOutput");
const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistoryButton");
const commissionSettingsForm = document.getElementById("commissionSettingsForm");
const directLevelsList = document.getElementById("directLevelsList");
const addDirectLevelButton = document.getElementById("addDirectLevelButton");
const poolRateSettingsInput = document.getElementById("poolRateSettingsInput");
const cashbackRateSettingsInput = document.getElementById("cashbackRateSettingsInput");
const uniLevelsList = document.getElementById("uniLevelsList");
const addUniLevelButton = document.getElementById("addUniLevelButton");
const matrixSettingsForm = document.getElementById("matrixSettingsForm");
const walletSettingsForm = document.getElementById("walletSettingsForm");
const matrixOrganizationPvRateInput = document.getElementById("matrixOrganizationPvRateInput");
const matrixLevelRatesList = document.getElementById("matrixLevelRatesList");
const matrixBoardThresholdsList = document.getElementById("matrixBoardThresholdsList");
const matrixMemberForm = document.getElementById("matrixMemberForm");
const matrixOutput = document.getElementById("matrixOutput");
const matrixCycleCount = document.getElementById("matrixCycleCount");
const matrixActiveCycleCount = document.getElementById("matrixActiveCycleCount");
const matrixPayoutCount = document.getElementById("matrixPayoutCount");
const matrixPayoutTotal = document.getElementById("matrixPayoutTotal");
const matrixSummaryList = document.getElementById("matrixSummaryList");
const walletCommissionFeeRateInput = document.getElementById("walletCommissionFeeRateInput");
const walletTransferFeeRateInput = document.getElementById("walletTransferFeeRateInput");
const walletCommissionEnabledSelect = document.getElementById("walletCommissionEnabledSelect");
const walletTransferEnabledSelect = document.getElementById("walletTransferEnabledSelect");
const walletTopupEnabledSelect = document.getElementById("walletTopupEnabledSelect");
const walletSpendEnabledSelect = document.getElementById("walletSpendEnabledSelect");
const walletOrderCashMethodsInput = document.getElementById("walletOrderCashMethodsInput");
const walletTopupMethodsInput = document.getElementById("walletTopupMethodsInput");
const walletSettingsOutput = document.getElementById("walletSettingsOutput");
const walletTopupRequestUserFilterInput = document.getElementById("walletTopupRequestUserFilterInput");
const walletTopupRequestStatusFilter = document.getElementById("walletTopupRequestStatusFilter");
const matrixPayoutBeneficiaryInput = document.getElementById("matrixPayoutBeneficiaryInput");
const matrixPayoutOrderInput = document.getElementById("matrixPayoutOrderInput");
const createSupplierForm = document.getElementById("createSupplierForm");
const createCategoryForm = document.getElementById("createCategoryForm");
const createProductForm = document.getElementById("createProductForm");
const createProductDetailForm = document.getElementById("createProductDetailForm");
const createPackageForm = document.getElementById("createPackageForm");
const resetProductFormButton = document.getElementById("resetProductFormButton");
const createMemberForm = document.getElementById("createMemberForm");
const createOrderForm = document.getElementById("createOrderForm");
const activatePackageForm = document.getElementById("activatePackageForm");
const closePoolForm = document.getElementById("closePoolForm");
const orderPackageSelect = document.getElementById("orderPackageSelect");
const activatePackageSelect = document.getElementById("activatePackageSelect");
const packageCodeInput = document.getElementById("packageCodeInput");
const packageNameInput = document.getElementById("packageNameInput");
const packageDaysInput = document.getElementById("packageDaysInput");
const packageCapInput = document.getElementById("packageCapInput");
const packagePoolRateInput = document.getElementById("packagePoolRateInput");
const packageDetailSelect = document.getElementById("packageDetailSelect");
const packageDetailQtyInput = document.getElementById("packageDetailQtyInput");
const addPackageDetailButton = document.getElementById("addPackageDetailButton");
const packageItemsList = document.getElementById("packageItemsList");
const supplierCodeInput = document.getElementById("supplierCodeInput");
const supplierNameInput = document.getElementById("supplierNameInput");
const categorySupplierSelect = document.getElementById("categorySupplierSelect");
const categoryCodeInput = document.getElementById("categoryCodeInput");
const categoryNameInput = document.getElementById("categoryNameInput");
const productSupplierSelect = document.getElementById("productSupplierSelect");
const productCategorySelect = document.getElementById("productCategorySelect");
const productCodeInput = document.getElementById("productCodeInput");
const productNameInput = document.getElementById("productNameInput");
const productDetailProductSelect = document.getElementById("productDetailProductSelect");
const productDetailCodeInput = document.getElementById("productDetailCodeInput");
const productDetailNameInput = document.getElementById("productDetailNameInput");
const productDetailYoutubeUrlInput = document.getElementById("productDetailYoutubeUrlInput");
const productDetailImageUrlsInput = document.getElementById("productDetailImageUrlsInput");
const productDetailYoutubePreview = document.getElementById("productDetailYoutubePreview");
const productDetailImagePreviewGrid = document.getElementById("productDetailImagePreviewGrid");
const productDetailCostInput = document.getElementById("productDetailCostInput");
const productDetailMemberPriceInput = document.getElementById("productDetailMemberPriceInput");
const productDetailRetailPriceInput = document.getElementById("productDetailRetailPriceInput");
const productDetailPvInput = document.getElementById("productDetailPvInput");
const productDetailPoolRateInput = document.getElementById("productDetailPoolRateInput");
const supplierCountMetric = document.getElementById("supplierCountMetric");
const categoryCountMetric = document.getElementById("categoryCountMetric");
const catalogProductCountMetric = document.getElementById("catalogProductCountMetric");
const productDetailCountMetric = document.getElementById("productDetailCountMetric");
const workspaceTitle = document.getElementById("workspaceTitle");
const workspaceDescription = document.getElementById("workspaceDescription");
const workspaceAdminName = document.getElementById("workspaceAdminName");
const workspaceAdminMeta = document.getElementById("workspaceAdminMeta");
const ecommerceSectionDescription = document.getElementById("ecommerceSectionDescription");
const contentForm = document.getElementById("contentForm");
const contentKeyInput = document.getElementById("contentKeyInput");
const contentPlacementSelect = document.getElementById("contentPlacementSelect");
const contentTitleInput = document.getElementById("contentTitleInput");
const contentAudienceSelect = document.getElementById("contentAudienceSelect");
const contentStartInput = document.getElementById("contentStartInput");
const contentEndInput = document.getElementById("contentEndInput");
const contentSummaryInput = document.getElementById("contentSummaryInput");
const contentBodyInput = document.getElementById("contentBodyInput");
const resetContentButton = document.getElementById("resetContentButton");
const contentPreviewPlacement = document.getElementById("contentPreviewPlacement");
const contentPreviewTitle = document.getElementById("contentPreviewTitle");
const contentPreviewAudience = document.getElementById("contentPreviewAudience");
const contentPreviewSummary = document.getElementById("contentPreviewSummary");
const contentPreviewBody = document.getElementById("contentPreviewBody");
const notificationForm = document.getElementById("notificationForm");
const notificationNameInput = document.getElementById("notificationNameInput");
const notificationChannelSelect = document.getElementById("notificationChannelSelect");
const notificationAudienceSelect = document.getElementById("notificationAudienceSelect");
const notificationScheduleInput = document.getElementById("notificationScheduleInput");
const notificationCtaLabelInput = document.getElementById("notificationCtaLabelInput");
const notificationCtaRouteInput = document.getElementById("notificationCtaRouteInput");
const notificationHeadlineInput = document.getElementById("notificationHeadlineInput");
const notificationMessageInput = document.getElementById("notificationMessageInput");
const resetNotificationButton = document.getElementById("resetNotificationButton");
const notificationPreviewChannel = document.getElementById("notificationPreviewChannel");
const notificationPreviewAudience = document.getElementById("notificationPreviewAudience");
const notificationPreviewHeadline = document.getElementById("notificationPreviewHeadline");
const notificationPreviewMessage = document.getElementById("notificationPreviewMessage");
const notificationPreviewCta = document.getElementById("notificationPreviewCta");
const notificationPreviewSchedule = document.getElementById("notificationPreviewSchedule");
const salesOrdersTotalMetric = document.getElementById("salesOrdersTotalMetric");
const salesPendingMetric = document.getElementById("salesPendingMetric");
const salesApprovedMetric = document.getElementById("salesApprovedMetric");
const salesAveragePvMetric = document.getElementById("salesAveragePvMetric");
const salesLatestOrderLabel = document.getElementById("salesLatestOrderLabel");
const salesLatestCommissionLabel = document.getElementById("salesLatestCommissionLabel");
const salesPackageInventoryLabel = document.getElementById("salesPackageInventoryLabel");
const salesFocusLatestButton = document.getElementById("salesFocusLatestButton");
const salesFocusPendingButton = document.getElementById("salesFocusPendingButton");
const salesFocusCommissionButton = document.getElementById("salesFocusCommissionButton");
const shippingJobsMetric = document.getElementById("shippingJobsMetric");
const shippingPendingMetric = document.getElementById("shippingPendingMetric");
const shippingTransitMetric = document.getElementById("shippingTransitMetric");
const shippingDeliveredMetric = document.getElementById("shippingDeliveredMetric");
const shippingForm = document.getElementById("shippingForm");
const shippingOrderIdInput = document.getElementById("shippingOrderIdInput");
const shippingStatusSelect = document.getElementById("shippingStatusSelect");
const shippingCarrierInput = document.getElementById("shippingCarrierInput");
const shippingTrackingInput = document.getElementById("shippingTrackingInput");
const shippingWarehouseInput = document.getElementById("shippingWarehouseInput");
const shippingDispatchInput = document.getElementById("shippingDispatchInput");
const shippingNoteInput = document.getElementById("shippingNoteInput");
const shippingUseLatestOrderButton = document.getElementById("shippingUseLatestOrderButton");
const resetShippingButton = document.getElementById("resetShippingButton");
const shippingPreviewStatus = document.getElementById("shippingPreviewStatus");
const shippingPreviewWarehouse = document.getElementById("shippingPreviewWarehouse");
const shippingPreviewOrder = document.getElementById("shippingPreviewOrder");
const shippingPreviewCarrier = document.getElementById("shippingPreviewCarrier");
const shippingPreviewNote = document.getElementById("shippingPreviewNote");
const reportSalesPvMetric = document.getElementById("reportSalesPvMetric");
const reportApprovedRateMetric = document.getElementById("reportApprovedRateMetric");
const reportShipmentCoverageMetric = document.getElementById("reportShipmentCoverageMetric");
const reportAveragePackageMetric = document.getElementById("reportAveragePackageMetric");
const reportOrderMixLabel = document.getElementById("reportOrderMixLabel");
const reportShipmentMixLabel = document.getElementById("reportShipmentMixLabel");
const reportCatalogValueLabel = document.getElementById("reportCatalogValueLabel");
const reportOpsInsight1 = document.getElementById("reportOpsInsight1");
const reportOpsInsight2 = document.getElementById("reportOpsInsight2");
const reportOpsInsight3 = document.getElementById("reportOpsInsight3");
state.memberSearch = "";
state.orderUserId = "";
state.commissionOrderId = "";
state.commissionBeneficiaryUserId = "";
state.matrixPayoutBeneficiaryUserId = "";
state.matrixPayoutSourceOrderId = "";
state.pageSize = 8;
state.pages = {
  members: 1,
  orders: 1,
  pool: 1,
  fallbacks: 1,
  commissions: 1,
};
state.totals = {
  members: 0,
  orders: 0,
  pool: 0,
  fallbacks: 0,
  commissions: 0,
};
state.latestOrderId = "";
state.latestCommission = null;
state.memberSort = "created_desc";
state.orderSort = "created_desc";
state.actionHistory = JSON.parse(localStorage.getItem("adminActionHistory") || "[]");
state.settings = {
  directLevelRates: ["0.2"],
  uniLevelRates: ["0.05", "0.05", "0.05", "0.05", "0.05"],
  poolRate: "0.5",
  cashbackRate: "0",
};
state.matrixSettings = {
  boardWidth: 2,
  boardDepth: 3,
  boardCount: 3,
  organizationPvRate: "0.1",
  levelRates: ["0.1", "0.05", "0.03"],
  boardOpenPvThresholds: ["100", "100", "100"],
};
state.walletSettings = {
  commissionToShoppingEnabled: true,
  commissionToShoppingFeeRate: "0",
  walletTransferEnabled: true,
  walletTransferFeeRate: "0",
  walletTopupEnabled: true,
  shoppingWalletSpendEnabled: true,
  orderCashPaymentMethods: ["bank_transfer", "promptpay_qr", "cash"],
  walletTopupPaymentMethods: ["manual_bank", "promptpay_qr", "cash"],
};
state.walletTopupRequests = [];
state.walletTopupRequestUserId = "";
state.walletTopupRequestStatus = "";
state.suppliers = [];
state.categories = [];
state.products = [];
state.productDetails = [];
state.packageBuilderItems = [];
state.packageCatalogItems = [];
state.activeAdminMenu =
  localStorage.getItem("adminActiveMenu") || "overview";
state.activeEcommerceMenu =
  localStorage.getItem("adminActiveEcommerceMenu") || "catalog";
state.contentDrafts = [];
state.notificationDrafts = [];
state.shippingJobs = [];
state.orderItems = [];
state.commissionItems = [];

const adminMenuConfig = {
  overview: {
    title: "Overview",
    description:
      "High-level command center plus recommended admin areas to add next.",
  },
  marketing: {
    title: "Commission Setting",
    description:
      "Commission rates, matrix rules, pool cycles, and compensation configuration workspace.",
  },
  ecommerce: {
    title: "ระบบ eCommerce",
    description:
      "Product creation, package setup, order operations, and sales-related workflows.",
  },
  members: {
    title: "ข้อมูลสมาชิก / ค่าคอมมิชชั่น",
    description:
      "Member records, commission activity, profile lookup, and network-related operations.",
  },
  content: {
    title: "Member Content",
    description:
      "Planned space for banners, tutorials, CMS blocks, and publishing controls for member-facing screens.",
  },
  notifications: {
    title: "Notification",
    description:
      "Planned space for broadcast messaging, templates, targeting, and delivery reporting.",
  },
};

const ecommerceMenuConfig = {
  catalog: "จัดการสินค้า, product detail, package, และ catalog structure",
  sales: "ดูคำสั่งซื้อ, ใช้งาน quick actions, และจัดการ flow งานขายรายวัน",
  shipping: "พื้นที่สำหรับคิวจัดส่ง, tracking, packing, และสถานะขนส่ง",
  reports: "สรุปยอดขาย, operational KPI, pool/fallback snapshots, และประวัติการทำงาน",
};

function parseLineSeparatedUrls(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCommaSeparatedValues(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderProductDetailMediaPreview() {
  if (!productDetailYoutubePreview || !productDetailImagePreviewGrid) {
    return;
  }

  const youtubeUrl = productDetailYoutubeUrlInput?.value.trim() || "";
  const imageUrls = parseLineSeparatedUrls(productDetailImageUrlsInput?.value || "").slice(0, 10);

  if (youtubeUrl) {
    productDetailYoutubePreview.href = youtubeUrl;
    productDetailYoutubePreview.textContent = youtubeUrl;
    productDetailYoutubePreview.classList.remove("muted");
  } else {
    productDetailYoutubePreview.href = "#";
    productDetailYoutubePreview.textContent = "No YouTube link";
    productDetailYoutubePreview.classList.add("muted");
  }

  productDetailImagePreviewGrid.innerHTML = imageUrls.length
    ? imageUrls
        .map(
          (url, index) => `<figure class="product-detail-preview-card">
            <img src="${escapeHtml(url)}" alt="Preview ${index + 1}" loading="lazy" />
            <figcaption>${index + 1}. ${escapeHtml(url)}</figcaption>
          </figure>`,
        )
        .join("")
    : '<p class="muted">No images yet.</p>';
}

function renderContentPreview() {
  if (!contentPreviewTitle) {
    return;
  }

  contentPreviewPlacement.textContent =
    contentPlacementSelect?.selectedOptions?.[0]?.textContent || "Placement";
  contentPreviewTitle.textContent = contentTitleInput?.value.trim() || "Draft title";
  contentPreviewAudience.textContent =
    `Audience: ${contentAudienceSelect?.value || "all_members"}`;
  contentPreviewSummary.textContent =
    contentSummaryInput?.value.trim() || "Short summary will appear here.";
  contentPreviewBody.textContent =
    contentBodyInput?.value.trim() || "Detailed content preview.";
}

function renderContentDrafts() {
  renderTableRows(
    "contentDraftsTable",
    state.contentDrafts,
    (item) => `<tr>
      <td>${escapeHtml(item.key)}</td>
      <td>${escapeHtml(item.placement)}</td>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.audience)}</td>
      <td>${escapeHtml(item.startAt || "-")}</td>
      <td>${escapeHtml(item.status)}</td>
    </tr>`,
  );
}

function resetContentStudio() {
  contentForm?.reset();
  renderContentPreview();
}

function renderNotificationPreview() {
  if (!notificationPreviewHeadline) {
    return;
  }

  notificationPreviewChannel.textContent = (notificationChannelSelect?.value || "in_app").toUpperCase();
  notificationPreviewAudience.textContent = notificationAudienceSelect?.value || "all_members";
  notificationPreviewHeadline.textContent =
    notificationHeadlineInput?.value.trim() || "Draft headline";
  notificationPreviewMessage.textContent =
    notificationMessageInput?.value.trim() || "Notification message preview.";
  notificationPreviewCta.textContent =
    notificationCtaLabelInput?.value.trim() || "CTA";
  notificationPreviewSchedule.textContent =
    notificationScheduleInput?.value || "Send now";
}

function renderSalesWorkspace() {
  const visibleOrders = state.orderItems || [];
  const pendingCount = visibleOrders.filter(
    (item) => String(item.approvalStatus || "").toLowerCase() === "pending",
  ).length;
  const approvedCount = visibleOrders.filter(
    (item) => String(item.approvalStatus || "").toLowerCase() === "approved",
  ).length;
  const totalPv = visibleOrders.reduce(
    (sum, item) => sum + (Number(item.totalPv) || 0),
    0,
  );
  const averagePv = visibleOrders.length ? (totalPv / visibleOrders.length).toFixed(2) : "0";

  if (salesOrdersTotalMetric) {
    salesOrdersTotalMetric.textContent = String(state.totals.orders || 0);
  }

  if (salesPendingMetric) {
    salesPendingMetric.textContent = String(pendingCount);
  }

  if (salesApprovedMetric) {
    salesApprovedMetric.textContent = String(approvedCount);
  }

  if (salesAveragePvMetric) {
    salesAveragePvMetric.textContent = averagePv;
  }

  if (salesLatestOrderLabel) {
    const latestOrder = visibleOrders[0];
    salesLatestOrderLabel.textContent = latestOrder
      ? `${latestOrder.orderNo} · ${latestOrder.approvalStatus} · PV ${latestOrder.totalPv}`
      : "No order loaded";
  }

  if (salesLatestCommissionLabel) {
    const latestCommission = state.latestCommission;
    salesLatestCommissionLabel.textContent = latestCommission
      ? `${latestCommission.commissionType} · ${latestCommission.amount} · order ${latestCommission.orderId}`
      : "No commission loaded";
  }

  if (salesPackageInventoryLabel) {
    salesPackageInventoryLabel.textContent = `${state.packageCatalogItems.length} packages available for sales`;
  }
}

function renderNotificationQueue() {
  renderTableRows(
    "notificationQueueTable",
    state.notificationDrafts,
    (item) => `<tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.channel)}</td>
      <td>${escapeHtml(item.audience)}</td>
      <td>${escapeHtml(item.headline)}</td>
      <td>${escapeHtml(item.scheduleAt || "-")}</td>
      <td>${escapeHtml(item.status)}</td>
    </tr>`,
  );
}

function renderShippingPreview() {
  if (!shippingPreviewOrder) {
    return;
  }

  shippingPreviewStatus.textContent =
    (shippingStatusSelect?.value || "pending_pack").toUpperCase();
  shippingPreviewWarehouse.textContent =
    shippingWarehouseInput?.value.trim() || "Warehouse";
  shippingPreviewOrder.textContent =
    shippingOrderIdInput?.value.trim() || "Order ID";
  shippingPreviewCarrier.textContent = shippingCarrierInput?.value.trim()
    ? `${shippingCarrierInput.value.trim()}${shippingTrackingInput?.value.trim() ? ` · ${shippingTrackingInput.value.trim()}` : ""}`
    : "Carrier and tracking will appear here.";
  shippingPreviewNote.textContent =
    shippingNoteInput?.value.trim() || "Shipping note preview.";
}

function renderShippingQueue() {
  renderTableRows(
    "shippingQueueTable",
    state.shippingJobs,
    (item) => `<tr>
      <td>${escapeHtml(item.orderId)}</td>
      <td>${escapeHtml(item.status)}</td>
      <td>${escapeHtml(item.carrier || "-")}</td>
      <td>${escapeHtml(item.trackingNo || "-")}</td>
      <td>${escapeHtml(item.warehouse || "-")}</td>
      <td>${escapeHtml(item.dispatchAt || "-")}</td>
    </tr>`,
  );
}

function renderShippingWorkspace() {
  const jobs = state.shippingJobs || [];
  const pendingPack = jobs.filter((item) => item.status === "pending_pack").length;
  const inTransit = jobs.filter((item) => item.status === "shipped").length;
  const delivered = jobs.filter((item) => item.status === "delivered").length;

  if (shippingJobsMetric) {
    shippingJobsMetric.textContent = String(jobs.length);
  }

  if (shippingPendingMetric) {
    shippingPendingMetric.textContent = String(pendingPack);
  }

  if (shippingTransitMetric) {
    shippingTransitMetric.textContent = String(inTransit);
  }

  if (shippingDeliveredMetric) {
    shippingDeliveredMetric.textContent = String(delivered);
  }

  renderShippingQueue();
}

function renderReportsWorkspace() {
  const orders = state.orderItems || [];
  const shipments = state.shippingJobs || [];
  const packages = state.packageCatalogItems || [];
  const totalPv = orders.reduce((sum, item) => sum + (Number(item.totalPv) || 0), 0);
  const approvedCount = orders.filter(
    (item) => String(item.approvalStatus || "").toLowerCase() === "approved",
  ).length;
  const pendingCount = orders.filter(
    (item) => String(item.approvalStatus || "").toLowerCase() === "pending",
  ).length;
  const approvedRate = orders.length ? ((approvedCount / orders.length) * 100).toFixed(1) : "0.0";
  const shipmentCoverage = approvedCount
    ? ((shipments.length / approvedCount) * 100).toFixed(1)
    : "0.0";
  const averagePackagePrice = packages.length
    ? (
        packages.reduce((sum, item) => sum + (Number(item.memberPriceUsdt) || 0), 0) /
        packages.length
      ).toFixed(2)
    : "0.00";
  const deliveredCount = shipments.filter((item) => item.status === "delivered").length;
  const shippedCount = shipments.filter((item) => item.status === "shipped").length;

  if (reportSalesPvMetric) {
    reportSalesPvMetric.textContent = `${totalPv}`;
  }

  if (reportApprovedRateMetric) {
    reportApprovedRateMetric.textContent = `${approvedRate}%`;
  }

  if (reportShipmentCoverageMetric) {
    reportShipmentCoverageMetric.textContent = `${shipmentCoverage}%`;
  }

  if (reportAveragePackageMetric) {
    reportAveragePackageMetric.textContent = `${averagePackagePrice}`;
  }

  if (reportOrderMixLabel) {
    reportOrderMixLabel.textContent = `${approvedCount} approved / ${pendingCount} pending from ${orders.length} visible orders`;
  }

  if (reportShipmentMixLabel) {
    reportShipmentMixLabel.textContent = `${shippedCount} in transit / ${deliveredCount} delivered across ${shipments.length} shipment jobs`;
  }

  if (reportCatalogValueLabel) {
    reportCatalogValueLabel.textContent = `${packages.length} packages with average member price ${averagePackagePrice}`;
  }

  if (reportOpsInsight1) {
    reportOpsInsight1.textContent = pendingCount
      ? `${pendingCount} pending orders need approval attention in the current visible set.`
      : "No pending orders in the current visible set.";
  }

  if (reportOpsInsight2) {
    reportOpsInsight2.textContent = approvedCount > shipments.length
      ? `${approvedCount - shipments.length} approved orders still have no shipment job tracked locally.`
      : "Shipment tracking covers all approved orders currently visible.";
  }

  if (reportOpsInsight3) {
    reportOpsInsight3.textContent = `${state.totals.fallbacks || 0} fallback records and ${state.totals.pool || 0} pool cycles are available for report cross-checking.`;
  }

  renderTableRows(
    "salesReportTable",
    [
      {
        metric: "Visible Sales PV",
        value: `${totalPv}`,
        comment: "PV total from the currently loaded order page.",
      },
      {
        metric: "Approved Rate",
        value: `${approvedRate}%`,
        comment: "Approved orders divided by visible orders.",
      },
      {
        metric: "Shipment Coverage",
        value: `${shipmentCoverage}%`,
        comment: "Local shipment jobs compared with approved orders.",
      },
      {
        metric: "Average Package Price",
        value: `${averagePackagePrice}`,
        comment: "Average member price from package catalog.",
      },
    ],
    (row) => `<tr><td>${row.metric}</td><td>${row.value}</td><td>${row.comment}</td></tr>`,
  );

  renderTableRows(
    "operationsReportTable",
    [
      {
        area: "Orders",
        status: pendingCount ? "attention" : "stable",
        summary: pendingCount
          ? `${pendingCount} pending orders awaiting approval.`
          : "No pending orders in current view.",
      },
      {
        area: "Shipping",
        status: approvedCount > shipments.length ? "gap" : "covered",
        summary:
          approvedCount > shipments.length
            ? `${approvedCount - shipments.length} approved orders have no local shipment job.`
            : "Approved orders are covered by local shipment jobs.",
      },
      {
        area: "Catalog",
        status: packages.length ? "ready" : "empty",
        summary: `${packages.length} packages available for commerce operations.`,
      },
    ],
    (row) => `<tr><td>${row.area}</td><td>${row.status}</td><td>${row.summary}</td></tr>`,
  );
}

function resetShippingWorkspace() {
  shippingForm?.reset();
  renderShippingPreview();
}

function resetNotificationStudio() {
  notificationForm?.reset();
  renderNotificationPreview();
}

function renderAdminWorkspaceHeader() {
  const menu = adminMenuConfig[state.activeAdminMenu] || adminMenuConfig.overview;

  if (workspaceTitle) {
    workspaceTitle.textContent = menu.title;
  }

  if (workspaceDescription) {
    workspaceDescription.textContent = menu.description;
  }

  if (ecommerceSectionDescription) {
    ecommerceSectionDescription.textContent =
      ecommerceMenuConfig[state.activeEcommerceMenu] || ecommerceMenuConfig.catalog;
  }
}

function applyAdminMenuVisibility() {
  const activeMenu = state.activeAdminMenu || "overview";
  document.body.dataset.activeAdminMenu = activeMenu;

  document.querySelectorAll("[data-menu-section]").forEach((element) => {
    const sections = String(element.dataset.menuSection || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    element.hidden = !sections.includes(activeMenu);
  });

  document.querySelectorAll("[data-menu-target]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.menuTarget === activeMenu);
  });

  document.querySelectorAll("[data-ecommerce-section]").forEach((element) => {
    const sections = String(element.dataset.ecommerceSection || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    element.hidden = activeMenu !== "ecommerce" || !sections.includes(state.activeEcommerceMenu);
  });

  document.querySelectorAll("[data-ecommerce-target]").forEach((button) => {
    button.classList.toggle(
      "is-active",
      activeMenu === "ecommerce" && button.dataset.ecommerceTarget === state.activeEcommerceMenu,
    );
  });
}

function setActiveAdminMenu(menu) {
  if (!adminMenuConfig[menu]) {
    return;
  }

  state.activeAdminMenu = menu;
  localStorage.setItem("adminActiveMenu", menu);
  renderAdminWorkspaceHeader();
  applyAdminMenuVisibility();
}

function setActiveEcommerceMenu(menu) {
  if (!ecommerceMenuConfig[menu]) {
    return;
  }

  state.activeEcommerceMenu = menu;
  localStorage.setItem("adminActiveEcommerceMenu", menu);
  renderAdminWorkspaceHeader();
  applyAdminMenuVisibility();
}

function setAuthState(isAuthenticated) {
  document.body.classList.toggle("is-authenticated", isAuthenticated);
  document.body.classList.toggle("is-logged-out", !isAuthenticated);
}

function setStatus(message) {
  if (statusLine) {
    statusLine.textContent = message;
  }
}

function setActionOutput(label, data) {
  if (actionOutput) {
    actionOutput.textContent = `${label}\n\n${JSON.stringify(data, null, 2)}`;
  }
}

function renderProductPreview() {
  const previewTitle = document.getElementById("productPreviewTitle");
  const previewCode = document.getElementById("productPreviewCode");
  const previewCost = document.getElementById("productPreviewCost");
  const previewMemberPrice = document.getElementById("productPreviewMemberPrice");
  const previewRetailPrice = document.getElementById("productPreviewRetailPrice");
  const previewPv = document.getElementById("productPreviewPv");
  const previewPoolRate = document.getElementById("productPreviewPoolRate");
  const previewDays = document.getElementById("productPreviewDays");
  const previewCap = document.getElementById("productPreviewCap");
  const previewItemCount = document.getElementById("productPreviewItemCount");

  if (!previewTitle) {
    return;
  }

  const totals = state.packageBuilderItems.reduce(
    (summary, item) => {
      const detail = state.productDetails.find(
        (productDetail) => productDetail.productDetailId === item.productDetailId,
      );

      if (!detail) {
        return summary;
      }

      const qty = Number(item.qty) || 0;
      summary.cost += (Number(detail.costPriceUsdt) || 0) * qty;
      summary.member += (Number(detail.memberPriceUsdt) || 0) * qty;
      summary.retail += (Number(detail.retailPriceUsdt) || 0) * qty;
      summary.pv += (Number(detail.pv) || 0) * qty;
      summary.items += qty;
      return summary;
    },
    { cost: 0, member: 0, retail: 0, pv: 0, items: 0 },
  );

  previewTitle.textContent = packageNameInput?.value.trim() || "Untitled Product";
  previewCode.textContent = packageCodeInput?.value.trim() || "NO-CODE";
  previewCost.textContent = `${totals.cost} USDT`;
  previewMemberPrice.textContent = `${totals.member} USDT`;
  previewRetailPrice.textContent = `${totals.retail} USDT`;
  previewPv.textContent = `${totals.pv} PV`;
  previewPoolRate.textContent = `${packagePoolRateInput?.value.trim() || "0"}%`;
  previewDays.textContent = `${packageDaysInput?.value.trim() || "0"} days`;
  previewCap.textContent = packageCapInput?.value.trim() || "0";
  previewItemCount.textContent = `${totals.items} items`;
}

function resetProductForm() {
  createPackageForm.reset();
  packageDaysInput.value = "30";
  packageCapInput.value = "360";
  packagePoolRateInput.value = "10";
  packageDetailQtyInput.value = "1";
  state.packageBuilderItems = [];
  renderPackageItemRows();
  renderProductPreview();
}

function populateProductForm(pkg) {
  if (!pkg) {
    return;
  }

  packageCodeInput.value = pkg.code || "";
  packageNameInput.value = pkg.name || "";
  packageDaysInput.value = `${pkg.activeDays || ""}`;
  packageCapInput.value = pkg.earningCapAmount || "";
  packagePoolRateInput.value = pkg.poolRate ? `${Number(pkg.poolRate) * 100}` : "0";
  state.packageBuilderItems = [];
  renderPackageItemRows();
  renderProductPreview();
}

function renderCatalogEntityMetrics() {
  if (!supplierCountMetric) {
    return;
  }

  supplierCountMetric.textContent = `${state.suppliers.length}`;
  categoryCountMetric.textContent = `${state.categories.length}`;
  catalogProductCountMetric.textContent = `${state.products.length}`;
  productDetailCountMetric.textContent = `${state.productDetails.length}`;
}

function renderCatalogSelectors() {
  if (!categorySupplierSelect) {
    return;
  }

  const supplierOptions = [
    '<option value="">Pick supplier</option>',
    ...state.suppliers.map(
      (supplier) =>
        `<option value="${supplier.supplierId}">${supplier.code} · ${supplier.name}</option>`,
    ),
  ].join("");
  const categoryOptions = [
    '<option value="">Pick category</option>',
    ...state.categories.map(
      (category) =>
        `<option value="${category.categoryId}">${category.code} · ${category.name}</option>`,
    ),
  ].join("");
  const productOptions = [
    '<option value="">Pick product</option>',
    ...state.products.map(
      (product) => `<option value="${product.productId}">${product.code} · ${product.name}</option>`,
    ),
  ].join("");
  const detailOptions = [
    '<option value="">Pick product detail</option>',
    ...state.productDetails.map(
      (detail) =>
        `<option value="${detail.productDetailId}">${detail.code} · ${detail.name} · Member ${detail.memberPriceUsdt}</option>`,
    ),
  ].join("");

  categorySupplierSelect.innerHTML = supplierOptions;
  productSupplierSelect.innerHTML = supplierOptions;
  productCategorySelect.innerHTML = categoryOptions;
  productDetailProductSelect.innerHTML = productOptions;
  packageDetailSelect.innerHTML = detailOptions;
}

function renderPackageItemRows() {
  if (!packageItemsList) {
    return;
  }

  if (!state.packageBuilderItems.length) {
    packageItemsList.innerHTML = '<p class="muted">No product details selected yet.</p>';
    renderProductPreview();
    return;
  }

  packageItemsList.innerHTML = state.packageBuilderItems
    .map((item) => {
      const detail = state.productDetails.find(
        (productDetail) => productDetail.productDetailId === item.productDetailId,
      );

      if (!detail) {
        return "";
      }

      return `<div class="package-item-row">
        <div class="package-item-meta">
          <strong>${detail.code} · ${detail.name}</strong>
          <span>${detail.productCode} · Cost ${detail.costPriceUsdt} · Member ${detail.memberPriceUsdt} · PV ${detail.pv}</span>
        </div>
        <input type="number" min="1" value="${item.qty}" data-package-item-qty="${item.productDetailId}" />
        <button type="button" class="ghost" data-action="remove-package-item" data-product-detail-id="${item.productDetailId}">Remove</button>
      </div>`;
    })
    .join("");
  renderProductPreview();
}

function renderHistory() {
  if (!historyList) {
    return;
  }

  if (!state.actionHistory.length) {
    historyList.innerHTML = '<p class="muted">No actions yet.</p>';
    return;
  }

  historyList.innerHTML = state.actionHistory
    .map(
      (item) => `<article class="history-item">
        <strong>${item.label}</strong>
        <div class="muted">${item.message}</div>
        <div class="muted">${item.at}</div>
      </article>`,
    )
    .join("");
}

function pushHistory(label, message) {
  state.actionHistory = [
    {
      label,
      message,
      at: new Date().toISOString(),
    },
    ...state.actionHistory,
  ].slice(0, 12);
  localStorage.setItem("adminActionHistory", JSON.stringify(state.actionHistory));
  renderHistory();
}

function confirmAction(message) {
  return window.confirm(message);
}

function decimalToPercentString(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value;
  }

  return `${numericValue * 100}`;
}

function percentToDecimalString(value) {
  const trimmed = value.trim();
  const numericValue = Number(trimmed);

  if (!trimmed || !Number.isFinite(numericValue)) {
    return trimmed;
  }

  return `${numericValue / 100}`;
}

function renderRateLevelRows(listElement, rates, inputKey, removeAction) {
  if (!listElement) {
    return;
  }

  listElement.innerHTML = rates
    .map(
      (rate, index) => `<label class="settings-level-row">
        <span>Level ${index + 1}</span>
        <input type="text" data-${inputKey}="${index}" value="${rate}" required />
        <button type="button" class="ghost" data-action="${removeAction}" data-level-index="${index}">Remove</button>
      </label>`,
    )
    .join("");
}

function renderSimpleValueRows(listElement, values, inputKey, labelPrefix) {
  if (!listElement) {
    return;
  }

  listElement.innerHTML = values
    .map(
      (value, index) => `<label class="settings-level-row">
        <span>${labelPrefix} ${index + 1}</span>
        <input type="text" data-${inputKey}="${index}" value="${value}" required />
      </label>`,
    )
    .join("");
}

function renderCommissionSettings() {
  if (
    !poolRateSettingsInput ||
    !cashbackRateSettingsInput ||
    !directLevelsList ||
    !uniLevelsList
  ) {
    return;
  }

  poolRateSettingsInput.value = decimalToPercentString(state.settings.poolRate);
  cashbackRateSettingsInput.value = decimalToPercentString(
    state.settings.cashbackRate,
  );
  renderRateLevelRows(
    directLevelsList,
    state.settings.directLevelRates.map(decimalToPercentString),
    "direct-level-rate",
    "remove-direct-level",
  );
  renderRateLevelRows(
    uniLevelsList,
    state.settings.uniLevelRates.map(decimalToPercentString),
    "uni-level-rate",
    "remove-uni-level",
  );
}

function renderWalletSettings() {
  if (!walletCommissionFeeRateInput) {
    return;
  }

  walletCommissionFeeRateInput.value = decimalToPercentString(
    state.walletSettings.commissionToShoppingFeeRate,
  );
  walletTransferFeeRateInput.value = decimalToPercentString(
    state.walletSettings.walletTransferFeeRate,
  );
  walletCommissionEnabledSelect.value = String(
    Boolean(state.walletSettings.commissionToShoppingEnabled),
  );
  walletTransferEnabledSelect.value = String(
    Boolean(state.walletSettings.walletTransferEnabled),
  );
  walletTopupEnabledSelect.value = String(
    Boolean(state.walletSettings.walletTopupEnabled),
  );
  walletSpendEnabledSelect.value = String(
    Boolean(state.walletSettings.shoppingWalletSpendEnabled),
  );
  walletOrderCashMethodsInput.value = (state.walletSettings.orderCashPaymentMethods || []).join(", ");
  walletTopupMethodsInput.value = (state.walletSettings.walletTopupPaymentMethods || []).join(", ");

  if (walletSettingsOutput) {
    walletSettingsOutput.textContent = JSON.stringify(state.walletSettings, null, 2);
  }
}

function collectRateInputs(selector) {
  return Array.from(document.querySelectorAll(selector)).map((input) =>
    input.value.trim(),
  );
}

function collectDirectLevelRates() {
  return collectRateInputs("[data-direct-level-rate]").map(percentToDecimalString);
}

function collectUniLevelRates() {
  return collectRateInputs("[data-uni-level-rate]").map(percentToDecimalString);
}

async function loadCommissionSettings() {
  const settings = await request("/settings/commissions");
  state.settings = {
    directLevelRates:
      settings.directLevelRates && settings.directLevelRates.length > 0
        ? settings.directLevelRates
        : settings.directRate
          ? [settings.directRate]
          : ["0.2"],
    uniLevelRates: settings.uniLevelRates,
    poolRate: settings.poolRate,
    cashbackRate: settings.cashbackRate || "0",
  };
  renderCommissionSettings();
}

async function loadWalletSettings() {
  const settings = await request("/settings/wallets");
  state.walletSettings = {
    commissionToShoppingEnabled: Boolean(settings.commissionToShoppingEnabled),
    commissionToShoppingFeeRate: settings.commissionToShoppingFeeRate || "0",
    walletTransferEnabled: Boolean(settings.walletTransferEnabled),
    walletTransferFeeRate: settings.walletTransferFeeRate || "0",
    walletTopupEnabled: Boolean(settings.walletTopupEnabled),
    shoppingWalletSpendEnabled: Boolean(settings.shoppingWalletSpendEnabled),
    orderCashPaymentMethods: settings.orderCashPaymentMethods || [],
    walletTopupPaymentMethods: settings.walletTopupPaymentMethods || [],
  };
  renderWalletSettings();
}

async function saveWalletSettings() {
  const result = await request("/settings/wallets", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commissionToShoppingEnabled: walletCommissionEnabledSelect.value === "true",
      commissionToShoppingFeeRate: percentToDecimalString(walletCommissionFeeRateInput.value),
      walletTransferEnabled: walletTransferEnabledSelect.value === "true",
      walletTransferFeeRate: percentToDecimalString(walletTransferFeeRateInput.value),
      walletTopupEnabled: walletTopupEnabledSelect.value === "true",
      shoppingWalletSpendEnabled: walletSpendEnabledSelect.value === "true",
      orderCashPaymentMethods: parseCommaSeparatedValues(walletOrderCashMethodsInput.value),
      walletTopupPaymentMethods: parseCommaSeparatedValues(walletTopupMethodsInput.value),
    }),
  });

  state.walletSettings = {
    commissionToShoppingEnabled: Boolean(result.commissionToShoppingEnabled),
    commissionToShoppingFeeRate: result.commissionToShoppingFeeRate,
    walletTransferEnabled: Boolean(result.walletTransferEnabled),
    walletTransferFeeRate: result.walletTransferFeeRate,
    walletTopupEnabled: Boolean(result.walletTopupEnabled),
    shoppingWalletSpendEnabled: Boolean(result.shoppingWalletSpendEnabled),
    orderCashPaymentMethods: result.orderCashPaymentMethods || [],
    walletTopupPaymentMethods: result.walletTopupPaymentMethods || [],
  };
  renderWalletSettings();
  setActionOutput("Wallet settings saved", result);
  pushHistory(
    "Wallet Settings",
    `Saved cash methods ${state.walletSettings.orderCashPaymentMethods.join(", ")} and top-up methods ${state.walletSettings.walletTopupPaymentMethods.join(", ")}`,
  );
}

async function loadWalletTopupRequests() {
  const query = new URLSearchParams();
  if (state.walletTopupRequestUserId) {
    query.set("userId", state.walletTopupRequestUserId);
  }
  if (state.walletTopupRequestStatus) {
    query.set("status", state.walletTopupRequestStatus);
  }

  const result = await request(
    `/wallets/topup-requests${query.toString() ? `?${query.toString()}` : ""}`,
  );
  state.walletTopupRequests = Array.isArray(result) ? result : [];

  renderTableRows(
    "walletTopupRequestsTable",
    state.walletTopupRequests,
    (requestItem) => `<tr>
      <td>${requestItem.requestId}</td>
      <td>${requestItem.userId}</td>
      <td>${requestItem.amount}</td>
      <td>${requestItem.paymentMethod}</td>
      <td>${requestItem.status}</td>
      <td>${requestItem.requestedAt}</td>
      <td>${requestItem.transferSlipUrl ? `<a href="${escapeHtml(requestItem.transferSlipUrl)}" target="_blank" rel="noreferrer">Slip</a>` : "-"}</td>
      <td>
        <div class="table-actions">
          <button type="button" data-action="approve-wallet-topup-request" data-request-id="${requestItem.requestId}" ${requestItem.status !== "pending" ? "disabled" : ""}>Approve</button>
          <button type="button" class="secondary" data-action="reject-wallet-topup-request" data-request-id="${requestItem.requestId}" ${requestItem.status !== "pending" ? "disabled" : ""}>Reject</button>
          <button type="button" class="secondary" data-action="wallet-topup-request-detail" data-request-id="${requestItem.requestId}">Detail</button>
        </div>
      </td>
    </tr>`,
  );
}

function renderMatrixSettings() {
  if (
    !matrixOrganizationPvRateInput ||
    !matrixLevelRatesList ||
    !matrixBoardThresholdsList
  ) {
    return;
  }

  matrixOrganizationPvRateInput.value = decimalToPercentString(
    state.matrixSettings.organizationPvRate,
  );
  renderSimpleValueRows(
    matrixLevelRatesList,
    state.matrixSettings.levelRates.map(decimalToPercentString),
    "matrix-level-rate",
    "Level",
  );
  renderSimpleValueRows(
    matrixBoardThresholdsList,
    state.matrixSettings.boardOpenPvThresholds,
    "matrix-board-threshold",
    "Board",
  );
}

function collectMatrixLevelRates() {
  return collectRateInputs("[data-matrix-level-rate]").map(percentToDecimalString);
}

function collectMatrixBoardThresholds() {
  return collectRateInputs("[data-matrix-board-threshold]");
}

async function loadMatrixSettings() {
  const settings = await request("/settings/matrix");
  state.matrixSettings = {
    boardWidth: settings.boardWidth,
    boardDepth: settings.boardDepth,
    boardCount: settings.boardCount,
    organizationPvRate: settings.organizationPvRate,
    levelRates: settings.levelRates,
    boardOpenPvThresholds: settings.boardOpenPvThresholds,
  };
  renderMatrixSettings();
}

function renderMatrixSummary(summary) {
  if (
    !matrixCycleCount ||
    !matrixActiveCycleCount ||
    !matrixPayoutCount ||
    !matrixPayoutTotal ||
    !matrixSummaryList
  ) {
    return;
  }

  matrixCycleCount.textContent = String(summary.cycleCount || 0);
  matrixActiveCycleCount.textContent = String(summary.activeCycleCount || 0);
  matrixPayoutCount.textContent = String(summary.payoutCount || 0);
  matrixPayoutTotal.textContent = summary.payoutTotal || "0";

  if (!summary.latestCycles || summary.latestCycles.length === 0) {
    matrixSummaryList.innerHTML = '<p class="muted">No matrix cycles yet.</p>';
    return;
  }

  matrixSummaryList.innerHTML = summary.latestCycles
    .map(
      (cycle) => `<article class="history-item">
        <strong>${cycle.memberCode} · Cycle ${cycle.cycleNo}</strong>
        <div class="muted">PV ${cycle.totalAccumulatedPv} · Board ${cycle.currentBoardNo} · ${cycle.status}</div>
        <div class="muted">${cycle.boards
          .map(
            (board) =>
              `B${board.boardNo}: ${board.filledSlots}/${board.slotCount} slots · PV ${board.accumulatedPv}/${board.openThresholdPv} · ${board.status}`,
          )
          .join(" | ")}</div>
      </article>`,
    )
    .join("");
}

async function loadMatrixSummary() {
  const summary = await request("/matrix/summary");
  renderMatrixSummary(summary);
}

async function loadMatrixPayouts() {
  const query = new URLSearchParams();
  if (state.matrixPayoutBeneficiaryUserId) {
    query.set("beneficiaryUserId", state.matrixPayoutBeneficiaryUserId);
  }
  if (state.matrixPayoutSourceOrderId) {
    query.set("sourceOrderId", state.matrixPayoutSourceOrderId);
  }

  const result = await request(
    `/matrix/payouts?page=1&pageSize=20${query.toString() ? `&${query.toString()}` : ""}`,
  );
  const rows = Array.isArray(result) ? result : result.items || [];

  renderTableRows(
    "matrixPayoutsTable",
    rows,
    (payout) => `<tr>
      <td>${payout.payoutId}</td>
      <td>${payout.cycleId}</td>
      <td>${payout.boardNo}</td>
      <td>${payout.levelNo}</td>
      <td>${payout.beneficiaryUserId}</td>
      <td>${payout.sourceOrderId ?? "-"}</td>
      <td>${decimalToPercentString(payout.rate)}%</td>
      <td>${payout.basePv}</td>
      <td>${payout.amount}</td>
      <td>${payout.status}</td>
    </tr>`,
  );
}

async function saveMatrixSettings() {
  const result = await request("/settings/matrix", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organizationPvRate: percentToDecimalString(
        matrixOrganizationPvRateInput.value,
      ),
      levelRates: collectMatrixLevelRates(),
      boardOpenPvThresholds: collectMatrixBoardThresholds(),
    }),
  });

  state.matrixSettings = {
    boardWidth: result.boardWidth,
    boardDepth: result.boardDepth,
    boardCount: result.boardCount,
    organizationPvRate: result.organizationPvRate,
    levelRates: result.levelRates,
    boardOpenPvThresholds: result.boardOpenPvThresholds,
  };
  renderMatrixSettings();
  setActionOutput("Matrix settings saved", result);
  pushHistory(
    "Matrix Settings",
    `Saved matrix ${state.matrixSettings.boardWidth}x${state.matrixSettings.boardDepth} with ${state.matrixSettings.boardCount} boards`,
  );
}

async function loadMemberMatrix(memberId) {
  if (!memberId) {
    matrixOutput.textContent = "Enter a member ID.";
    return;
  }

  setStatus(`Loading matrix ${memberId}`);
  const result = await request(`/matrix/member/${memberId}`);
  matrixOutput.textContent = JSON.stringify(result, null, 2);
  setStatus(`Loaded matrix ${memberId}`);
}

async function saveCommissionSettings() {
  const result = await request("/settings/commissions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      directLevelRates: collectDirectLevelRates(),
      uniLevelRates: collectUniLevelRates(),
      poolRate: percentToDecimalString(poolRateSettingsInput.value),
      cashbackRate: percentToDecimalString(cashbackRateSettingsInput.value),
    }),
  });

  state.settings = {
    directLevelRates: result.directLevelRates,
    uniLevelRates: result.uniLevelRates,
    poolRate: result.poolRate,
    cashbackRate: result.cashbackRate,
  };
  renderCommissionSettings();
  setActionOutput("Commission settings saved", result);
  pushHistory(
    "Commission Settings",
    `Saved ${result.directLevels} direct levels, ${result.uniLevels} uni levels, pool ${decimalToPercentString(result.poolRate)}%, cashback ${decimalToPercentString(result.cashbackRate)}%`,
  );
}

function setToken(token) {
  state.token = token;
  if (token) {
    localStorage.setItem("adminAccessToken", token);
  } else {
    localStorage.removeItem("adminAccessToken");
  }
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (response.status === 401 || response.status === 403) {
    handleSessionFailure(data?.message || `Request failed: ${response.status}`);
    throw new Error(data?.message || `Request failed: ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(data?.message || `Request failed: ${response.status}`);
  }

  return data;
}

function handleSessionFailure(message) {
  setToken("");
  renderSession(null);
  setStatus(message || "Session expired.");

  if (adminView === "dashboard") {
    window.setTimeout(() => {
      window.location.href = "/admin";
    }, 300);
  }
}

function renderTableRows(elementId, rows, renderRow) {
  const target = document.getElementById(elementId);
  if (!target) {
    return;
  }

  target.innerHTML =
    rows.length > 0
      ? rows.map(renderRow).join("")
      : `<tr><td colspan="5" class="muted">No data</td></tr>`;
}

function getListItems(result) {
  return Array.isArray(result) ? result : result?.items || [];
}

function getListTotal(result) {
  return Array.isArray(result) ? result.length : result?.total || 0;
}

function paginateRows(rows, key) {
  const totalPages = Math.max(
    1,
    Math.ceil((state.totals[key] || rows.length) / state.pageSize),
  );
  state.pages[key] = Math.min(state.pages[key] || 1, totalPages);
  const page = state.pages[key];
  const label = document.getElementById(`${key}PageLabel`);

  if (label) {
    label.textContent = `Page ${page} / ${totalPages}`;
  }

  return rows;
}

function updatePage(key, delta) {
  state.pages[key] = Math.max(1, (state.pages[key] || 1) + delta);
  loadDashboard().catch((error) => setStatus(error.message));
}

function resetOrderFocus(orderId) {
  state.commissionOrderId = orderId || "";
  state.pages.commissions = 1;

  if (commissionOrderFilterInput) {
    commissionOrderFilterInput.value = state.commissionOrderId;
  }
}

function resetBeneficiaryFocus(userId) {
  state.commissionBeneficiaryUserId = userId || "";
  state.pages.commissions = 1;

  if (commissionBeneficiaryFilterInput) {
    commissionBeneficiaryFilterInput.value = state.commissionBeneficiaryUserId;
  }
}

function renderSession(user) {
  if (!sessionCard) {
    return;
  }

  setAuthState(Boolean(user));
  sessionCard.innerHTML = user
    ? `<p class="eyebrow">Signed In</p><strong>${user.name}</strong><p class="muted">${user.memberCode}${user.email ? ` · ${user.email}` : ""}</p>`
      : `<p class="muted">Not signed in</p>`;
  state.currentUserId = user?.userId || "";

  if (workspaceAdminName) {
    workspaceAdminName.textContent = user ? user.name : "Not signed in";
  }

  if (workspaceAdminMeta) {
    workspaceAdminMeta.textContent = user
      ? `${user.memberCode}${user.email ? ` · ${user.email}` : ""}`
      : "Sign in to access menu workspaces.";
  }
}

async function loadSession() {
  try {
    const session = await request("/auth/me");
    renderSession(session.user);
    return session.user;
  } catch {
    return null;
  }
}

async function loadDashboard() {
  if (adminView !== "dashboard") {
    return;
  }

  setStatus("Loading dashboard");

  const orderQuery = new URLSearchParams();
  if (orderStatusFilter.value) {
    orderQuery.set("approvalStatus", orderStatusFilter.value);
  }
  if (state.orderUserId) {
    orderQuery.set("userId", state.orderUserId);
  }

  const [members, orders, poolCycles, fallbacks, packages, suppliers, categories, products, productDetails, contentItems, notificationItems, shippingJobs] = await Promise.all([
    request(
      `/members?page=${state.pages.members}&pageSize=${state.pageSize}${state.memberSearch ? `&query=${encodeURIComponent(state.memberSearch)}` : ""}`,
    ),
    request(
      `/orders?page=${state.pages.orders}&pageSize=${state.pageSize}${orderQuery.toString() ? `&${orderQuery.toString()}` : ""}`,
    ),
    request(`/pool?page=${state.pages.pool}&pageSize=${state.pageSize}`),
    request(
      `/commissions/company-fallbacks?page=${state.pages.fallbacks}&pageSize=${state.pageSize}${fallbackTypeFilter.value ? `&sourceType=${encodeURIComponent(fallbackTypeFilter.value)}` : ""}`,
    ),
    request("/packages"),
    request("/packages/suppliers"),
    request("/packages/categories"),
    request("/packages/products"),
    request("/packages/product-details"),
    request("/content"),
    request("/notifications"),
    request("/shipping/jobs"),
    loadCommissionSettings(),
    loadWalletSettings(),
    loadMatrixSettings(),
    loadMatrixSummary(),
    loadMatrixPayouts(),
    loadWalletTopupRequests(),
  ]);

  const commissionQuery = new URLSearchParams();
  if (state.commissionOrderId) {
    commissionQuery.set("orderId", state.commissionOrderId);
  }
  if (state.commissionBeneficiaryUserId) {
    commissionQuery.set("beneficiaryUserId", state.commissionBeneficiaryUserId);
  }
  const commissions = await request(
    `/commissions?page=${state.pages.commissions}&pageSize=${state.pageSize}${commissionQuery.toString() ? `&${commissionQuery.toString()}` : ""}`,
  );
  const memberItems = getListItems(members);
  const orderItems = getListItems(orders);
  const poolCycleItems = getListItems(poolCycles);
  const fallbackItems = getListItems(fallbacks);
  const packageItems = getListItems(packages);
  state.suppliers = getListItems(suppliers);
  state.categories = getListItems(categories);
  state.products = getListItems(products);
  state.productDetails = getListItems(productDetails);
  state.contentDrafts = getListItems(contentItems);
  state.notificationDrafts = getListItems(notificationItems);
  state.shippingJobs = getListItems(shippingJobs);
  const commissionItems = getListItems(commissions);

  memberItems.sort((left, right) => {
    if (state.memberSort === "code_asc") {
      return left.memberCode.localeCompare(right.memberCode);
    }
    if (state.memberSort === "name_asc") {
      return left.name.localeCompare(right.name);
    }
    return Number(right.memberId) - Number(left.memberId);
  });

  orderItems.sort((left, right) => {
    if (state.orderSort === "order_no_asc") {
      return left.orderNo.localeCompare(right.orderNo);
    }
    if (state.orderSort === "pv_desc") {
      return Number(right.totalPv) - Number(left.totalPv);
    }
    return Number(right.orderId) - Number(left.orderId);
  });

  state.orderItems = orderItems;
  state.commissionItems = commissionItems;
  state.packageCatalogItems = packageItems;
  state.totals.members = getListTotal(members);
  state.totals.orders = getListTotal(orders);
  state.totals.pool = getListTotal(poolCycles);
  state.totals.fallbacks = getListTotal(fallbacks);
  state.totals.commissions = getListTotal(commissions);
  state.latestOrderId = orderItems[0]?.orderId || "";
  state.latestCommission = commissionItems[0] || null;

  document.getElementById("membersCount").textContent = String(state.totals.members);
  document.getElementById("ordersCount").textContent = String(state.totals.orders);
  document.getElementById("poolCount").textContent = String(state.totals.pool);
  document.getElementById("fallbackCount").textContent = String(state.totals.fallbacks);

  renderTableRows(
    "membersTable",
    paginateRows(memberItems, "members"),
    (member) => `<tr>
      <td>${member.memberId}</td>
      <td>${member.memberCode}</td>
      <td>${member.referralCode ?? "-"}</td>
      <td>${member.name}</td>
      <td>${member.sponsorId ?? "-"}</td>
      <td>
        <button type="button" class="secondary" data-action="wallet-detail" data-member-id="${member.memberId}">Wallet</button>
      </td>
      <td>
        <div class="table-actions">
          <button type="button" class="secondary" data-action="member-detail" data-member-id="${member.memberId}">Detail</button>
          <button type="button" class="secondary" data-action="member-network" data-member-id="${member.memberId}">Network</button>
          <button type="button" class="secondary" data-action="member-referral" data-member-code="${member.memberCode}">Referral</button>
          <button type="button" class="secondary" data-action="member-matrix" data-member-id="${member.memberId}">Matrix</button>
          <button type="button" class="secondary" data-action="member-reset-password" data-member-id="${member.memberId}">Reset PW</button>
          <button type="button" class="secondary" data-action="prefill-activate" data-member-id="${member.memberId}">Activate</button>
          <button type="button" class="secondary" data-action="prefill-order-member" data-member-id="${member.memberId}">New Order</button>
        </div>
      </td>
    </tr>`,
  );

  renderTableRows(
    "ordersTable",
    paginateRows(orderItems, "orders"),
    (order) => `<tr>
      <td>${order.orderId}</td>
      <td>${order.orderNo}</td>
      <td>${order.sourceUserId}</td>
      <td>${order.approvalStatus}</td>
      <td>${order.totalPv}</td>
      <td>
        <div class="table-actions">
          <button type="button" data-action="approve-process-order" data-order-id="${order.orderId}">Approve + Process</button>
          <button type="button" data-action="approve-order" data-order-id="${order.orderId}">Approve</button>
          <button type="button" data-action="process-order" data-order-id="${order.orderId}">Process</button>
          <button type="button" class="secondary" data-action="reprocess-order" data-order-id="${order.orderId}">Reprocess</button>
          <button type="button" class="secondary" data-action="order-detail" data-order-id="${order.orderId}">Detail</button>
        </div>
      </td>
    </tr>`,
  );

  renderTableRows(
    "productDetailsTable",
    state.productDetails,
    (detail) => {
      const youtubeCell = detail.youtubeUrl
        ? `<a href="${escapeHtml(detail.youtubeUrl)}" target="_blank" rel="noreferrer">Open video</a>`
        : '<span class="muted">No video</span>';
      const imageCell = Array.isArray(detail.imageUrls) && detail.imageUrls.length
        ? `<div class="product-detail-media-cell">
            <div class="product-detail-thumb-row">
              ${detail.imageUrls
                .slice(0, 3)
                .map(
                  (url, index) =>
                    `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer" title="Image ${index + 1}">
                      <img src="${escapeHtml(url)}" alt="${escapeHtml(detail.name)} image ${index + 1}" loading="lazy" />
                    </a>`,
                )
                .join("")}
            </div>
            <span class="muted">${detail.imageUrls.length} image${detail.imageUrls.length > 1 ? "s" : ""}</span>
          </div>`
        : '<span class="muted">No images</span>';

      return `<tr>
        <td>${detail.productDetailId}</td>
        <td>${detail.supplierCode}</td>
        <td>${detail.categoryCode}</td>
        <td>${detail.productCode}<br /><span class="muted">${detail.productName}</span></td>
        <td>${detail.code}<br /><span class="muted">${detail.name}</span></td>
        <td><div class="product-detail-media-stack">${youtubeCell}${imageCell}</div></td>
        <td>${detail.costPriceUsdt}</td>
        <td>${detail.memberPriceUsdt}</td>
        <td>${detail.retailPriceUsdt}</td>
        <td>${detail.pv}</td>
        <td>${decimalToPercentString(detail.poolRate)}</td>
        <td>${detail.status}</td>
      </tr>`;
    },
  );

  renderTableRows(
    "packagesTable",
    packageItems,
    (pkg) => `<tr><td>${pkg.packageId}</td><td>${pkg.code}</td><td>${pkg.name}</td><td>${pkg.costPriceUsdt}</td><td>${pkg.memberPriceUsdt}</td><td>${pkg.retailPriceUsdt}</td><td>${pkg.pv}</td><td>${decimalToPercentString(pkg.poolRate)}</td><td>${pkg.activeDays}</td><td>${pkg.earningCapAmount}</td><td>${pkg.itemCount ?? 0}</td><td>${pkg.status}</td><td><div class="table-actions"><button type="button" class="secondary" data-action="clone-package-to-studio" data-package-id="${pkg.packageId}">Clone to Studio</button><button type="button" class="secondary" data-action="prefill-order-package" data-package-id="${pkg.packageId}">Use In Order</button><button type="button" class="secondary" data-action="toggle-package-status" data-package-id="${pkg.packageId}" data-package-status="${pkg.status}">${pkg.status === "active" ? "Deactivate" : "Activate"}</button></div></td></tr>`,
  );
  renderCatalogEntityMetrics();
  renderCatalogSelectors();
  renderPackageItemRows();
  renderProductDetailMediaPreview();
  renderSalesWorkspace();
  renderShippingWorkspace();
  renderReportsWorkspace();

  const packageOptions = [
    '<option value="">Pick package ID</option>',
    ...packageItems.map(
      (pkg) => `<option value="${pkg.packageId}">${pkg.packageId} · ${pkg.code} · PV ${pkg.pv}</option>`,
    ),
  ].join("");
  orderPackageSelect.innerHTML = packageOptions;
  activatePackageSelect.innerHTML = packageOptions;

  renderTableRows(
    "poolTable",
    paginateRows(poolCycleItems, "pool"),
    (cycle) => `<tr><td>${cycle.poolDate}</td><td>${cycle.poolFund}</td><td>${cycle.eligibleMemberCount}</td><td>${cycle.payoutPerMember}</td><td>${cycle.status}</td><td><button type="button" class="secondary" data-action="pool-snapshot" data-pool-date="${cycle.poolDate}">Snapshot</button></td></tr>`,
  );

  renderTableRows(
    "fallbacksTable",
    paginateRows(fallbackItems, "fallbacks"),
    (fallback) => `<tr><td>${fallback.fallbackId}</td><td>${fallback.sourceType}</td><td>${fallback.sourceRefId}</td><td>${fallback.amount}</td><td>${fallback.reason}</td></tr>`,
  );

  renderTableRows(
    "commissionsTable",
    paginateRows(commissionItems, "commissions"),
    (commission) =>
      `<tr><td>${commission.commissionId}</td><td><button type="button" class="secondary" data-action="focus-order-commissions" data-order-id="${commission.orderId}">${commission.orderId}</button></td><td><button type="button" class="secondary" data-action="focus-beneficiary-member" data-beneficiary-user-id="${commission.beneficiaryUserId ?? ""}">${commission.beneficiaryUserId ?? "-"}</button></td><td>${commission.commissionType}</td><td>${commission.amount}</td><td>${commission.status}</td></tr>`,
  );

  setStatus("Dashboard ready");
}

async function loadMemberDetail(memberId) {
  if (!memberId) {
    memberDetailOutput.textContent = "Enter a member ID.";
    return;
  }

  setStatus(`Loading member ${memberId}`);
  const detail = await request(`/members/${memberId}/detail`);
  memberDetailOutput.textContent = JSON.stringify(detail, null, 2);
  setStatus(`Loaded member ${memberId}`);
}

async function loadMemberNetwork(memberId) {
  setStatus(`Loading member network ${memberId}`);
  const network = await request(`/members/${memberId}/network`);
  memberDetailOutput.textContent = JSON.stringify(network, null, 2);
  setStatus(`Loaded member network ${memberId}`);
}

async function loadWalletDetail(memberId) {
  if (!memberId) {
    memberDetailOutput.textContent = "Enter a member ID.";
    return;
  }

  setStatus(`Loading wallet ${memberId}`);
  const [wallet, transactions] = await Promise.all([
    request(`/wallets/${memberId}`),
    request(`/wallets/${memberId}/transactions`),
  ]);
  memberDetailOutput.textContent = JSON.stringify({ wallet, transactions }, null, 2);
  setStatus(`Loaded wallet ${memberId}`);
}

async function loadOrderDetail(orderId) {
  setStatus(`Loading order ${orderId}`);
  const snapshot = await request(`/orders/${orderId}/snapshot`);
  setActionOutput(`Order ${orderId} detail`, snapshot);
  setStatus(`Loaded order ${orderId}`);
  pushHistory("Order Detail", `Loaded snapshot for order ${orderId}`);
}

async function loadPoolPayouts(poolDate) {
  if (!poolDate) {
    setActionOutput("Pool payouts failed", { message: "poolDate is required" });
    return;
  }

  setStatus(`Loading pool payouts ${poolDate}`);
  const payouts = await request(`/pool/${encodeURIComponent(poolDate)}/payouts`);
  setActionOutput(`Pool payouts ${poolDate}`, payouts);
  setStatus(`Loaded pool payouts ${poolDate}`);
  pushHistory("Pool Payouts", `Loaded payouts for ${poolDate}`);
}

async function loadPoolSnapshot(poolDate) {
  setStatus(`Loading pool snapshot ${poolDate}`);
  const snapshot = await request(`/pool/${encodeURIComponent(poolDate)}/snapshot`);
  setActionOutput(`Pool snapshot ${poolDate}`, snapshot);
  setStatus(`Loaded pool snapshot ${poolDate}`);
  pushHistory("Pool Snapshot", `Loaded snapshot for ${poolDate}`);
}

async function loadReferralLink(memberCode) {
  if (!memberCode) {
    setActionOutput("Referral link failed", { message: "memberCode is required" });
    return;
  }

  setStatus(`Loading referral link ${memberCode}`);
  const result = await request(
    `/members/by-code/${encodeURIComponent(memberCode)}/referral-link?baseUrl=${encodeURIComponent(window.location.origin)}`,
  );
  setActionOutput(`Referral link ${memberCode}`, result);
  setStatus(`Loaded referral link ${memberCode}`);
  pushHistory("Referral Link", `Loaded referral link for ${memberCode}`);
}

function prefillOrderMember(memberId) {
  document.getElementById("orderUserIdInput").value = memberId;
  setStatus(`Prepared order form for member ${memberId}`);
}

function prefillOrderPackage(packageId) {
  document.getElementById("orderPackageIdInput").value = packageId;
  if (orderPackageSelect) {
    orderPackageSelect.value = packageId;
  }
  setStatus(`Prepared order form for package ${packageId}`);
}

async function resetMemberPassword(memberId) {
  if (!confirmAction(`Reset password for member ${memberId}?`)) {
    return;
  }

  const newPassword = window.prompt("New password for member", "dev-password");

  if (!newPassword) {
    return;
  }

  const result = await request(`/members/${memberId}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
  });
  setActionOutput(`Password reset ${memberId}`, result);
  setStatus(`Password updated for member ${memberId}`);
  pushHistory("Reset Password", `Updated password for member ${memberId}`);
}

async function togglePackageStatus(packageId, currentStatus) {
  const nextStatus = currentStatus === "active" ? "inactive" : "active";
  if (!confirmAction(`Change package ${packageId} to ${nextStatus}?`)) {
    return;
  }

  const result = await request(`/packages/${packageId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: nextStatus }),
  });
  setActionOutput(`Package status ${packageId}`, result);
  pushHistory("Package Status", `Changed package ${packageId} to ${nextStatus}`);
  await loadDashboard();
}

async function runOrderAction(orderId, action) {
  if (
    (action === "approve-process-order" &&
      !confirmAction(`Approve and process order ${orderId}?`)) ||
    (action === "approve-order" &&
      !confirmAction(`Approve order ${orderId}?`)) ||
    (action === "process-order" &&
      !confirmAction(`Process approved order ${orderId}?`)) ||
    (action === "reprocess-order" &&
      !confirmAction(`Reprocess order ${orderId}?`))
  ) {
    return;
  }

  setStatus(`${action} order ${orderId}`);
  let result;

  if (action === "approve-process-order") {
    const approval = await request(`/orders/${orderId}/approve`, { method: "POST" });
    const processed = await request(`/orders/${orderId}/process-approved`, { method: "POST" });
    result = { approval, processed };
  } else {
    const path =
      action === "approve-order"
        ? `/orders/${orderId}/approve`
        : action === "reprocess-order"
          ? `/orders/${orderId}/reprocess`
          : `/orders/${orderId}/process-approved`;
    result = await request(path, { method: "POST" });
  }

  setActionOutput(`${action} result`, result);
  pushHistory(action, `Ran ${action} for order ${orderId}`);
  await loadDashboard();
}

function syncPackageInputs() {
  if (orderPackageSelect.value) {
    document.getElementById("orderPackageIdInput").value = orderPackageSelect.value;
  }

  if (activatePackageSelect.value) {
    document.getElementById("activatePackageIdInput").value = activatePackageSelect.value;
  }
}

function normalizeIdentifierInput(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.includes("@") ? trimmed.toLowerCase() : trimmed.toUpperCase();
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const normalizedIdentifier = normalizeIdentifierInput(
        document.getElementById("identifierInput").value,
      );
      document.getElementById("identifierInput").value = normalizedIdentifier;

      const data = await request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: normalizedIdentifier,
          password: document.getElementById("passwordInput").value,
        }),
      });

      setToken(data.accessToken);
      renderSession(data.user);

      if (adminView === "login") {
        window.location.href = "/admin";
        return;
      }

      await loadDashboard();
    } catch (error) {
      setStatus(error.message);
    }
  });
}

if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    const task = adminView === "dashboard" ? loadDashboard() : loadSession();
    task.catch((error) => setStatus(error.message));
  });
}

document.querySelectorAll("[data-menu-target]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveAdminMenu(button.dataset.menuTarget || "overview");
  });
});

document.querySelectorAll("[data-ecommerce-target]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveEcommerceMenu(button.dataset.ecommerceTarget || "catalog");
  });
});

if (clearHistoryButton) {
  clearHistoryButton.addEventListener("click", () => {
    if (!confirmAction("Clear local action history?")) {
      return;
    }

    state.actionHistory = [];
    localStorage.removeItem("adminActionHistory");
    renderHistory();
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {}

    setToken("");
    renderSession(null);
    setStatus("Signed out");

    if (adminView === "dashboard") {
      window.location.href = "/admin";
    }
  });
}

if (orderStatusFilter) {
  orderStatusFilter.addEventListener("change", () => {
    state.pages.orders = 1;
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

if (memberSearchInput) {
  memberSearchInput.addEventListener("input", (event) => {
    state.memberSearch = event.target.value || "";
    state.pages.members = 1;
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

if (memberSortSelect) {
  memberSortSelect.addEventListener("change", (event) => {
    state.memberSort = event.target.value;
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

if (orderUserFilterInput) {
  orderUserFilterInput.addEventListener("change", (event) => {
    state.orderUserId = (event.target.value || "").trim();
    state.pages.orders = 1;
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

if (orderSortSelect) {
  orderSortSelect.addEventListener("change", (event) => {
    state.orderSort = event.target.value;
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

if (commissionOrderFilterInput) {
  commissionOrderFilterInput.addEventListener("change", (event) => {
    state.commissionOrderId = (event.target.value || "").trim();
    state.pages.commissions = 1;
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

if (commissionBeneficiaryFilterInput) {
  commissionBeneficiaryFilterInput.addEventListener("change", (event) => {
    state.commissionBeneficiaryUserId = (event.target.value || "").trim();
    state.pages.commissions = 1;
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

if (matrixPayoutBeneficiaryInput) {
  matrixPayoutBeneficiaryInput.addEventListener("change", (event) => {
    state.matrixPayoutBeneficiaryUserId = (event.target.value || "").trim();
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

if (matrixPayoutOrderInput) {
  matrixPayoutOrderInput.addEventListener("change", (event) => {
    state.matrixPayoutSourceOrderId = (event.target.value || "").trim();
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

if (loadPoolPayoutsButton) {
  loadPoolPayoutsButton.addEventListener("click", () => {
    loadPoolPayouts(poolPayoutDateInput.value).catch((error) => {
      setStatus(error.message);
      setActionOutput("Pool payout lookup failed", { message: error.message });
    });
  });
}

if (focusLatestOrderButton) {
  focusLatestOrderButton.addEventListener("click", () => {
    if (!state.latestOrderId) {
      setStatus("No latest order available.");
      return;
    }

    resetOrderFocus(state.latestOrderId);
    loadOrderDetail(state.latestOrderId).catch((error) => {
      setStatus(error.message);
      setActionOutput("Latest order focus failed", { message: error.message });
    });
  });
}

if (focusPendingOrdersButton) {
  focusPendingOrdersButton.addEventListener("click", () => {
    if (orderStatusFilter) {
      orderStatusFilter.value = "pending";
    }
    state.pages.orders = 1;
    loadDashboard().catch((error) => {
      setStatus(error.message);
      setActionOutput("Pending order focus failed", { message: error.message });
    });
  });
}

if (focusLatestCommissionButton) {
  focusLatestCommissionButton.addEventListener("click", () => {
    if (!state.latestCommission) {
      setStatus("No latest commission available.");
      return;
    }

    resetOrderFocus(state.latestCommission.orderId || "");
    resetBeneficiaryFocus(state.latestCommission.beneficiaryUserId || "");
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

if (reloadPoolTodayButton) {
  reloadPoolTodayButton.addEventListener("click", () => {
    loadPoolPayouts(poolPayoutDateInput.value).catch((error) => {
      setStatus(error.message);
      setActionOutput("Today's pool reload failed", { message: error.message });
    });
  });
}

if (fallbackTypeFilter) {
  fallbackTypeFilter.addEventListener("change", () => {
    state.pages.fallbacks = 1;
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

[
  ["membersPrevButton", "members", -1],
  ["membersNextButton", "members", 1],
  ["ordersPrevButton", "orders", -1],
  ["ordersNextButton", "orders", 1],
  ["poolPrevButton", "pool", -1],
  ["poolNextButton", "pool", 1],
  ["fallbacksPrevButton", "fallbacks", -1],
  ["fallbacksNextButton", "fallbacks", 1],
  ["commissionsPrevButton", "commissions", -1],
  ["commissionsNextButton", "commissions", 1],
].forEach(([buttonId, key, delta]) => {
  const button = document.getElementById(buttonId);
  if (button) {
    button.addEventListener("click", () => updatePage(key, delta));
  }
});

if (adminView === "dashboard") {
document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  if (button.dataset.action === "member-detail") {
    loadMemberDetail(button.dataset.memberId).catch((error) => {
      memberDetailOutput.textContent = error.message;
      setStatus(error.message);
    });
    return;
  }

  if (button.dataset.action === "member-network") {
    loadMemberNetwork(button.dataset.memberId).catch((error) => {
      memberDetailOutput.textContent = error.message;
      setStatus(error.message);
    });
    return;
  }

  if (button.dataset.action === "wallet-detail") {
    loadWalletDetail(button.dataset.memberId).catch((error) => {
      memberDetailOutput.textContent = error.message;
      setStatus(error.message);
    });
    return;
  }

  if (button.dataset.action === "member-referral") {
    loadReferralLink(button.dataset.memberCode).catch((error) => {
      setStatus(error.message);
      setActionOutput("Referral link failed", { message: error.message });
    });
    return;
  }

  if (button.dataset.action === "member-matrix") {
    document.getElementById("matrixMemberInput").value = button.dataset.memberId;
    loadMemberMatrix(button.dataset.memberId).catch((error) => {
      matrixOutput.textContent = error.message;
      setStatus(error.message);
    });
    return;
  }

  if (button.dataset.action === "member-reset-password") {
    resetMemberPassword(button.dataset.memberId).catch((error) => {
      setStatus(error.message);
      setActionOutput("Reset password failed", { message: error.message });
    });
    return;
  }

  if (button.dataset.action === "focus-order-commissions") {
    resetOrderFocus(button.dataset.orderId || "");
    loadDashboard().catch((error) => setStatus(error.message));
    return;
  }

  if (button.dataset.action === "focus-beneficiary-member") {
    const userId = button.dataset.beneficiaryUserId || "";
    if (!userId) {
      setStatus("Commission has no beneficiary member.");
      return;
    }

    resetBeneficiaryFocus(userId);
    loadMemberDetail(userId).catch((error) => {
      memberDetailOutput.textContent = error.message;
      setStatus(error.message);
    });
    return;
  }

  if (button.dataset.action === "prefill-activate") {
    document.getElementById("activateMemberIdInput").value = button.dataset.memberId;
    setStatus(`Prepared activate form for member ${button.dataset.memberId}`);
    return;
  }

  if (button.dataset.action === "prefill-order-member") {
    prefillOrderMember(button.dataset.memberId);
    return;
  }

  if (button.dataset.action === "prefill-order-package") {
    prefillOrderPackage(button.dataset.packageId);
    return;
  }

  if (button.dataset.action === "clone-package-to-studio") {
    const pkg = (state.packageCatalogItems || []).find(
      (item) => item.packageId === (button.dataset.packageId || ""),
    );
    populateProductForm(pkg);
    setStatus(`Loaded package ${button.dataset.packageId} into Product Studio`);
    return;
  }

  if (button.dataset.action === "remove-package-item") {
    state.packageBuilderItems = state.packageBuilderItems.filter(
      (item) => item.productDetailId !== (button.dataset.productDetailId || ""),
    );
    renderPackageItemRows();
    return;
  }

  if (button.dataset.action === "toggle-package-status") {
    togglePackageStatus(button.dataset.packageId, button.dataset.packageStatus).catch(
      (error) => {
        setStatus(error.message);
        setActionOutput("Package status failed", { message: error.message });
      },
    );
    return;
  }

  if (button.dataset.action === "remove-uni-level") {
    const levelIndex = Number(button.dataset.levelIndex);
    if (state.settings.uniLevelRates.length <= 1) {
      setStatus("At least one unilevel rate is required.");
      return;
    }

    state.settings.uniLevelRates.splice(levelIndex, 1);
    renderCommissionSettings();
    return;
  }

  if (button.dataset.action === "remove-direct-level") {
    const levelIndex = Number(button.dataset.levelIndex);
    if (state.settings.directLevelRates.length <= 1) {
      setStatus("At least one direct rate is required.");
      return;
    }

    state.settings.directLevelRates.splice(levelIndex, 1);
    renderCommissionSettings();
    return;
  }

  if (button.dataset.action === "pool-snapshot") {
    loadPoolSnapshot(button.dataset.poolDate).catch((error) => {
      setStatus(error.message);
      setActionOutput("Pool snapshot failed", { message: error.message });
    });
    return;
  }

  if (button.dataset.action === "order-detail") {
    loadOrderDetail(button.dataset.orderId).catch((error) => {
      setStatus(error.message);
      setActionOutput("Order detail failed", { message: error.message });
    });
    return;
  }

  if (button.dataset.action === "wallet-topup-request-detail") {
    const topupRequest = (state.walletTopupRequests || []).find(
      (item) => item.requestId === (button.dataset.requestId || ""),
    );
    setActionOutput(
      `Wallet top-up request ${button.dataset.requestId}`,
      topupRequest || { message: "Top-up request not found in current view." },
    );
    return;
  }

  if (button.dataset.action === "approve-wallet-topup-request") {
    request(`/wallets/topup-requests/${button.dataset.requestId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorUserId: state.currentUserId }),
    })
      .then(async (result) => {
        setActionOutput(`Top-up request ${button.dataset.requestId} approved`, result);
        pushHistory(
          "Wallet Top-Up Approve",
          `Approved top-up request ${button.dataset.requestId}`,
        );
        await loadDashboard();
      })
      .catch((error) => {
        setStatus(error.message);
        setActionOutput("Top-up approval failed", { message: error.message });
      });
    return;
  }

  if (button.dataset.action === "reject-wallet-topup-request") {
    const rejectionReason = window.prompt(
      "Reason for rejecting this top-up request",
      "Payment evidence invalid",
    );

    if (!rejectionReason) {
      return;
    }

    request(`/wallets/topup-requests/${button.dataset.requestId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorUserId: state.currentUserId, rejectionReason }),
    })
      .then(async (result) => {
        setActionOutput(`Top-up request ${button.dataset.requestId} rejected`, result);
        pushHistory(
          "Wallet Top-Up Reject",
          `Rejected top-up request ${button.dataset.requestId}`,
        );
        await loadDashboard();
      })
      .catch((error) => {
        setStatus(error.message);
        setActionOutput("Top-up rejection failed", { message: error.message });
      });
    return;
  }

  runOrderAction(button.dataset.orderId, button.dataset.action).catch((error) => {
    setStatus(error.message);
    setActionOutput("Action failed", { message: error.message });
  });
});

createSupplierForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const result = await request("/packages/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: supplierCodeInput.value.trim(),
        name: supplierNameInput.value.trim(),
      }),
    });

    setActionOutput("Supplier created", result);
    createSupplierForm.reset();
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
    setActionOutput("Supplier create failed", { message: error.message });
  }
});

createCategoryForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const result = await request("/packages/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: categorySupplierSelect.value,
        code: categoryCodeInput.value.trim(),
        name: categoryNameInput.value.trim(),
      }),
    });

    setActionOutput("Category created", result);
    createCategoryForm.reset();
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
    setActionOutput("Category create failed", { message: error.message });
  }
});

createProductForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const result = await request("/packages/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: productSupplierSelect.value,
        categoryId: productCategorySelect.value,
        code: productCodeInput.value.trim(),
        name: productNameInput.value.trim(),
      }),
    });

    setActionOutput("Product created", result);
    createProductForm.reset();
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
    setActionOutput("Product create failed", { message: error.message });
  }
});

createProductDetailForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const result = await request("/packages/product-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: productDetailProductSelect.value,
        code: productDetailCodeInput.value.trim(),
        name: productDetailNameInput.value.trim(),
        youtubeUrl: productDetailYoutubeUrlInput.value.trim(),
        imageUrls: parseLineSeparatedUrls(productDetailImageUrlsInput.value),
        costPriceUsdt: productDetailCostInput.value.trim(),
        memberPriceUsdt: productDetailMemberPriceInput.value.trim(),
        retailPriceUsdt: productDetailRetailPriceInput.value.trim(),
        pv: productDetailPvInput.value.trim(),
        poolRate: percentToDecimalString(productDetailPoolRateInput.value),
      }),
    });

    setActionOutput("Product detail created", result);
    createProductDetailForm.reset();
    renderProductDetailMediaPreview();
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
    setActionOutput("Product detail create failed", { message: error.message });
  }
});

productDetailYoutubeUrlInput?.addEventListener("input", renderProductDetailMediaPreview);
productDetailImageUrlsInput?.addEventListener("input", renderProductDetailMediaPreview);

createPackageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    if (!state.packageBuilderItems.length) {
      throw new Error("Select at least one product detail for the package.");
    }

    const result = await request("/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: packageCodeInput.value.trim(),
        name: packageNameInput.value.trim(),
        activeDays: Number(packageDaysInput.value),
        earningCapAmount: packageCapInput.value.trim(),
        poolRate: percentToDecimalString(packagePoolRateInput.value),
        productDetailItems: state.packageBuilderItems.map((item) => ({
          productDetailId: item.productDetailId,
          qty: Number(item.qty),
        })),
      }),
    });

    setActionOutput("Package created", result);
    resetProductForm();
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
    setActionOutput("Package create failed", { message: error.message });
  }
});

[packageCodeInput, packageNameInput, packageDaysInput, packageCapInput, packagePoolRateInput]
  .filter(Boolean)
  .forEach((input) => {
    input.addEventListener("input", renderProductPreview);
  });

addPackageDetailButton?.addEventListener("click", () => {
  const productDetailId = packageDetailSelect.value;
  const qty = Number(packageDetailQtyInput.value);

  if (!productDetailId) {
    setStatus("Pick a product detail first.");
    return;
  }

  if (!Number.isInteger(qty) || qty <= 0) {
    setStatus("Quantity must be a positive integer.");
    return;
  }

  const existing = state.packageBuilderItems.find(
    (item) => item.productDetailId === productDetailId,
  );

  if (existing) {
    existing.qty += qty;
  } else {
    state.packageBuilderItems.push({ productDetailId, qty });
  }

  packageDetailQtyInput.value = "1";
  renderPackageItemRows();
});

packageItemsList?.addEventListener("input", (event) => {
  const input = event.target;

  if (!(input instanceof HTMLInputElement) || !input.dataset.packageItemQty) {
    return;
  }

  const nextQty = Number(input.value);
  const item = state.packageBuilderItems.find(
    (entry) => entry.productDetailId === input.dataset.packageItemQty,
  );

  if (!item || !Number.isInteger(nextQty) || nextQty <= 0) {
    return;
  }

  item.qty = nextQty;
  renderProductPreview();
});

renderProductPreview();

if (resetProductFormButton) {
  resetProductFormButton.addEventListener("click", () => {
    resetProductForm();
    setStatus("Product Studio reset");
  });
}

[
  contentKeyInput,
  contentPlacementSelect,
  contentTitleInput,
  contentAudienceSelect,
  contentStartInput,
  contentEndInput,
  contentSummaryInput,
  contentBodyInput,
].forEach((element) => {
  element?.addEventListener("input", renderContentPreview);
  element?.addEventListener("change", renderContentPreview);
});

if (contentForm) {
  contentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const result = await request("/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: contentKeyInput.value.trim(),
          placement: contentPlacementSelect.value,
          title: contentTitleInput.value.trim(),
          audience: contentAudienceSelect.value,
          summary: contentSummaryInput.value.trim(),
          body: contentBodyInput.value.trim(),
          startAt: contentStartInput.value || undefined,
          endAt: contentEndInput.value || undefined,
        }),
      });

      setStatus("Content draft saved");
      setActionOutput("Content draft saved", result);
      await loadDashboard();
    } catch (error) {
      setStatus(error.message);
      setActionOutput("Content draft save failed", { message: error.message });
    }
  });
}

if (resetContentButton) {
  resetContentButton.addEventListener("click", () => {
    resetContentStudio();
    setStatus("Content studio reset");
  });
}

[
  notificationNameInput,
  notificationChannelSelect,
  notificationAudienceSelect,
  notificationScheduleInput,
  notificationCtaLabelInput,
  notificationCtaRouteInput,
  notificationHeadlineInput,
  notificationMessageInput,
].forEach((element) => {
  element?.addEventListener("input", renderNotificationPreview);
  element?.addEventListener("change", renderNotificationPreview);
});

if (notificationForm) {
  notificationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const result = await request("/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: notificationNameInput.value.trim(),
          channel: notificationChannelSelect.value,
          audience: notificationAudienceSelect.value,
          headline: notificationHeadlineInput.value.trim(),
          message: notificationMessageInput.value.trim(),
          ctaLabel: notificationCtaLabelInput.value.trim() || undefined,
          ctaRoute: notificationCtaRouteInput.value.trim() || undefined,
          scheduleAt: notificationScheduleInput.value || undefined,
        }),
      });

      setStatus("Notification draft queued");
      setActionOutput("Notification draft queued", result);
      await loadDashboard();
    } catch (error) {
      setStatus(error.message);
      setActionOutput("Notification draft queue failed", { message: error.message });
    }
  });
}

if (resetNotificationButton) {
  resetNotificationButton.addEventListener("click", () => {
    resetNotificationStudio();
    setStatus("Notification studio reset");
  });
}

if (salesFocusLatestButton) {
  salesFocusLatestButton.addEventListener("click", () => {
    if (!state.latestOrderId) {
      setStatus("No latest order found.");
      return;
    }

    resetOrderFocus(state.latestOrderId);
    loadOrderDetail(state.latestOrderId).catch((error) => setStatus(error.message));
  });
}

if (salesFocusPendingButton) {
  salesFocusPendingButton.addEventListener("click", () => {
    if (orderStatusFilter) {
      orderStatusFilter.value = "approved";
      orderStatusFilter.value = "pending";
    }
    state.pages.orders = 1;
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

if (salesFocusCommissionButton) {
  salesFocusCommissionButton.addEventListener("click", () => {
    if (!state.latestCommission) {
      setStatus("No latest commission found.");
      return;
    }

    resetOrderFocus(state.latestCommission.orderId || "");
    resetBeneficiaryFocus(state.latestCommission.beneficiaryUserId || "");
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

[
  shippingOrderIdInput,
  shippingStatusSelect,
  shippingCarrierInput,
  shippingTrackingInput,
  shippingWarehouseInput,
  shippingDispatchInput,
  shippingNoteInput,
].forEach((element) => {
  element?.addEventListener("input", renderShippingPreview);
  element?.addEventListener("change", renderShippingPreview);
});

if (shippingForm) {
  shippingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const result = await request("/shipping/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: shippingOrderIdInput.value.trim(),
          status: shippingStatusSelect.value,
          carrier: shippingCarrierInput.value.trim() || undefined,
          trackingNo: shippingTrackingInput.value.trim() || undefined,
          warehouse: shippingWarehouseInput.value.trim() || undefined,
          dispatchAt: shippingDispatchInput.value || undefined,
          note: shippingNoteInput.value.trim() || undefined,
        }),
      });

      setStatus("Shipment job saved");
      setActionOutput("Shipment job saved", result);
      await loadDashboard();
    } catch (error) {
      setStatus(error.message);
      setActionOutput("Shipment job save failed", { message: error.message });
    }
  });
}

if (shippingUseLatestOrderButton) {
  shippingUseLatestOrderButton.addEventListener("click", () => {
    if (!state.latestOrderId) {
      setStatus("No latest order found.");
      return;
    }

    shippingOrderIdInput.value = state.latestOrderId;
    renderShippingPreview();
    setStatus(`Loaded latest order ${state.latestOrderId} into shipping form`);
  });
}

if (resetShippingButton) {
  resetShippingButton.addEventListener("click", () => {
    resetShippingWorkspace();
    setStatus("Shipping workspace reset");
  });
}

createMemberForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const sponsorCode = document.getElementById("memberSponsorCodeInput").value.trim();
    const email = document.getElementById("memberEmailCreateInput").value.trim();
    const phone = document.getElementById("memberPhoneCreateInput").value.trim();
    const password = document.getElementById("memberPasswordCreateInput").value;

    if (!email && !phone) {
      throw new Error("Email or phone is required.");
    }

    if (!/^[A-Za-z0-9]{6,}$/.test(password)) {
      throw new Error("Password must be at least 6 letters or numbers.");
    }

    const result = await request("/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberCode: document.getElementById("memberCodeCreateInput").value.trim() || undefined,
        name: document.getElementById("memberNameCreateInput").value.trim(),
        email: email || undefined,
        phone: phone || undefined,
        password,
        sponsorCode: sponsorCode || undefined,
      }),
    });

    setActionOutput("Member created", result);
    createMemberForm.reset();
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
    setActionOutput("Member create failed", { message: error.message });
  }
});

createOrderForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const result = await request("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: document.getElementById("orderUserIdInput").value.trim(),
        packageId: document.getElementById("orderPackageIdInput").value.trim(),
      }),
    });

    setActionOutput("Order created", result);
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
    setActionOutput("Order create failed", { message: error.message });
  }
});

activatePackageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const memberId = document.getElementById("activateMemberIdInput").value.trim();
    const packageId = document.getElementById("activatePackageIdInput").value.trim();
    const result = await request(`/members/${memberId}/activate-package`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId }),
    });

    setActionOutput("Package activated", result);
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
    setActionOutput("Activate package failed", { message: error.message });
  }
});

closePoolForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const poolDate = document.getElementById("poolDateInput").value;
    const result = await request(`/pool/${poolDate}/close`, { method: "POST" });
    setActionOutput("Pool close result", result);
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
    setActionOutput("Pool close failed", { message: error.message });
  }
});

memberDetailForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadMemberDetail(document.getElementById("memberDetailInput").value.trim()).catch(
    (error) => {
      memberDetailOutput.textContent = error.message;
      setStatus(error.message);
    },
  );
});

orderPackageSelect.addEventListener("change", syncPackageInputs);
activatePackageSelect.addEventListener("change", syncPackageInputs);

if (addUniLevelButton) {
  addUniLevelButton.addEventListener("click", () => {
    const lastRate =
      state.settings.uniLevelRates[state.settings.uniLevelRates.length - 1] || "0.05";
    state.settings.uniLevelRates.push(lastRate);
    renderCommissionSettings();
  });
}

if (addDirectLevelButton) {
  addDirectLevelButton.addEventListener("click", () => {
    const lastRate =
      state.settings.directLevelRates[state.settings.directLevelRates.length - 1] || "0.2";
    state.settings.directLevelRates.push(lastRate);
    renderCommissionSettings();
  });
}

if (commissionSettingsForm) {
  commissionSettingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await saveCommissionSettings();
    } catch (error) {
      setStatus(error.message);
      setActionOutput("Commission settings failed", { message: error.message });
    }
  });
}

if (walletSettingsForm) {
  walletSettingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await saveWalletSettings();
    } catch (error) {
      setStatus(error.message);
      setActionOutput("Wallet settings failed", { message: error.message });
    }
  });
}

if (matrixSettingsForm) {
  matrixSettingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await saveMatrixSettings();
    } catch (error) {
      setStatus(error.message);
      setActionOutput("Matrix settings failed", { message: error.message });
    }
  });
}

if (matrixMemberForm) {
  matrixMemberForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadMemberMatrix(document.getElementById("matrixMemberInput").value.trim()).catch(
      (error) => {
        matrixOutput.textContent = error.message;
        setStatus(error.message);
      },
    );
  });
}

if (walletTopupRequestUserFilterInput) {
  walletTopupRequestUserFilterInput.addEventListener("change", (event) => {
    state.walletTopupRequestUserId = (event.target.value || "").trim();
    loadWalletTopupRequests().catch((error) => {
      setStatus(error.message);
      setActionOutput("Wallet top-up requests failed", { message: error.message });
    });
  });
}

if (walletTopupRequestStatusFilter) {
  walletTopupRequestStatusFilter.addEventListener("change", (event) => {
    state.walletTopupRequestStatus = (event.target.value || "").trim();
    loadWalletTopupRequests().catch((error) => {
      setStatus(error.message);
      setActionOutput("Wallet top-up requests failed", { message: error.message });
    });
  });
}

(async function bootstrap() {
  setAuthState(false);
  renderAdminWorkspaceHeader();
  applyAdminMenuVisibility();
  renderHistory();
  renderContentPreview();
  renderContentDrafts();
  renderNotificationPreview();
  renderNotificationQueue();
  renderShippingPreview();
  renderShippingWorkspace();
  const user = await loadSession();
  if (user) {
    if (adminView === "dashboard") {
      await loadDashboard().catch((error) => setStatus(error.message));
    } else {
      window.location.href = "/admin";
    }
  } else {
    setStatus("Sign in to load dashboard");
  }
})();
