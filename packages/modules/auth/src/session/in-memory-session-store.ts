import {
  CreateSessionInput,
  SessionRecord,
  SessionStore,
} from "./session-store";
import { hashSessionToken } from "./session-token.util";

type StoredSessionRecord = SessionRecord & {
  expiresAtMs: number;
};

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, StoredSessionRecord>();
  private readonly userSessionHashes = new Map<string, Set<string>>();

  async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    await this.cleanupExpiredSessions();
    const tokenHash = hashSessionToken(input.token);
    const now = Date.now();
    const expiresAtMs = now + input.ttlSeconds * 1000;
    const record: StoredSessionRecord = {
      tokenHash,
      userId: input.userId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      lastTouchedAt: new Date(now).toISOString(),
      expiresAtMs,
    };

    this.sessions.set(tokenHash, record);
    const hashes = this.userSessionHashes.get(input.userId) ?? new Set<string>();
    hashes.add(tokenHash);
    this.userSessionHashes.set(input.userId, hashes);

    return this.toPublicRecord(record);
  }

  async getSessionByToken(token: string): Promise<SessionRecord | null> {
    const tokenHash = hashSessionToken(token);
    const record = this.sessions.get(tokenHash);

    if (!record) {
      return null;
    }

    if (record.expiresAtMs <= Date.now()) {
      await this.deleteByHash(record.userId, tokenHash);
      return null;
    }

    return this.toPublicRecord(record);
  }

  async revokeSession(token: string): Promise<void> {
    const tokenHash = hashSessionToken(token);
    const record = this.sessions.get(tokenHash);

    if (!record) {
      return;
    }

    await this.deleteByHash(record.userId, tokenHash);
  }

  async revokeAllSessionsForUser(userId: string): Promise<number> {
    const hashes = this.userSessionHashes.get(userId);

    if (!hashes || hashes.size === 0) {
      return 0;
    }

    const allHashes = Array.from(hashes);
    for (const tokenHash of allHashes) {
      this.sessions.delete(tokenHash);
    }

    this.userSessionHashes.delete(userId);
    return allHashes.length;
  }

  async touchSession(token: string, ttlSeconds: number): Promise<SessionRecord | null> {
    const tokenHash = hashSessionToken(token);
    const record = this.sessions.get(tokenHash);

    if (!record) {
      return null;
    }

    if (record.expiresAtMs <= Date.now()) {
      await this.deleteByHash(record.userId, tokenHash);
      return null;
    }

    const now = Date.now();
    record.lastTouchedAt = new Date(now).toISOString();
    record.expiresAtMs = now + ttlSeconds * 1000;
    record.expiresAt = new Date(record.expiresAtMs).toISOString();
    this.sessions.set(tokenHash, record);

    return this.toPublicRecord(record);
  }

  async cleanupExpiredSessions(): Promise<number> {
    let removed = 0;

    for (const [tokenHash, record] of this.sessions.entries()) {
      if (record.expiresAtMs <= Date.now()) {
        await this.deleteByHash(record.userId, tokenHash);
        removed += 1;
      }
    }

    return removed;
  }

  debugTokenHashes(): string[] {
    return Array.from(this.sessions.keys());
  }

  private async deleteByHash(userId: string, tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
    const hashes = this.userSessionHashes.get(userId);
    if (!hashes) {
      return;
    }

    hashes.delete(tokenHash);
    if (hashes.size === 0) {
      this.userSessionHashes.delete(userId);
      return;
    }

    this.userSessionHashes.set(userId, hashes);
  }

  private toPublicRecord(record: StoredSessionRecord): SessionRecord {
    return {
      tokenHash: record.tokenHash,
      userId: record.userId,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      lastTouchedAt: record.lastTouchedAt,
    };
  }
}
