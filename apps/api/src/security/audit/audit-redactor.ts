const REDACTED = "[REDACTED]";
const CIRCULAR = "[Circular]";
const DEFAULT_MAX_STRING_LENGTH = 2048;

const SENSITIVE_KEYS = new Set([
  "password",
  "oldpassword",
  "newpassword",
  "confirmpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "sessiontoken",
  "authorization",
  "authheader",
  "cookie",
  "setcookie",
  "linetoken",
  "idtoken",
  "lineidtoken",
  "lineaccesstoken",
  "secret",
  "apikey",
  "internaltoken",
  "receipttoken",
  "internalreceipttoken",
  "superadminpassword",
  "superadminoverridepassword",
  "databaseurl",
  "appredisurl",
  "redisurl",
  "authsessionhmacsecret",
  "base64",
  "imagebase64",
  "slipimage",
  "slipdataurl",
]);

export interface RedactAuditValueOptions {
  maxStringLength?: number;
}

export function redactAuditValue<T>(
  value: T,
  options: RedactAuditValueOptions = {},
): unknown {
  return redactValue(value, {
    maxStringLength: options.maxStringLength || DEFAULT_MAX_STRING_LENGTH,
    seen: new WeakSet<object>(),
  });
}

export function isSensitiveAuditKey(key: string): boolean {
  return SENSITIVE_KEYS.has(normalizeKey(key));
}

function redactValue(
  value: unknown,
  context: { maxStringLength: number; seen: WeakSet<object> },
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return truncateString(value, context.maxStringLength);
  }

  if (typeof value !== "object") {
    return value;
  }

  if (context.seen.has(value)) {
    return CIRCULAR;
  }

  context.seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, context));
  }

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    output[key] = isSensitiveAuditKey(key)
      ? REDACTED
      : redactValue(nestedValue, context);
  }

  return output;
}

function truncateString(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...[truncated:${value.length - maxLength}]`;
}

function normalizeKey(key: string): string {
  return key.replace(/[-_\s]/g, "").toLowerCase();
}
