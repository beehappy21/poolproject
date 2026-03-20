import { Module } from "@nestjs/common";
import { AuthModule } from "../../../packages/modules/auth";
import { MembersModule } from "../../../packages/modules/members";
import { OrdersModule } from "../../../packages/modules/orders";
import { PoolModule } from "../../../packages/modules/pool";
import { HealthController } from "./health.controller";

@Module({
  imports: [AuthModule, MembersModule, OrdersModule, PoolModule],
  controllers: [HealthController],
  providers: [],
})
export class ApiAppModule {}
