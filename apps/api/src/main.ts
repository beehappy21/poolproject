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

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(ApiAppModule);
  const authService = app.get(AuthService);

  // Slip uploads are currently sent as base64 data URLs from the Stephub web app.
  app.use(expressBodyParsers.json({ limit: "12mb" }));
  app.use(expressBodyParsers.urlencoded({ extended: true, limit: "12mb" }));

  app.enableCors({
    origin: apiConfig.corsOrigins,
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
    path === "/app" ||
    path === "/app/index.html" ||
    path === "/app/styles.css" ||
    path === "/app/app.js" ||
    path === "/signup" ||
    path === "/signup/index.html" ||
    path === "/signup/styles.css" ||
    path === "/signup/app.js" ||
    path === "/auth/login" ||
    path === "/auth/line-login" ||
    path === "/admin" ||
    path === "/admin/index.html" ||
    path === "/admin/styles.css" ||
    path === "/admin/app.js"
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

  if (method === "GET" && path.startsWith("/members/by-code/")) {
    return "public";
  }

  if (
    method === "GET" &&
    (
      path === "/settings/commissions" ||
      path === "/settings/matrix" ||
      path === "/settings/signup-share"
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

void bootstrap();
