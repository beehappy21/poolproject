import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { MembersModule } from "../../members/src/members.module";
import { authBruteForceStoreProvider } from "./brute-force/auth-brute-force.provider";
import { AuthBruteForceService } from "./brute-force/auth-brute-force.service";
import { PrismaAuthRepository } from "./repositories/auth.repository";
import { sessionStoreProvider } from "./session/session-store.provider";
import { AuthService } from "./services/auth.service";

@Module({
  imports: [PrismaModule, forwardRef(() => MembersModule)],
  providers: [
    PrismaAuthRepository,
    sessionStoreProvider,
    authBruteForceStoreProvider,
    AuthBruteForceService,
    AuthService,
  ],
  exports: [AuthService, PrismaAuthRepository],
})
export class AuthCoreModule {}
