import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { MembersModule } from "../../members";
import { OrdersModule } from "../../orders";
import { QualificationModule } from "../../qualification";
import { PrismaCommissionsRepository } from "./repositories/commissions.repository";
import { CommissionsService } from "./services/commissions.service";

@Module({
  imports: [
    PrismaModule,
    MembersModule,
    QualificationModule,
    forwardRef(() => OrdersModule),
  ],
  providers: [PrismaCommissionsRepository, CommissionsService],
  exports: [CommissionsService, PrismaCommissionsRepository],
})
export class CommissionsModule {}
