import { createHash } from "node:crypto";

import { getAuditLogConfig } from "./audit.config";
import type { AuditEvent, NormalizedAuditEvent } from "./audit-event.types";
import { redactAuditValue } from "./audit-redactor";
import { FileAuditSink } from "./file-audit-sink";

const auditSink = new FileAuditSink(getAuditLogConfig());

export function writeAuditEvent(event: AuditEvent): void {
  const normalized = normalizeAuditEvent(event);
  const line = `${JSON.stringify(normalized)}\n`;

  auditSink.write(line);

  if (getAuditLogConfig().console) {
    console.info(line.trim());
  }
}

export function normalizeAuditEvent(event: AuditEvent): NormalizedAuditEvent {
  const metadata = redactAuditValue(event.metadata || {}) as Record<string, unknown>;

  return {
    timestamp: event.timestamp || new Date().toISOString(),
    eventType: event.eventType,
    actorType: event.actorType || "unknown",
    actorId: event.actorId ?? null,
    memberCode: event.memberCode ?? null,
    role: event.role ?? null,
    ipHash: event.ipHash ?? null,
    ipMasked: event.ipMasked ?? null,
    requestId: event.requestId ?? null,
    route: event.route ?? null,
    method: event.method ?? null,
    targetType: event.targetType ?? null,
    targetId: event.targetId ?? null,
    outcome: event.outcome,
    reason: event.reason ?? null,
    code: event.code ?? null,
    metadata,
  };
}

export function hashAuditIp(ip: string | null | undefined): string | null {
  const normalized = String(ip || "").trim();
  if (!normalized) {
    return null;
  }

  return createHash("sha256").update(normalized).digest("hex");
}

export function maskAuditIp(ip: string | null | undefined): string | null {
  const normalized = String(ip || "").trim();
  if (!normalized) {
    return null;
  }

  if (normalized.includes(":")) {
    const parts = normalized.split(":");
    return `${parts.slice(0, 3).join(":")}:***`;
  }

  const parts = normalized.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  return "[masked]";
}
