import type {
  AuthBruteForceCheck,
  AuthBruteForceStore,
} from "./auth-brute-force.types";

type RedisLike = {
  multi(): RedisMultiLike;
  expire(key: string, seconds: number): Promise<boolean | number>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
  ttl(key: string): Promise<number>;
  del(key: string | string[]): Promise<number>;
};

type RedisMultiLike = {
  incr(key: string): RedisMultiLike;
  ttl(key: string): RedisMultiLike;
  exec(): Promise<Array<number | null>>;
};

export class RedisAuthBruteForceStore implements AuthBruteForceStore {
  constructor(private readonly redis: RedisLike) {}

  async incrementFailure(key: string, windowSeconds: number): Promise<number> {
    const results = await this.redis.multi().incr(key).ttl(key).exec();
    const count = Number(results[0] || 0);
    const ttl = Number(results[1] || -1);

    if (count === 1 || ttl < 0) {
      await this.redis.expire(key, windowSeconds);
    }

    return count;
  }

  async clearFailures(key: string): Promise<void> {
    await this.redis.del(key);
    await this.redis.del(`${key}:lock`);
  }

  async lock(key: string, durationSeconds: number): Promise<void> {
    await this.redis.set(`${key}:lock`, "1", { EX: durationSeconds });
  }

  async getLock(key: string): Promise<AuthBruteForceCheck> {
    const ttl = await this.redis.ttl(`${key}:lock`);
    if (ttl <= 0) {
      return { locked: false, retryAfterSeconds: 0 };
    }

    return { locked: true, retryAfterSeconds: ttl };
  }
}
