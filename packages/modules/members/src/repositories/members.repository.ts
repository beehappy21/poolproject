import { Injectable } from "@nestjs/common";

import { QualificationCycleSnapshot } from "../../../qualification/src/domain/qualification.types";
import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import {
  toIdString,
  toQualificationCycleSnapshot,
} from "../../../../infrastructure/src/prisma/prisma.mappers";

export interface MembersRepository {
  findMemberById(memberId: string): Promise<{
    memberId: string;
    memberCode: string;
    name: string;
    sponsorId: string | null;
  } | null>;

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

  findMemberIdsWithActiveCycles(evaluationAt: string): Promise<string[]>;

  findMemberByCode(memberCode: string): Promise<{
    memberId: string;
    memberCode: string;
    name: string;
    sponsorId: string | null;
  } | null>;

  createMember(input: {
    memberCode: string;
    name: string;
    email?: string;
    phone?: string;
    sponsorId?: string | null;
    sponsorCode?: string | null;
  }): Promise<{
    memberId: string;
    memberCode: string;
    name: string;
    sponsorId: string | null;
  }>;

  activatePackageCycle(input: {
    memberId: string;
    packageId: string;
  }): Promise<{
    cycleId: string;
    memberId: string;
    packageId: string;
    cycleNo: number;
    activatedAt: string;
    activeUntil: string;
  }>;
}

@Injectable()
export class PrismaMembersRepository implements MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMemberById(memberId: string): Promise<{
    memberId: string;
    memberCode: string;
    name: string;
    sponsorId: string | null;
  } | null> {
    const member = await this.prisma.user.findUnique({
      where: { id: BigInt(memberId) },
      select: { id: true, memberCode: true, name: true, sponsorId: true },
    });

    return member
      ? {
          memberId: toIdString(member.id),
          memberCode: member.memberCode,
          name: member.name,
          sponsorId: member.sponsorId ? toIdString(member.sponsorId) : null,
        }
      : null;
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

  async findMemberIdsWithActiveCycles(evaluationAt: string): Promise<string[]> {
    const at = new Date(evaluationAt);
    const cycles = await this.prisma.memberPackageCycle.findMany({
      where: {
        status: "ACTIVE",
        activatedAt: { lte: at },
        activeUntil: { gte: at },
      },
      distinct: ["userId"],
      select: {
        userId: true,
      },
    });

    return cycles.map((cycle) => toIdString(cycle.userId));
  }

  async findMemberByCode(memberCode: string): Promise<{
    memberId: string;
    memberCode: string;
    name: string;
    sponsorId: string | null;
  } | null> {
    const member = await this.prisma.user.findUnique({
      where: { memberCode },
      select: { id: true, memberCode: true, name: true, sponsorId: true },
    });

    return member
      ? {
          memberId: toIdString(member.id),
          memberCode: member.memberCode,
          name: member.name,
          sponsorId: member.sponsorId ? toIdString(member.sponsorId) : null,
        }
      : null;
  }

  async createMember(input: {
    memberCode: string;
    name: string;
    email?: string;
    phone?: string;
    sponsorId?: string | null;
    sponsorCode?: string | null;
  }) {
    let sponsorId = input.sponsorId ? BigInt(input.sponsorId) : null;

    if (!sponsorId && input.sponsorCode) {
      const sponsor = await this.prisma.user.findUnique({
        where: { memberCode: input.sponsorCode },
        select: { id: true },
      });

      sponsorId = sponsor?.id ?? null;
    }

    const member = await this.prisma.user.create({
      data: {
        memberCode: input.memberCode,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        passwordHash: "dev-password",
        sponsorId,
        status: "ACTIVE",
        riskLevel: "NORMAL",
        payoutStatus: "ACTIVE",
      },
    });

    return {
      memberId: toIdString(member.id),
      memberCode: member.memberCode,
      name: member.name,
      sponsorId: member.sponsorId ? toIdString(member.sponsorId) : null,
    };
  }

  async activatePackageCycle(input: { memberId: string; packageId: string }) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: BigInt(input.packageId) },
      select: {
        id: true,
        activeDays: true,
        earningCapAmount: true,
      },
    });

    if (!pkg) {
      throw new Error("Package not found.");
    }

    const lastCycle = await this.prisma.memberPackageCycle.findFirst({
      where: { userId: BigInt(input.memberId) },
      orderBy: [{ cycleNo: "desc" }],
      select: { cycleNo: true },
    });

    const activatedAt = new Date();
    const activeUntil = new Date(activatedAt);
    activeUntil.setUTCDate(activeUntil.getUTCDate() + pkg.activeDays);

    const cycle = await this.prisma.memberPackageCycle.create({
      data: {
        userId: BigInt(input.memberId),
        packageId: pkg.id,
        cycleNo: (lastCycle?.cycleNo ?? 0) + 1,
        activatedAt,
        activeUntil,
        earningCap: pkg.earningCapAmount,
        earnedTotalInCycle: "0",
        earningStatus: "ACTIVE",
        isReceivable: true,
        status: "ACTIVE",
      },
    });

    return {
      cycleId: toIdString(cycle.id),
      memberId: input.memberId,
      packageId: input.packageId,
      cycleNo: cycle.cycleNo,
      activatedAt: cycle.activatedAt.toISOString(),
      activeUntil: cycle.activeUntil.toISOString(),
    };
  }
}
