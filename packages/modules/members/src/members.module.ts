import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../infrastructure";
import { MembersController } from "./controllers/members.controller";
import { PrismaMembersRepository } from "./repositories/members.repository";
import { MembersService } from "./services/members.service";

@Module({
  imports: [PrismaModule],
  controllers: [MembersController],
  providers: [PrismaMembersRepository, MembersService],
  exports: [MembersService, PrismaMembersRepository],
})
export class MembersModule {}
