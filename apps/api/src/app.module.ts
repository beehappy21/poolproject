import { Module } from "@nestjs/common";
import { AuthModule } from "../../../packages/modules/auth";
import { MembersModule } from "../../../packages/modules/members";
import { OrdersModule } from "../../../packages/modules/orders";
import { PackagesModule } from "../../../packages/modules/packages";
import { PoolModule } from "../../../packages/modules/pool";
import { WalletsModule } from "../../../packages/modules/wallets";
import { AdminUiController } from "./admin-ui.controller";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    AuthModule,
    MembersModule,
    PackagesModule,
    OrdersModule,
    PoolModule,
    WalletsModule,
  ],
  controllers: [HealthController, AdminUiController],
  providers: [],
})
export class ApiAppModule {}
