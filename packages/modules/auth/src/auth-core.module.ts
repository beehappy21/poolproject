import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { MembersModule } from "../../members/src/members.module";
import { PrismaAuthRepository } from "./repositories/auth.repository";
import { AuthService } from "./services/auth.service";

@Module({
  imports: [PrismaModule, forwardRef(() => MembersModule)],
  providers: [PrismaAuthRepository, AuthService],
  exports: [AuthService, PrismaAuthRepository],
})
export class AuthCoreModule {}
