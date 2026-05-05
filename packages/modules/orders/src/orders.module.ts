import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { CapModule } from "../../cap";
import { CommissionsModule } from "../../commissions";
import { MatrixModule } from "../../matrix/src";
import { MembersModule } from "../../members/src/members.module";
import { PoolModule } from "../../pool";
import { QualificationModule } from "../../qualification";
import { RiskModule } from "../../risk/src";
import { WalletsModule } from "../../wallets/src/wallets.module";
import { OrdersController } from "./controllers/orders.controller";
import { PrismaOrdersRepository } from "./repositories/orders.repository";
import { OrdersService } from "./services/orders.service";

@Module({
  imports: [
    PrismaModule,
    CapModule,
    forwardRef(() => MembersModule),
    QualificationModule,
    RiskModule,
    forwardRef(() => WalletsModule),
    MatrixModule,
    forwardRef(() => CommissionsModule),
    forwardRef(() => PoolModule),
  ],
  controllers: [OrdersController],
  providers: [PrismaOrdersRepository, OrdersService],
  exports: [OrdersService, PrismaOrdersRepository],
})
export class OrdersModule {}
