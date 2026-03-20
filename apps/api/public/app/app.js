const loginForm = document.getElementById("loginForm");
const logoutButton = document.getElementById("logoutButton");
const refreshButton = document.getElementById("refreshButton");
const statusLine = document.getElementById("statusLine");
const dashboard = document.getElementById("dashboard");
const authPanel = document.getElementById("authPanel");
const activateForm = document.getElementById("activateForm");
const passwordForm = document.getElementById("passwordForm");
const orderForm = document.getElementById("orderForm");
const activatePackageSelect = document.getElementById("activatePackageSelect");
const orderPackageSelect = document.getElementById("orderPackageSelect");
const actionOutput = document.getElementById("actionOutput");
const orderGuide = document.getElementById("orderGuide");
const orderDetailOutput = document.getElementById("orderDetailOutput");
const orderTimeline = document.getElementById("orderTimeline");
const transactionsTable = document.getElementById("transactionsTable");
const commissionsTable = document.getElementById("commissionsTable");
const networkSummary = document.getElementById("networkSummary");
const networkReferrals = document.getElementById("networkReferrals");

let packageCatalog = [];

function setStatus(message) {
  statusLine.textContent = message;
}

async function request(path, options = {}) {
  const token = localStorage.getItem("memberAccessToken");
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      renderSignedOut();
    }

    throw new Error(data?.message || `Request failed: ${response.status}`);
  }

  return data;
}

function clearSession() {
  localStorage.removeItem("memberAccessToken");
}

function setActionResult(label, data) {
  actionOutput.textContent = `${label}\n\n${JSON.stringify(data, null, 2)}`;
}

function renderSignedOut() {
  dashboard.classList.add("hidden");
  authPanel.classList.remove("hidden");
}

function renderSignedIn() {
  authPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");
}

function renderCycles(cycles) {
  const cyclesList = document.getElementById("cyclesList");

  cyclesList.innerHTML =
    cycles.length > 0
      ? cycles
          .map(
            (cycle) => `<div class="stack-item">
              <strong>Cycle ${cycle.cycleId}</strong>
              <p class="muted">Receivable: ${cycle.isReceivable ? "yes" : "no"} | Status: ${cycle.earningStatus}</p>
              <p class="muted">Earned ${cycle.earnedTotalInCycle} / Cap ${cycle.earningCap}</p>
              <p class="muted">${cycle.activatedAt} -> ${cycle.activeUntil}</p>
            </div>`,
          )
          .join("")
      : '<div class="stack-item"><p class="muted">No active cycles.</p></div>';
}

function renderOrders(orderResult) {
  const rows = Array.isArray(orderResult) ? orderResult : orderResult.items || [];
  const ordersTable = document.getElementById("ordersTable");

  ordersTable.innerHTML =
    rows.length > 0
      ? rows
          .map(
            (order) => `<tr>
              <td>${order.orderNo}</td>
              <td>${order.status}</td>
              <td><span class="status-chip ${getApprovalClassName(order.approvalStatus)}">${order.approvalStatus}</span></td>
              <td>${order.totalPv}</td>
              <td>${order.createdAt}</td>
              <td><button type="button" class="ghost inspect-order-button" data-order-id="${order.orderId}">Detail</button></td>
            </tr>`,
          )
          .join("")
      : '<tr><td colspan="6" class="muted">No orders</td></tr>';

  renderOrderGuide(rows);
}

function renderPackageOptions(packages) {
  const options =
    packages.length > 0
      ? packages
          .map(
            (pkg) =>
              `<option value="${pkg.packageId}">${pkg.code} • ${pkg.name} • PV ${pkg.pv}</option>`,
          )
          .join("")
      : '<option value="">No packages</option>';

  activatePackageSelect.innerHTML = options;
  orderPackageSelect.innerHTML = options;
}

