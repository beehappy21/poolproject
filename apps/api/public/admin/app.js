const state = {
  token: localStorage.getItem("adminAccessToken") || "",
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
const uniLevelsList = document.getElementById("uniLevelsList");
const addUniLevelButton = document.getElementById("addUniLevelButton");
const matrixSettingsForm = document.getElementById("matrixSettingsForm");
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
const matrixPayoutBeneficiaryInput = document.getElementById("matrixPayoutBeneficiaryInput");
const matrixPayoutOrderInput = document.getElementById("matrixPayoutOrderInput");
const createPackageForm = document.getElementById("createPackageForm");
const createMemberForm = document.getElementById("createMemberForm");
const createOrderForm = document.getElementById("createOrderForm");
const activatePackageForm = document.getElementById("activatePackageForm");
const closePoolForm = document.getElementById("closePoolForm");
const orderPackageSelect = document.getElementById("orderPackageSelect");
const activatePackageSelect = document.getElementById("activatePackageSelect");
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
};
state.matrixSettings = {
  boardWidth: 2,
  boardDepth: 3,
  boardCount: 3,
  organizationPvRate: "0.1",
  levelRates: ["0.1", "0.05", "0.03"],
  boardOpenPvThresholds: ["100", "100", "100"],
};

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
  if (!poolRateSettingsInput || !directLevelsList || !uniLevelsList) {
    return;
  }

  poolRateSettingsInput.value = decimalToPercentString(state.settings.poolRate);
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
  };
  renderCommissionSettings();
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
    }),
  });

  state.settings = {
    directLevelRates: result.directLevelRates,
    uniLevelRates: result.uniLevelRates,
    poolRate: result.poolRate,
  };
  renderCommissionSettings();
  setActionOutput("Commission settings saved", result);
  pushHistory(
    "Commission Settings",
    `Saved ${result.directLevels} direct levels, ${result.uniLevels} uni levels, pool ${decimalToPercentString(result.poolRate)}%`,
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

  const [members, orders, poolCycles, fallbacks, packages] = await Promise.all([
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
    loadCommissionSettings(),
    loadMatrixSettings(),
    loadMatrixSummary(),
    loadMatrixPayouts(),
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
  const commissionItems = getListItems(commissions);
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
    "packagesTable",
    packageItems,
    (pkg) => `<tr><td>${pkg.packageId}</td><td>${pkg.code}</td><td>${pkg.name}</td><td>${pkg.pv}</td><td>${pkg.priceUsdt}</td><td>${pkg.status}</td><td><div class="table-actions"><button type="button" class="secondary" data-action="prefill-order-package" data-package-id="${pkg.packageId}">Use In Order</button><button type="button" class="secondary" data-action="toggle-package-status" data-package-id="${pkg.packageId}" data-package-status="${pkg.status}">${pkg.status === "active" ? "Deactivate" : "Activate"}</button></div></td></tr>`,
  );

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

  runOrderAction(button.dataset.orderId, button.dataset.action).catch((error) => {
    setStatus(error.message);
    setActionOutput("Action failed", { message: error.message });
  });
});

createPackageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const result = await request("/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: document.getElementById("packageCodeInput").value.trim(),
        name: document.getElementById("packageNameInput").value.trim(),
        priceUsdt: document.getElementById("packagePriceInput").value.trim(),
        pv: document.getElementById("packagePvInput").value.trim(),
        activeDays: Number(document.getElementById("packageDaysInput").value),
        earningCapAmount: document.getElementById("packageCapInput").value.trim(),
      }),
    });

    setActionOutput("Package created", result);
    createPackageForm.reset();
    document.getElementById("packagePriceInput").value = "120";
    document.getElementById("packagePvInput").value = "120";
    document.getElementById("packageDaysInput").value = "30";
    document.getElementById("packageCapInput").value = "360";
  } catch (error) {
    setStatus(error.message);
    setActionOutput("Package create failed", { message: error.message });
  }
});

createMemberForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const sponsorCode = document.getElementById("memberSponsorCodeInput").value.trim();
    const result = await request("/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberCode: document.getElementById("memberCodeCreateInput").value.trim(),
        name: document.getElementById("memberNameCreateInput").value.trim(),
        email: document.getElementById("memberEmailCreateInput").value.trim() || undefined,
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
}

(async function bootstrap() {
  setAuthState(false);
  renderHistory();
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
