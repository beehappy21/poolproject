import test from "node:test";
import assert from "node:assert/strict";

import {
  Controller,
  ForbiddenException,
  Get,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { Public, Roles, type AuthUserSummary } from "../../../../packages/modules/auth";
import { AuthGuard } from "./guards/auth.guard";
import { RolesGuard } from "./guards/roles.guard";

@Controller("spec")
class AccessControlSpecController {
  @Public()
  @Get("public")
  health() {
    return { status: "ok" };
  }

  @Roles("member")
  @Get("member")
  member() {
    return { ok: true };
  }

  @Roles("admin")
  @Get("admin")
  admin() {
    return { ok: true };
  }

  @Get("private-default")
  privateDefault() {
    return { ok: true };
  }
}

function createExecutionContext(
  handlerName: keyof AccessControlSpecController,
  request: Record<string, unknown>,
) {
  const controller = new AccessControlSpecController();

  return {
    getClass: () => AccessControlSpecController,
    getHandler: () => controller[handlerName] as unknown as Function,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}

function createAuthGuard(usersByToken: Record<string, AuthUserSummary | null>) {
  return new AuthGuard(new Reflector(), {
    getSessionUser: async (token: string) => usersByToken[token] ?? null,
  } as any);
}

function createRolesGuard() {
  return new RolesGuard(new Reflector());
}

const memberUser: AuthUserSummary = {
  userId: "101",
  memberCode: "MEM001",
  name: "Member User",
  email: "member@example.com",
  phone: null,
  isAdmin: false,
  matrixReentryEnabled: false,
};

const adminUser: AuthUserSummary = {
  ...memberUser,
  userId: "201",
  memberCode: "ADM001",
  isAdmin: true,
  adminRole: "ADMIN",
};

const superAdminUser: AuthUserSummary = {
  ...memberUser,
  userId: "301",
  memberCode: "SUP001",
  isAdmin: true,
  adminRole: "SUPER_ADMIN",
};

test("public route without token is allowed and returns health payload", async () => {
  const request = {
    method: "GET",
    headers: {},
  };
  const authGuard = createAuthGuard({});
  const rolesGuard = createRolesGuard();
  const context = createExecutionContext("health", request);

  assert.equal(await authGuard.canActivate(context), true);
  assert.equal(rolesGuard.canActivate(context), true);
  assert.deepEqual(new AccessControlSpecController().health(), { status: "ok" });
});

test("private route without token returns 401", async () => {
  const authGuard = createAuthGuard({});
  const context = createExecutionContext("member", {
    method: "GET",
    headers: {},
  });

  await assert.rejects(() => authGuard.canActivate(context), (error: unknown) => {
    assert.ok(error instanceof UnauthorizedException);
    assert.equal(error.getStatus(), 401);
    return true;
  });
});

test("private route with invalid token returns 401", async () => {
  const authGuard = createAuthGuard({});
  const context = createExecutionContext("member", {
    method: "GET",
    headers: {
      authorization: "Bearer invalid-token",
    },
  });

  await assert.rejects(() => authGuard.canActivate(context), (error: unknown) => {
    assert.ok(error instanceof UnauthorizedException);
    assert.equal(error.getStatus(), 401);
    return true;
  });
});

test("private member route with valid member token is allowed", async () => {
  const request = {
    method: "GET",
    headers: {
      authorization: "Bearer member-token",
    },
  };
  const authGuard = createAuthGuard({
    "member-token": memberUser,
  });
  const rolesGuard = createRolesGuard();
  const context = createExecutionContext("member", request);

  assert.equal(await authGuard.canActivate(context), true);
  assert.equal(rolesGuard.canActivate(context), true);
});

test("admin route with no token returns 401", async () => {
  const authGuard = createAuthGuard({});
  const context = createExecutionContext("admin", {
    method: "GET",
    headers: {},
  });

  await assert.rejects(() => authGuard.canActivate(context), (error: unknown) => {
    assert.ok(error instanceof UnauthorizedException);
    assert.equal(error.getStatus(), 401);
    return true;
  });
});

test("admin route with member token returns 403", async () => {
  const request = {
    method: "GET",
    headers: {
      authorization: "Bearer member-token",
    },
  };
  const authGuard = createAuthGuard({
    "member-token": memberUser,
  });
  const rolesGuard = createRolesGuard();
  const context = createExecutionContext("admin", request);

  assert.equal(await authGuard.canActivate(context), true);
  assert.throws(() => rolesGuard.canActivate(context), (error: unknown) => {
    assert.ok(error instanceof ForbiddenException);
    assert.equal(error.getStatus(), 403);
    return true;
  });
});

test("admin route with admin token is allowed", async () => {
  const request = {
    method: "GET",
    headers: {
      authorization: "Bearer admin-token",
    },
  };
  const authGuard = createAuthGuard({
    "admin-token": adminUser,
  });
  const rolesGuard = createRolesGuard();
  const context = createExecutionContext("admin", request);

  assert.equal(await authGuard.canActivate(context), true);
  assert.equal(rolesGuard.canActivate(context), true);
});

test("admin route with super admin token is allowed", async () => {
  const request = {
    method: "GET",
    headers: {
      authorization: "Bearer super-token",
    },
  };
  const authGuard = createAuthGuard({
    "super-token": superAdminUser,
  });
  const rolesGuard = createRolesGuard();
  const context = createExecutionContext("admin", request);

  assert.equal(await authGuard.canActivate(context), true);
  assert.equal(rolesGuard.canActivate(context), true);
});

test("undecorated route is private by default", async () => {
  const authGuard = createAuthGuard({});
  const context = createExecutionContext("privateDefault", {
    method: "GET",
    headers: {},
  });

  await assert.rejects(() => authGuard.canActivate(context), (error: unknown) => {
    assert.ok(error instanceof UnauthorizedException);
    assert.equal(error.getStatus(), 401);
    return true;
  });
});
