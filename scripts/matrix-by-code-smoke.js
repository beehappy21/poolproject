const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const MEMBER_CODE = process.env.MATRIX_MEMBER_CODE || "TH0000013";
const EXPECTED_MEMBER_ID = process.env.MATRIX_EXPECTED_MEMBER_ID || "18";

async function request(path) {
  const target = new URL(`${API_BASE_URL}${path}`);
  const transport = target.protocol === "https:" ? https : http;

  const response = await new Promise((resolve, reject) => {
    const req = transport.request(
      target,
      {
        method: "GET",
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 500,
            body: raw,
          });
        });
      },
    );

    req.on("error", reject);
    req.end();
  });

  const parsed = response.body ? JSON.parse(response.body) : null;

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(parsed?.message || `${response.statusCode} request failed for ${path}`);
  }

  return parsed;
}

async function main() {
  const member = await request(`/members/by-code/${encodeURIComponent(MEMBER_CODE)}`);
  const matrix = await request(
    `/matrix/member/by-code/${encodeURIComponent(MEMBER_CODE)}`,
  );

  if (String(member.memberId) !== String(EXPECTED_MEMBER_ID)) {
    throw new Error(
      `Expected ${MEMBER_CODE} to map to memberId ${EXPECTED_MEMBER_ID}, received ${member.memberId}.`,
    );
  }

  if (String(matrix.member?.memberId) !== String(member.memberId)) {
    throw new Error(
      `Matrix by-code route resolved memberId ${matrix.member?.memberId ?? "unknown"} instead of ${member.memberId}.`,
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        memberCode: MEMBER_CODE,
        memberId: member.memberId,
        cycleCount: Array.isArray(matrix.cycles) ? matrix.cycles.length : 0,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
