import assert from "node:assert/strict";
import test from "node:test";

import { InMemorySessionStore } from "../../../../packages/modules/auth/src/session/in-memory-session-store";
import { sessionStoreProvider } from "../../../../packages/modules/auth/src/session/session-store.provider";
import { hashSessionToken } from "../../../../packages/modules/auth/src/session/session-token.util";

test("creating a session does not store the raw token", async () => {
  process.env.AUTH_SESSION_HMAC_SECRET = "test-session-hmac-secret-0123456789abcdef";
  const store = new InMemorySessionStore();
  const rawToken = "raw-session-token";

  await store.createSession({
    token: rawToken,
    userId: "101",
    ttlSeconds: 60,
  });

  const storedHashes = store.debugTokenHashes();
  assert.equal(storedHashes.includes(rawToken), false);
  assert.equal(storedHashes.includes(hashSessionToken(rawToken)), true);
});

test("lookup by raw token succeeds through hash", async () => {
  process.env.AUTH_SESSION_HMAC_SECRET = "test-session-hmac-secret-0123456789abcdef";
  const store = new InMemorySessionStore();

  await store.createSession({
    token: "lookup-token",
    userId: "202",
    ttlSeconds: 60,
  });

  const session = await store.getSessionByToken("lookup-token");
  assert.ok(session);
  assert.equal(session?.userId, "202");
});

test("invalid token returns null", async () => {
  process.env.AUTH_SESSION_HMAC_SECRET = "test-session-hmac-secret-0123456789abcdef";
  const store = new InMemorySessionStore();

  const session = await store.getSessionByToken("missing-token");
  assert.equal(session, null);
});

test("expired session is not returned", async () => {
  process.env.AUTH_SESSION_HMAC_SECRET = "test-session-hmac-secret-0123456789abcdef";
  const store = new InMemorySessionStore();

  await store.createSession({
    token: "expired-token",
    userId: "303",
    ttlSeconds: 1,
  });
  await new Promise((resolve) => setTimeout(resolve, 1100));

  const session = await store.getSessionByToken("expired-token");
  assert.equal(session, null);
});

test("active session is returned", async () => {
  process.env.AUTH_SESSION_HMAC_SECRET = "test-session-hmac-secret-0123456789abcdef";
  const store = new InMemorySessionStore();

  await store.createSession({
    token: "active-token",
    userId: "404",
    ttlSeconds: 60,
  });

  const session = await store.getSessionByToken("active-token");
  assert.ok(session);
  assert.equal(session?.userId, "404");
});

test("revokeSession invalidates one token", async () => {
  process.env.AUTH_SESSION_HMAC_SECRET = "test-session-hmac-secret-0123456789abcdef";
  const store = new InMemorySessionStore();

  await store.createSession({
    token: "revoke-one",
    userId: "505",
    ttlSeconds: 60,
  });

  await store.revokeSession("revoke-one");
  const session = await store.getSessionByToken("revoke-one");
  assert.equal(session, null);
});

test("revokeAllSessionsForUser invalidates all tokens for a user", async () => {
  process.env.AUTH_SESSION_HMAC_SECRET = "test-session-hmac-secret-0123456789abcdef";
  const store = new InMemorySessionStore();

  await store.createSession({
    token: "user-token-1",
    userId: "606",
    ttlSeconds: 60,
  });
  await store.createSession({
    token: "user-token-2",
    userId: "606",
    ttlSeconds: 60,
  });
  await store.createSession({
    token: "other-user-token",
    userId: "999",
    ttlSeconds: 60,
  });

  const revokedCount = await store.revokeAllSessionsForUser("606");
  assert.equal(revokedCount, 2);
  assert.equal(await store.getSessionByToken("user-token-1"), null);
  assert.equal(await store.getSessionByToken("user-token-2"), null);
  assert.ok(await store.getSessionByToken("other-user-token"));
});

test("production config refuses to use the in-memory store without Redis", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRedisUrl = process.env.APP_REDIS_URL;
  const previousFallbackRedisUrl = process.env.REDIS_URL;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.APP_REDIS_URL;
    delete process.env.REDIS_URL;

    await assert.rejects(
      () => (sessionStoreProvider as { useFactory: () => Promise<unknown> }).useFactory(),
      /APP_REDIS_URL or REDIS_URL is required in production/,
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousRedisUrl === undefined) {
      delete process.env.APP_REDIS_URL;
    } else {
      process.env.APP_REDIS_URL = previousRedisUrl;
    }
    if (previousFallbackRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = previousFallbackRedisUrl;
    }
  }
});
