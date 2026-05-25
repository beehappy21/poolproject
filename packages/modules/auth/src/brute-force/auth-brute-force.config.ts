export interface AuthBruteForceConfig {
  redisUrl: string | null;
  keyPrefix: string;
  failureWindowSeconds: number;
  maxFailures: number;
  lockDurationSeconds: number;
  isProduction: boolean;
}

const DEFAULT_KEY_PREFIX = "poolproject:authbf:";

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function getAuthBruteForceConfig(): AuthBruteForceConfig {
  return {
    redisUrl: process.env.APP_REDIS_URL?.trim() || process.env.REDIS_URL?.trim() || null,
    keyPrefix: process.env.AUTH_LOGIN_BRUTE_FORCE_KEY_PREFIX?.trim() || DEFAULT_KEY_PREFIX,
    failureWindowSeconds: parsePositiveInteger(process.env.AUTH_LOGIN_LOCK_WINDOW_SECONDS, 900),
    maxFailures: parsePositiveInteger(process.env.AUTH_LOGIN_LOCK_MAX_FAILURES, 5),
    lockDurationSeconds: parsePositiveInteger(process.env.AUTH_LOGIN_LOCK_DURATION_SECONDS, 900),
    isProduction: process.env.NODE_ENV === "production",
  };
}
