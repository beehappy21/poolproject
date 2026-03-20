import { Module } from "@nestjs/common";
import { AuthModule } from "../../../packages/modules/auth";
import { MembersModule } from "../../../packages/modules/members";
import { OrdersModule } from "../../../packages/modules/orders";
import { PackagesModule } from "../../../packages/modules/packages";
import { PoolModule } from "../../../packages/modules/pool";
import { HealthController } from "./health.controller";

@Module({
  imports: [AuthModule, MembersModule, PackagesModule, OrdersModule, PoolModule],
  controllers: [HealthController],
  providers: [],
})
export class ApiAppModule {}
