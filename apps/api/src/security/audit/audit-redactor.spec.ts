import assert from "node:assert/strict";
import test from "node:test";

import { redactAuditValue } from "./audit-redactor";

test("redacts sensitive keys case-insensitively", () => {
  const redacted = redactAuditValue({
    password: "p@ssword",
    Authorization: "Bearer raw-token",
    lineIdToken: "line-token",
    INTERNAL_RECEIPT_TOKEN: "receipt-token",
    safe: "visible",
  }) as Record<string, unknown>;

  assert.equal(redacted.password, "[REDACTED]");
  assert.equal(redacted.Authorization, "[REDACTED]");
  assert.equal(redacted.lineIdToken, "[REDACTED]");
  assert.equal(redacted.INTERNAL_RECEIPT_TOKEN, "[REDACTED]");
  assert.equal(redacted.safe, "visible");
});

test("redacts nested objects and arrays", () => {
  const redacted = redactAuditValue({
    nested: {
      token: "raw-token",
      items: [{ apiKey: "raw-api-key" }, { value: "ok" }],
    },
  }) as { nested: { token: string; items: Array<Record<string, unknown>> } };

  assert.equal(redacted.nested.token, "[REDACTED]");
  assert.equal(redacted.nested.items[0].apiKey, "[REDACTED]");
  assert.equal(redacted.nested.items[1].value, "ok");
});

test("handles circular references safely", () => {
  const source: Record<string, unknown> = { value: "ok" };
  source.self = source;

  const redacted = redactAuditValue(source) as Record<string, unknown>;

  assert.equal(redacted.value, "ok");
  assert.equal(redacted.self, "[Circular]");
});

test("truncates long strings and redacts base64 payload keys", () => {
  const redacted = redactAuditValue(
    {
      message: "x".repeat(20),
      imageBase64: "data:image/png;base64,raw-payload",
      slipDataUrl: "data:image/png;base64,raw-slip",
    },
    { maxStringLength: 8 },
  ) as Record<string, unknown>;

  assert.equal(redacted.imageBase64, "[REDACTED]");
  assert.equal(redacted.slipDataUrl, "[REDACTED]");
  assert.equal(redacted.message, "xxxxxxxx...[truncated:12]");
});
