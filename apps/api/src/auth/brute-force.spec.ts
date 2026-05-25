import assert from "node:assert/strict";
import test from "node:test";

import { UnauthorizedException } from "@nestjs/common";

import { AuthBruteForceService } from "../../../../packages/modules/auth/src/brute-force/auth-brute-force.service";
import { InMemoryAuthBruteForceStore } from "../../../../packages/modules/auth/src/brute-force/in-memory-auth-brute-force-store";
import { AuthService } from "../../../../packages/modules/auth/src/services/auth.service";
import { InMemorySessionStore } from "../../../../packages/modules/auth/src/session/in-memory-session-store";

function createBruteForceService(): AuthBruteForceService {
  process.env.AUTH_LOGIN_LOCK_MAX_FAILURES = "2";
  process.env.AUTH_LOGIN_LOCK_WINDOW_SECONDS = "60";
  process.env.AUTH_LOGIN_LOCK_DURATION_SECONDS = "60";
  return new AuthBruteForceService(new InMemoryAuthBruteForceStore());
}

function createAuthService(bruteForceService: AuthBruteForceService) {
  const authRepository = {
    findUserForLogin: async (input: { identifier: string; password: string }) => {
      if (input.identifier === "member@example.com" && input.password === "correct-password") {
        return {
          userId: "101",
          memberCode: "MEM101",
          name: "Session Test User",
          email: "member@example.com",
          phone: null,
          isAdmin: false,
          matrixReentryEnabled: false,
        };
      }

      return null;
    },
    findUserByIdentifier: async () => null,
    findUserById: async (userId: string) => userId === "101"
      ? {
          userId: "101",
          memberCode: "MEM101",
          name: "Session Test User",
          email: "member@example.com",
          phone: null,
          isAdmin: false,
          matrixReentryEnabled: false,
        }
      : null,
    verifyUserPassword: async () => true,
    updateUserPassword: async (userId: string, _password: string) => ({
      userId,
      passwordUpdated: true as const,
    }),
  };
  const membersService = {
    resetMemberPassword: async () => ({ memberId: "101" }),
    getMemberByCode: async () => ({ nationalId: "1234567890123" }),
  };

  return new AuthService(
    authRepository as any,
    membersService as any,
    new InMemorySessionStore(),
    bruteForceService,
  );
}

test("failed login increments counters and locks temporarily", async () => {
  process.env.AUTH_SESSION_HMAC_SECRET = "test-session-hmac-secret-0123456789abcdef";
  const service = createAuthService(createBruteForceService());
  const input = {
    identifier: "member@example.com",
    password: "wrong-password",
    ip: "203.0.113.10",
  };

  await assert.rejects(() => service.login(input), UnauthorizedException);
  await assert.rejects(() => service.login(input), UnauthorizedException);
  await assert.rejects(() =>
    service.login({ ...input, password: "correct-password" }),
  UnauthorizedException);
});

test("successful login clears failed counters", async () => {
  process.env.AUTH_SESSION_HMAC_SECRET = "test-session-hmac-secret-0123456789abcdef";
  const service = createAuthService(createBruteForceService());

  await assert.rejects(
    () => service.login({
      identifier: "member@example.com",
      password: "wrong-password",
      ip: "203.0.113.11",
    }),
    UnauthorizedException,
  );
  await service.login({
    identifier: "member@example.com",
    password: "correct-password",
    ip: "203.0.113.11",
  });
  await assert.rejects(
    () => service.login({
      identifier: "member@example.com",
      password: "wrong-password",
      ip: "203.0.113.11",
    }),
    UnauthorizedException,
  );

  const session = await service.login({
    identifier: "member@example.com",
    password: "correct-password",
    ip: "203.0.113.11",
  });

  assert.ok(session.accessToken);
});

test("brute-force error message does not reveal account existence", async () => {
  process.env.AUTH_SESSION_HMAC_SECRET = "test-session-hmac-secret-0123456789abcdef";
  const service = createAuthService(createBruteForceService());

  await assert.rejects(
    () => service.login({
      identifier: "unknown@example.com",
      password: "wrong-password",
      ip: "203.0.113.12",
    }),
    (error: unknown) => {
      assert.ok(error instanceof UnauthorizedException);
      assert.equal((error.getResponse() as { message?: string }).message, "Invalid credentials.");
      return true;
    },
  );
});
