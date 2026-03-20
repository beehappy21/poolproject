const loginForm = document.getElementById("loginForm");
const logoutButton = document.getElementById("logoutButton");
const refreshButton = document.getElementById("refreshButton");
const statusLine = document.getElementById("statusLine");
const dashboard = document.getElementById("dashboard");
const authPanel = document.getElementById("authPanel");

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
            </tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="muted">No orders</td></tr>';
}

function renderDashboard(data, orders) {
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
  renderSignedIn();
}

async function loadDashboard() {
  setStatus("Loading dashboard");

  const [dashboardData, orders] = await Promise.all([
    request("/auth/dashboard"),
    request("/auth/orders"),
  ]);

  renderDashboard(dashboardData, orders);
  setStatus("Dashboard loaded");
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

(async function bootstrap() {
  try {
    await request("/auth/me");
    await loadDashboard();
  } catch (_error) {
    renderSignedOut();
  }
})();
