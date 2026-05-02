import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { MembersModule } from "../../members";
import { OrdersModule } from "../../orders";
import { PoolModule } from "../../pool";
import { QualificationModule } from "../../qualification";
import { WalletsModule } from "../../wallets";
import { CommissionsController } from "./controllers/commissions.controller";
import { PrismaCommissionsRepository } from "./repositories/commissions.repository";
import { CommissionsService } from "./services/commissions.service";

@Module({
  imports: [
    PrismaModule,
    MembersModule,
    QualificationModule,
    WalletsModule,
    forwardRef(() => OrdersModule),
    forwardRef(() => PoolModule),
  ],
  controllers: [CommissionsController],
  providers: [PrismaCommissionsRepository, CommissionsService],
  exports: [CommissionsService, PrismaCommissionsRepository],
})
export class CommissionsModule {}
