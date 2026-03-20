import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { CommissionsModule } from "../../commissions";
import { MembersModule } from "../../members";
import { OrdersModule } from "../../orders";
import { QualificationModule } from "../../qualification";
import { PoolController } from "./controllers/pool.controller";
import { PrismaPoolRepository } from "./repositories/pool.repository";
import { PoolService } from "./services/pool.service";

@Module({
  imports: [
    PrismaModule,
    MembersModule,
    QualificationModule,
    forwardRef(() => OrdersModule),
    forwardRef(() => CommissionsModule),
  ],
  controllers: [PoolController],
  providers: [PrismaPoolRepository, PoolService],
  exports: [PoolService, PrismaPoolRepository],
})
export class PoolModule {}
