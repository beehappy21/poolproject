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

function setStatus(message) {
  statusLine.textContent = message;
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

  const [members, orders, poolCycles, fallbacks] = await Promise.all([
    request("/members"),
    request(`/orders${orderStatusFilter.value ? `?approvalStatus=${encodeURIComponent(orderStatusFilter.value)}` : ""}`),
    request("/pool"),
    request(
      `/commissions/company-fallbacks${fallbackTypeFilter.value ? `?sourceType=${encodeURIComponent(fallbackTypeFilter.value)}` : ""}`,
    ),
  ]);

  document.getElementById("membersCount").textContent = String(members.length);
  document.getElementById("ordersCount").textContent = String(orders.length);
  document.getElementById("poolCount").textContent = String(poolCycles.length);
  document.getElementById("fallbackCount").textContent = String(fallbacks.length);

  renderTableRows(
    "membersTable",
    members,
    (member) => `<tr><td>${member.memberId}</td><td>${member.memberCode}</td><td>${member.name}</td><td>${member.sponsorId ?? "-"}</td></tr>`,
  );

  renderTableRows(
    "ordersTable",
    orders,
    (order) => `<tr><td>${order.orderId}</td><td>${order.orderNo}</td><td>${order.sourceUserId}</td><td>${order.approvalStatus}</td><td>${order.totalPv}</td></tr>`,
  );

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

memberDetailForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadMemberDetail(document.getElementById("memberDetailInput").value.trim()).catch(
    (error) => {
      memberDetailOutput.textContent = error.message;
      setStatus(error.message);
    },
  );
});

(async function bootstrap() {
  const user = await loadSession();
  if (user) {
    await loadDashboard().catch((error) => setStatus(error.message));
  } else {
    setStatus("Sign in to load dashboard");
  }
})();
