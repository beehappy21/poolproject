import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { CommissionsModule } from "../../commissions";
import { MatrixModule } from "../../matrix/src";
import { PoolModule } from "../../pool";
import { QualificationModule } from "../../qualification";
import { RiskModule } from "../../risk/src";
import { WalletsModule } from "../../wallets";
import { OrdersController } from "./controllers/orders.controller";
import { PrismaOrdersRepository } from "./repositories/orders.repository";
import { OrdersService } from "./services/orders.service";

@Module({
  imports: [
    PrismaModule,
    QualificationModule,
    RiskModule,
    WalletsModule,
    MatrixModule,
    forwardRef(() => CommissionsModule),
    forwardRef(() => PoolModule),
  ],
  controllers: [OrdersController],
  providers: [PrismaOrdersRepository, OrdersService],
  exports: [OrdersService, PrismaOrdersRepository],
})
export class OrdersModule {}
