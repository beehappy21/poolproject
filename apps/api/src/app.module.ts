import { Module } from "@nestjs/common";
import { AuthModule } from "../../../packages/modules/auth";
import { AdminMatrixSettingsController } from "./admin-matrix-settings.controller";
import { MatrixModule } from "../../../packages/modules/matrix/src";
import { MembersModule } from "../../../packages/modules/members";
import { OrdersModule } from "../../../packages/modules/orders";
import { PackagesModule } from "../../../packages/modules/packages";
import { PoolModule } from "../../../packages/modules/pool";
import { WalletsModule } from "../../../packages/modules/wallets";
import { AdminSettingsController } from "./admin-settings.controller";
import { AdminUiController } from "./admin-ui.controller";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    AuthModule,
    MembersModule,
    MatrixModule,
    PackagesModule,
    OrdersModule,
    PoolModule,
    WalletsModule,
  ],
  controllers: [
    HealthController,
    AdminUiController,
    AdminSettingsController,
    AdminMatrixSettingsController,
  ],
  providers: [],
})
export class ApiAppModule {}
