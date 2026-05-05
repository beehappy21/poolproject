import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { MembersModule } from "../../members/src/members.module";
import { WalletsModule } from "../../wallets/src/wallets.module";
import { MatrixController } from "./controllers/matrix.controller";
import { PrismaMatrixRepository } from "./repositories/matrix.repository";
import { MatrixService } from "./services/matrix.service";

@Module({
  imports: [PrismaModule, forwardRef(() => MembersModule), forwardRef(() => WalletsModule)],
  controllers: [MatrixController],
  providers: [PrismaMatrixRepository, MatrixService],
  exports: [PrismaMatrixRepository, MatrixService],
})
export class MatrixModule {}
