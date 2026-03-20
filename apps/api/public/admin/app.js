const state = {
  token: localStorage.getItem("adminAccessToken") || "",
};

const sessionCard = document.getElementById("sessionCard");
const loginForm = document.getElementById("loginForm");
const refreshButton = document.getElementById("refreshButton");
const logoutButton = document.getElementById("logoutButton");
const statusLine = document.getElementById("statusLine");
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

function setStatus(message) {
  statusLine.textContent = message;
}

function setActionOutput(label, data) {
  actionOutput.textContent = `${label}\n\n${JSON.stringify(data, null, 2)}`;
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

  if (!response.ok) {
    throw new Error(data?.message || `Request failed: ${response.status}`);
  }

  return data;
}

function renderTableRows(elementId, rows, renderRow) {
  const target = document.getElementById(elementId);
  target.innerHTML =
    rows.length > 0
      ? rows.map(renderRow).join("")
      : `<tr><td colspan="5" class="muted">No data</td></tr>`;
}

function renderSession(user) {
  sessionCard.innerHTML = user
    ? `<p class="eyebrow">Signed In</p><strong>${user.name}</strong><p class="muted">${user.memberCode}${user.email ? ` · ${user.email}` : ""}</p>`
    : `<p class="muted">Not signed in</p>`;
}

async function loadSession() {
  if (!state.token) {
    renderSession(null);
    return null;
  }

  try {
    const session = await request("/auth/me");
    renderSession(session.user);
    return session.user;
  } catch {
    setToken("");
    renderSession(null);
    return null;
  }
}

async function loadDashboard() {
  setStatus("Loading dashboard");

  const [members, orders, poolCycles, fallbacks, packages] = await Promise.all([
    request("/members"),
    request(`/orders${orderStatusFilter.value ? `?approvalStatus=${encodeURIComponent(orderStatusFilter.value)}` : ""}`),
    request("/pool"),
    request(
      `/commissions/company-fallbacks${fallbackTypeFilter.value ? `?sourceType=${encodeURIComponent(fallbackTypeFilter.value)}` : ""}`,
    ),
    request("/packages"),
  ]);

  document.getElementById("membersCount").textContent = String(members.length);
  document.getElementById("ordersCount").textContent = String(orders.length);
  document.getElementById("poolCount").textContent = String(poolCycles.length);
  document.getElementById("fallbackCount").textContent = String(fallbacks.length);

  renderTableRows(
    "membersTable",
    members,
    (member) => `<tr>
      <td>${member.memberId}</td>
      <td>${member.memberCode}</td>
      <td>${member.name}</td>
      <td>${member.sponsorId ?? "-"}</td>
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
    orders,
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
    poolCycles,
    (cycle) => `<tr><td>${cycle.poolDate}</td><td>${cycle.poolFund}</td><td>${cycle.eligibleMemberCount}</td><td>${cycle.payoutPerMember}</td><td>${cycle.status}</td></tr>`,
  );

  renderTableRows(
    "fallbacksTable",
    fallbacks,
    (fallback) => `<tr><td>${fallback.fallbackId}</td><td>${fallback.sourceType}</td><td>${fallback.sourceRefId}</td><td>${fallback.amount}</td><td>${fallback.reason}</td></tr>`,
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

async function loadOrderDetail(orderId) {
  setStatus(`Loading order ${orderId}`);
  const [order, commissions] = await Promise.all([
    request(`/orders/${orderId}`),
    request(`/commissions?orderId=${encodeURIComponent(orderId)}`),
  ]);
  setActionOutput(`Order ${orderId} detail`, { order, commissions });
  setStatus(`Loaded order ${orderId}`);
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
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
  }
});

refreshButton.addEventListener("click", () => {
  loadDashboard().catch((error) => setStatus(error.message));
});

logoutButton.addEventListener("click", async () => {
  try {
    if (state.token) {
      await request("/auth/logout", { method: "POST" });
    }
  } catch {}

  setToken("");
  renderSession(null);
  setStatus("Signed out");
});

orderStatusFilter.addEventListener("change", () => {
  loadDashboard().catch((error) => setStatus(error.message));
});

fallbackTypeFilter.addEventListener("change", () => {
  loadDashboard().catch((error) => setStatus(error.message));
});

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

(async function bootstrap() {
  const user = await loadSession();
  if (user) {
    await loadDashboard().catch((error) => setStatus(error.message));
  } else {
    setStatus("Sign in to load dashboard");
  }
})();
