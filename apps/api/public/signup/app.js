const sponsorCard = document.getElementById("sponsorCard");
const signupForm = document.getElementById("signupForm");
const packagesTable = document.getElementById("packagesTable");
const resultOutput = document.getElementById("resultOutput");
const statusLine = document.getElementById("statusLine");
const refInput = document.getElementById("refInput");

function setStatus(message) {
  statusLine.textContent = message;
}

function setResult(label, data) {
  resultOutput.textContent = `${label}\n\n${JSON.stringify(data, null, 2)}`;
}

function setSignupSuccessResult(member) {
  const referralLink = `${window.location.origin}/signup?ref=${encodeURIComponent(member.referralCode)}`;
  resultOutput.textContent = [
    "Member created",
    "",
    `Member Code: ${member.memberCode}`,
    `Referral Code: ${member.referralCode}`,
    `Name: ${member.name}`,
    `Member ID: ${member.memberId}`,
    `Referral Link: ${referralLink}`,
  ].join("\n");
}

async function request(path, options = {}) {
  const response = await fetch(path, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || `Request failed: ${response.status}`);
  }

  return data;
}

function getReferralCode() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("ref") || refInput.value || "").trim();
}

async function loadSponsorCard() {
  const ref = getReferralCode();

  if (!ref) {
    sponsorCard.innerHTML = '<p class="muted">No referral code provided yet.</p>';
    return;
  }

  setStatus(`Loading sponsor ${ref}`);
  refInput.value = ref;

  try {
    const member = await request(`/members/by-code/${encodeURIComponent(ref)}`);
    sponsorCard.innerHTML = `
      <p class="eyebrow">Invited By</p>
      <strong>${member.name}</strong>
      <p class="muted">${member.memberCode}</p>
      <p class="muted">Member ID ${member.memberId}</p>
    `;
    setStatus(`Loaded sponsor ${ref}`);
  } catch (error) {
    sponsorCard.innerHTML = `<p class="muted">${error.message}</p>`;
    setStatus(error.message);
  }
}

async function loadPackages() {
  const packages = await request("/packages");
  packagesTable.innerHTML =
    packages.length > 0
      ? packages
          .map(
            (pkg) => `<tr><td>${pkg.code}</td><td>${pkg.name}</td><td>${pkg.pv}</td><td>${Number(pkg.priceUsdt || 0).toFixed(2)} บาท</td><td>${pkg.status}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="muted">No packages</td></tr>';
}

async function createSessionAfterSignup(identifier, password) {
  const session = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier,
      password,
    }),
  });

  localStorage.setItem("memberAccessToken", session.accessToken);
}

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const password = document.getElementById("passwordInput").value;
    const email = document.getElementById("emailInput").value.trim();
    const phone = document.getElementById("phoneInput").value.trim();

    if (!email && !phone) {
      throw new Error("Email or phone is required.");
    }

    if (!/^[A-Za-z0-9]{6,}$/.test(password)) {
      throw new Error("Password must be at least 6 letters or numbers.");
    }

    const payload = {
      ref: getReferralCode() || undefined,
      email: email || undefined,
      phone: phone || undefined,
      password,
    };

    setStatus("Creating member");
    const result = await request("/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSignupSuccessResult(result);
    setStatus("Signing in");
    await createSessionAfterSignup(email || phone || result.memberCode, password);
    setStatus("Redirecting to dashboard");
    window.location.href = "/app";
  } catch (error) {
    setStatus(error.message);
    setResult("Signup failed", { message: error.message });
  }
});

refInput.addEventListener("change", () => {
  const params = new URLSearchParams(window.location.search);
  const ref = refInput.value.trim();

  if (ref) {
    params.set("ref", ref);
  } else {
    params.delete("ref");
  }

  history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  loadSponsorCard().catch((error) => setStatus(error.message));
});

(async function bootstrap() {
  await Promise.all([
    loadSponsorCard(),
    loadPackages(),
  ]).catch((error) => {
    setStatus(error.message);
  });
})();
