import { createHash } from "node:crypto";

import { apiConfig } from "../../config/api.config";
import type { RateLimitProfile, RateLimitRequestLike } from "./rate-limit.types";

export interface RateLimitConfig {
  redisUrl: string | null;
  keyPrefix: string;
  defaultProfile: RateLimitProfile;
  loginProfile: RateLimitProfile;
  lineLoginProfile: RateLimitProfile;
  adminSensitiveProfile: RateLimitProfile;
  orderSensitiveProfile: RateLimitProfile;
  uploadProfile: RateLimitProfile;
  publicCatalogProfile: RateLimitProfile;
  isProduction: boolean;
}

const DEFAULT_KEY_PREFIX = "poolproject:ratelimit:";

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function getRateLimitConfig(): RateLimitConfig {
  const defaultWindowSeconds = Math.ceil(apiConfig.rateLimitWindowMs / 1000);
  const configuredDefaultWindowSeconds =
    process.env.RATE_LIMIT_WINDOW_SECONDS ||
    (process.env.APP_RATE_LIMIT_WINDOW_MS
      ? String(Math.ceil(Number(process.env.APP_RATE_LIMIT_WINDOW_MS) / 1000))
      : undefined);

  return {
    redisUrl: process.env.APP_REDIS_URL?.trim() || process.env.REDIS_URL?.trim() || null,
    keyPrefix: process.env.RATE_LIMIT_KEY_PREFIX?.trim() || DEFAULT_KEY_PREFIX,
    defaultProfile: {
      name: "default",
      windowSeconds: parsePositiveInteger(
        configuredDefaultWindowSeconds,
        defaultWindowSeconds,
      ),
      maxRequests: parsePositiveInteger(
        process.env.RATE_LIMIT_MAX_REQUESTS || process.env.APP_RATE_LIMIT_MAX_REQUESTS,
        apiConfig.rateLimitMaxRequests,
      ),
    },
    loginProfile: {
      name: "auth-login",
      windowSeconds: parsePositiveInteger(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS, 300),
      maxRequests: parsePositiveInteger(process.env.AUTH_LOGIN_RATE_LIMIT_MAX, 5),
      sensitive: true,
    },
    lineLoginProfile: {
      name: "auth-line-login",
      windowSeconds: parsePositiveInteger(process.env.LINE_LOGIN_RATE_LIMIT_WINDOW_SECONDS, 300),
      maxRequests: parsePositiveInteger(process.env.LINE_LOGIN_RATE_LIMIT_MAX, 10),
      sensitive: true,
    },
    adminSensitiveProfile: {
      name: "admin-sensitive",
      windowSeconds: parsePositiveInteger(process.env.ADMIN_AUTH_RATE_LIMIT_WINDOW_SECONDS, 600),
      maxRequests: parsePositiveInteger(process.env.ADMIN_AUTH_RATE_LIMIT_MAX, 5),
      sensitive: true,
    },
    orderSensitiveProfile: {
      name: "order-payment",
      windowSeconds: parsePositiveInteger(process.env.ORDER_RATE_LIMIT_WINDOW_SECONDS, 60),
      maxRequests: parsePositiveInteger(process.env.ORDER_RATE_LIMIT_MAX, 20),
    },
    uploadProfile: {
      name: "upload",
      windowSeconds: parsePositiveInteger(process.env.UPLOAD_RATE_LIMIT_WINDOW_SECONDS, 60),
      maxRequests: parsePositiveInteger(process.env.UPLOAD_RATE_LIMIT_MAX, 10),
    },
    publicCatalogProfile: {
      name: "public-catalog",
      windowSeconds: parsePositiveInteger(process.env.PUBLIC_CATALOG_RATE_LIMIT_WINDOW_SECONDS, 60),
      maxRequests: parsePositiveInteger(process.env.PUBLIC_CATALOG_RATE_LIMIT_MAX, 200),
    },
    isProduction: process.env.NODE_ENV === "production",
  };
}

export function selectRateLimitProfile(
  request: RateLimitRequestLike,
  config: RateLimitConfig,
): RateLimitProfile | null {
  const method = String(request.method || "").toUpperCase();
  const path = getNormalizedPath(request);

  if (method === "OPTIONS" || path === "/health" || path === "/" || path.startsWith("/internal/bao/")) {
    return null;
  }

  if (method === "POST" && path === "/auth/login") {
    return config.loginProfile;
  }

  if (method === "POST" && path === "/auth/line-login") {
    return config.lineLoginProfile;
  }

  if (
    path === "/auth/forgot-password-reset" ||
    path === "/auth/change-password" ||
    path.startsWith("/auth/line-bindings")
  ) {
    return config.adminSensitiveProfile;
  }

  if (path.includes("upload") || path.includes("slip") || path.includes("receipt")) {
    return config.uploadProfile;
  }

  if (path.startsWith("/orders") || path.startsWith("/wallets")) {
    return config.orderSensitiveProfile;
  }

  if (method === "GET" && (path.startsWith("/products") || path.startsWith("/packages"))) {
    return config.publicCatalogProfile;
  }

  return config.defaultProfile;
}

export function buildRateLimitKey(
  request: RateLimitRequestLike,
  profile: RateLimitProfile,
  prefix: string,
): string {
  const path = getNormalizedPath(request);
  const ipHash = hashKeyPart(getClientIp(request));
  const identifier = profile.name === "auth-login"
    ? normalizeIdentifier(request.body?.identifier)
    : "";
  const identifierPart = identifier ? `:id:${hashKeyPart(identifier)}` : "";

  return `${prefix}${profile.name}:ip:${ipHash}:route:${hashKeyPart(path)}${identifierPart}`;
}

export function normalizeIdentifier(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export function getClientIp(request: RateLimitRequestLike): string {
  const forwardedFor = request.headers?.["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor;
  return String(firstForwarded || request.ip || request.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

function getNormalizedPath(request: RateLimitRequestLike): string {
  const source = String(request.path || request.originalUrl || "/");
  return source.split("?")[0].replace(/\/+$/, "") || "/";
}

function hashKeyPart(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
