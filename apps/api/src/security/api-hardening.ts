import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";

import { apiConfig } from "../config/api.config";
import { shouldAuditRequest, writeAuditEntry } from "../http/audit.util";
import { createRateLimitMiddleware } from "./rate-limit/rate-limit.middleware";

const expressBodyParsers = require("express") as {
  json: (options?: Record<string, unknown>) => any;
  urlencoded: (options?: Record<string, unknown>) => any;
};

export async function configureApiApp(app: NestExpressApplication): Promise<void> {
  const expressApp = app.getHttpAdapter().getInstance() as {
    disable: (name: string) => void;
    set: (name: string, value: unknown) => void;
  };

  app.enableShutdownHooks();
  expressApp.disable("x-powered-by");
  expressApp.set("trust proxy", apiConfig.trustProxyHops);

  app.use(createHelmetMiddleware());

  app.use(expressBodyParsers.json({
    limit: apiConfig.uploadBodyLimit,
    type: isUploadPayloadRequest,
  }));
  app.use(expressBodyParsers.urlencoded({
    extended: true,
    limit: apiConfig.uploadBodyLimit,
    type: isUploadPayloadRequest,
  }));
  app.use(expressBodyParsers.json({ limit: apiConfig.bodyLimit }));
  app.use(expressBodyParsers.urlencoded({ extended: true, limit: apiConfig.bodyLimit }));

  app.useGlobalPipes(
    createApiValidationPipe(),
  );

  app.use(await createRateLimitMiddleware());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isCorsOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    credentials: true,
  });

  app.use((request: any, response: any, next: () => void) => {
    const startedAt = Date.now();
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
        access: request.authAccess ?? "public",
        actorUserId: actor?.userId ?? null,
        actorMemberCode: actor?.memberCode ?? null,
        actorRole:
          request.authRoles?.includes("admin") || request.authRoles?.includes("super_admin")
            ? "admin"
            : actor
              ? "member"
              : "public",
        ip: request.ip ?? request.socket?.remoteAddress ?? null,
      });
    });

    next();
  });
}

export function createApiValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: false,
    },
    forbidUnknownValues: true,
  });
}

export function createHelmetMiddleware(): ReturnType<typeof helmet> {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    hsts: apiConfig.enableHsts
      ? {
          maxAge: 15552000,
          includeSubDomains: true,
        }
      : false,
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    frameguard: {
      action: "sameorigin",
    },
  });
}

export function isCorsOriginAllowed(origin: string): boolean {
  return apiConfig.corsOrigins.includes(origin);
}

export function isUploadPayloadRequest(request: { path?: string; originalUrl?: string }): boolean {
  const path = String(request.path || request.originalUrl || "").split("?")[0].toLowerCase();
  return path.includes("submit-transfer-slip") ||
    path.includes("kyc") ||
    path.includes("upload");
}
