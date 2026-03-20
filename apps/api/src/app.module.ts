import { Module } from "@nestjs/common";
import { AuthModule } from "../../../packages/modules/auth";
import { MembersModule } from "../../../packages/modules/members";
import { OrdersModule } from "../../../packages/modules/orders";
import { HealthController } from "./health.controller";

@Module({
  imports: [AuthModule, MembersModule, OrdersModule],
  controllers: [HealthController],
  providers: [],
})
export class ApiAppModule {}
