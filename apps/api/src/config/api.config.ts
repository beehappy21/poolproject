export interface ApiConfig {
  port: number;
  corsOrigins: string[];
  bodyLimit: string;
  trustProxyHops: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

const DEFAULT_CORS_ORIGINS = [
  "http://127.0.0.1:3001",
  "http://localhost:3001",
  "http://127.0.0.1:3002",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://wap.blifehealthy.com",
  "https://www.blifehealthy.com",
  "https://blifehealthy.com",
  "https://api.blifehealthy.com",
  "https://bao.blifehealthy.com",
];

function parseCorsOrigins(value?: string): string[] {
  if (!value?.trim()) {
    return process.env.NODE_ENV === "production" ? [] : DEFAULT_CORS_ORIGINS;
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export const apiConfig: ApiConfig = {
  port: Number(process.env.APP_PORT || process.env.PORT || 3000),
  corsOrigins: parseCorsOrigins(process.env.APP_CORS_ORIGINS),
  bodyLimit: process.env.APP_BODY_LIMIT?.trim() || "12mb",
  trustProxyHops: parsePositiveInteger(process.env.APP_TRUST_PROXY_HOPS, 1),
  rateLimitWindowMs: parsePositiveInteger(process.env.APP_RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMaxRequests: parsePositiveInteger(process.env.APP_RATE_LIMIT_MAX_REQUESTS, 120),
};
