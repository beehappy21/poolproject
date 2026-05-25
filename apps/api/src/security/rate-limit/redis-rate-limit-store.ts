import type { RateLimitHit, RateLimitStore } from "./rate-limit.types";

type RedisLike = {
  multi(): RedisMultiLike;
  expire(key: string, seconds: number): Promise<boolean | number>;
  ttl(key: string): Promise<number>;
};

type RedisMultiLike = {
  incr(key: string): RedisMultiLike;
  ttl(key: string): RedisMultiLike;
  exec(): Promise<Array<number | null>>;
};

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: RedisLike) {}

  async increment(
    key: string,
    windowSeconds: number,
    maxRequests: number,
  ): Promise<RateLimitHit> {
    const results = await this.redis
      .multi()
      .incr(key)
      .ttl(key)
      .exec();
    const count = Number(results[0] || 0);
    let ttlSeconds = Number(results[1] || -1);

    if (count === 1 || ttlSeconds < 0) {
      await this.redis.expire(key, windowSeconds);
      ttlSeconds = windowSeconds;
    }

    const now = Date.now();
    const resetAt = now + ttlSeconds * 1000;
    return {
      allowed: count <= maxRequests,
      limit: maxRequests,
      remaining: Math.max(maxRequests - count, 0),
      resetAt,
      retryAfterSeconds: Math.max(ttlSeconds, 1),
    };
  }
}
