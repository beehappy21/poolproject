import { QualificationCycleSnapshot } from "../../../qualification/src/domain/qualification.types";
import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import {
  toIdString,
  toQualificationCycleSnapshot,
} from "../../../../infrastructure/src/prisma/prisma.mappers";

export interface MembersRepository {
  findMemberById(memberId: string): Promise<{ memberId: string } | null>;

  findActiveDirectReferralCount(
    memberId: string,
    evaluationAt: string,
  ): Promise<number>;

  findCyclesForMember(
    memberId: string,
    evaluationAt: string,
  ): Promise<QualificationCycleSnapshot[]>;

  findUplineCandidateIds(
    memberId: string,
    evaluationAt: string,
  ): Promise<string[]>;
}

export class PrismaMembersRepository implements MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMemberById(memberId: string): Promise<{ memberId: string } | null> {
    const member = await this.prisma.user.findUnique({
      where: { id: BigInt(memberId) },
      select: { id: true },
    });

    return member ? { memberId: toIdString(member.id) } : null;
  }

  async findActiveDirectReferralCount(
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

  async findCyclesForMember(
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
        earningCap: true,
        earnedTotalInCycle: true,
        isReceivable: true,
        earningStatus: true,
      },
    });

    return cycles.map(toQualificationCycleSnapshot);
  }

  async findUplineCandidateIds(
    memberId: string,
    evaluationAt: string,
  ): Promise<string[]> {
    void evaluationAt;

    const candidateUserIds: string[] = [];
    let currentMemberId: bigint | null = BigInt(memberId);

    while (currentMemberId) {
      const user: { sponsorId: bigint | null } | null =
        await this.prisma.user.findUnique({
        where: { id: currentMemberId },
        select: { sponsorId: true },
        });

      if (!user?.sponsorId) {
        break;
      }

      candidateUserIds.push(toIdString(user.sponsorId));
      currentMemberId = user.sponsorId;
    }

    return candidateUserIds;
  }
}
