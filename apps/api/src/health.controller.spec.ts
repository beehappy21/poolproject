import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  checkDatabase,
  getMetricsPath,
  HealthController,
  type HealthChecks,
  MetricsController,
} from "./health.controller";

function createResponseRecorder() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
  };
}

function createChecks(overrides?: Partial<HealthChecks>): HealthChecks {
  return {
    async database() {
      return { status: "ok" };
    },
    async redis() {
      return { status: "ok" };
    },
    async auditLog() {
      return { status: "ok" };
    },
    ...(overrides || {}),
  };
}

test("/health returns lightweight ok without dependency checks", () => {
  let dependencyChecks = 0;
  const controller = new HealthController({} as any, createChecks({
    async database() {
      dependencyChecks += 1;
      return { status: "down" };
    },
  }));

  const result = controller.getHealth({ requestId: "req-health" });

  assert.equal(result.status, "ok");
  assert.equal(result.service, "api");
  assert.equal(result.requestId, "req-health");
  assert.equal(result.dependencies, undefined);
  assert.equal(dependencyChecks, 0);
});

test("/health/live returns ok", () => {
  const controller = new HealthController({} as any, createChecks());
  const result = controller.getLive({ requestId: "req-live" });

  assert.equal(result.status, "ok");
  assert.equal(result.requestId, "req-live");
});

test("/health/ready returns ok when DB Redis and audit checks pass", async () => {
  const controller = new HealthController({} as any, createChecks());
  const response = createResponseRecorder();

  const result = await controller.getReady({ requestId: "req-ready" }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(result.status, "ok");
  assert.deepEqual(result.dependencies?.database, { status: "ok" });
  assert.deepEqual(result.dependencies?.redis, { status: "ok" });
  assert.deepEqual(result.dependencies?.auditLog, { status: "ok" });
});

test("/health/ready returns sanitized degraded status when DB fails", async () => {
  const controller = new HealthController({} as any, createChecks({
    async database() {
      return { status: "down" };
    },
  }));
  const response = createResponseRecorder();

  const result = await controller.getReady({ requestId: "req-db-down" }, response);
  const serialized = JSON.stringify(result);

  assert.equal(response.statusCode, 503);
  assert.equal(result.status, "degraded");
  assert.deepEqual(result.dependencies?.database, { status: "down" });
  assert.doesNotMatch(serialized, /DATABASE_URL|postgresql:\/\/|redis:\/\/|secret|token/i);
});

test("/health/ready returns sanitized degraded status when Redis fails", async () => {
  const controller = new HealthController({} as any, createChecks({
    async redis() {
      return { status: "down" };
    },
  }));
  const response = createResponseRecorder();

  const result = await controller.getReady({ requestId: "req-redis-down" }, response);
  const serialized = JSON.stringify(result);

  assert.equal(response.statusCode, 503);
  assert.equal(result.status, "degraded");
  assert.deepEqual(result.dependencies?.redis, { status: "down" });
  assert.doesNotMatch(serialized, /APP_REDIS_URL|redis:\/\/|password|authorization/i);
});

test("database readiness check handles success and failure safely", async () => {
  assert.deepEqual(
    await checkDatabase({
      async $queryRawUnsafe() {
        return [{ ok: 1 }];
      },
    } as any, 50),
    { status: "ok" },
  );

  assert.deepEqual(
    await checkDatabase({
      async $queryRawUnsafe() {
        throw new Error("postgresql://user:password@db.internal/poolproject");
      },
    } as any, 50),
    { status: "down" },
  );
});

test("/metrics renders safe Prometheus process metrics", () => {
  const controller = new MetricsController();
  const response = createResponseRecorder();
  const metrics = controller.getMetrics(response);

  assert.equal(response.headers["content-type"], "text/plain; version=0.0.4; charset=utf-8");
  assert.match(metrics, /poolproject_api_uptime_seconds/);
  assert.doesNotMatch(metrics, /DATABASE_URL|redis:\/\/|password|token/i);
});

test("smoke health script exists and does not include secrets", () => {
  const script = readFileSync("scripts/ops/smoke-health.sh", "utf8");

  assert.match(script, /\/health\/ready/);
  assert.doesNotMatch(script, /DATABASE_URL|PASSWORD|TOKEN|SECRET/);
});

test("metrics path defaults to safe relative path", () => {
  const previous = process.env.METRICS_PATH;
  delete process.env.METRICS_PATH;

  try {
    assert.equal(getMetricsPath(), "metrics");
  } finally {
    if (previous === undefined) {
      delete process.env.METRICS_PATH;
    } else {
      process.env.METRICS_PATH = previous;
    }
  }
});
