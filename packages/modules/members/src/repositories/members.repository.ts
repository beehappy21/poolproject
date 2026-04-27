import { ConflictException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { QualificationCycleSnapshot } from "../../../qualification/src/domain/qualification.types";
import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import {
  toIdString,
  toQualificationCycleSnapshot,
} from "../../../../infrastructure/src/prisma/prisma.mappers";
import { hashPassword } from "../../../../shared/utils/src/password.util";

export interface MembersRepository {
  listMembers(filters?: {
    sponsorId?: string;
    memberCode?: string;
    query?: string;
    page?: number;
    pageSize?: number;
  }): Promise<
    | Array<{
        memberId: string;
        memberCode: string;
        referralCode: string;
        name: string;
        sponsorId: string | null;
        nationalId?: string | null;
        uplineUserId?: string | null;
        placementSide?: "LEFT" | "MIDDLE" | "RIGHT" | null;
        rankCode?: string | null;
        honorTitle?: string | null;
        mobileCenterCode?: string | null;
        joinedAt?: string | null;
      }>
    | {
        items: Array<{
          memberId: string;
          memberCode: string;
          referralCode: string;
          name: string;
          sponsorId: string | null;
          nationalId?: string | null;
          uplineUserId?: string | null;
          placementSide?: "LEFT" | "MIDDLE" | "RIGHT" | null;
          rankCode?: string | null;
          honorTitle?: string | null;
          mobileCenterCode?: string | null;
          joinedAt?: string | null;
        }>;
        total: number;
        page: number;
        pageSize: number;
      }
  >;

  findMemberNetwork(memberId: string): Promise<{
    member: {
      memberId: string;
      memberCode: string;
      referralCode: string;
      name: string;
      sponsorId: string | null;
    };
    sponsor: {
      memberId: string;
      memberCode: string;
      referralCode: string;
      name: string;
      sponsorId: string | null;
    } | null;
    directReferrals: Array<{
      memberId: string;
      memberCode: string;
      referralCode: string;
      name: string;
      sponsorId: string | null;
    }>;
    directReferralCount: number;
    uplineChain: Array<{
      memberId: string;
      memberCode: string;
      referralCode: string;
      name: string;
      sponsorId: string | null;
    }>;
    uplineLevelCount: number;
  } | null>;

  findMemberById(memberId: string): Promise<{
    memberId: string;
    memberCode: string;
    referralCode: string;
    name: string;
    sponsorId: string | null;
    nationalId?: string | null;
    uplineUserId?: string | null;
    placementSide?: "LEFT" | "MIDDLE" | "RIGHT" | null;
    rankCode?: string | null;
    honorTitle?: string | null;
    mobileCenterCode?: string | null;
    joinedAt?: string | null;
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
    referralCode: string;
    name: string;
    sponsorId: string | null;
    nationalId?: string | null;
    uplineUserId?: string | null;
    placementSide?: "LEFT" | "MIDDLE" | "RIGHT" | null;
    rankCode?: string | null;
    honorTitle?: string | null;
    mobileCenterCode?: string | null;
    joinedAt?: string | null;
  } | null>;

  findDirectReferralsByMemberCode(memberCode: string): Promise<{
    member: {
      memberId: string;
      memberCode: string;
      referralCode: string;
      name: string;
      sponsorId: string | null;
    };
    directReferrals: Array<{
      memberId: string;
      memberCode: string;
      referralCode: string;
      name: string;
      sponsorId: string | null;
      childCount: number;
    }>;
  } | null>;

  createMember(input: {
    memberCode?: string | null;
    name?: string | null;
    email?: string;
    phone?: string;
    sponsorId?: string | null;
    sponsorCode?: string | null;
    ref?: string | null;
    password?: string | null;
    lineBinding?: {
      lineUserId: string;
      displayName?: string | null;
      pictureUrl?: string | null;
      statusMessage?: string | null;
      source?: string | null;
    };
  }): Promise<{
    memberId: string;
    memberCode: string;
    referralCode: string;
    name: string;
    sponsorId: string | null;
    temporaryPassword?: string;
  }>;

  updateMemberProfile(
    memberId: string,
    input: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    },
  ): Promise<{
    memberId: string;
    memberCode: string;
    referralCode: string;
    name: string;
    email: string | null;
    phone: string | null;
      sponsorId: string | null;
    }>;

  getMatrixReentryPreference(memberId: string): Promise<boolean>;

  updateMatrixReentryPreference(
    memberId: string,
    enabled: boolean,
  ): Promise<boolean>;

  listShippingAddresses(memberId: string): Promise<
    Array<{
      shippingAddressId: string;
      label: string | null;
      recipientName: string;
      phone: string;
      email: string | null;
      countryCode: string | null;
      countryName: string | null;
      provinceCode: string | null;
      provinceName: string | null;
      districtCode: string | null;
      districtName: string | null;
      subdistrictCode: string | null;
      subdistrictName: string | null;
      postalCode: string | null;
      addressLine: string;
      note: string | null;
      isDefault: boolean;
      createdAt: string;
      updatedAt: string;
    }>
  >;

  createShippingAddress(
    memberId: string,
    input: {
      label?: string | null;
      recipientName: string;
      phone: string;
      email?: string | null;
      countryCode?: string | null;
      countryName?: string | null;
      provinceCode?: string | null;
      provinceName?: string | null;
      districtCode?: string | null;
      districtName?: string | null;
      subdistrictCode?: string | null;
      subdistrictName?: string | null;
      postalCode?: string | null;
      addressLine: string;
      note?: string | null;
      isDefault?: boolean;
    },
  ): Promise<{
    shippingAddressId: string;
    label: string | null;
    recipientName: string;
    phone: string;
    email: string | null;
    countryCode: string | null;
    countryName: string | null;
    provinceCode: string | null;
    provinceName: string | null;
    districtCode: string | null;
    districtName: string | null;
    subdistrictCode: string | null;
    subdistrictName: string | null;
    postalCode: string | null;
    addressLine: string;
    note: string | null;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  }>;

  setDefaultShippingAddress(
    memberId: string,
    shippingAddressId: string,
  ): Promise<{
    shippingAddressId: string;
    isDefault: true;
  }>;

  activateProductCycle(input: {
    memberId: string;
    productDetailId?: string;
    packageId?: string;
    activatedAt?: string;
  }): Promise<{
    cycleId: string;
    memberId: string;
    productDetailId: string;
    cycleNo: number;
    activatedAt: string;
    activeUntil: string;
  }>;

  updateMemberPassword(
    memberId: string,
    newPassword: string,
  ): Promise<{ memberId: string; passwordUpdated: true }>;
}

