import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("failed login and brute-force lock write sanitized audit events", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pool-audit-integration-"));
  process.env.AUDIT_LOG_ENABLED = "true";
  process.env.AUDIT_LOG_DIR = dir;
  process.env.AUDIT_LOG_FILE = "audit.jsonl";
  process.env.AUDIT_LOG_MAX_BYTES = "1048576";
  process.env.AUDIT_LOG_MAX_FILES = "3";
  process.env.AUTH_LOGIN_LOCK_MAX_FAILURES = "1";

  const { AuthBruteForceService } = await import(
    "../../../../../packages/modules/auth/src/brute-force/auth-brute-force.service"
  );
  const { InMemoryAuthBruteForceStore } = await import(
    "../../../../../packages/modules/auth/src/brute-force/in-memory-auth-brute-force-store"
  );

  const service = new AuthBruteForceService(new InMemoryAuthBruteForceStore());
  await service.recordFailedLogin({
    identifier: "Member001@example.com",
    ip: "203.0.113.24",
  });

  await assert.rejects(
    () => service.assertCanAttemptLogin({
      identifier: "Member001@example.com",
      ip: "203.0.113.24",
    }),
    /Invalid credentials/,
  );

  const contents = readFileSync(join(dir, "audit.jsonl"), "utf8");
  const events = contents
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));

  assert.ok(events.some((event) => event.eventType === "auth.login.failed"));
  assert.ok(events.some((event) => event.eventType === "auth.login.lock.created"));
  assert.ok(events.some((event) => event.eventType === "auth.login.locked"));
  assert.doesNotMatch(contents, /Member001@example.com/);
  assert.doesNotMatch(contents, /203\.0\.113\.24"/);
  rmSync(dir, { recursive: true, force: true });
});
