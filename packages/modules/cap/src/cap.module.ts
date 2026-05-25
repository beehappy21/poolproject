import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { CapController } from "./controllers/cap.controller";
import { CapService } from "./services/cap.service";

@Module({
  imports: [PrismaModule],
  controllers: [CapController],
  providers: [CapService],
  exports: [CapService],
})
export class CapModule {}
