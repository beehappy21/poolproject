import { createClient } from "redis";

import {
  buildRateLimitKey,
  getRateLimitConfig,
  selectRateLimitProfile,
} from "./rate-limit.config";
import { InMemoryRateLimitStore } from "./in-memory-rate-limit-store";
import { RedisRateLimitStore } from "./redis-rate-limit-store";
import { writeSecurityAuditEntry } from "../../http/audit.util";
import type {
  RateLimitRequestLike,
  RateLimitResponseLike,
  RateLimitStore,
} from "./rate-limit.types";

export type RateLimitNext = () => void;

export async function createRateLimitMiddleware(): Promise<(
  request: RateLimitRequestLike,
  response: RateLimitResponseLike,
  next: RateLimitNext,
) => Promise<void>> {
  const config = getRateLimitConfig();
  let store: RateLimitStore;

  if (!config.redisUrl) {
    if (config.isProduction) {
      throw new Error("APP_REDIS_URL or REDIS_URL is required in production for rate limiting.");
    }

    store = new InMemoryRateLimitStore();
  } else {
    const redis = createClient({ url: config.redisUrl });
    await redis.connect();
    store = new RedisRateLimitStore(redis as any);
  }

  return async (request, response, next) => {
    const profile = selectRateLimitProfile(request, config);
    if (!profile) {
      next();
      return;
    }

    try {
      const hit = await store.increment(
        buildRateLimitKey(request, profile, config.keyPrefix),
        profile.windowSeconds,
        profile.maxRequests,
      );

      response.setHeader("RateLimit-Limit", String(hit.limit));
      response.setHeader("RateLimit-Remaining", String(hit.remaining));
      response.setHeader("RateLimit-Reset", String(Math.ceil(hit.resetAt / 1000)));

      if (!hit.allowed) {
        writeSecurityAuditEntry({
          event: "rate.limit.exceeded",
          at: new Date().toISOString(),
          ip: request.ip ?? request.socket?.remoteAddress ?? null,
          requestId: (request as any).requestId ?? null,
          method: request.method ?? null,
          route: String(request.path || request.originalUrl || "").split("?")[0],
          retryAfterSeconds: hit.retryAfterSeconds,
          metadata: {
            profile: profile.name,
            limit: hit.limit,
          },
        });
        response.setHeader("Retry-After", String(hit.retryAfterSeconds));
        response.status(429).json({ message: "Too many requests." });
        return;
      }

      next();
    } catch {
      if (profile.sensitive) {
        writeSecurityAuditEntry({
          event: "rate.limit.store.failure",
          at: new Date().toISOString(),
          ip: request.ip ?? request.socket?.remoteAddress ?? null,
          requestId: (request as any).requestId ?? null,
          method: request.method ?? null,
          route: String(request.path || request.originalUrl || "").split("?")[0],
          metadata: {
            profile: profile.name,
          },
        });
        response.status(429).json({ message: "Too many requests." });
        return;
      }

      next();
    }
  };
}
