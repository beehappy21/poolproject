import { Provider } from "@nestjs/common";
import { createClient } from "redis";

import { SESSION_STORE, SessionStore } from "./session-store";
import { RedisSessionStore } from "./redis-session-store";
import { InMemorySessionStore } from "./in-memory-session-store";
import { getSessionStoreConfig } from "./session-env.util";

export const sessionStoreProvider: Provider = {
  provide: SESSION_STORE,
  useFactory: async (): Promise<SessionStore> => {
    const config = getSessionStoreConfig();

    if (!config.redisUrl) {
      if (config.isProduction) {
        throw new Error(
          "APP_REDIS_URL or REDIS_URL is required in production for session storage.",
        );
      }

      return new InMemorySessionStore();
    }

    const redis = createClient({
      url: config.redisUrl,
    });

    await redis.connect();
    return new RedisSessionStore(redis, config.keyPrefix);
  },
};
