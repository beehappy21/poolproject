import assert from "node:assert/strict";
import test from "node:test";

import { AuthService } from "../../../../packages/modules/auth/src/services/auth.service";
import { InMemorySessionStore } from "../../../../packages/modules/auth/src/session/in-memory-session-store";

function createAuthService() {
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
    findUserByIdentifier: async (identifier: string) => {
      if (identifier === "member@example.com") {
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
    findUserById: async (userId: string) => {
      if (userId === "101") {
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
    verifyUserPassword: async () => true,
    updateUserPassword: async (userId: string, _password: string) => ({
      userId,
      passwordUpdated: true as const,
    }),
  };

  const membersService = {
    resetMemberPassword: async () => ({
      memberId: "101",
    }),
    getMemberByCode: async () => ({
      nationalId: "1234567890123",
    }),
  };

  return new AuthService(
    authRepository as any,
    membersService as any,
    new InMemorySessionStore(),
    {
      assertCanAttemptLogin: async () => undefined,
      recordFailedLogin: async () => undefined,
      recordSuccessfulLogin: async () => undefined,
    } as any,
  );
}

test("login creates a session through SessionStore", async () => {
  process.env.AUTH_SESSION_HMAC_SECRET = "test-session-hmac-secret-0123456789abcdef";
  const service = createAuthService();

  const session = await service.login({
    identifier: "member@example.com",
    password: "correct-password",
  });
  const user = await service.getSessionUser(session.accessToken);

  assert.ok(user);
  assert.equal(user?.userId, "101");
});

test("logout revokes the current session", async () => {
  process.env.AUTH_SESSION_HMAC_SECRET = "test-session-hmac-secret-0123456789abcdef";
  const service = createAuthService();

  const session = await service.login({
    identifier: "member@example.com",
    password: "correct-password",
  });

  await service.logout(session.accessToken);
  const user = await service.getSessionUser(session.accessToken);

  assert.equal(user, null);
});

test("logoutAllForUser revokes all active sessions for that user", async () => {
  process.env.AUTH_SESSION_HMAC_SECRET = "test-session-hmac-secret-0123456789abcdef";
  const service = createAuthService();

  const sessionOne = await service.login({
    identifier: "member@example.com",
    password: "correct-password",
  });
  const sessionTwo = await service.login({
    identifier: "member@example.com",
    password: "correct-password",
  });

  const revokedCount = await service.logoutAllForUser("101");

  assert.equal(revokedCount, 2);
  assert.equal(await service.getSessionUser(sessionOne.accessToken), null);
  assert.equal(await service.getSessionUser(sessionTwo.accessToken), null);
});
