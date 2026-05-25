import {
  CreateSessionInput,
  SessionRecord,
  SessionStore,
} from "./session-store";
import { hashSessionToken } from "./session-token.util";

type RedisSessionPayload = SessionRecord;
type RedisLike = {
  set(
    key: string,
    value: string,
    options?: { EX?: number },
  ): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(keys: string | string[]): Promise<number>;
  sAdd(key: string, member: string): Promise<number>;
  sRem(key: string, member: string): Promise<number>;
  sMembers(key: string): Promise<string[]>;
  expire(key: string, seconds: number): Promise<boolean | number>;
};

export class RedisSessionStore implements SessionStore {
  constructor(
    private readonly redis: RedisLike,
    private readonly keyPrefix: string,
  ) {}

  async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    const now = Date.now();
    const tokenHash = hashSessionToken(input.token);
    const payload: RedisSessionPayload = {
      tokenHash,
      userId: input.userId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + input.ttlSeconds * 1000).toISOString(),
      lastTouchedAt: new Date(now).toISOString(),
    };

    await this.redis.set(this.sessionKey(tokenHash), JSON.stringify(payload), {
      EX: input.ttlSeconds,
    });
    await this.redis.sAdd(this.userSessionsKey(input.userId), tokenHash);
    await this.redis.expire(this.userSessionsKey(input.userId), input.ttlSeconds);

    return payload;
  }

  async getSessionByToken(token: string): Promise<SessionRecord | null> {
    const tokenHash = hashSessionToken(token);
    const raw = await this.redis.get(this.sessionKey(tokenHash));

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SessionRecord;
    } catch {
      await this.redis.del(this.sessionKey(tokenHash));
      return null;
    }
  }

  async revokeSession(token: string): Promise<void> {
    const tokenHash = hashSessionToken(token);
    const record = await this.getSessionByToken(token);

    await this.redis.del(this.sessionKey(tokenHash));
    if (record) {
      await this.redis.sRem(this.userSessionsKey(record.userId), tokenHash);
    }
  }

  async revokeAllSessionsForUser(userId: string): Promise<number> {
    const hashes = await this.redis.sMembers(this.userSessionsKey(userId));

    if (hashes.length === 0) {
      return 0;
    }

    const keys = hashes.map((hash) => this.sessionKey(hash));
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
    await this.redis.del(this.userSessionsKey(userId));
    return hashes.length;
  }

  async touchSession(token: string, ttlSeconds: number): Promise<SessionRecord | null> {
    const tokenHash = hashSessionToken(token);
    const record = await this.getSessionByToken(token);

    if (!record) {
      return null;
    }

    const now = Date.now();
    const touchedRecord: SessionRecord = {
      ...record,
      lastTouchedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
    };

    await this.redis.set(this.sessionKey(tokenHash), JSON.stringify(touchedRecord), {
      EX: ttlSeconds,
    });
    await this.redis.expire(this.userSessionsKey(record.userId), ttlSeconds);

    return touchedRecord;
  }

  async cleanupExpiredSessions(): Promise<number> {
    return 0;
  }

  private sessionKey(tokenHash: string): string {
    return `${this.keyPrefix}${tokenHash}`;
  }

  private userSessionsKey(userId: string): string {
    return `${this.keyPrefix}user:${userId}`;
  }
}
