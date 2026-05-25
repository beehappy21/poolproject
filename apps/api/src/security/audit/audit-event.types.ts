export type AuditActorType = "public" | "member" | "admin" | "system" | "worker" | "unknown";
export type AuditOutcome = "success" | "failure" | "denied" | "limited" | "locked";

export interface AuditEvent {
  timestamp?: string;
  eventType: string;
  actorType?: AuditActorType;
  actorId?: string | null;
  memberCode?: string | null;
  role?: string | null;
  ipHash?: string | null;
  ipMasked?: string | null;
  requestId?: string | null;
  route?: string | null;
  method?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  outcome: AuditOutcome;
  reason?: string | null;
  code?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface NormalizedAuditEvent extends AuditEvent {
  timestamp: string;
  metadata: Record<string, unknown>;
}
