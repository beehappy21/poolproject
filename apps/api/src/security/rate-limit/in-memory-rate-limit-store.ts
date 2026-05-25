import type { RateLimitHit, RateLimitStore } from "./rate-limit.types";

interface StoredWindow {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly windows = new Map<string, StoredWindow>();

  async increment(
    key: string,
    windowSeconds: number,
    maxRequests: number,
  ): Promise<RateLimitHit> {
    const now = Date.now();
    const current = this.windows.get(key);
    const resetAt = !current || current.resetAt <= now
      ? now + windowSeconds * 1000
      : current.resetAt;
    const count = !current || current.resetAt <= now ? 1 : current.count + 1;

    this.windows.set(key, { count, resetAt });
    return {
      allowed: count <= maxRequests,
      limit: maxRequests,
      remaining: Math.max(maxRequests - count, 0),
      resetAt,
      retryAfterSeconds: Math.max(Math.ceil((resetAt - now) / 1000), 1),
    };
  }
}
