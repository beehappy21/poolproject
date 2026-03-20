import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";

import { AuthService } from "../../../packages/modules/auth";
import { ApiAppModule } from "./app.module";
import { apiConfig } from "./config/api.config";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(ApiAppModule);
  const authService = app.get(AuthService);

  app.use(async (request: any, response: any, next: () => void) => {
    if (!requiresAdminSession(request.method, request.path)) {
      next();
      return;
    }

    const token = extractAccessToken(request.headers.authorization, request.headers.cookie);

    if (!token) {
      response.status(401).json({ message: "Admin session required." });
      return;
    }

    const user = await authService.getSessionUser(token);

    if (!user) {
      response.status(401).json({ message: "Invalid session." });
      return;
    }

    if (!authService.isAdminUser(user)) {
      response.status(403).json({ message: "Admin access required." });
      return;
    }

    next();
  });

  await app.listen(apiConfig.port);
}

function requiresAdminSession(method: string, path: string): boolean {
  if (method === "OPTIONS") {
    return false;
  }

  if (
    path === "/health" ||
    path === "/" ||
    path === "/signup" ||
    path === "/signup/index.html" ||
    path === "/signup/styles.css" ||
    path === "/signup/app.js" ||
    path === "/auth/login" ||
    path === "/auth/me" ||
    path === "/auth/logout" ||
    path === "/admin" ||
    path === "/admin/index.html" ||
    path === "/admin/styles.css" ||
    path === "/admin/app.js"
  ) {
    return false;
  }

  if (method === "POST" && path === "/members") {
    return false;
  }

  if (method === "GET" && path === "/packages") {
    return false;
  }

  if (method === "GET" && path.startsWith("/members/by-code/")) {
    return false;
  }

  return (
    path.startsWith("/packages") ||
    path.startsWith("/orders") ||
    path.startsWith("/pool") ||
    path.startsWith("/wallets") ||
    path.startsWith("/commissions") ||
    path.startsWith("/members")
  );
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
