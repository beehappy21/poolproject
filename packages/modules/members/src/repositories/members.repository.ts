import { ConflictException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { QualificationCycleSnapshot } from "../../../qualification/src/domain/qualification.types";
import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import { toIdString } from "../../../../infrastructure/src/prisma/prisma.mappers";
import { hashPassword } from "../../../../shared/utils/src/password.util";
import {
  addDecimalStrings,
  compareDecimalStrings,
  minDecimalString,
  multiplyDecimalStrings,
  subtractDecimalStrings,
} from "../../../../shared/utils/src/money.util";

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

  findTopLeaderboardBySponsor(
    memberId: string,
    limit?: number,
  ): Promise<
    Array<{
      memberId: string;
      memberCode: string;
      name: string;
      sponsorMemberCode: string | null;
      sponsorName: string | null;
      totalCommission: string;
    }>
  >;

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
    legTotals: {
      DIRECT: number;
      LEFT: number;
      MIDDLE: number;
      RIGHT: number;
    };
  } | null>;

  findSubtreeMemberIdsBySponsorId(memberId: string): Promise<string[]>;

  createMember(input: {
    memberCode?: string | null;
    name?: string | null;
    email?: string;
    phone?: string;
    sponsorId?: string | null;
    sponsorCode?: string | null;
    ref?: string | null;
    placementPreference?: "AUTO" | "LEFT" | "MIDDLE" | "RIGHT" | null;
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

  allocateApprovedOrderPvToCycles(input: {
    memberId: string;
    totalPv: string;
    sourceOrderId: string;
    productDetailId?: string;
    packageId?: string;
    activatedAt?: string;
  }): Promise<{
    affectedCycleIds: string[];
    openedCycleIds: string[];
    totalAllocatedPv: string;
    overflowCycleCount: number;
  }>;

  grantSpecialCommissionCycle(input: {
    memberId: string;
    grantCode: "SPECIAL_100_PV" | "SPECIAL_200_PV";
    reason: string;
    note?: string | null;
    grantedByAdminName?: string | null;
    grantedByAdminEmail?: string | null;
    activatedAt?: string;
  }): Promise<{
    grantId: string;
    cycleId: string;
    memberId: string;
    cycleNo: number;
    memberCode: string;
    grantCode: "SPECIAL_100_PV" | "SPECIAL_200_PV";
    grantedPv: string;
    purchaseBase: string;
    earningCap: string;
    cycleCapTier: "BELOW_200_PV" | "AT_LEAST_200_PV";
    isReceivable: boolean;
    activatedAt: string;
    reason: string;
    note: string | null;
  }>;

  closeLatestSpecialCommissionCycle(input: {
    memberId: string;
    closedByAdminName?: string | null;
    closedByAdminEmail?: string | null;
    closedAt?: string;
  }): Promise<{
    grantId: string;
    cycleId: string;
    memberId: string;
    memberCode: string;
    cycleNo: number;
    grantCode: "SPECIAL_100_PV" | "SPECIAL_200_PV";
    closedAt: string;
    nextReceivableCycleId: string | null;
    nextReceivableCycleNo: number | null;
  }>;

  updateMemberPassword(
    memberId: string,
    newPassword: string,
  ): Promise<{ memberId: string; passwordUpdated: true }>;
}

@Injectable()
export class PrismaMembersRepository implements MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly cycleCapThresholdPv = "200";
  private readonly cycleCapLowerAmount = "5000";
  private readonly cycleCapUpperAmount = "10000";
  private readonly specialCycleLowerPurchaseBase = "650";
  private readonly specialCycleUpperPurchaseBase = "1000";
  private readonly specialCycleActiveDays = 30;

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

  async findTopLeaderboardBySponsor(memberId: string, limit = 10) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        memberId: string;
        memberCode: string;
        name: string;
        sponsorMemberCode: string | null;
        sponsorName: string | null;
        totalCommission: string;
      }>
    >(Prisma.sql`
      with recursive downline as (
        select
          u.id,
          u."memberCode",
          u.name,
          u."sponsorId"
        from "User" u
        where u."sponsorId" = ${BigInt(memberId)}

        union all

        select
          child.id,
          child."memberCode",
          child.name,
          child."sponsorId"
        from "User" child
        inner join downline parent on child."sponsorId" = parent.id
      ),
      commission_totals as (
        select
          cl."beneficiaryUserId" as beneficiary_user_id,
          coalesce(sum(cl."commissionAmount"), 0)::text as total_commission
        from "CommissionLedger" cl
        inner join downline d on d.id = cl."beneficiaryUserId"
        where cl."beneficiaryUserId" is not null
          and cl.status <> 'FALLBACK'
        group by cl."beneficiaryUserId"
      )
      select
        d.id::text as "memberId",
        d."memberCode" as "memberCode",
        d.name as "name",
        sponsor."memberCode" as "sponsorMemberCode",
        sponsor.name as "sponsorName",
        coalesce(ct.total_commission, '0') as "totalCommission"
      from downline d
      inner join commission_totals ct on ct.beneficiary_user_id = d.id
      left join "User" sponsor on sponsor.id = d."sponsorId"
      order by
        coalesce(ct.total_commission, '0')::numeric desc,
        d.id asc
      limit ${Math.max(1, limit)}
    `);

    return rows;
  }

  async findActiveDirectReferralCount(
    memberId: string,
    evaluationAt: string,
  ): Promise<number> {
    void evaluationAt;

    const rows = await this.prisma.$queryRaw<
      Array<{ active_direct_referral_count: bigint | number }>
    >(Prisma.sql`
      select count(*) as active_direct_referral_count
      from "User" u
      where u."sponsorId" = ${BigInt(memberId)}
        and exists (
          select 1
          from "MemberPackageCycle" mpc
          where mpc."userId" = u.id
            and mpc.status = 'ACTIVE'
            and mpc."isReceivable" = true
            and mpc."earningStatus" = 'ACTIVE'
        )
    `);

    return Number(rows[0]?.active_direct_referral_count ?? 0);
  }

  async findCyclesForMember(
    memberId: string,
    evaluationAt: string,
  ): Promise<QualificationCycleSnapshot[]> {
    void evaluationAt;

    const rows = await this.prisma.$queryRaw<
      Array<{
        cycleId: string;
        activatedAt: string;
        activeUntil: string;
        purchaseBase: string;
        poolRateMode: string | null;
        poolRate: string;
        poolCapMultiple: string;
        commissionCapScope: string | null;
        commissionCapMultiple: string;
        earningCap: string;
        earnedTotalInCycle: string;
        poolEarnedToDate: string;
        isReceivable: boolean;
        earningStatus: "active" | "capped";
      }>
    >(Prisma.sql`
      select
        mpc.id::text as "cycleId",
        to_char(mpc."activatedAt" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "activatedAt",
        to_char(mpc."activeUntil" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "activeUntil",
        coalesce(mpc."purchaseBase", 0)::text as "purchaseBase",
        lower(mpc."poolRateMode"::text) as "poolRateMode",
        coalesce(mpc."poolRate", 0)::text as "poolRate",
        coalesce(mpc."poolCapMultiple", 0)::text as "poolCapMultiple",
        lower(mpc."commissionCapScope"::text) as "commissionCapScope",
        coalesce(mpc."commissionCapMultiple", 0)::text as "commissionCapMultiple",
        coalesce(mpc."earningCap", 0)::text as "earningCap",
        coalesce(mpc."earnedTotalInCycle", 0)::text as "earnedTotalInCycle",
        coalesce((
          select sum(dpp."payoutAmount")
          from "DailyPoolPayout" dpp
          where dpp."beneficiaryCycleId" = mpc.id
            and dpp.status = 'APPROVED'
        ), 0)::text as "poolEarnedToDate",
        mpc."isReceivable" as "isReceivable",
        case when mpc."earningStatus" = 'ACTIVE' then 'active' else 'capped' end as "earningStatus"
      from "MemberPackageCycle" mpc
      where mpc."userId" = ${BigInt(memberId)}
        and mpc.status = 'ACTIVE'
      order by mpc."activatedAt" asc, mpc.id asc
    `);

    return rows.map((cycle) => ({
      cycleId: cycle.cycleId,
      activatedAt: cycle.activatedAt,
      activeUntil: cycle.activeUntil,
      purchaseBase: cycle.purchaseBase,
      poolRateMode:
        (cycle.poolRateMode as
          | "default_50_percent"
          | "custom_rate"
          | "disabled"
          | null) ?? undefined,
      poolRate: cycle.poolRate,
      poolCapMultiple: cycle.poolCapMultiple,
      commissionCapScope:
        (cycle.commissionCapScope as "pool_only" | "all_commissions" | null) ?? undefined,
      commissionCapMultiple: cycle.commissionCapMultiple,
      earningCap: cycle.earningCap,
      earnedTotalInCycle: cycle.earnedTotalInCycle,
      poolEarnedToDate: cycle.poolEarnedToDate,
      isReceivable: cycle.isReceivable,
      earningStatus: cycle.earningStatus,
    }));
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
    const rows = await this.prisma.$queryRaw<Array<{ userId: bigint }>>(Prisma.sql`
      select distinct mpc."userId" as "userId"
      from "MemberPackageCycle" mpc
      where mpc.status = 'ACTIVE'
        and mpc."activatedAt" <= (${evaluationAt}::timestamptz at time zone 'UTC')
        and mpc."activeUntil" >= (${evaluationAt}::timestamptz at time zone 'UTC')
    `);

    return rows.map((cycle) => toIdString(cycle.userId));
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

  async findSubtreeMemberIdsBySponsorId(memberId: string): Promise<string[]> {
    const rootId = BigInt(memberId);
    const visited = new Set<string>();
    const queue: bigint[] = [rootId];
    const descendants: string[] = [];

    while (queue.length > 0) {
      const parentIds = queue.splice(0, 200);
      const children = await this.prisma.user.findMany({
        where: {
          sponsorId: { in: parentIds },
        },
        select: { id: true },
      });

      for (const child of children) {
        const childId = toIdString(child.id);
        if (visited.has(childId)) {
          continue;
        }
        visited.add(childId);
        descendants.push(childId);
        queue.push(child.id);
      }
    }

    return descendants;
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
        memberProfile: {
          select: {
            placementSide: true,
          },
        },
      },
    });

    const referralsWithCounts = await Promise.all(
      directReferrals.map(async (directReferral) => {
        const subtreeIds = await this.findSubtreeMemberIdsBySponsorId(
          toIdString(directReferral.id),
        );
        const childCount = subtreeIds.length;

        return {
          memberId: toIdString(directReferral.id),
          memberCode: directReferral.memberCode,
          referralCode: await this.ensureUserReferralCode(directReferral),
          name: directReferral.name,
          sponsorId: directReferral.sponsorId
            ? toIdString(directReferral.sponsorId)
            : null,
          placementSide: directReferral.memberProfile?.placementSide ?? null,
          childCount,
        };
      }),
    );

    const legTotals = {
      DIRECT: referralsWithCounts.length,
      LEFT: 0,
      MIDDLE: 0,
      RIGHT: 0,
    };

    for (const node of referralsWithCounts) {
      const legSize = node.childCount + 1;
      if (node.placementSide === "LEFT") {
        legTotals.LEFT += legSize;
      } else if (node.placementSide === "MIDDLE") {
        legTotals.MIDDLE += legSize;
      } else if (node.placementSide === "RIGHT") {
        legTotals.RIGHT += legSize;
      }
    }

    return {
      member: {
        memberId: toIdString(member.id),
        memberCode: member.memberCode,
        referralCode: await this.ensureUserReferralCode(member),
        name: member.name,
        sponsorId: member.sponsorId ? toIdString(member.sponsorId) : null,
      },
      directReferrals: referralsWithCounts,
      legTotals,
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
    placementPreference?: "AUTO" | "LEFT" | "MIDDLE" | "RIGHT" | null;
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

        const placement = await this.resolvePlacementForNewDirectReferral(
          tx,
          sponsorId!,
          input.placementPreference ?? "AUTO",
        );
        await tx.memberProfile.upsert({
          where: { userId: createdMember.id },
          create: {
            userId: createdMember.id,
            uplineUserId: placement.uplineUserId,
            placementSide: placement.placementSide,
          },
          update: {
            uplineUserId: placement.uplineUserId,
            placementSide: placement.placementSide,
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

  private async resolvePlacementForNewDirectReferral(
    tx: Prisma.TransactionClient,
    sponsorId: bigint,
    placementPreference: "AUTO" | "LEFT" | "MIDDLE" | "RIGHT",
  ): Promise<{
    uplineUserId: bigint;
    placementSide: "LEFT" | "MIDDLE" | "RIGHT";
  }> {
    const directReferrals = await tx.user.findMany({
      where: { sponsorId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        memberCode: true,
        memberProfile: {
          select: {
            placementSide: true,
          },
        },
      },
    });

    const topSides: Array<"LEFT" | "MIDDLE" | "RIGHT"> = [
      "LEFT",
      "MIDDLE",
      "RIGHT",
    ];
    const branchRoots = new Map<"LEFT" | "MIDDLE" | "RIGHT", bigint>();

    for (const directReferral of directReferrals) {
      const side = directReferral.memberProfile?.placementSide;
      if (
        side &&
        (side === "LEFT" || side === "MIDDLE" || side === "RIGHT") &&
        !branchRoots.has(side)
      ) {
        branchRoots.set(side, directReferral.id);
      }
    }

    const missingTopSide = topSides.find((side) => !branchRoots.has(side));

    if (missingTopSide) {
      return {
        uplineUserId: sponsorId,
        placementSide: missingTopSide,
      };
    }

    if (
      placementPreference !== "AUTO" &&
      branchRoots.has(placementPreference)
    ) {
      const targetedPlacement = await this.resolveBinaryBranchPlacement(
        tx,
        branchRoots.get(placementPreference)!,
      );

      return {
        uplineUserId: targetedPlacement.uplineUserId,
        placementSide: targetedPlacement.placementSide,
      };
    }

    const branchScores = await this.loadTopBranchApprovedPvScores(
      tx,
      branchRoots,
    );
    const rankedSides = [...topSides].sort((a, b) => {
      const scoreCompare = compareDecimalStrings(
        branchScores[a] ?? "0",
        branchScores[b] ?? "0",
      );
      if (scoreCompare !== 0) {
        return scoreCompare;
      }

      return topSides.indexOf(a) - topSides.indexOf(b);
    });
    const targetBranchSide = rankedSides[0];
    const targetPlacement = await this.resolveBinaryBranchPlacement(
      tx,
      branchRoots.get(targetBranchSide)!,
    );

    return {
      uplineUserId: targetPlacement.uplineUserId,
      placementSide: targetPlacement.placementSide,
    };
  }

  private async loadTopBranchApprovedPvScores(
    tx: Prisma.TransactionClient,
    branchRoots: Map<"LEFT" | "MIDDLE" | "RIGHT", bigint>,
  ): Promise<Record<"LEFT" | "MIDDLE" | "RIGHT", string>> {
    const defaultScores: Record<"LEFT" | "MIDDLE" | "RIGHT", string> = {
      LEFT: "0",
      MIDDLE: "0",
      RIGHT: "0",
    };

    if (branchRoots.size === 0) {
      return defaultScores;
    }

    const branchSeeds = Array.from(branchRoots.entries()).map(([side, userId]) => {
      return Prisma.sql`select ${side}::text as top_side, ${userId}::bigint as user_id`;
    });

    const rows = await tx.$queryRaw<
      Array<{
        top_side: "LEFT" | "MIDDLE" | "RIGHT";
        total_pv: string;
      }>
    >(Prisma.sql`
      with recursive branch_seed as (
        ${Prisma.join(branchSeeds, " union all ")}
      ),
      branch_tree as (
        select
          bs.top_side,
          bs.user_id
        from branch_seed bs

        union all

        select
          bt.top_side,
          child."userId"
        from branch_tree bt
        inner join "MemberProfile" child
          on child."uplineUserId" = bt.user_id
      )
      select
        bt.top_side,
        coalesce(
          sum(
            case
              when o.status = 'APPROVED' and o."approvalStatus" = 'APPROVED'
                then o."totalPv"
              else 0
            end
          ),
          0
        )::text as total_pv
      from branch_tree bt
      left join "Order" o
        on o."userId" = bt.user_id
      group by bt.top_side
    `);

    for (const row of rows) {
      if (row.top_side === "LEFT" || row.top_side === "MIDDLE" || row.top_side === "RIGHT") {
        defaultScores[row.top_side] = row.total_pv ?? "0";
      }
    }

    return defaultScores;
  }

  private async resolveBinaryBranchPlacement(
    tx: Prisma.TransactionClient,
    startUserId: bigint,
  ): Promise<{
    uplineUserId: bigint;
    placementSide: "LEFT" | "RIGHT";
    path: number[];
  }> {
    const queue: Array<{ userId: bigint; path: number[] }> = [
      { userId: startUserId, path: [] },
    ];

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        break;
      }

      const children = await tx.memberProfile.findMany({
        where: { uplineUserId: current.userId },
        orderBy: [{ user: { memberCode: "asc" } }, { userId: "asc" }],
        select: {
          userId: true,
          placementSide: true,
        },
      });

      const leftChild =
        children.find((child) => child.placementSide === "LEFT") ?? null;
      const rightChild =
        children.find((child) => child.placementSide === "RIGHT") ?? null;

      if (!leftChild) {
        return {
          uplineUserId: current.userId,
          placementSide: "LEFT",
          path: [...current.path, 0],
        };
      }
      if (!rightChild) {
        return {
          uplineUserId: current.userId,
          placementSide: "RIGHT",
          path: [...current.path, 1],
        };
      }

      queue.push({
        userId: leftChild.userId,
        path: [...current.path, 0],
      });
      queue.push({
        userId: rightChild.userId,
        path: [...current.path, 1],
      });
    }

    return {
      uplineUserId: startUserId,
      placementSide: "LEFT",
      path: [0],
    };
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

  private deriveCycleCapState(accumulatedPv: string) {
    const atLeastThreshold =
      compareDecimalStrings(accumulatedPv, this.cycleCapThresholdPv) >= 0;

    return {
      accumulatedPv: atLeastThreshold
        ? this.cycleCapThresholdPv
        : accumulatedPv,
      earningCap: atLeastThreshold
        ? this.cycleCapUpperAmount
        : this.cycleCapLowerAmount,
      cycleCapTier: atLeastThreshold ? "AT_LEAST_200_PV" : "BELOW_200_PV",
      reachedThreshold: atLeastThreshold,
    } as const;
  }

  private resolveSpecialCycleGrantTemplate(
    grantCode: "SPECIAL_100_PV" | "SPECIAL_200_PV",
  ) {
    if (grantCode === "SPECIAL_200_PV") {
      return {
        grantCode,
        grantedPv: this.cycleCapThresholdPv,
        purchaseBase: this.specialCycleUpperPurchaseBase,
      } as const;
    }

    return {
      grantCode,
      grantedPv: "100",
      purchaseBase: this.specialCycleLowerPurchaseBase,
    } as const;
  }

  private async resolveCycleSourceSnapshot(
    tx: Prisma.TransactionClient,
    input: {
      productDetailId?: string;
      packageId?: string;
    },
  ) {
    const packageSnapshot = input.packageId
      ? await tx.package.findUnique({
          where: { id: BigInt(input.packageId) },
          select: {
            id: true,
            activeDays: true,
            earningCapAmount: true,
            memberPriceUsdt: true,
            priceUsdt: true,
            pv: true,
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

          const packageItem = await tx.packageItem.findFirst({
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
      ? await tx.productDetail.findUnique({
          where: { id: BigInt(resolvedProductDetailId) },
          select: {
            id: true,
            activeDays: true,
            earningCapAmount: true,
            memberPriceUsdt: true,
            pv: true,
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

    return {
      packageSnapshot,
      resolvedProductDetailId,
      detail,
    };
  }

  private computeActiveUntil(
    activatedAt: Date,
    activeDays: number | bigint | null | undefined,
  ) {
    const activeUntil = new Date(activatedAt);
    activeUntil.setUTCDate(activeUntil.getUTCDate() + Number(activeDays ?? 0));
    return activeUntil;
  }

  private async normalizeCycleReceivability(
    tx: Prisma.TransactionClient,
    memberId: string,
  ) {
    const cycles = await tx.memberPackageCycle.findMany({
      where: {
        userId: BigInt(memberId),
        status: "ACTIVE",
      },
      orderBy: [{ cycleNo: "asc" }],
      select: {
        id: true,
        earningCap: true,
        purchaseBase: true,
        commissionCapScope: true,
        commissionCapMultiple: true,
        earnedTotalInCycle: true,
        earningStatus: true,
        isReceivable: true,
        readyToReceiveAt: true,
      },
    });

    let firstActiveCycleId: bigint | null = null;

    for (const cycle of cycles) {
      let effectiveCap = cycle.earningCap.toString();

      if (
        cycle.commissionCapScope === "ALL_COMMISSIONS" &&
        compareDecimalStrings(cycle.commissionCapMultiple?.toString() ?? "0", "0") > 0 &&
        compareDecimalStrings(cycle.purchaseBase?.toString() ?? "0", "0") > 0
      ) {
        const commissionCap = minDecimalString(
          effectiveCap,
          multiplyDecimalStrings(
            cycle.purchaseBase?.toString() ?? "0",
            cycle.commissionCapMultiple?.toString() ?? "0",
          ),
        );
        effectiveCap = commissionCap;
      }

      const isCapped =
        compareDecimalStrings(effectiveCap, "0") > 0 &&
        compareDecimalStrings(cycle.earnedTotalInCycle.toString(), effectiveCap) >= 0;

      await tx.memberPackageCycle.update({
        where: { id: cycle.id },
        data: {
          earningStatus: isCapped ? "CAPPED" : "ACTIVE",
          cappedAt: isCapped ? new Date() : null,
        },
      });

      if (!isCapped && firstActiveCycleId === null) {
        firstActiveCycleId = cycle.id;
      }
    }

    for (const cycle of cycles) {
      const shouldReceive = firstActiveCycleId !== null && cycle.id === firstActiveCycleId;
      await tx.memberPackageCycle.update({
        where: { id: cycle.id },
        data: {
          isReceivable: shouldReceive,
          readyToReceiveAt:
            shouldReceive && !cycle.readyToReceiveAt ? new Date() : cycle.readyToReceiveAt,
        },
      });
    }
  }

  async activateProductCycle(input: {
    memberId: string;
    productDetailId?: string;
    packageId?: string;
    activatedAt?: string;
  }) {
    const cycle = await this.prisma.$transaction(async (tx) => {
      const { packageSnapshot, resolvedProductDetailId, detail } =
        await this.resolveCycleSourceSnapshot(tx, input);
      const lastCycle = await tx.memberPackageCycle.findFirst({
        where: { userId: BigInt(input.memberId) },
        orderBy: [{ cycleNo: "desc" }],
        select: { cycleNo: true },
      });
      const existingReceivableCycle = await tx.memberPackageCycle.findFirst({
        where: {
          userId: BigInt(input.memberId),
          status: "ACTIVE",
          earningStatus: "ACTIVE",
          isReceivable: true,
        },
        select: { id: true },
      });

      const activatedAt = input.activatedAt ? new Date(input.activatedAt) : new Date();
      const activeUntil = this.computeActiveUntil(
        activatedAt,
        detail?.activeDays ?? packageSnapshot?.activeDays,
      );
      const sourcePv = detail?.pv?.toString() ?? packageSnapshot?.pv?.toString() ?? "0";
      const capState = this.deriveCycleCapState(
        minDecimalString(sourcePv, this.cycleCapThresholdPv),
      );

      return tx.memberPackageCycle.create({
        data: {
          userId: BigInt(input.memberId),
          packageId: input.packageId ? BigInt(input.packageId) : undefined,
          productDetailId: detail?.id,
          cycleNo: (lastCycle?.cycleNo ?? 0) + 1,
          purchaseBase:
            detail?.memberPriceUsdt ??
            packageSnapshot?.memberPriceUsdt ??
            packageSnapshot?.priceUsdt,
          accumulatedPv: capState.accumulatedPv,
          cycleCapTier: capState.cycleCapTier,
          capThresholdPv: this.cycleCapThresholdPv,
          poolRateMode: detail?.poolRateMode ?? packageSnapshot?.poolRateMode,
          poolRate: detail?.poolRate ?? packageSnapshot?.poolRate,
          poolCapMultiple: detail?.poolCapMultiple ?? packageSnapshot?.poolCapMultiple,
          commissionCapScope:
            detail?.commissionCapScope ?? packageSnapshot?.commissionCapScope,
          commissionCapMultiple:
            detail?.commissionCapMultiple ?? packageSnapshot?.commissionCapMultiple,
          activatedAt,
          activeUntil,
          queuedAt: existingReceivableCycle ? activatedAt : null,
          readyToReceiveAt: existingReceivableCycle ? null : activatedAt,
          capUpgradedAt: capState.reachedThreshold ? activatedAt : null,
          sourceOrderCount: compareDecimalStrings(sourcePv, "0") > 0 ? 1 : 0,
          lastPvAccruedAt: compareDecimalStrings(sourcePv, "0") > 0 ? activatedAt : null,
          earningCap: capState.earningCap,
          earnedTotalInCycle: "0",
          earningStatus: "ACTIVE",
          isReceivable: !existingReceivableCycle,
          status: "ACTIVE",
        },
      });
    });

    return {
      cycleId: toIdString(cycle.id),
      memberId: input.memberId,
      productDetailId: cycle.productDetailId?.toString() ?? "",
      cycleNo: cycle.cycleNo,
      activatedAt: cycle.activatedAt.toISOString(),
      activeUntil: cycle.activeUntil.toISOString(),
    };
  }

  async allocateApprovedOrderPvToCycles(input: {
    memberId: string;
    totalPv: string;
    sourceOrderId: string;
    productDetailId?: string;
    packageId?: string;
    activatedAt?: string;
  }) {
    if (compareDecimalStrings(input.totalPv, "0") <= 0) {
      return {
        affectedCycleIds: [],
        openedCycleIds: [],
        totalAllocatedPv: "0",
        overflowCycleCount: 0,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const { packageSnapshot, detail } = await this.resolveCycleSourceSnapshot(tx, input);
      const activatedAt = input.activatedAt ? new Date(input.activatedAt) : new Date();
      const activeDays = detail?.activeDays ?? packageSnapshot?.activeDays;
      let remainingPv = input.totalPv;
      const affectedCycleIds: string[] = [];
      const openedCycleIds: string[] = [];

      await this.normalizeCycleReceivability(tx, input.memberId);

      let lastCycle = await tx.memberPackageCycle.findFirst({
        where: { userId: BigInt(input.memberId) },
        orderBy: [{ cycleNo: "desc" }],
        select: { cycleNo: true },
      });

      while (compareDecimalStrings(remainingPv, "0") > 0) {
        const accumulatingCycle = await tx.memberPackageCycle.findFirst({
          where: {
            userId: BigInt(input.memberId),
            status: "ACTIVE",
          },
          orderBy: [{ cycleNo: "desc" }],
          select: {
            id: true,
            cycleNo: true,
            accumulatedPv: true,
            isReceivable: true,
          },
        });
        const currentAccumulatedPv =
          accumulatingCycle?.accumulatedPv?.toString() ?? this.cycleCapThresholdPv;
        const remainingCapacity =
          accumulatingCycle &&
          compareDecimalStrings(currentAccumulatedPv, this.cycleCapThresholdPv) < 0
            ? subtractDecimalStrings(this.cycleCapThresholdPv, currentAccumulatedPv)
            : "0";

        if (
          accumulatingCycle &&
          compareDecimalStrings(remainingCapacity, "0") > 0
        ) {
          const allocatedPv = minDecimalString(remainingPv, remainingCapacity);
          const nextAccumulatedPv = addDecimalStrings(currentAccumulatedPv, allocatedPv);
          const capState = this.deriveCycleCapState(nextAccumulatedPv);
          const crossedThreshold =
            compareDecimalStrings(currentAccumulatedPv, this.cycleCapThresholdPv) < 0 &&
            compareDecimalStrings(nextAccumulatedPv, this.cycleCapThresholdPv) >= 0;

          await tx.memberPackageCycle.update({
            where: { id: accumulatingCycle.id },
            data: {
              accumulatedPv: capState.accumulatedPv,
              cycleCapTier: capState.cycleCapTier,
              earningCap: capState.earningCap,
              capUpgradedAt: crossedThreshold ? activatedAt : undefined,
              sourceOrderCount: { increment: 1 },
              lastPvAccruedAt: activatedAt,
              lastSourceOrderId: BigInt(input.sourceOrderId),
            },
          });

          if (!affectedCycleIds.includes(accumulatingCycle.id.toString())) {
            affectedCycleIds.push(accumulatingCycle.id.toString());
          }

          remainingPv = subtractDecimalStrings(remainingPv, allocatedPv);

          continue;
        }

        const allocatedPv = minDecimalString(remainingPv, this.cycleCapThresholdPv);
        const capState = this.deriveCycleCapState(allocatedPv);
        const activeUntil = this.computeActiveUntil(activatedAt, activeDays);
        const previousActiveCycle = await tx.memberPackageCycle.findFirst({
          where: {
            userId: BigInt(input.memberId),
            status: "ACTIVE",
          },
          orderBy: [{ cycleNo: "desc" }],
          select: { id: true },
        });
        const hasExistingActiveCycle = !!previousActiveCycle;
        const newCycle = await tx.memberPackageCycle.create({
          data: {
            userId: BigInt(input.memberId),
            packageId: input.packageId ? BigInt(input.packageId) : undefined,
            productDetailId: detail?.id,
            cycleNo: (lastCycle?.cycleNo ?? 0) + 1,
            purchaseBase:
              detail?.memberPriceUsdt ??
              packageSnapshot?.memberPriceUsdt ??
              packageSnapshot?.priceUsdt,
            accumulatedPv: capState.accumulatedPv,
            carryOverPvIn: hasExistingActiveCycle ? allocatedPv : "0",
            cycleCapTier: capState.cycleCapTier,
            capThresholdPv: this.cycleCapThresholdPv,
            poolRateMode: detail?.poolRateMode ?? packageSnapshot?.poolRateMode,
            poolRate: detail?.poolRate ?? packageSnapshot?.poolRate,
            poolCapMultiple: detail?.poolCapMultiple ?? packageSnapshot?.poolCapMultiple,
            commissionCapScope:
              detail?.commissionCapScope ?? packageSnapshot?.commissionCapScope,
            commissionCapMultiple:
              detail?.commissionCapMultiple ?? packageSnapshot?.commissionCapMultiple,
            activatedAt,
            activeUntil,
            queuedAt: hasExistingActiveCycle ? activatedAt : null,
            readyToReceiveAt: hasExistingActiveCycle ? null : activatedAt,
            capUpgradedAt: capState.reachedThreshold ? activatedAt : null,
            sourceOrderCount: 1,
            lastPvAccruedAt: activatedAt,
            lastSourceOrderId: BigInt(input.sourceOrderId),
            earningCap: capState.earningCap,
            earnedTotalInCycle: "0",
            earningStatus: "ACTIVE",
            isReceivable: !hasExistingActiveCycle,
            status: "ACTIVE",
          },
        });

        affectedCycleIds.push(newCycle.id.toString());
        openedCycleIds.push(newCycle.id.toString());
        lastCycle = { cycleNo: newCycle.cycleNo };

        if (previousActiveCycle) {
          await tx.memberPackageCycle.update({
            where: { id: previousActiveCycle.id },
            data: {
              carryOverPvOut: {
                increment: allocatedPv,
              },
            },
          });
        }

        remainingPv = subtractDecimalStrings(remainingPv, allocatedPv);

        if (compareDecimalStrings(remainingPv, "0") > 0) {
          await tx.memberPackageCycle.update({
            where: { id: newCycle.id },
            data: {
              carryOverPvOut: {
                increment: remainingPv,
              },
            },
          });
        }

      }

      await this.normalizeCycleReceivability(tx, input.memberId);

      return {
        affectedCycleIds,
        openedCycleIds,
        totalAllocatedPv: input.totalPv,
        overflowCycleCount: Math.max(0, openedCycleIds.length - 1),
      };
    });
  }

  async grantSpecialCommissionCycle(input: {
    memberId: string;
    grantCode: "SPECIAL_100_PV" | "SPECIAL_200_PV";
    reason: string;
    note?: string | null;
    grantedByAdminName?: string | null;
    grantedByAdminEmail?: string | null;
    activatedAt?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.user.findUnique({
        where: { id: BigInt(input.memberId) },
        select: {
          id: true,
          memberCode: true,
          isAdmin: true,
        },
      });

      if (!member || member.isAdmin) {
        throw new Error("Member not found.");
      }

      const template = this.resolveSpecialCycleGrantTemplate(input.grantCode);
      const capState = this.deriveCycleCapState(template.grantedPv);
      const activatedAt = input.activatedAt ? new Date(input.activatedAt) : new Date();

      if (Number.isNaN(activatedAt.getTime())) {
        throw new Error("Invalid activatedAt.");
      }

      const lastCycle = await tx.memberPackageCycle.findFirst({
        where: { userId: BigInt(input.memberId) },
        orderBy: [{ cycleNo: "desc" }],
        select: { cycleNo: true },
      });
      const existingReceivableCycle = await tx.memberPackageCycle.findFirst({
        where: {
          userId: BigInt(input.memberId),
          status: "ACTIVE",
          earningStatus: "ACTIVE",
          isReceivable: true,
        },
        select: { id: true },
      });

      const activeUntil = this.computeActiveUntil(
        activatedAt,
        this.specialCycleActiveDays,
      );

      const cycle = await tx.memberPackageCycle.create({
        data: {
          userId: BigInt(input.memberId),
          cycleNo: (lastCycle?.cycleNo ?? 0) + 1,
          purchaseBase: template.purchaseBase,
          accumulatedPv: capState.accumulatedPv,
          carryOverPvIn: "0",
          carryOverPvOut: "0",
          cycleCapTier: capState.cycleCapTier,
          capThresholdPv: this.cycleCapThresholdPv,
          poolRateMode: "DEFAULT_50_PERCENT",
          poolRate: "0",
          poolCapMultiple: "0",
          commissionCapScope: "ALL_COMMISSIONS",
          commissionCapMultiple: "0",
          activatedAt,
          activeUntil,
          queuedAt: existingReceivableCycle ? activatedAt : null,
          readyToReceiveAt: existingReceivableCycle ? null : activatedAt,
          capUpgradedAt: capState.reachedThreshold ? activatedAt : null,
          sourceOrderCount: 0,
          lastPvAccruedAt: activatedAt,
          earningCap: capState.earningCap,
          earnedTotalInCycle: "0",
          earningStatus: "ACTIVE",
          repurchaseRequired: false,
          isReceivable: !existingReceivableCycle,
          status: "ACTIVE",
        },
      });

      const createdGrantRows = await tx.$queryRaw<Array<{ id: bigint }>>(
        Prisma.sql`
          INSERT INTO "SpecialCommissionCycleGrant" (
            "userId",
            "memberPackageCycleId",
            "cycleNo",
            "grantCode",
            "grantedPv",
            "purchaseBase",
            "earningCap",
            "cycleCapTier",
            "reason",
            "note",
            "grantedByAdminName",
            "grantedByAdminEmail",
            "activatedAt",
            "updatedAt"
          )
          VALUES (
            ${BigInt(input.memberId)},
            ${cycle.id},
            ${cycle.cycleNo},
            ${template.grantCode},
            ${template.grantedPv}::decimal,
            ${template.purchaseBase}::decimal,
            ${capState.earningCap}::decimal,
            ${capState.cycleCapTier}::"CycleCapTier",
            ${input.reason.trim()},
            ${input.note?.trim() || null},
            ${input.grantedByAdminName?.trim() || null},
            ${input.grantedByAdminEmail?.trim() || null},
            ${activatedAt},
            NOW()
          )
          RETURNING "id"
        `,
      );
      const grantId = createdGrantRows[0]?.id;

      await this.normalizeCycleReceivability(tx, input.memberId);

      const refreshedCycle = await tx.memberPackageCycle.findUnique({
        where: { id: cycle.id },
        select: {
          id: true,
          cycleNo: true,
          isReceivable: true,
          activatedAt: true,
          earningCap: true,
          purchaseBase: true,
          cycleCapTier: true,
        },
      });

      if (!refreshedCycle) {
        throw new Error("Special commission cycle not found after grant.");
      }

      return {
        grantId: grantId ? toIdString(grantId) : "",
        cycleId: toIdString(refreshedCycle.id),
        memberId: input.memberId,
        cycleNo: refreshedCycle.cycleNo,
        memberCode: member.memberCode,
        grantCode: template.grantCode,
        grantedPv: template.grantedPv,
        purchaseBase: refreshedCycle.purchaseBase?.toString() ?? template.purchaseBase,
        earningCap: refreshedCycle.earningCap.toString(),
        cycleCapTier: refreshedCycle.cycleCapTier,
        isReceivable: refreshedCycle.isReceivable,
        activatedAt: refreshedCycle.activatedAt.toISOString(),
        reason: input.reason.trim(),
        note: input.note?.trim() || null,
      };
    });
  }

  async closeLatestSpecialCommissionCycle(input: {
    memberId: string;
    closedByAdminName?: string | null;
    closedByAdminEmail?: string | null;
    closedAt?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.user.findUnique({
        where: { id: BigInt(input.memberId) },
        select: {
          id: true,
          memberCode: true,
          isAdmin: true,
        },
      });

      if (!member || member.isAdmin) {
        throw new Error("Member not found.");
      }

      const closedAt = input.closedAt ? new Date(input.closedAt) : new Date();

      if (Number.isNaN(closedAt.getTime())) {
        throw new Error("Invalid closedAt.");
      }

      const latestActiveSpecialGrant = await tx.$queryRaw<
        Array<{
          grantId: bigint;
          cycleId: bigint;
          cycleNo: number;
          grantCode: "SPECIAL_100_PV" | "SPECIAL_200_PV";
        }>
      >(Prisma.sql`
        SELECT
          grant.id as "grantId",
          grant."memberPackageCycleId" as "cycleId",
          grant."cycleNo" as "cycleNo",
          grant."grantCode" as "grantCode"
        FROM "SpecialCommissionCycleGrant" grant
        JOIN "MemberPackageCycle" cycle
          ON cycle.id = grant."memberPackageCycleId"
        WHERE grant."userId" = ${BigInt(input.memberId)}
          AND cycle.status = 'ACTIVE'
        ORDER BY grant.id DESC
        LIMIT 1
      `);

      const latestGrant = latestActiveSpecialGrant[0];

      if (!latestGrant) {
        throw new ConflictException(
          "No active special commission cycle found for this member.",
        );
      }

      await tx.memberPackageCycle.update({
        where: { id: latestGrant.cycleId },
        data: {
          status: "CLOSED",
          isReceivable: false,
          closedAt,
        },
      });

      await this.normalizeCycleReceivability(tx, input.memberId);

      const nextReceivableCycle = await tx.memberPackageCycle.findFirst({
        where: {
          userId: BigInt(input.memberId),
          status: "ACTIVE",
          earningStatus: "ACTIVE",
          isReceivable: true,
        },
        orderBy: [{ cycleNo: "asc" }],
        select: {
          id: true,
          cycleNo: true,
        },
      });

      return {
        grantId: toIdString(latestGrant.grantId),
        cycleId: toIdString(latestGrant.cycleId),
        memberId: input.memberId,
        memberCode: member.memberCode,
        cycleNo: latestGrant.cycleNo,
        grantCode: latestGrant.grantCode,
        closedAt: closedAt.toISOString(),
        nextReceivableCycleId: nextReceivableCycle
          ? toIdString(nextReceivableCycle.id)
          : null,
        nextReceivableCycleNo: nextReceivableCycle?.cycleNo ?? null,
      };
    });
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
