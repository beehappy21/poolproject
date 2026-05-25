import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { CommissionsModule } from "../../commissions";
import { MembersModule } from "../../members/src/members.module";
import { OrdersModule } from "../../orders";
import { QualificationModule } from "../../qualification";
import { WalletsModule } from "../../wallets/src/wallets.module";
import { PoolController } from "./controllers/pool.controller";
import { PrismaPoolRepository } from "./repositories/pool.repository";
import { PoolService } from "./services/pool.service";

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => MembersModule),
    QualificationModule,
    forwardRef(() => WalletsModule),
    forwardRef(() => OrdersModule),
    forwardRef(() => CommissionsModule),
  ],
  controllers: [PoolController],
  providers: [PrismaPoolRepository, PoolService],
  exports: [PoolService, PrismaPoolRepository],
})
export class PoolModule {}
