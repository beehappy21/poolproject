import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRateLimitKey,
  getRateLimitConfig,
  selectRateLimitProfile,
} from "./rate-limit.config";
import { InMemoryRateLimitStore } from "./in-memory-rate-limit-store";
import { createRateLimitMiddleware } from "./rate-limit.middleware";

test("in-memory store increments keys and blocks after max attempts", async () => {
  const store = new InMemoryRateLimitStore();

  const first = await store.increment("test-key", 60, 2);
  const second = await store.increment("test-key", 60, 2);
  const third = await store.increment("test-key", 60, 2);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
});

test("different rate limit keys are isolated", async () => {
  const store = new InMemoryRateLimitStore();

  await store.increment("key-a", 60, 1);
  const blocked = await store.increment("key-a", 60, 1);
  const isolated = await store.increment("key-b", 60, 1);

  assert.equal(blocked.allowed, false);
  assert.equal(isolated.allowed, true);
});

test("in-memory window expires", async () => {
  const store = new InMemoryRateLimitStore();

  await store.increment("short-window", 1, 1);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const afterReset = await store.increment("short-window", 1, 1);

  assert.equal(afterReset.allowed, true);
});

test("login key includes hashed identifier but not raw password or identifier", () => {
  const config = getRateLimitConfig();
  const profile = config.loginProfile;
  const key = buildRateLimitKey(
    {
      method: "POST",
      path: "/auth/login",
      ip: "203.0.113.10",
      body: {
        identifier: "Member@Example.com",
        password: "never-store-this-password",
      },
    },
    profile,
    "test:",
  );

  assert.match(key, /^test:auth-login:/);
  assert.doesNotMatch(key, /Member@Example\.com/i);
  assert.doesNotMatch(key, /never-store-this-password/);
});

test("login profile is stricter than global profile", () => {
  const config = getRateLimitConfig();

  assert.ok(config.loginProfile.maxRequests < config.defaultProfile.maxRequests);
});

test("profile selection uses login and public catalog profiles", () => {
  const config = getRateLimitConfig();

  assert.equal(
    selectRateLimitProfile({ method: "POST", path: "/auth/login" }, config)?.name,
    "auth-login",
  );
  assert.equal(
    selectRateLimitProfile({ method: "GET", path: "/products" }, config)?.name,
    "public-catalog",
  );
});

test("production refuses in-memory rate limit store without Redis", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAppRedisUrl = process.env.APP_REDIS_URL;
  const previousRedisUrl = process.env.REDIS_URL;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.APP_REDIS_URL;
    delete process.env.REDIS_URL;

    await assert.rejects(
      () => createRateLimitMiddleware(),
      /APP_REDIS_URL or REDIS_URL is required in production/,
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousAppRedisUrl === undefined) {
      delete process.env.APP_REDIS_URL;
    } else {
      process.env.APP_REDIS_URL = previousAppRedisUrl;
    }
    if (previousRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = previousRedisUrl;
    }
  }
});
