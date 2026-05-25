export interface SessionRecord {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastTouchedAt: string;
}

export interface CreateSessionInput {
  token: string;
  userId: string;
  ttlSeconds: number;
}

export interface SessionStore {
  createSession(input: CreateSessionInput): Promise<SessionRecord>;
  getSessionByToken(token: string): Promise<SessionRecord | null>;
  revokeSession(token: string): Promise<void>;
  revokeAllSessionsForUser(userId: string): Promise<number>;
  touchSession(token: string, ttlSeconds: number): Promise<SessionRecord | null>;
  cleanupExpiredSessions(): Promise<number>;
}

export const SESSION_STORE = Symbol("SESSION_STORE");
