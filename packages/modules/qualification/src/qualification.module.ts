import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../infrastructure";
import { PrismaQualificationRepository } from "./repositories/qualification.repository";
import { QualificationService } from "./services/qualification.service";

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaQualificationRepository,
    {
      provide: QualificationService,
      useFactory: (
        qualificationRepository: PrismaQualificationRepository,
      ) => new QualificationService(qualificationRepository),
      inject: [PrismaQualificationRepository],
    },
  ],
  exports: [QualificationService, PrismaQualificationRepository],
})
export class QualificationModule {}
