import assert from "node:assert/strict";
import { accessSync, constants, readFileSync } from "node:fs";
import test from "node:test";

const requiredDocs = [
  "docs/operations/production-readiness-checklist.md",
  "docs/operations/production-deploy-runbook.md",
  "docs/operations/rollback-runbook.md",
  "docs/operations/incident-response.md",
  "docs/operations/production-handoff-summary.md",
];

test("production go-live documents exist", () => {
  for (const doc of requiredDocs) {
    accessSync(doc, constants.R_OK);
  }
});

test("production smoke scripts exist and are executable", () => {
  accessSync("scripts/ops/smoke-health.sh", constants.X_OK);
  accessSync("scripts/ops/smoke-production.sh", constants.X_OK);
});

test("package scripts expose production smoke and readiness docs test", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

  assert.equal(packageJson.scripts["smoke:production"], "bash scripts/ops/smoke-production.sh");
  assert.equal(packageJson.scripts["test:production-readiness"], "npm run build && node --test dist/apps/api/apps/api/src/ops/production-readiness-docs.spec.js");
  assert.match(packageJson.scripts["ci:shell-syntax"], /smoke-production\.sh/);
});

test("production checklist covers launch-critical categories", () => {
  const source = readFileSync("docs/operations/production-readiness-checklist.md", "utf8");

  for (const term of ["backup", "restore", "rollback", "monitoring", "CI", "security"]) {
    assert.match(source, new RegExp(term, "i"));
  }
});

test("handoff summary includes PR1 through PR9 commit hashes", () => {
  const source = readFileSync("docs/operations/production-handoff-summary.md", "utf8");
  const commits = [
    "4fe0c25d",
    "9f65f493",
    "98fec475",
    "2c194bcc",
    "e304ffe1",
    "8b84ffa0",
    "cd62e391",
    "d9b2eba5",
    "61df47ac",
  ];

  for (const commit of commits) {
    assert.match(source, new RegExp(commit));
  }
});

test("production smoke script covers health readiness and login surface", () => {
  const source = readFileSync("scripts/ops/smoke-production.sh", "utf8");

  assert.match(source, /\/health\/ready/);
  assert.match(source, /\/auth\/login/);
  assert.doesNotMatch(source, /Admin123|password123|SUPER_ADMIN_PASSWORD=.*\w|DATABASE_URL=.*:\/\//);
});

test("new go-live docs do not contain obvious real secret assignments", () => {
  for (const doc of requiredDocs) {
    const source = readFileSync(doc, "utf8");

    assert.doesNotMatch(source, /DATABASE_URL\s*=\s*\w+:\/\//);
    assert.doesNotMatch(source, /APP_REDIS_URL\s*=\s*redis:\/\//);
    assert.doesNotMatch(source, /SUPER_ADMIN_PASSWORD\s*=\s*\S+/);
    assert.doesNotMatch(source, /AUTH_SESSION_HMAC_SECRET\s*=\s*\S+/);
    assert.doesNotMatch(source, /LINE_CHANNEL_SECRET\s*=\s*\S+/);
  }
});
