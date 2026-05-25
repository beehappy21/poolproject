import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { normalizeAuditEvent } from "./audit-logger";
import { FileAuditSink } from "./file-audit-sink";

test("normalizes audit events without exposing raw secret metadata", () => {
  const normalized = normalizeAuditEvent({
    eventType: "auth.login.failed",
    outcome: "failure",
    metadata: {
      password: "raw-password",
      nested: {
        accessToken: "raw-token",
      },
    },
  });

  const json = JSON.stringify(normalized);
  assert.match(normalized.timestamp, /\d{4}-\d{2}-\d{2}T/);
  assert.doesNotMatch(json, /raw-password/);
  assert.doesNotMatch(json, /raw-token/);
  assert.match(json, /\[REDACTED\]/);
});

test("file audit sink writes JSONL and creates missing log directory", () => {
  const dir = mkdtempSync(join(tmpdir(), "pool-audit-"));
  const logDir = join(dir, "nested");
  const sink = new FileAuditSink({
    enabled: true,
    console: false,
    dir: logDir,
    file: "audit.jsonl",
    maxBytes: 1024,
    maxFiles: 3,
  });

  sink.write(`${JSON.stringify({ eventType: "test.event" })}\n`);

  const contents = readFileSync(join(logDir, "audit.jsonl"), "utf8");
  assert.deepEqual(JSON.parse(contents.trim()), { eventType: "test.event" });
  rmSync(dir, { recursive: true, force: true });
});

test("file audit sink rotates and retains bounded files", () => {
  const dir = mkdtempSync(join(tmpdir(), "pool-audit-"));
  const sink = new FileAuditSink({
    enabled: true,
    console: false,
    dir,
    file: "audit.jsonl",
    maxBytes: 45,
    maxFiles: 2,
  });

  for (let index = 0; index < 6; index += 1) {
    sink.write(`${JSON.stringify({ eventType: "test.event", index })}\n`);
  }

  const files = readdirSync(dir).filter((file) => file.startsWith("audit.jsonl"));
  assert.ok(files.includes("audit.jsonl"));
  assert.ok(files.includes("audit.jsonl.1"));
  assert.ok(!files.includes("audit.jsonl.2"));
  assert.ok(!files.includes("audit.jsonl.3"));
  rmSync(dir, { recursive: true, force: true });
});

test("file audit sink does not throw on write failure", () => {
  const dir = mkdtempSync(join(tmpdir(), "pool-audit-"));
  const blockedPath = join(dir, "blocked");
  writeFileSync(blockedPath, "not a directory", "utf8");
  const sink = new FileAuditSink({
    enabled: true,
    console: false,
    dir: blockedPath,
    file: "audit.jsonl",
    maxBytes: 1024,
    maxFiles: 3,
  });

  assert.doesNotThrow(() => sink.write(`${JSON.stringify({ eventType: "test.event" })}\n`));
  assert.ok(existsSync(blockedPath));
  rmSync(dir, { recursive: true, force: true });
});
