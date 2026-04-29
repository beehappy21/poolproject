#!/usr/bin/env node

const http = require("http");
const https = require("https");

function requestStatus(targetUrl, method = "HEAD") {
  return new Promise((resolve) => {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === "https:" ? https : http;

    const req = client.request(
      parsed,
      {
        method,
        timeout: 5000,
      },
      (res) => {
        resolve({
          ok: true,
          statusCode: res.statusCode || 0,
          location: res.headers.location || "",
        });
        res.resume();
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });

    req.on("error", (error) => {
      resolve({
        ok: false,
        statusCode: 0,
        location: "",
        error: error.message,
      });
    });

    req.end();
  });
}

async function main() {
  const baseUrl = process.argv[2] || "http://127.0.0.1:8001";
  const wapUrl = process.argv[3] || "http://127.0.0.1:3001";

  let failed = false;

  const bao = await requestStatus(`${baseUrl}/admin/commission-main-plan/report`);
  const baoStatus = bao.ok ? String(bao.statusCode) : `error:${bao.error}`;
  const baoMarker =
    bao.statusCode === 302 && bao.location.includes("/admin/login")
      ? "login-redirect-ok"
      : bao.statusCode === 200
        ? "head-ok"
        : "unexpected";
  console.log(
    `BAO_MAIN_PLAN path=/admin/commission-main-plan/report status=${baoStatus} marker=${baoMarker} location=${bao.location || "n/a"}`,
  );
  if (
    !(
      bao.statusCode === 200 ||
      (bao.statusCode === 302 && bao.location.includes("/admin/login"))
    )
  ) {
    failed = true;
  }

  const wap = await requestStatus(`${wapUrl}/CommissionMainPlan`);
  const wapStatus = wap.ok ? String(wap.statusCode) : `error:${wap.error}`;
  const wapMarker = wap.statusCode === 200 ? "head-ok" : "unexpected";
  console.log(
    `WAP_MAIN_PLAN path=/CommissionMainPlan status=${wapStatus} marker=${wapMarker}`,
  );
  if (wap.statusCode !== 200) {
    failed = true;
  }

  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
