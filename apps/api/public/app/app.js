const loginForm = document.getElementById("loginForm");
const logoutButton = document.getElementById("logoutButton");
const refreshButton = document.getElementById("refreshButton");
const statusLine = document.getElementById("statusLine");
const dashboard = document.getElementById("dashboard");
const authPanel = document.getElementById("authPanel");
const activateForm = document.getElementById("activateForm");
const orderForm = document.getElementById("orderForm");
const activatePackageSelect = document.getElementById("activatePackageSelect");
const orderPackageSelect = document.getElementById("orderPackageSelect");
const actionOutput = document.getElementById("actionOutput");
const orderDetailOutput = document.getElementById("orderDetailOutput");
const transactionsTable = document.getElementById("transactionsTable");
const commissionsTable = document.getElementById("commissionsTable");

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
              <td>${order.approvalStatus}</td>
              <td>${order.totalPv}</td>
              <td>${order.createdAt}</td>
              <td><button type="button" class="ghost inspect-order-button" data-order-id="${order.orderId}">Detail</button></td>
            </tr>`,
          )
          .join("")
      : '<tr><td colspan="6" class="muted">No orders</td></tr>';
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

function renderDashboard(data, orders, transactions, commissions) {
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
  renderSignedIn();
}

async function loadDashboard() {
  setStatus("Loading dashboard");

  const [dashboardData, orders, packages, transactions, commissions] = await Promise.all([
    request("/auth/dashboard"),
    request("/auth/orders"),
    request("/packages"),
    request("/auth/transactions"),
    request("/auth/commissions"),
  ]);

  packageCatalog = packages.filter((pkg) => pkg.status === "active");
  renderPackageOptions(packageCatalog);
  renderDashboard(dashboardData, orders, transactions, commissions);
  setStatus("Dashboard loaded");
}

async function loadOrderDetail(orderId) {
  setStatus(`Loading order ${orderId}`);
  const snapshot = await request(`/auth/orders/${orderId}`);
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