@Injectable()
export class PrismaMembersRepository implements MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toShippingAddressRecord(address: {
    id: bigint;
    label: string | null;
    recipientName: string;
    phone: string;
    email: string | null;
    countryCode: string | null;
    countryName: string | null;
    provinceCode: string | null;
    provinceName: string | null;
    districtCode: string | null;
    districtName: string | null;
    subdistrictCode: string | null;
    subdistrictName: string | null;
    postalCode: string | null;
    addressLine: string;
    note: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      shippingAddressId: toIdString(address.id),
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      email: address.email,
      countryCode: address.countryCode ?? null,
      countryName: address.countryName ?? null,
      provinceCode: address.provinceCode ?? null,
      provinceName: address.provinceName ?? null,
      districtCode: address.districtCode ?? null,
      districtName: address.districtName ?? null,
      subdistrictCode: address.subdistrictCode ?? null,
      subdistrictName: address.subdistrictName ?? null,
      postalCode: address.postalCode ?? null,
      addressLine: address.addressLine,
      note: address.note,
      isDefault: address.isDefault,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    };
  }

  private async toMemberSummary(
    member: {
      id: bigint;
      memberCode: string;
      referralCode: string | null;
      name: string;
      sponsorId: bigint | null;
      memberProfile?: {
        nationalId: string | null;
        uplineUserId: bigint | null;
        placementSide: "LEFT" | "MIDDLE" | "RIGHT" | null;
        rankCode: string | null;
        honorTitle: string | null;
        mobileCenterCode: string | null;
        joinedAtOverride: Date | null;
      } | null;
    },
  ) {
    return {
      memberId: toIdString(member.id),
      memberCode: member.memberCode,
      referralCode: await this.ensureUserReferralCode(member),
      name: member.name,
      sponsorId: member.sponsorId ? toIdString(member.sponsorId) : null,
      nationalId: member.memberProfile?.nationalId ?? null,
      uplineUserId: member.memberProfile?.uplineUserId
        ? toIdString(member.memberProfile.uplineUserId)
        : null,
      placementSide: member.memberProfile?.placementSide ?? null,
      rankCode: member.memberProfile?.rankCode ?? null,
      honorTitle: member.memberProfile?.honorTitle ?? null,
      mobileCenterCode: member.memberProfile?.mobileCenterCode ?? null,
      joinedAt: member.memberProfile?.joinedAtOverride?.toISOString() ?? null,
    };
  }

  private async ensureUserReferralCode(user: {
    id: bigint;
    referralCode: string | null;
  }): Promise<string> {
    if (user.referralCode) {
      return user.referralCode;
    }

    const referralCode = await this.generateUniqueReferralCode();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { referralCode },
    });
    return referralCode;
  }

  private async generateNextMemberCode(): Promise<string> {
    const result = await this.prisma.$queryRaw<Array<{ next_code: number | bigint }>>`
      SELECT COALESCE(MAX(CAST(SUBSTRING("memberCode" FROM 3) AS INTEGER)), 0) + 1 AS next_code
      FROM "User"
      WHERE "memberCode" ~ '^TH[0-9]{7}$'
    `;

    const nextCode = Number(result[0]?.next_code ?? 1);
    return `TH${String(nextCode).padStart(7, "0")}`;
  }

  private async findMemberCodeSummaryRecord(memberCode: string) {
    const normalizedCode = memberCode.trim();
    const upperCode = normalizedCode.toUpperCase();

    let member = await this.prisma.user.findUnique({
      where: { memberCode: normalizedCode },
      select: {
        id: true,
        memberCode: true,
        referralCode: true,
        name: true,
        sponsorId: true,
        memberProfile: {
          select: {
            nationalId: true,
            uplineUserId: true,
            placementSide: true,
            rankCode: true,
            honorTitle: true,
            mobileCenterCode: true,
            joinedAtOverride: true,
          },
        },
      },
    });

    if (!member && upperCode !== normalizedCode) {
      member = await this.prisma.user.findUnique({
        where: { memberCode: upperCode },
        select: {
          id: true,
          memberCode: true,
          referralCode: true,
          name: true,
          sponsorId: true,
          memberProfile: {
            select: {
              nationalId: true,
              uplineUserId: true,
              placementSide: true,
              rankCode: true,
              honorTitle: true,
              mobileCenterCode: true,
              joinedAtOverride: true,
            },
          },
        },
      });
    }

    if (!member) {
      member = await this.prisma.user.findUnique({
        where: { referralCode: normalizedCode },
        select: {
          id: true,
          memberCode: true,
          referralCode: true,
          name: true,
          sponsorId: true,
          memberProfile: {
            select: {
              nationalId: true,
              uplineUserId: true,
              placementSide: true,
              rankCode: true,
              honorTitle: true,
              mobileCenterCode: true,
              joinedAtOverride: true,
            },
          },
        },
      });
    }

    if (!member && upperCode !== normalizedCode) {
      member = await this.prisma.user.findUnique({
        where: { referralCode: upperCode },
        select: {
          id: true,
          memberCode: true,
          referralCode: true,
          name: true,
          sponsorId: true,
          memberProfile: {
            select: {
              nationalId: true,
              uplineUserId: true,
              placementSide: true,
              rankCode: true,
              honorTitle: true,
              mobileCenterCode: true,
              joinedAtOverride: true,
            },
          },
        },
      });
    }

    if (!member) {
      member = await this.prisma.user.findFirst({
        where: {
          OR: [
            {
              memberCode: {
                equals: normalizedCode,
                mode: "insensitive" as const,
              },
            },
            {
              referralCode: {
                equals: normalizedCode,
                mode: "insensitive" as const,
              },
            },
          ],
        },
        select: {
          id: true,
          memberCode: true,
          referralCode: true,
          name: true,
          sponsorId: true,
          memberProfile: {
            select: {
              nationalId: true,
              uplineUserId: true,
              placementSide: true,
              rankCode: true,
              honorTitle: true,
              mobileCenterCode: true,
              joinedAtOverride: true,
            },
          },
        },
      });
    }

    return member;
  }

  private async findMemberCodeIdRecord(memberCode: string) {
    const normalizedCode = memberCode.trim();
    const upperCode = normalizedCode.toUpperCase();

    let member = await this.prisma.user.findUnique({
      where: { memberCode: normalizedCode },
      select: { id: true },
    });

    if (!member && upperCode !== normalizedCode) {
      member = await this.prisma.user.findUnique({
        where: { memberCode: upperCode },
        select: { id: true },
      });
    }

    if (!member) {
      member = await this.prisma.user.findUnique({
        where: { referralCode: normalizedCode },
        select: { id: true },
      });
    }

    if (!member && upperCode !== normalizedCode) {
      member = await this.prisma.user.findUnique({
        where: { referralCode: upperCode },
        select: { id: true },
      });
    }

    if (!member) {
      member = await this.prisma.user.findFirst({
        where: {
          OR: [
            {
              memberCode: {
                equals: normalizedCode,
                mode: "insensitive" as const,
              },
            },
            {
              referralCode: {
                equals: normalizedCode,
                mode: "insensitive" as const,
              },
            },
          ],
        },
        select: { id: true },
      });
    }

    return member;
  }

  private async generateUniqueReferralCode(): Promise<string> {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const letterPool = [
        letters[Math.floor(Math.random() * letters.length)],
        letters[Math.floor(Math.random() * letters.length)],
      ];
      const digitPool = Array.from({ length: 5 }, () =>
        digits[Math.floor(Math.random() * digits.length)],
      );
      const pattern = ["L", "L", "D", "D", "D", "D", "D"];

      for (let index = pattern.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [pattern[index], pattern[swapIndex]] = [pattern[swapIndex], pattern[index]];
      }

      let letterIndex = 0;
      let digitIndex = 0;
      const referralCode = pattern
        .map((token) => (token === "L" ? letterPool[letterIndex++] : digitPool[digitIndex++]))
        .join("");

      const existing = await this.prisma.user.findUnique({
        where: { referralCode },
        select: { id: true },
      });

      if (!existing) {
        return referralCode;
      }
    }

    throw new Error("Unable to generate referral code.");
  }

  async listMembers(filters?: {
    sponsorId?: string;
    memberCode?: string;
    query?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where = {
      sponsorId: filters?.sponsorId ? BigInt(filters.sponsorId) : undefined,
      memberCode: filters?.memberCode,
      OR: filters?.query
        ? [
            { memberCode: { contains: filters.query, mode: "insensitive" as const } },
            { name: { contains: filters.query, mode: "insensitive" as const } },
          ]
        : undefined,
    };
    const members = await this.prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip:
        filters?.page && filters?.pageSize
          ? (filters.page - 1) * filters.pageSize
          : undefined,
      take: filters?.pageSize ?? 100,
      select: {
        id: true,
        memberCode: true,
        referralCode: true,
        name: true,
        sponsorId: true,
        memberProfile: {
          select: {
            nationalId: true,
            uplineUserId: true,
            placementSide: true,
            rankCode: true,
            honorTitle: true,
            mobileCenterCode: true,
            joinedAtOverride: true,
          },
        },
      },
    });

    const items = await Promise.all(members.map((member) => this.toMemberSummary(member)));

    if (!filters?.page || !filters?.pageSize) {
      return items;
    }

    const total = await this.prisma.user.count({ where });

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async findMemberById(memberId: string): Promise<{
    memberId: string;
    memberCode: string;
    referralCode: string;
    name: string;
    sponsorId: string | null;
    nationalId?: string | null;
    uplineUserId?: string | null;
    placementSide?: "LEFT" | "MIDDLE" | "RIGHT" | null;
    rankCode?: string | null;
    honorTitle?: string | null;
    mobileCenterCode?: string | null;
    joinedAt?: string | null;
  } | null> {
    const member = await this.prisma.user.findUnique({
      where: { id: BigInt(memberId) },
      select: {
        id: true,
        memberCode: true,
        referralCode: true,
        name: true,
        sponsorId: true,
        memberProfile: {
          select: {
            nationalId: true,
            uplineUserId: true,
            placementSide: true,
            rankCode: true,
            honorTitle: true,
            mobileCenterCode: true,
            joinedAtOverride: true,
          },
        },
      },
    });

    return member ? this.toMemberSummary(member) : null;
  }

  async findMemberNetwork(memberId: string) {
    const member = await this.prisma.user.findUnique({
      where: { id: BigInt(memberId) },
      select: { id: true, memberCode: true, referralCode: true, name: true, sponsorId: true },
    });

    if (!member) {
      return null;
    }

    const sponsor = member.sponsorId
      ? await this.prisma.user.findUnique({
          where: { id: member.sponsorId },
          select: { id: true, memberCode: true, referralCode: true, name: true, sponsorId: true },
        })
      : null;
    const directReferrals = await this.prisma.user.findMany({
      where: { sponsorId: member.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      select: { id: true, memberCode: true, referralCode: true, name: true, sponsorId: true },
    });
    const directReferralCount = await this.prisma.user.count({
      where: { sponsorId: member.id },
    });
    const memberReferralCode = await this.ensureUserReferralCode(member);
    const uplineChain: Array<{
      memberId: string;
      memberCode: string;
      referralCode: string;
      name: string;
      sponsorId: string | null;
    }> = [];
    let currentSponsorId = member.sponsorId;

    while (currentSponsorId && uplineChain.length < 10) {
      const upline = await this.prisma.user.findUnique({
        where: { id: currentSponsorId },
        select: { id: true, memberCode: true, referralCode: true, name: true, sponsorId: true },
      });

      if (!upline) {
        break;
      }

      uplineChain.push({
        memberId: toIdString(upline.id),
        memberCode: upline.memberCode,
        referralCode: await this.ensureUserReferralCode(upline),
        name: upline.name,
        sponsorId: upline.sponsorId ? toIdString(upline.sponsorId) : null,
      });
      currentSponsorId = upline.sponsorId;
    }

    return {
      member: {
        memberId: toIdString(member.id),
        memberCode: member.memberCode,
        referralCode: memberReferralCode,
        name: member.name,
        sponsorId: member.sponsorId ? toIdString(member.sponsorId) : null,
      },
      sponsor: sponsor
        ? {
            memberId: toIdString(sponsor.id),
            memberCode: sponsor.memberCode,
            referralCode: await this.ensureUserReferralCode(sponsor),
            name: sponsor.name,
            sponsorId: sponsor.sponsorId ? toIdString(sponsor.sponsorId) : null,
          }
        : null,
      directReferrals: await Promise.all(
        directReferrals.map(async (directReferral) => ({
          memberId: toIdString(directReferral.id),
          memberCode: directReferral.memberCode,
          referralCode: await this.ensureUserReferralCode(directReferral),
          name: directReferral.name,
          sponsorId: directReferral.sponsorId
            ? toIdString(directReferral.sponsorId)
            : null,
        })),
      ),
      directReferralCount,
      uplineChain,
      uplineLevelCount: uplineChain.length,
    };
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
        purchaseBase: true,
        poolRateMode: true,
        poolRate: true,
        poolCapMultiple: true,
        commissionCapScope: true,
        commissionCapMultiple: true,
        earningCap: true,
        earnedTotalInCycle: true,
        dailyPoolPayouts: {
          where: {
            status: "APPROVED",
          },
          select: {
            payoutAmount: true,
          },
        },
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
    referralCode: string;
    name: string;
    sponsorId: string | null;
    nationalId?: string | null;
    uplineUserId?: string | null;
    placementSide?: "LEFT" | "MIDDLE" | "RIGHT" | null;
    rankCode?: string | null;
    honorTitle?: string | null;
    mobileCenterCode?: string | null;
    joinedAt?: string | null;
  } | null> {
    const member = await this.findMemberCodeSummaryRecord(memberCode);

    return member ? this.toMemberSummary(member) : null;
  }

  async findDirectReferralsByMemberCode(memberCode: string) {
    const member = await this.prisma.user.findFirst({
      where: { memberCode: { equals: memberCode, mode: "insensitive" } },
      select: {
        id: true,
        memberCode: true,
        referralCode: true,
        name: true,
        sponsorId: true,
      },
    });

    if (!member) {
      return null;
    }

    const directReferrals = await this.prisma.user.findMany({
      where: { sponsorId: member.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        memberCode: true,
        referralCode: true,
        name: true,
        sponsorId: true,
      },
    });

    const referralsWithCounts = await Promise.all(
      directReferrals.map(async (directReferral) => {
        const childCount = await this.prisma.user.count({
          where: { sponsorId: directReferral.id },
        });

        return {
          memberId: toIdString(directReferral.id),
          memberCode: directReferral.memberCode,
          referralCode: await this.ensureUserReferralCode(directReferral),
          name: directReferral.name,
          sponsorId: directReferral.sponsorId
            ? toIdString(directReferral.sponsorId)
            : null,
          childCount,
        };
      }),
    );

    return {
      member: {
        memberId: toIdString(member.id),
        memberCode: member.memberCode,
        referralCode: await this.ensureUserReferralCode(member),
        name: member.name,
        sponsorId: member.sponsorId ? toIdString(member.sponsorId) : null,
      },
      directReferrals: referralsWithCounts,
    };
  }

  async createMember(input: {
    memberCode?: string | null;
    name?: string | null;
    email?: string;
    phone?: string;
    sponsorId?: string | null;
    sponsorCode?: string | null;
    ref?: string | null;
    password?: string | null;
    lineBinding?: {
      lineUserId: string;
      displayName?: string | null;
      pictureUrl?: string | null;
      statusMessage?: string | null;
      source?: string | null;
    };
  }) {
    let sponsorId = input.sponsorId ? BigInt(input.sponsorId) : null;

    if (!sponsorId && (input.sponsorCode || input.ref)) {
      const sponsor = await this.findMemberCodeIdRecord(
        input.sponsorCode ?? input.ref ?? "",
      );

      if (!sponsor) {
        throw new Error("Sponsor not found.");
      }

      sponsorId = sponsor.id;
    }

    if (!sponsorId) {
      const defaultSponsor = await this.findMemberCodeIdRecord("TH0000001");

      if (defaultSponsor) {
        sponsorId = defaultSponsor.id;
      } else {
        throw new Error("Default sponsor TH0000001 not found.");
      }
    }

    const temporaryPassword =
      input.password && input.password.trim().length > 0
        ? undefined
        : randomUUID().replace(/-/g, "").slice(0, 12);
    const passwordToHash = input.password?.trim() || temporaryPassword!;
    const memberCode = input.memberCode?.trim() || (await this.generateNextMemberCode());
    const referralCode = await this.generateUniqueReferralCode();
    const displayName = input.name?.trim() || memberCode;

    try {
      const member = await this.prisma.$transaction(async (tx) => {
        if (input.lineBinding?.lineUserId) {
          const existingLineBinding = await tx.lineBinding.findUnique({
            where: { lineUserId: input.lineBinding.lineUserId },
            select: { userId: true },
          });

          if (existingLineBinding) {
            throw new ConflictException(
              "LINE account is already connected to another member.",
            );
          }
        }

        const createdMember = await tx.user.create({
          data: {
            memberCode,
            referralCode,
            name: displayName,
            email: input.email ?? null,
            phone: input.phone ?? null,
            passwordHash: hashPassword(passwordToHash),
            sponsorId,
            status: "ACTIVE",
            riskLevel: "NORMAL",
            payoutStatus: "ACTIVE",
          },
        });

        if (input.lineBinding?.lineUserId) {
          await tx.lineBinding.create({
            data: {
              userId: createdMember.id,
              lineUserId: input.lineBinding.lineUserId,
              displayName: input.lineBinding.displayName ?? null,
              pictureUrl: input.lineBinding.pictureUrl ?? null,
              statusMessage: input.lineBinding.statusMessage ?? null,
              source: input.lineBinding.source ?? null,
            },
          });
        }

        return createdMember;
      });

      return {
        memberId: toIdString(member.id),
        memberCode: member.memberCode,
        referralCode,
        name: member.name,
        sponsorId: member.sponsorId ? toIdString(member.sponsorId) : null,
        ...(temporaryPassword ? { temporaryPassword } : {}),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes("lineUserId")
      ) {
        throw new ConflictException(
          "LINE account is already connected to another member.",
        );
      }

      throw error;
    }
  }

  async updateMemberProfile(
    memberId: string,
    input: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    },
  ) {
    const normalizedName =
      input.name === undefined || input.name === null
        ? undefined
        : input.name.trim() || undefined;
    const member = await this.prisma.user.update({
      where: { id: BigInt(memberId) },
      data: {
        name: normalizedName,
        email: input.email === undefined ? undefined : input.email || null,
        phone: input.phone === undefined ? undefined : input.phone || null,
      },
      select: {
        id: true,
        memberCode: true,
        referralCode: true,
        name: true,
        email: true,
        phone: true,
        sponsorId: true,
      },
    });

    return {
      memberId: toIdString(member.id),
      memberCode: member.memberCode,
      referralCode: await this.ensureUserReferralCode(member),
      name: member.name,
      email: member.email,
      phone: member.phone,
      sponsorId: member.sponsorId ? toIdString(member.sponsorId) : null,
    };
  }

  async getMatrixReentryPreference(memberId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(memberId) },
      select: { matrixReentryEnabled: true },
    });

    return user?.matrixReentryEnabled !== false;
  }

  async updateMatrixReentryPreference(
    memberId: string,
    enabled: boolean,
  ): Promise<boolean> {
    const user = await this.prisma.user.update({
      where: { id: BigInt(memberId) },
      data: { matrixReentryEnabled: enabled },
      select: { matrixReentryEnabled: true },
    });

    return user.matrixReentryEnabled !== false;
  }

  async listShippingAddresses(memberId: string) {
    const addresses = await this.prisma.memberShippingAddress.findMany({
      where: { userId: BigInt(memberId) },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
    });

    return addresses.map((address) => this.toShippingAddressRecord(address));
  }

  async createShippingAddress(
    memberId: string,
    input: {
      label?: string | null;
      recipientName: string;
      phone: string;
      email?: string | null;
      countryCode?: string | null;
      countryName?: string | null;
      provinceCode?: string | null;
      provinceName?: string | null;
      districtCode?: string | null;
      districtName?: string | null;
      subdistrictCode?: string | null;
      subdistrictName?: string | null;
      postalCode?: string | null;
      addressLine: string;
      note?: string | null;
      isDefault?: boolean;
    },
  ) {
    const userId = BigInt(memberId);
    const existingCount = await this.prisma.memberShippingAddress.count({
      where: { userId },
    });
    const shouldBeDefault = input.isDefault === true || existingCount === 0;

    const created = await this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.memberShippingAddress.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.memberShippingAddress.create({
        data: {
          userId,
          label: input.label?.trim() || null,
          recipientName: input.recipientName.trim(),
          phone: input.phone.trim(),
          email: input.email?.trim() || null,
          countryCode: input.countryCode?.trim() || null,
          countryName: input.countryName?.trim() || null,
          provinceCode: input.provinceCode?.trim() || null,
          provinceName: input.provinceName?.trim() || null,
          districtCode: input.districtCode?.trim() || null,
          districtName: input.districtName?.trim() || null,
          subdistrictCode: input.subdistrictCode?.trim() || null,
          subdistrictName: input.subdistrictName?.trim() || null,
          postalCode: input.postalCode?.trim() || null,
          addressLine: input.addressLine.trim(),
          note: input.note?.trim() || null,
          isDefault: shouldBeDefault,
        },
      });
    });

    return this.toShippingAddressRecord(created);
  }

  async setDefaultShippingAddress(memberId: string, shippingAddressId: string) {
    const userId = BigInt(memberId);
    const addressId = BigInt(shippingAddressId);
    const address = await this.prisma.memberShippingAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
      select: { id: true },
    });

    if (!address) {
      throw new Error("Shipping address not found.");
    }

    await this.prisma.$transaction([
      this.prisma.memberShippingAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.memberShippingAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    return {
      shippingAddressId,
      isDefault: true as const,
    };
  }

  async activateProductCycle(input: {
    memberId: string;
    productDetailId?: string;
    packageId?: string;
    activatedAt?: string;
  }) {
    const packageSnapshot = input.packageId
      ? await this.prisma.package.findUnique({
          where: { id: BigInt(input.packageId) },
          select: {
            id: true,
            activeDays: true,
            earningCapAmount: true,
            memberPriceUsdt: true,
            priceUsdt: true,
            poolRateMode: true,
            poolRate: true,
            poolCapMultiple: true,
            commissionCapScope: true,
            commissionCapMultiple: true,
            status: true,
          },
        })
      : null;

    if (input.packageId && (!packageSnapshot || packageSnapshot.status !== "ACTIVE")) {
      throw new Error("Package not found.");
    }

    const resolvedProductDetailId = input.productDetailId
      ? input.productDetailId
      : await (async () => {
          if (!input.packageId) {
            return undefined;
          }

          const packageItem = await this.prisma.packageItem.findFirst({
            where: {
              packageId: BigInt(input.packageId),
              package: { status: "ACTIVE" },
              productDetail: { status: "ACTIVE" },
            },
            orderBy: [{ id: "asc" }],
            select: {
              productDetailId: true,
            },
          });

          return packageItem?.productDetailId.toString();
        })();

    const detail = resolvedProductDetailId
      ? await this.prisma.productDetail.findUnique({
          where: { id: BigInt(resolvedProductDetailId) },
          select: {
            id: true,
            activeDays: true,
            earningCapAmount: true,
            memberPriceUsdt: true,
            poolRateMode: true,
            poolRate: true,
            poolCapMultiple: true,
            commissionCapScope: true,
            commissionCapMultiple: true,
          },
        })
      : null;

    if (!detail && !packageSnapshot) {
      throw new Error("Product detail not found.");
    }

    const lastCycle = await this.prisma.memberPackageCycle.findFirst({
      where: { userId: BigInt(input.memberId) },
      orderBy: [{ cycleNo: "desc" }],
      select: { cycleNo: true },
    });

    const activatedAt = input.activatedAt ? new Date(input.activatedAt) : new Date();
    const activeUntil = new Date(activatedAt);
    activeUntil.setUTCDate(
      activeUntil.getUTCDate() +
        Number(detail?.activeDays ?? packageSnapshot?.activeDays ?? 0),
    );

    const cycle = await this.prisma.memberPackageCycle.create({
      data: {
        userId: BigInt(input.memberId),
        packageId: input.packageId ? BigInt(input.packageId) : undefined,
        productDetailId: detail?.id,
        cycleNo: (lastCycle?.cycleNo ?? 0) + 1,
        purchaseBase: detail?.memberPriceUsdt ?? packageSnapshot?.memberPriceUsdt ?? packageSnapshot?.priceUsdt,
        poolRateMode: detail?.poolRateMode ?? packageSnapshot?.poolRateMode,
        poolRate: detail?.poolRate ?? packageSnapshot?.poolRate,
        poolCapMultiple: detail?.poolCapMultiple ?? packageSnapshot?.poolCapMultiple,
        commissionCapScope:
          detail?.commissionCapScope ?? packageSnapshot?.commissionCapScope,
        commissionCapMultiple:
          detail?.commissionCapMultiple ?? packageSnapshot?.commissionCapMultiple,
        activatedAt,
        activeUntil,
        earningCap: detail?.earningCapAmount ?? packageSnapshot?.earningCapAmount ?? "0",
        earnedTotalInCycle: "0",
        earningStatus: "ACTIVE",
        isReceivable: true,
        status: "ACTIVE",
      },
    });

    return {
      cycleId: toIdString(cycle.id),
      memberId: input.memberId,
      productDetailId: resolvedProductDetailId ?? "",
      cycleNo: cycle.cycleNo,
      activatedAt: cycle.activatedAt.toISOString(),
      activeUntil: cycle.activeUntil.toISOString(),
    };
  }

  async updateMemberPassword(memberId: string, newPassword: string) {
    await this.prisma.user.update({
      where: { id: BigInt(memberId) },
      data: { passwordHash: hashPassword(newPassword) },
      select: { id: true },
    });

    return {
      memberId,
      passwordUpdated: true as const,
    };
  }
}
