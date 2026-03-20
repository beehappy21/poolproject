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
const orderUserFilterInput = document.getElementById("orderUserFilterInput");
const commissionOrderFilterInput = document.getElementById("commissionOrderFilterInput");
const commissionBeneficiaryFilterInput = document.getElementById("commissionBeneficiaryFilterInput");
const poolPayoutDateInput = document.getElementById("poolPayoutDateInput");
const loadPoolPayoutsButton = document.getElementById("loadPoolPayoutsButton");
const orderStatusFilter = document.getElementById("orderStatusFilter");
const fallbackTypeFilter = document.getElementById("fallbackTypeFilter");
const memberDetailForm = document.getElementById("memberDetailForm");
const memberDetailOutput = document.getElementById("memberDetailOutput");
const actionOutput = document.getElementById("actionOutput");
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
state.pageSize = 8;
state.pages = {
  members: 1,
  orders: 1,
  pool: 1,
  fallbacks: 1,
  commissions: 1,
};

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

function paginateRows(rows, key) {
  const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  state.pages[key] = Math.min(state.pages[key] || 1, totalPages);
  const page = state.pages[key];
  const start = (page - 1) * state.pageSize;
  const pagedRows = rows.slice(start, start + state.pageSize);
  const label = document.getElementById(`${key}PageLabel`);

  if (label) {
    label.textContent = `Page ${page} / ${totalPages}`;
  }

  return pagedRows;
}

function updatePage(key, delta) {
  state.pages[key] = Math.max(1, (state.pages[key] || 1) + delta);
  loadDashboard().catch((error) => setStatus(error.message));
}

function renderSession(user) {
  if (!sessionCard) {
    return;
  }

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
    request("/members"),
    request(`/orders${orderQuery.toString() ? `?${orderQuery.toString()}` : ""}`),
    request("/pool"),
    request(
      `/commissions/company-fallbacks${fallbackTypeFilter.value ? `?sourceType=${encodeURIComponent(fallbackTypeFilter.value)}` : ""}`,
    ),
    request("/packages"),
  ]);

  const commissionQuery = new URLSearchParams();
  if (state.commissionOrderId) {
    commissionQuery.set("orderId", state.commissionOrderId);
  }
  if (state.commissionBeneficiaryUserId) {
    commissionQuery.set("beneficiaryUserId", state.commissionBeneficiaryUserId);
  }
  const commissions = await request(
    `/commissions${commissionQuery.toString() ? `?${commissionQuery.toString()}` : ""}`,
  );

  document.getElementById("membersCount").textContent = String(members.length);
  document.getElementById("ordersCount").textContent = String(orders.length);
  document.getElementById("poolCount").textContent = String(poolCycles.length);
  document.getElementById("fallbackCount").textContent = String(fallbacks.length);

  const visibleMembers = members.filter((member) => {
    const needle = state.memberSearch.trim().toLowerCase();

    if (!needle) {
      return true;
    }

    return (
      member.memberCode.toLowerCase().includes(needle) ||
      member.name.toLowerCase().includes(needle)
    );
  });

  renderTableRows(
    "membersTable",
    paginateRows(visibleMembers, "members"),
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
          <button type="button" class="secondary" data-action="prefill-activate" data-member-id="${member.memberId}">Activate</button>
        </div>
      </td>
    </tr>`,
  );

  renderTableRows(
    "ordersTable",
    paginateRows(orders, "orders"),
    (order) => `<tr>
      <td>${order.orderId}</td>
      <td>${order.orderNo}</td>
      <td>${order.sourceUserId}</td>
      <td>${order.approvalStatus}</td>
      <td>${order.totalPv}</td>
      <td>
        <div class="table-actions">
          <button type="button" data-action="approve-order" data-order-id="${order.orderId}">Approve</button>
          <button type="button" data-action="process-order" data-order-id="${order.orderId}">Process</button>
          <button type="button" class="secondary" data-action="order-detail" data-order-id="${order.orderId}">Detail</button>
        </div>
      </td>
    </tr>`,
  );

  renderTableRows(
    "packagesTable",
    packages,
    (pkg) => `<tr><td>${pkg.packageId}</td><td>${pkg.code}</td><td>${pkg.name}</td><td>${pkg.pv}</td><td>${pkg.priceUsdt}</td><td>${pkg.status}</td></tr>`,
  );

  const packageOptions = [
    '<option value="">Pick package ID</option>',
    ...packages.map(
      (pkg) => `<option value="${pkg.packageId}">${pkg.packageId} · ${pkg.code} · PV ${pkg.pv}</option>`,
    ),
  ].join("");
  orderPackageSelect.innerHTML = packageOptions;
  activatePackageSelect.innerHTML = packageOptions;

  renderTableRows(
    "poolTable",
    paginateRows(poolCycles, "pool"),
    (cycle) => `<tr><td>${cycle.poolDate}</td><td>${cycle.poolFund}</td><td>${cycle.eligibleMemberCount}</td><td>${cycle.payoutPerMember}</td><td>${cycle.status}</td></tr>`,
  );

  renderTableRows(
    "fallbacksTable",
    paginateRows(fallbacks, "fallbacks"),
    (fallback) => `<tr><td>${fallback.fallbackId}</td><td>${fallback.sourceType}</td><td>${fallback.sourceRefId}</td><td>${fallback.amount}</td><td>${fallback.reason}</td></tr>`,
  );

  renderTableRows(
    "commissionsTable",
    paginateRows(commissions, "commissions"),
    (commission) =>
      `<tr><td>${commission.commissionId}</td><td>${commission.orderId}</td><td>${commission.beneficiaryUserId ?? "-"}</td><td>${commission.commissionType}</td><td>${commission.amount}</td><td>${commission.status}</td></tr>`,
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
  const [order, commissions] = await Promise.all([
    request(`/orders/${orderId}`),
    request(`/commissions?orderId=${encodeURIComponent(orderId)}`),
  ]);
  setActionOutput(`Order ${orderId} detail`, { order, commissions });
  setStatus(`Loaded order ${orderId}`);
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
}

async function runOrderAction(orderId, action) {
  setStatus(`${action} order ${orderId}`);
  const path =
    action === "approve-order"
      ? `/orders/${orderId}/approve`
      : `/orders/${orderId}/process-approved`;
  const result = await request(path, { method: "POST" });
  setActionOutput(`${action} result`, result);
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

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const data = await request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: document.getElementById("identifierInput").value.trim(),
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
    loadDashboard().catch((error) => setStatus(error.message));
  });
}

if (memberSearchInput) {
  memberSearchInput.addEventListener("input", (event) => {
    state.memberSearch = event.target.value || "";
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

if (loadPoolPayoutsButton) {
  loadPoolPayoutsButton.addEventListener("click", () => {
    loadPoolPayouts(poolPayoutDateInput.value).catch((error) => {
      setStatus(error.message);
      setActionOutput("Pool payout lookup failed", { message: error.message });
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

  if (button.dataset.action === "wallet-detail") {
    loadWalletDetail(button.dataset.memberId).catch((error) => {
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
}

(async function bootstrap() {
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
