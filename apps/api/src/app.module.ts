import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "../../../packages/modules/auth";
import { CapModule } from "../../../packages/modules/cap";
import { CommissionsModule } from "../../../packages/modules/commissions";
import { AdminMatrixSettingsController } from "./admin-matrix-settings.controller";
import { InternalBaoController } from "./internal-bao.controller";
import { MatrixModule } from "../../../packages/modules/matrix/src";
import { MembersModule } from "../../../packages/modules/members";
import { OrdersModule } from "../../../packages/modules/orders";
import { PackagesModule } from "../../../packages/modules/packages";
import { PoolModule } from "../../../packages/modules/pool";
import { WalletsModule } from "../../../packages/modules/wallets";
import { AdminSettingsController } from "./admin-settings.controller";
import { ContentController } from "./content.controller";
import {
  defaultHealthChecks,
  HEALTH_CHECKS,
  HealthController,
  MetricsController,
} from "./health.controller";
import { NotificationsController } from "./notifications.controller";
import { ShippingController } from "./shipping.controller";
import { AuthGuard } from "./auth/guards/auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";

@Module({
  imports: [
    AuthModule,
    CapModule,
    CommissionsModule,
    MembersModule,
    MatrixModule,
    PackagesModule,
    OrdersModule,
    PoolModule,
    WalletsModule,
  ],
  controllers: [
    HealthController,
    MetricsController,
    AdminSettingsController,
    AdminMatrixSettingsController,
    InternalBaoController,
    ContentController,
    NotificationsController,
    ShippingController,
  ],
  providers: [
    {
      provide: HEALTH_CHECKS,
      useValue: defaultHealthChecks,
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
export class ApiAppModule {}
