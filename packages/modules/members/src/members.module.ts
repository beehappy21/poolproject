import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../infrastructure";
import { WalletsModule } from "../../wallets";
import { MembersController } from "./controllers/members.controller";
import { PrismaMembersRepository } from "./repositories/members.repository";
import { MembersService } from "./services/members.service";

@Module({
  imports: [PrismaModule, WalletsModule],
  controllers: [MembersController],
  providers: [PrismaMembersRepository, MembersService],
  exports: [MembersService, PrismaMembersRepository],
})
export class MembersModule {}
