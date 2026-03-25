import { Injectable } from "@nestjs/common";

import {
  QualificationCycleSnapshot,
  QualificationDecisionInput,
} from "../domain/qualification.types";
import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import { toQualificationCycleSnapshot } from "../../../../infrastructure/src/prisma/prisma.mappers";

export interface QualificationRepository {
  findCyclesForQualification(
    input: QualificationDecisionInput,
  ): Promise<QualificationCycleSnapshot[]>;

  findReceivableCycles(
    memberId: string,
    evaluationAt: string,
  ): Promise<QualificationCycleSnapshot[]>;

  countActiveDirectReferrals(
    memberId: string,
    evaluationAt: string,
  ): Promise<number>;
}

@Injectable()
export class PrismaQualificationRepository implements QualificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCyclesForQualification(
    input: QualificationDecisionInput,
  ): Promise<QualificationCycleSnapshot[]> {
    return this.findCyclesAt(input.userId, input.evaluationAt);
  }

  async findReceivableCycles(
    memberId: string,
    evaluationAt: string,
  ): Promise<QualificationCycleSnapshot[]> {
    return this.findCyclesAt(memberId, evaluationAt);
  }

  async countActiveDirectReferrals(
    memberId: string,
    evaluationAt: string,
  ): Promise<number> {
    const at = new Date(evaluationAt);

    return this.prisma.user.count({
      where: {
        sponsorId: BigInt(memberId),
        packageCycles: {
          some: {
            status: "ACTIVE",
            isReceivable: true,
            earningStatus: "ACTIVE",
            activatedAt: { lte: at },
            activeUntil: { gte: at },
          },
        },
      },
    });
  }

  private async findCyclesAt(
    memberId: string,
    evaluationAt: string,
  ): Promise<QualificationCycleSnapshot[]> {
    const at = new Date(evaluationAt);
    const cycles = await this.prisma.memberPackageCycle.findMany({
      where: {
        userId: BigInt(memberId),
        status: "ACTIVE",
        activatedAt: { lte: at },
        activeUntil: { gte: at },
      },
      orderBy: [{ activatedAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        activatedAt: true,
        activeUntil: true,
        purchaseBase: true,
        poolRateMode: true,
        poolRate: true,
        poolCapMultiple: true,
        commissionCapScope: true,
        commissionCapMultiple: true,
        earningCap: true,
        earnedTotalInCycle: true,
        isReceivable: true,
        earningStatus: true,
      },
    });

    return cycles.map(toQualificationCycleSnapshot);
  }
}
