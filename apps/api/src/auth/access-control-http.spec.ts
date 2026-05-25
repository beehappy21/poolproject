import assert from "node:assert/strict";
import test from "node:test";

import {
  type INestApplicationContext,
  Module,
  UnauthorizedException,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { APP_GUARD, Reflector } from "@nestjs/core";

import { HealthController } from "../health.controller";
import { AuthGuard } from "./guards/auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { AuthController } from "../../../../packages/modules/auth/src/controllers/auth.controller";
import { AuthService } from "../../../../packages/modules/auth/src/services/auth.service";
import { CommissionsService } from "../../../../packages/modules/commissions/src/services/commissions.service";
import { MatrixService } from "../../../../packages/modules/matrix/src/services/matrix.service";
import { MembersService } from "../../../../packages/modules/members/src/services/members.service";
import { OrdersService } from "../../../../packages/modules/orders/src/services/orders.service";
import { PackagesService } from "../../../../packages/modules/packages/src/services/packages.service";
import { PoolService } from "../../../../packages/modules/pool/src/services/pool.service";
import { WalletsService } from "../../../../packages/modules/wallets/src/services/wallets.service";
import { PrismaService } from "../../../../packages/infrastructure/src/prisma/prisma.service";

function createAuthServiceMock() {
  return {
    loginCalls: [] as Array<{ identifier: string; password: string }>,
    async login(input: { identifier: string; password: string }) {
      this.loginCalls.push(input);

      if (input.identifier === "invalid-user") {
        throw new UnauthorizedException("Invalid credentials.");
      }

      return {
        accessToken: "test-access-token",
        user: {
          userId: "1001",
          memberCode: "MEM1001",
          name: "HTTP Login Smoke",
          email: "smoke@example.com",
          phone: null,
          isAdmin: false,
          matrixReentryEnabled: false,
        },
      };
    },
    async getSessionUser() {
      return null;
    },
    async logout() {
      return undefined;
    },
    isAdminUser() {
      return false;
    },
  };
}

function createNoopProvider<T extends object>(overrides?: Partial<T>): T {
  return {
    ...(overrides || {}),
  } as T;
}

function createExecutionContext(controllerClass: Function, handler: Function, request: any) {
  return {
    getClass: () => controllerClass,
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}

async function createTestContext() {
  const authServiceMock = createAuthServiceMock();

  @Module({
    controllers: [HealthController, AuthController],
    providers: [
      {
        provide: AuthService,
        useValue: authServiceMock,
      },
      {
        provide: MembersService,
        useValue: createNoopProvider<MembersService>(),
      },
      {
        provide: OrdersService,
        useValue: createNoopProvider<OrdersService>(),
      },
      {
        provide: WalletsService,
        useValue: createNoopProvider<WalletsService>(),
      },
      {
        provide: CommissionsService,
        useValue: createNoopProvider<CommissionsService>(),
      },
      {
        provide: MatrixService,
        useValue: createNoopProvider<MatrixService>(),
      },
      {
        provide: PackagesService,
        useValue: createNoopProvider<PackagesService>(),
      },
      {
        provide: PoolService,
        useValue: createNoopProvider<PoolService>(),
      },
      {
        provide: PrismaService,
        useValue: createNoopProvider<PrismaService>(),
      },
      {
        provide: APP_GUARD,
        useClass: AuthGuard,
      },
      {
        provide: APP_GUARD,
        useClass: RolesGuard,
      },
    ],
  })
  class AccessControlHttpTestModule {}

  const app = await NestFactory.createApplicationContext(
    AccessControlHttpTestModule,
    { logger: false },
  );

  return {
    app,
    authServiceMock,
    authGuard: new AuthGuard(app.get(Reflector), authServiceMock as any),
    rolesGuard: new RolesGuard(app.get(Reflector)),
    healthController: app.get(HealthController),
    authController: app.get(AuthController),
  };
}

async function closeApp(app: INestApplicationContext): Promise<void> {
  await app.close();
}

test("GET /health is public under global guards using the real HealthController route", async () => {
  const { app, authGuard, rolesGuard, healthController } = await createTestContext();

  try {
    const request = {
      method: "GET",
      headers: {},
    };
    const context = createExecutionContext(
      HealthController,
      healthController.getHealth,
      request,
    );

    assert.equal(await authGuard.canActivate(context), true);
    assert.equal(rolesGuard.canActivate(context), true);
    assert.equal(healthController.getHealth().status, "ok");
  } finally {
    await closeApp(app);
  }
});

test("POST /auth/login reaches the real handler under global guards", async () => {
  const { app, authGuard, rolesGuard, authController, authServiceMock } =
    await createTestContext();

  try {
    const request = {
      method: "POST",
      headers: {},
    };
    const context = createExecutionContext(
      AuthController,
      authController.login,
      request,
    );
    const responseHeaders: Record<string, string> = {};

    assert.equal(await authGuard.canActivate(context), true);
    assert.equal(rolesGuard.canActivate(context), true);

    await assert.rejects(
      () =>
        authController.login(
          {
            ip: "127.0.0.1",
            headers: {},
          },
          {
            identifier: "invalid-user",
            password: "wrong-password",
          },
          {
            setHeader(name: string, value: string) {
              responseHeaders[name] = value;
            },
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof UnauthorizedException);
        assert.equal(error.message, "Invalid credentials.");
        return true;
      },
    );

    assert.equal(authServiceMock.loginCalls.length, 1);
    assert.deepEqual(authServiceMock.loginCalls[0], {
      identifier: "invalid-user",
      password: "wrong-password",
      ip: "127.0.0.1",
    });
    assert.deepEqual(responseHeaders, {});
  } finally {
    await closeApp(app);
  }
});