function renderTransactions(transactions) {
  transactionsTable.innerHTML =
    transactions.length > 0
      ? transactions
          .map(
            (tx) => `<tr>
              <td>${tx.txType}</td>
              <td>${tx.direction}</td>
              <td>${tx.amount}</td>
              <td>${tx.status}</td>
              <td>${tx.createdAt}</td>
            </tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="muted">No transactions</td></tr>';
}

function renderCommissions(commissionResult) {
  const rows = Array.isArray(commissionResult)
    ? commissionResult
    : commissionResult.items || [];

  commissionsTable.innerHTML =
    rows.length > 0
      ? rows
          .map(
            (commission) => `<tr>
              <td>${commission.commissionType}</td>
              <td>${commission.levelNo ?? "-"}</td>
              <td>${commission.amount}</td>
              <td>${commission.status}</td>
              <td>${commission.createdAt}</td>
            </tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="muted">No commissions</td></tr>';
}

function getApprovalClassName(approvalStatus) {
  return approvalStatus === "approved" ? "status-ok" : "status-waiting";
}

function renderOrderGuide(orders) {
  if (!orders.length) {
    orderGuide.innerHTML = `<div class="stack-item">
      <strong>No orders yet</strong>
      <p class="muted">Create an order after activating a package. Admin approval is still required before commissions and pool effects are processed.</p>
    </div>`;
    return;
  }

  const pendingCount = orders.filter((order) => order.approvalStatus !== "approved").length;
  const approvedCount = orders.length - pendingCount;

  orderGuide.innerHTML = [
    `<div class="stack-item">
      <strong>${approvedCount} approved / ${pendingCount} pending</strong>
      <p class="muted">Pending orders still need admin approval. Approved orders are ready for downstream processing and earnings allocation.</p>
    </div>`,
    pendingCount > 0
      ? `<div class="stack-item">
          <strong>Next step</strong>
          <p class="muted">Wait for admin to approve and process your pending order(s). Use the Detail button to inspect each order snapshot.</p>
        </div>`
      : `<div class="stack-item">
          <strong>All clear</strong>
          <p class="muted">Your visible orders are approved. Check commissions and wallet activity below for resulting earnings.</p>
        </div>`,
  ].join("");
}

function renderNetwork(network) {
  if (!network) {
    networkSummary.innerHTML =
      '<div class="stack-item"><p class="muted">No network data.</p></div>';
    networkReferrals.innerHTML = "";
    return;
  }

  networkSummary.innerHTML = [
    `<div class="stack-item"><strong>Sponsor</strong><p class="muted">${network.sponsor ? `${network.sponsor.name} • ${network.sponsor.memberCode}` : "No sponsor"}</p></div>`,
    `<div class="stack-item"><strong>Direct Referrals</strong><p class="muted">${network.directReferrals.length} members</p></div>`,
    `<div class="stack-item"><strong>Upline Chain</strong><p class="muted">${network.uplineChain.length} levels tracked</p></div>`,
  ].join("");

    networkReferrals.innerHTML =
    network.directReferrals.length > 0
      ? network.directReferrals
          .map(
            (member) => `<div class="stack-item">
              <strong>${member.name}</strong>
              <p class="muted">${member.memberCode}</p>
              <p class="muted">Member ID ${member.memberId}</p>
            </div>`,
          )
          .join("")
      : '<div class="stack-item"><p class="muted">No direct referrals yet.</p></div>';
}

function renderDashboard(data, orders, transactions, commissions, network) {
  document.getElementById("memberName").textContent = data.user.name;
  document.getElementById("memberMeta").textContent =
    `${data.user.memberCode}${data.user.email ? ` • ${data.user.email}` : ""}`;
  document.getElementById("withdrawableBalance").textContent =
    data.wallet.withdrawableBalance;
  document.getElementById("walletMeta").textContent =
    `Approved ${data.wallet.approvedBalance} • Held ${data.wallet.heldBalance} • Offset ${data.wallet.negativeOffsetBalance}`;
  document.getElementById("referralCode").textContent = data.referral.memberCode;
  document.getElementById("referralLink").textContent = data.referral.referralLink;

  renderCycles(data.cycles);
  renderOrders(orders);
  renderTransactions(transactions);
  renderCommissions(commissions);
  renderNetwork(network);
  renderSignedIn();
}

async function loadDashboard() {
  setStatus("Loading dashboard");

  const [dashboardData, orders, packages, transactions, commissions, network] = await Promise.all([
    request("/auth/dashboard"),
    request("/auth/orders"),
    request("/packages"),
    request("/auth/transactions"),
    request("/auth/commissions"),
    request("/auth/network"),
  ]);

  packageCatalog = packages.filter((pkg) => pkg.status === "active");
  renderPackageOptions(packageCatalog);
  renderDashboard(dashboardData, orders, transactions, commissions, network);
  setStatus("Dashboard loaded");
}

async function loadOrderDetail(orderId) {
  setStatus(`Loading order ${orderId}`);
  const snapshot = await request(`/auth/orders/${orderId}`);
  const commissionRows = Array.isArray(snapshot.commissions)
    ? snapshot.commissions
    : snapshot.commissions.items || [];
  const fallbackRows = Array.isArray(snapshot.companyFallbacks)
    ? snapshot.companyFallbacks
    : snapshot.companyFallbacks.items || [];

  orderTimeline.innerHTML = [
    `<div class="stack-item">
      <strong>${snapshot.order.orderNo}</strong>
      <p class="muted">Status ${snapshot.order.status} • Approval ${snapshot.order.approvalStatus}</p>
      <p class="muted">PV ${snapshot.order.totalPv} • Created ${snapshot.order.createdAt}</p>
    </div>`,
    `<div class="stack-item">
      <strong>Timeline</strong>
      <p class="muted">${snapshot.order.approvalStatus === "approved" ? "1. Created  2. Approved  3. Ready for processing" : "1. Created  2. Waiting for admin approval  3. Processing will happen after approval"}</p>
    </div>`,
    `<div class="stack-item">
      <strong>Commissions</strong>
      <p class="muted">${commissionRows.length} item(s)</p>
      <p class="muted">${commissionRows.map((row) => `${row.commissionType}:${row.amount}`).join(" | ") || "No commissions"}</p>
    </div>`,
    `<div class="stack-item">
      <strong>Fallbacks</strong>
      <p class="muted">${fallbackRows.length} item(s)</p>
      <p class="muted">${fallbackRows.map((row) => `${row.sourceType}:${row.amount}`).join(" | ") || "No fallbacks"}</p>
    </div>`,
  ].join("");
  orderDetailOutput.textContent = JSON.stringify(snapshot, null, 2);
  setStatus(`Loaded order ${orderId}`);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    setStatus("Signing in");
    const session = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: document.getElementById("identifierInput").value.trim(),
        password: document.getElementById("passwordInput").value,
      }),
    });

    localStorage.setItem("memberAccessToken", session.accessToken);
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await request("/auth/logout", { method: "POST" });
  } catch (_error) {
  } finally {
    clearSession();
    renderSignedOut();
    setStatus("Signed out");
  }
});

