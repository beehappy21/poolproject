import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { RiskModule } from "../../risk/src";
import { WalletsController } from "./controllers/wallets.controller";
import { PrismaWalletsRepository } from "./repositories/wallets.repository";
import { WalletsService } from "./services/wallets.service";

@Module({
  imports: [PrismaModule, RiskModule],
  controllers: [WalletsController],
  providers: [PrismaWalletsRepository, WalletsService],
  exports: [WalletsService, PrismaWalletsRepository],
})
export class WalletsModule {}
