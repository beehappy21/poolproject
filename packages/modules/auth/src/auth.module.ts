import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { CommissionsModule } from "../../commissions";
import { MatrixModule } from "../../matrix/src";
import { MembersModule } from "../../members";
import { OrdersModule } from "../../orders";
import { WalletsModule } from "../../wallets";
import { AuthController } from "./controllers/auth.controller";
import { PrismaAuthRepository } from "./repositories/auth.repository";
import { AuthService } from "./services/auth.service";

@Module({
  imports: [
    PrismaModule,
    MembersModule,
    OrdersModule,
    WalletsModule,
    CommissionsModule,
    MatrixModule,
  ],
  controllers: [AuthController],
  providers: [PrismaAuthRepository, AuthService],
  exports: [AuthService, PrismaAuthRepository],
})
export class AuthModule {}
