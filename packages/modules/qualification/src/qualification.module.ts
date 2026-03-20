import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../infrastructure";
import { PrismaQualificationRepository } from "./repositories/qualification.repository";
import { QualificationService } from "./services/qualification.service";

@Module({
  imports: [PrismaModule],
  providers: [PrismaQualificationRepository, QualificationService],
  exports: [QualificationService, PrismaQualificationRepository],
})
export class QualificationModule {}
