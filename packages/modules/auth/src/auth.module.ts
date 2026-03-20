import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { AuthController } from "./controllers/auth.controller";
import { PrismaAuthRepository } from "./repositories/auth.repository";
import { AuthService } from "./services/auth.service";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [PrismaAuthRepository, AuthService],
  exports: [AuthService, PrismaAuthRepository],
})
export class AuthModule {}
