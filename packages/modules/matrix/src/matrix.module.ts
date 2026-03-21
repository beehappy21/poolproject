import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { MembersModule } from "../../members";
import { WalletsModule } from "../../wallets";
import { MatrixController } from "./controllers/matrix.controller";
import { PrismaMatrixRepository } from "./repositories/matrix.repository";
import { MatrixService } from "./services/matrix.service";

@Module({
  imports: [PrismaModule, MembersModule, WalletsModule],
  controllers: [MatrixController],
  providers: [PrismaMatrixRepository, MatrixService],
  exports: [PrismaMatrixRepository, MatrixService],
})
export class MatrixModule {}
