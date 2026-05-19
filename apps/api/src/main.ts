import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";

import { AuthService } from "../../../packages/modules/auth";
import { ApiAppModule } from "./app.module";
import { apiConfig } from "./config/api.config";
import { shouldAuditRequest, writeAuditEntry } from "./http/audit.util";

const expressBodyParsers = require("express") as {
  json: (options?: Record<string, unknown>) => any;
  urlencoded: (options?: Record<string, unknown>) => any;
};

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitState = new Map<string, RateLimitEntry>();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(ApiAppModule);
  const authService = app.get(AuthService);
  const expressApp = app.getHttpAdapter().getInstance() as {
    disable: (name: string) => void;
    set: (name: string, value: unknown) => void;
  };

  app.enableShutdownHooks();
  expressApp.disable("x-powered-by");
  expressApp.set("trust proxy", apiConfig.trustProxyHops);

  // Slip uploads are currently sent as base64 data URLs from the Stephub web app.
  app.use(expressBodyParsers.json({ limit: apiConfig.bodyLimit }));
  app.use(expressBodyParsers.urlencoded({ extended: true, limit: apiConfig.bodyLimit }));

  app.use((request: any, response: any, next: () => void) => {
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "SAMEORIGIN");
    response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    next();
  });

  app.use((request: any, response: any, next: () => void) => {
    if (shouldSkipRateLimit(request.method, request.path)) {
      next();
      return;
    }

    const now = Date.now();
    const key = request.ip || request.socket?.remoteAddress || "unknown";
    const current = rateLimitState.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + apiConfig.rateLimitWindowMs;
      rateLimitState.set(key, { count: 1, resetAt });
      response.setHeader("RateLimit-Limit", String(apiConfig.rateLimitMaxRequests));
      response.setHeader("RateLimit-Remaining", String(apiConfig.rateLimitMaxRequests - 1));
      response.setHeader("RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
      next();
      return;
    }

    current.count += 1;
    response.setHeader("RateLimit-Limit", String(apiConfig.rateLimitMaxRequests));
    response.setHeader(
      "RateLimit-Remaining",
      String(Math.max(apiConfig.rateLimitMaxRequests - current.count, 0)),
    );
    response.setHeader("RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

    if (current.count > apiConfig.rateLimitMaxRequests) {
      response.setHeader("Retry-After", String(Math.max(Math.ceil((current.resetAt - now) / 1000), 1)));
      response.status(429).json({ message: "Too many requests." });
      return;
    }

    next();
  });

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (apiConfig.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    credentials: true,
  });

  app.use(async (request: any, response: any, next: () => void) => {
    const startedAt = Date.now();
    const access = resolveRouteAccess(request.method, request.path);
    const shouldAudit = shouldAuditRequest(request.method, request.path);

    response.on("finish", () => {
      if (!shouldAudit) {
        return;
      }

      const actor = request.authUser ?? null;
      writeAuditEntry({
        at: new Date().toISOString(),
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
        access,
        actorUserId: actor?.userId ?? null,
        actorMemberCode: actor?.memberCode ?? null,
        actorRole:
          access === "admin" && actor
            ? "admin"
            : actor
              ? "member"
              : "public",
        ip: request.ip ?? request.socket?.remoteAddress ?? null,
      });
    });

    if (access === "public") {
      next();
      return;
    }

    const token = extractAccessToken(request.headers.authorization, request.headers.cookie);

    if (!token) {
      response.status(401).json({
        message: access === "admin" ? "Admin session required." : "Session required.",
      });
      return;
    }

    const user = await authService.getSessionUser(token);

    if (!user) {
      response.status(401).json({ message: "Invalid session." });
      return;
    }

    if (access === "admin" && !authService.isAdminUser(user)) {
      response.status(403).json({ message: "Admin access required." });
      return;
    }

    request.authUser = user;
    next();
  });

  await app.listen(apiConfig.port);
}

function shouldSkipRateLimit(method: string, path: string): boolean {
  if (
    method === "OPTIONS" ||
    path === "/health" ||
    path === "/" ||
    path.startsWith("/internal/bao/")
  ) {
    return true;
  }

  return false;
}

function resolveRouteAccess(
  method: string,
  path: string,
): "public" | "member" | "admin" {
  if (method === "OPTIONS") {
    return "public";
  }

  if (
    path === "/health" ||
    path === "/" ||
    path === "/auth/login" ||
    path === "/auth/line-login" ||
    path.startsWith("/internal/bao/")
  ) {
    return "public";
  }

  if (method === "POST" && path === "/members") {
    return "public";
  }

  if (
    method === "GET" &&
    (
      path === "/packages" ||
      path === "/packages/storefront-products" ||
      path === "/products" ||
      path === "/products/suppliers" ||
      path === "/products/categories" ||
      path === "/products/details" ||
      path === "/products/storefront"
    )
  ) {
    return "public";
  }

  if (
    method === "GET" &&
    path.startsWith("/members/by-code/") &&
    !path.endsWith("/direct-referrals")
  ) {
    return "public";
  }

  if (method === "GET" && path.endsWith("/direct-referrals")) {
    return "member";
  }

  if (method === "GET" && path.startsWith("/matrix/member/by-code/")) {
    return "public";
  }

  if (
    method === "GET" &&
    (
      path === "/settings/commissions" ||
      path === "/settings/matrix" ||
      path === "/settings/signup-share" ||
      path === "/settings/line-runtime"
    )
  ) {
    return "public";
  }

  if (path === "/auth/me" || path === "/auth/logout") {
    return "member";
  }

  if (
    path === "/auth/line-binding" ||
    path === "/auth/dashboard" ||
    path === "/auth/orders" ||
    path === "/auth/transactions" ||
    path === "/auth/commissions" ||
    path === "/auth/network-top-leaders" ||
    path === "/auth/network" ||
    path === "/auth/activate-package" ||
    path === "/auth/activate-product" ||
    path === "/auth/change-password" ||
    path.startsWith("/auth/orders/")
  ) {
    return "member";
  }

  if (
    path === "/auth/line-bindings" ||
    path.startsWith("/auth/line-bindings/")
  ) {
    return "admin";
  }

  if (
    path.startsWith("/packages") ||
    path.startsWith("/cap") ||
    path.startsWith("/orders") ||
    path.startsWith("/pool") ||
    path.startsWith("/wallets") ||
    path.startsWith("/commissions") ||
    path.startsWith("/members") ||
    path.startsWith("/settings") ||
    path.startsWith("/content") ||
    path.startsWith("/notifications") ||
    path.startsWith("/shipping")
  ) {
    return "admin";
  }

  return "public";
}

function extractAccessToken(
  authorization?: string,
  cookieHeader?: string,
): string | null {
  const normalized = (authorization || "").trim();

  if (normalized.toLowerCase().startsWith("bearer ")) {
    const token = normalized.slice(7).trim();
    return token || null;
  }

  const source = cookieHeader || "";
  const prefix = "adminAccessToken=";

  for (const part of source.split(";")) {
    const value = part.trim();
    if (value.startsWith(prefix)) {
      return decodeURIComponent(value.slice(prefix.length));
    }
  }

  return null;
}

void bootstrap().catch((error) => {
  process.stderr.write(`[api] failed to start: ${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
