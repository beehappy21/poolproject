import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { CommissionsModule } from "../../commissions/src/commissions.module";
import { MatrixModule } from "../../matrix/src";
import { MembersModule } from "../../members/src/members.module";
import { OrdersModule } from "../../orders";
import { PackagesModule } from "../../packages";
import { PoolModule } from "../../pool";
import { WalletsModule } from "../../wallets/src/wallets.module";
import { AuthCoreModule } from "./auth-core.module";
import { AuthController } from "./controllers/auth.controller";

@Module({
  imports: [
    PrismaModule,
    AuthCoreModule,
    forwardRef(() => MembersModule),
    OrdersModule,
    PackagesModule,
    forwardRef(() => WalletsModule),
    CommissionsModule,
    MatrixModule,
    PoolModule,
  ],
  controllers: [AuthController],
  exports: [AuthCoreModule],
})
export class AuthModule {}
