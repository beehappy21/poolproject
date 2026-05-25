import assert from "node:assert/strict";
import test from "node:test";

import {
  assertValidApiEnvironment,
  ApiEnvironmentValidationError,
} from "./env.validation";

function createValidProductionEnv(): Record<string, string> {
  return {
    NODE_ENV: "production",
    DATABASE_URL:
      "postgresql://poolproject_app:Pm7X4vB28V6nQ91M3cYfL2sZ8tRaK5hD@db.internal.example:5432/poolproject?schema=public",
    APP_PORT: "3000",
    APP_WAP_URL: "https://wap.blifehealthy.com",
    APP_PUBLIC_BASE_URL: "https://api.blifehealthy.com",
    APP_CORS_ORIGINS:
      "https://wap.blifehealthy.com,https://api.blifehealthy.com,https://bao.blifehealthy.com",
    APP_BODY_LIMIT: "1mb",
    APP_UPLOAD_BODY_LIMIT: "8mb",
    APP_ENABLE_HSTS: "true",
    APP_REDIS_URL: "redis://redis.internal.example:6379",
    INTERNAL_BAO_BASE_URL: "http://bao:8001",
    INTERNAL_RECEIPT_TOKEN: "receipt-token-0123456789abcdef0123456789abcd",
    AUTH_SESSION_HMAC_SECRET:
      "auth-session-hmac-secret-0123456789abcdef0123456789abcd",
    SUPER_ADMIN_EMAIL: "ops-admin@blifehealthy.com",
    SUPER_ADMIN_MEMBER_CODE: "BLSUPER0001",
    SUPER_ADMIN_PASSWORD: "Sup3rAdminProdPass!",
    SUPER_ADMIN_OVERRIDE_PASSWORD: "Sup3rAdminOverride#2026",
    LINE_CHANNEL_ID: "2009662380",
    LINE_LOGIN_CHANNEL_SECRET: "line-secret-0123456789abcdef0123456789abcd",
    LINE_LOGIN_CALLBACK_URL:
      "https://wap.blifehealthy.com/line/liff/signin",
    LINE_LIFF_ID: "2009662380-OAbgN6VR",
    LINE_LIFF_SIGNIN_URL:
      "https://wap.blifehealthy.com/line/liff/signin",
    LINE_STRICT_VERIFY: "true",
  };
}

test("production with missing required secret fails", () => {
  const env = createValidProductionEnv();
  delete env.INTERNAL_RECEIPT_TOKEN;

  assert.throws(
    () => assertValidApiEnvironment(env, { sourceName: "test-env" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiEnvironmentValidationError);
      assert.match(error.message, /INTERNAL_RECEIPT_TOKEN/);
      return true;
    },
  );
});

test("production with missing Redis URL fails", () => {
  const env = createValidProductionEnv();
  delete env.APP_REDIS_URL;

  assert.throws(
    () => assertValidApiEnvironment(env, { sourceName: "test-env" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiEnvironmentValidationError);
      assert.match(error.message, /APP_REDIS_URL or REDIS_URL/);
      return true;
    },
  );
});

test("production with invalid rate limit numeric value fails", () => {
  const env = createValidProductionEnv();
  env.AUTH_LOGIN_LOCK_MAX_FAILURES = "0";

  assert.throws(
    () => assertValidApiEnvironment(env, { sourceName: "test-env" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiEnvironmentValidationError);
      assert.match(error.message, /AUTH_LOGIN_LOCK_MAX_FAILURES/);
      return true;
    },
  );
});

test("production with unsafe body limit fails", () => {
  const env = createValidProductionEnv();
  env.APP_BODY_LIMIT = "12mb";

  assert.throws(
    () => assertValidApiEnvironment(env, { sourceName: "test-env" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiEnvironmentValidationError);
      assert.match(error.message, /APP_BODY_LIMIT/);
      return true;
    },
  );
});

test("production with default secret fails", () => {
  const env = createValidProductionEnv();
  env.SUPER_ADMIN_OVERRIDE_PASSWORD = "@4721Funnylife";

  assert.throws(
    () => assertValidApiEnvironment(env, { sourceName: "test-env" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiEnvironmentValidationError);
      assert.match(error.message, /SUPER_ADMIN_OVERRIDE_PASSWORD/);
      assert.doesNotMatch(error.message, /@4721Funnylife/);
      return true;
    },
  );
});

test("production with short secret fails", () => {
  const env = createValidProductionEnv();
  env.INTERNAL_RECEIPT_TOKEN = "short-token";

  assert.throws(
    () => assertValidApiEnvironment(env, { sourceName: "test-env" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiEnvironmentValidationError);
      assert.match(error.message, /INTERNAL_RECEIPT_TOKEN/);
      assert.match(error.message, /at least 32 characters/);
      assert.doesNotMatch(error.message, /short-token/);
      return true;
    },
  );
});

test("production with LINE login enabled but LINE_STRICT_VERIFY not true fails", () => {
  const env = createValidProductionEnv();
  env.LINE_STRICT_VERIFY = "false";

  assert.throws(
    () => assertValidApiEnvironment(env, { sourceName: "test-env" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiEnvironmentValidationError);
      assert.match(error.message, /LINE_STRICT_VERIFY/);
      return true;
    },
  );
});

test("development can use documented local defaults", () => {
  const env = {
    NODE_ENV: "development",
    DATABASE_URL:
      "postgresql://postgres:postgres@127.0.0.1:5432/poolproject?schema=public",
    INTERNAL_RECEIPT_TOKEN: "local-bao-internal-token-20260508",
  };

  assert.doesNotThrow(() =>
    assertValidApiEnvironment(env, { sourceName: "development-env" }),
  );
});

test("error messages include env var names but never secret values", () => {
  const env = createValidProductionEnv();
  env.LINE_LOGIN_CHANNEL_SECRET = "changeme";

  assert.throws(
    () => assertValidApiEnvironment(env, { sourceName: "test-env" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiEnvironmentValidationError);
      assert.match(error.message, /LINE_LOGIN_CHANNEL_SECRET/);
      assert.doesNotMatch(error.message, /changeme/);
      return true;
    },
  );
});
