import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface AuditEntry {
  at: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  access: "public" | "member" | "admin";
  actorUserId: string | null;
  actorMemberCode: string | null;
  actorRole: "public" | "member" | "admin";
  ip: string | null;
}

export interface SecurityAuditEntry {
  event: string;
  at: string;
  ip: string | null;
  identifierHash?: string;
  retryAfterSeconds?: number;
}

const auditLogPath = join(process.cwd(), "logs", "api-audit.jsonl");
const securityAuditLogPath = join(process.cwd(), "logs", "security-audit.jsonl");

export function writeAuditEntry(entry: AuditEntry): void {
  mkdirSync(join(process.cwd(), "logs"), { recursive: true });
  appendFileSync(auditLogPath, `${JSON.stringify(entry)}\n`, "utf8");
}

export function writeSecurityAuditEntry(entry: SecurityAuditEntry): void {
  mkdirSync(join(process.cwd(), "logs"), { recursive: true });
  appendFileSync(securityAuditLogPath, `${JSON.stringify(entry)}\n`, "utf8");
}

export function shouldAuditRequest(method: string, path: string): boolean {
  if (method === "GET" || method === "OPTIONS") {
    return false;
  }

  return (
    path.startsWith("/auth/") ||
    path.startsWith("/members") ||
    path.startsWith("/packages") ||
    path.startsWith("/orders") ||
    path.startsWith("/pool")
  );
}
