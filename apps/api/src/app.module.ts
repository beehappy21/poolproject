import { Module } from "@nestjs/common";
import { AuthModule } from "../../../packages/modules/auth";
import { CapModule } from "../../../packages/modules/cap";
import { AdminMatrixSettingsController } from "./admin-matrix-settings.controller";
import { MatrixModule } from "../../../packages/modules/matrix/src";
import { MembersModule } from "../../../packages/modules/members";
import { OrdersModule } from "../../../packages/modules/orders";
import { PackagesModule } from "../../../packages/modules/packages";
import { PoolModule } from "../../../packages/modules/pool";
import { WalletsModule } from "../../../packages/modules/wallets";
import { AdminSettingsController } from "./admin-settings.controller";
import { AdminUiController } from "./admin-ui.controller";
import { ContentController } from "./content.controller";
import { HealthController } from "./health.controller";
import { NotificationsController } from "./notifications.controller";
import { ShippingController } from "./shipping.controller";

@Module({
  imports: [
    AuthModule,
    CapModule,
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
    ContentController,
    NotificationsController,
    ShippingController,
  ],
  providers: [],
})
export class ApiAppModule {}
