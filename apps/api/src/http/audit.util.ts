import {
  hashAuditIp,
  maskAuditIp,
  writeAuditEvent,
} from "../security/audit/audit-logger";

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
  requestId?: string | null;
}

export interface SecurityAuditEntry {
  event: string;
  at: string;
  ip: string | null;
  identifierHash?: string;
  retryAfterSeconds?: number;
  requestId?: string | null;
  method?: string | null;
  route?: string | null;
  metadata?: Record<string, unknown>;
}

export interface BusinessAuditEntry {
  event: string;
  at: string;
  actorUserId?: string | null;
  actorMemberCode?: string | null;
  actorRole?: string | null;
  ip?: string | null;
  requestId?: string | null;
  method?: string | null;
  route?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  outcome?: "success" | "failure" | "denied" | "limited" | "locked";
  reason?: string | null;
  code?: string | null;
  metadata?: Record<string, unknown>;
}

export function writeAuditEntry(entry: AuditEntry): void {
  writeAuditEvent({
    timestamp: entry.at,
    eventType: "api.request",
    actorType: entry.actorRole,
    actorId: entry.actorUserId,
    memberCode: entry.actorMemberCode,
    role: entry.actorRole,
    ipHash: hashAuditIp(entry.ip),
    ipMasked: maskAuditIp(entry.ip),
    requestId: entry.requestId ?? null,
    route: entry.path,
    method: entry.method,
    targetType: "route",
    targetId: entry.path,
    outcome: entry.statusCode >= 400 ? "failure" : "success",
    code: String(entry.statusCode),
    metadata: {
      durationMs: entry.durationMs,
      access: entry.access,
    },
  });
}

export function writeSecurityAuditEntry(entry: SecurityAuditEntry): void {
  writeAuditEvent({
    timestamp: entry.at,
    eventType: entry.event,
    actorType: "unknown",
    ipHash: hashAuditIp(entry.ip),
    ipMasked: maskAuditIp(entry.ip),
    requestId: entry.requestId ?? null,
    route: entry.route ?? null,
    method: entry.method ?? null,
    targetType: entry.identifierHash ? "login_identifier" : "security_event",
    targetId: entry.identifierHash ?? null,
    outcome: inferSecurityOutcome(entry.event),
    metadata: {
      identifierHash: entry.identifierHash,
      retryAfterSeconds: entry.retryAfterSeconds,
      ...(entry.metadata || {}),
    },
  });
}

export function writeBusinessAuditEntry(entry: BusinessAuditEntry): void {
  writeAuditEvent({
    timestamp: entry.at,
    eventType: entry.event,
    actorType: inferActorType(entry.actorRole),
    actorId: entry.actorUserId ?? null,
    memberCode: entry.actorMemberCode ?? null,
    role: entry.actorRole ?? null,
    ipHash: hashAuditIp(entry.ip),
    ipMasked: maskAuditIp(entry.ip),
    requestId: entry.requestId ?? null,
    route: entry.route ?? null,
    method: entry.method ?? null,
    targetType: entry.targetType ?? null,
    targetId: entry.targetId ?? null,
    outcome: entry.outcome ?? "success",
    reason: entry.reason ?? null,
    code: entry.code ?? null,
    metadata: entry.metadata || {},
  });
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

function inferSecurityOutcome(event: string): "success" | "failure" | "denied" | "limited" | "locked" {
  if (event.includes("success") || event.includes("logout")) {
    return "success";
  }
  if (event.includes("locked") || event.includes("lock")) {
    return "locked";
  }
  if (event.includes("limit")) {
    return "limited";
  }
  if (event.includes("denied") || event.includes("forbidden")) {
    return "denied";
  }

  return "failure";
}

function inferActorType(role: string | null | undefined): "public" | "member" | "admin" | "system" | "worker" | "unknown" {
  if (role === "admin" || role === "super_admin") {
    return "admin";
  }
  if (role === "member") {
    return "member";
  }
  if (role === "system" || role === "worker") {
    return role;
  }

  return "unknown";
}
