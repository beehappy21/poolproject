import { accessSync, constants, mkdirSync } from "node:fs";
import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Optional,
  Req,
  Res,
} from "@nestjs/common";
import { createClient } from "redis";

import { PrismaService } from "../../../packages/infrastructure/src/prisma/prisma.service";
import { Public } from "../../../packages/modules/auth/src/access-control/public.decorator";
import { getAuditLogConfig } from "./security/audit/audit.config";
import {
  getMetricsSnapshot,
  renderPrometheusMetrics,
} from "./monitoring/metrics.util";

type DependencyStatus = "ok" | "down";

interface HealthDependency {
  status: DependencyStatus;
}

interface HealthResponse {
  status: "ok" | "degraded";
  service: "api";
  requestId: string | null;
  uptimeSeconds: number;
  dependencies?: {
    database: HealthDependency;
    redis: HealthDependency;
    auditLog: HealthDependency;
    config: HealthDependency;
  };
}

const DEFAULT_READINESS_TIMEOUT_MS = 1500;
export const HEALTH_CHECKS = Symbol("HEALTH_CHECKS");

export interface HealthChecks {
  database(
    prisma: Pick<PrismaService, "$queryRawUnsafe">,
    timeoutMs: number,
  ): Promise<HealthDependency>;
  redis(timeoutMs: number): Promise<HealthDependency>;
  auditLog(): Promise<HealthDependency>;
}

export const defaultHealthChecks: HealthChecks = {
  database: checkDatabase,
  redis: checkRedis,
  auditLog: checkAuditLogSink,
};

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(HEALTH_CHECKS)
    private readonly checks: HealthChecks = defaultHealthChecks,
  ) {}

  @Public()
  @Get()
  getHealth(@Req() request?: any): HealthResponse {
    return this.createBaseResponse(request);
  }

  @Public()
  @Get("live")
  getLive(@Req() request?: any): HealthResponse {
    return this.createBaseResponse(request);
  }

  @Public()
  @Get("ready")
  async getReady(
    @Req() request: any,
    @Res({ passthrough: true }) response: { status(code: number): void },
  ): Promise<HealthResponse> {
    const timeoutMs = getReadinessTimeoutMs();
    const [database, redis, auditLog] = await Promise.all([
      this.checks.database(this.prisma, timeoutMs),
      this.checks.redis(timeoutMs),
      this.checks.auditLog(),
    ]);
    const dependencies = {
      database,
      redis,
      auditLog,
      config: { status: "ok" as const },
    };
    const isReady = Object.values(dependencies).every(
      (dependency) => dependency.status === "ok",
    );

    if (!isReady) {
      response.status(503);
    }

    return {
      ...this.createBaseResponse(request),
      status: isReady ? "ok" : "degraded",
      dependencies,
    };
  }

  private createBaseResponse(request?: any): HealthResponse {
    return {
      status: "ok",
      service: "api",
      requestId: request?.requestId ?? null,
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}

@Controller()
export class MetricsController {
  @Public()
  @Get(getMetricsPath())
  getMetrics(
    @Res({ passthrough: true })
    response: { setHeader(name: string, value: string): void },
  ): string {
    if (!isMetricsEnabled()) {
      throw new NotFoundException("Metrics are disabled.");
    }

    response.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    return renderPrometheusMetrics(getMetricsSnapshot());
  }
}

export async function checkDatabase(
  prisma: Pick<PrismaService, "$queryRawUnsafe">,
  timeoutMs = getReadinessTimeoutMs(),
): Promise<HealthDependency> {
  return withTimeout<HealthDependency>(
    async () => {
      await prisma.$queryRawUnsafe("SELECT 1");
      return { status: "ok" };
    },
    timeoutMs,
    { status: "down" },
  );
}

export async function checkRedis(
  timeoutMs = getReadinessTimeoutMs(),
): Promise<HealthDependency> {
  const redisUrl = process.env.APP_REDIS_URL?.trim() || process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    return { status: "down" };
  }

  const client = createClient({ url: redisUrl });

  try {
    return await withTimeout<HealthDependency>(
      async () => {
        await client.connect();
        await client.ping();
        return { status: "ok" };
      },
      timeoutMs,
      { status: "down" },
    );
  } catch {
    return { status: "down" };
  } finally {
    try {
      if (client.isOpen) {
        await client.quit();
      }
    } catch {
      // Health checks must stay sanitized and non-throwing.
    }
  }
}

export async function checkAuditLogSink(): Promise<HealthDependency> {
  const config = getAuditLogConfig();
  if (!config.enabled) {
    return { status: process.env.NODE_ENV === "production" ? "down" : "ok" };
  }

  try {
    mkdirSync(config.dir, { recursive: true });
    accessSync(config.dir, constants.W_OK);
    return { status: "ok" };
  } catch {
    return { status: "down" };
  }
}

export function getReadinessTimeoutMs(): number {
  const parsed = Number(process.env.HEALTH_READINESS_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : DEFAULT_READINESS_TIMEOUT_MS;
}

export function getMetricsPath(): string {
  return process.env.METRICS_PATH?.trim() || "metrics";
}

export function isMetricsEnabled(): boolean {
  return (process.env.METRICS_ENABLED || "true").trim().toLowerCase() !== "false";
}

async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation(),
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
