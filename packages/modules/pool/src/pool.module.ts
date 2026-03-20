import { Module, forwardRef } from "@nestjs/common";

import { CommissionsModule } from "../../commissions";
import { MembersModule } from "../../members";
import { OrdersModule } from "../../orders";
import { QualificationModule } from "../../qualification";
import { PoolController } from "./controllers/pool.controller";
import { PoolService } from "./services/pool.service";

@Module({
  imports: [
    MembersModule,
    QualificationModule,
    forwardRef(() => OrdersModule),
    forwardRef(() => CommissionsModule),
  ],
  controllers: [PoolController],
  providers: [PoolService],
  exports: [PoolService],
})
export class PoolModule {}
