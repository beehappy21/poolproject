import { join } from "node:path";

export interface AuditLogConfig {
  enabled: boolean;
  console: boolean;
  dir: string;
  file: string;
  maxBytes: number;
  maxFiles: number;
}

export function getAuditLogConfig(env: NodeJS.ProcessEnv = process.env): AuditLogConfig {
  return {
    enabled: parseBoolean(env.AUDIT_LOG_ENABLED, true),
    console: parseBoolean(env.AUDIT_LOG_CONSOLE, false),
    dir: env.AUDIT_LOG_DIR?.trim() || join(process.cwd(), "logs"),
    file: env.AUDIT_LOG_FILE?.trim() || "audit.jsonl",
    maxBytes: parsePositiveInteger(env.AUDIT_LOG_MAX_BYTES, 10 * 1024 * 1024),
    maxFiles: parsePositiveInteger(env.AUDIT_LOG_MAX_FILES, 5),
  };
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  return value.trim().toLowerCase() === "true";
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return fallback;
  }

  return parsed;
}
