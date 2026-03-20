import { Module } from "@nestjs/common";
import { CommissionsModule } from "../../../packages/modules/commissions";
import { PoolModule } from "../../../packages/modules/pool";
import { QualificationModule } from "../../../packages/modules/qualification";

@Module({
  imports: [QualificationModule, CommissionsModule, PoolModule],
  providers: [],
})
export class WorkerAppModule {}
