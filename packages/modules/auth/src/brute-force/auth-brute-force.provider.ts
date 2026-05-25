import { Provider } from "@nestjs/common";
import { createClient } from "redis";

import { getAuthBruteForceConfig } from "./auth-brute-force.config";
import { AUTH_BRUTE_FORCE_STORE } from "./auth-brute-force.types";
import { InMemoryAuthBruteForceStore } from "./in-memory-auth-brute-force-store";
import { RedisAuthBruteForceStore } from "./redis-auth-brute-force-store";

export const authBruteForceStoreProvider: Provider = {
  provide: AUTH_BRUTE_FORCE_STORE,
  useFactory: async () => {
    const config = getAuthBruteForceConfig();

    if (!config.redisUrl) {
      if (config.isProduction) {
        throw new Error("APP_REDIS_URL or REDIS_URL is required in production for login brute-force protection.");
      }

      return new InMemoryAuthBruteForceStore();
    }

    const redis = createClient({ url: config.redisUrl });
    await redis.connect();
    return new RedisAuthBruteForceStore(redis as any);
  },
};