refreshButton.addEventListener("click", () => {
  loadDashboard().catch((error) => {
    setStatus(error.message);
  });
});

activateForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    setStatus("Activating package");
    const result = await request("/auth/activate-package", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageId: activatePackageSelect.value,
      }),
    });
    setActionResult("Package activated", result);
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
    setActionResult("Activate failed", { message: error.message });
  }
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    setStatus("Updating password");
    const result = await request("/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: document.getElementById("currentPasswordInput").value,
        newPassword: document.getElementById("newPasswordInput").value,
      }),
    });
    setActionResult("Password updated", result);
    passwordForm.reset();
    setStatus("Password updated");
  } catch (error) {
    setStatus(error.message);
    setActionResult("Password update failed", { message: error.message });
  }
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    setStatus("Creating order");
    const result = await request("/auth/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageId: orderPackageSelect.value,
      }),
    });
    setActionResult("Order created", result);
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
    setActionResult("Order create failed", { message: error.message });
  }
});

document.addEventListener("click", (event) => {
  const button = event.target.closest(".inspect-order-button");

  if (!button) {
    return;
  }

  loadOrderDetail(button.dataset.orderId).catch((error) => {
    setStatus(error.message);
    orderDetailOutput.textContent = JSON.stringify({ message: error.message }, null, 2);
  });
});

(async function bootstrap() {
  try {
    await request("/auth/me");
    await loadDashboard();
  } catch (_error) {
    renderSignedOut();
  }
})();
