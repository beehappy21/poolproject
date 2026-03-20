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
            (pkg) => `<tr><td>${pkg.code}</td><td>${pkg.name}</td><td>${pkg.pv}</td><td>${pkg.priceUsdt}</td><td>${pkg.status}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="muted">No packages</td></tr>';
}

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const payload = {
      ref: getReferralCode() || undefined,
      memberCode: document.getElementById("memberCodeInput").value.trim(),
      name: document.getElementById("nameInput").value.trim(),
      email: document.getElementById("emailInput").value.trim() || undefined,
    };

    setStatus("Creating member");
    const result = await request("/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setResult("Member created", result);
    setStatus("Member created");
    signupForm.reset();
    refInput.value = getReferralCode();
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
