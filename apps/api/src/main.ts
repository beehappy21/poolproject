import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";

import { ApiAppModule } from "./app.module";
import { apiConfig } from "./config/api.config";
import { assertValidApiEnvironment } from "./config/env.validation";
import { shouldAuditRequest, writeAuditEntry } from "./http/audit.util";
import { createRateLimitMiddleware } from "./security/rate-limit/rate-limit.middleware";

const expressBodyParsers = require("express") as {
  json: (options?: Record<string, unknown>) => any;
  urlencoded: (options?: Record<string, unknown>) => any;
};

async function bootstrap(): Promise<void> {
  assertValidApiEnvironment(process.env, { sourceName: "process.env" });
  const app = await NestFactory.create<NestExpressApplication>(ApiAppModule);
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

  app.use(await createRateLimitMiddleware());

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

  await app.listen(apiConfig.port);
}

void bootstrap().catch((error) => {
  process.stderr.write(`[api] failed to start: ${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
