import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../infrastructure";
import { PrismaMembersRepository } from "./repositories/members.repository";
import { MembersService } from "./services/members.service";

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaMembersRepository,
    {
      provide: MembersService,
      useFactory: (membersRepository: PrismaMembersRepository) =>
        new MembersService(membersRepository),
      inject: [PrismaMembersRepository],
    },
  ],
  exports: [MembersService, PrismaMembersRepository],
})
export class MembersModule {}
