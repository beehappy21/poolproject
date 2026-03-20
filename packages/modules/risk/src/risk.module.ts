import { Module } from "@nestjs/common";

import { RiskService } from "./services/risk.service";

@Module({
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
