export interface SessionStoreConfig {
  ttlSeconds: number;
  keyPrefix: string;
  redisUrl: string | null;
  isProduction: boolean;
}

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_SESSION_KEY_PREFIX = "poolproject:session:";

export function getSessionStoreConfig(): SessionStoreConfig {
  const ttlValue = Number.parseInt(
    process.env.AUTH_SESSION_TTL_SECONDS || `${DEFAULT_SESSION_TTL_SECONDS}`,
    10,
  );
  const ttlSeconds =
    Number.isFinite(ttlValue) && ttlValue > 0 ? ttlValue : DEFAULT_SESSION_TTL_SECONDS;
  const keyPrefix =
    process.env.AUTH_SESSION_KEY_PREFIX?.trim() || DEFAULT_SESSION_KEY_PREFIX;
  const redisUrl =
    process.env.APP_REDIS_URL?.trim() || process.env.REDIS_URL?.trim() || null;

  return {
    ttlSeconds,
    keyPrefix,
    redisUrl,
    isProduction: process.env.NODE_ENV === "production",
  };
}
