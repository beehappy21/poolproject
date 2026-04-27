import { Injectable } from "@nestjs/common";

import { PrismaMembersRepository } from "../repositories/members.repository";
import { QualificationCycleSnapshot } from "../../../qualification/src/domain/qualification.types";

export interface MembersServiceContract {
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

  getMemberNetwork(memberId: string): Promise<{
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

  getMemberCycles(
    memberId: string,
    evaluationAt: string,
  ): Promise<QualificationCycleSnapshot[]>;

  getActiveDirectReferralCount(
    memberId: string,
    evaluationAt: string,
  ): Promise<number>;

  getUplineCandidateIds(
    memberId: string,
    evaluationAt: string,
  ): Promise<string[]>;

  getMemberIdsWithActiveCycles(evaluationAt: string): Promise<string[]>;

  getMember(memberId: string): Promise<{
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

  getMemberByCode(memberCode: string): Promise<{
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

  getDirectReferralsByMemberCode(memberCode: string): Promise<{
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
      placementSide?: "LEFT" | "MIDDLE" | "RIGHT" | null;
      childCount: number;
    }>;
  } | null>;

  getReferralLink(memberCode: string, baseUrl?: string): Promise<{
    memberCode: string;
    sponsorCode: string;
    referralCode: string;
    referralLink: string;
    lineReferralLink: string;
  }>;

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

  resetMemberPassword(
    memberId: string,
    newPassword: string,
  ): Promise<{ memberId: string; passwordUpdated: true }>;
}

@Injectable()
export class MembersService implements MembersServiceContract {
  constructor(
    private readonly membersRepository: PrismaMembersRepository,
  ) {}

  async listMembers(filters?: {
    sponsorId?: string;
    memberCode?: string;
    query?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.membersRepository.listMembers(filters);
  }

  async getMemberNetwork(memberId: string) {
    return this.membersRepository.findMemberNetwork(memberId);
  }

  async getMemberCycles(
    memberId: string,
    evaluationAt: string,
  ): Promise<QualificationCycleSnapshot[]> {
    return this.membersRepository.findCyclesForMember(memberId, evaluationAt);
  }

  async getActiveDirectReferralCount(
    memberId: string,
    evaluationAt: string,
  ): Promise<number> {
    return this.membersRepository.findActiveDirectReferralCount(
      memberId,
      evaluationAt,
    );
  }

  async getUplineCandidateIds(
    memberId: string,
    evaluationAt: string,
  ): Promise<string[]> {
    return this.membersRepository.findUplineCandidateIds(memberId, evaluationAt);
  }

  async getMemberIdsWithActiveCycles(evaluationAt: string): Promise<string[]> {
    return this.membersRepository.findMemberIdsWithActiveCycles(evaluationAt);
  }

  async getMember(memberId: string) {
    return this.membersRepository.findMemberById(memberId);
  }

  async getMemberByCode(memberCode: string) {
    return this.membersRepository.findMemberByCode(memberCode);
  }

  async getDirectReferralsByMemberCode(memberCode: string) {
    return this.membersRepository.findDirectReferralsByMemberCode(memberCode);
  }

  async getReferralLink(memberCode: string, baseUrl = "http://localhost:3000") {
    const member = await this.membersRepository.findMemberByCode(memberCode);

    if (!member) {
      throw new Error("Member not found.");
    }

    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

    return {
      memberCode: member.memberCode,
      sponsorCode: member.memberCode,
      referralCode: member.referralCode,
      referralLink: `${normalizedBaseUrl}/SignUp?ref=${encodeURIComponent(member.referralCode)}`,
      lineReferralLink: `${normalizedBaseUrl}/line/liff/signin?mode=signup&ref=${encodeURIComponent(member.referralCode)}`,
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
    return this.membersRepository.createMember(input);
  }

  async updateMemberProfile(
    memberId: string,
    input: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    },
  ) {
    return this.membersRepository.updateMemberProfile(memberId, input);
  }

  async getMatrixReentryPreference(memberId: string) {
    return this.membersRepository.getMatrixReentryPreference(memberId);
  }

  async updateMatrixReentryPreference(memberId: string, enabled: boolean) {
    return this.membersRepository.updateMatrixReentryPreference(memberId, enabled);
  }

  async listShippingAddresses(memberId: string) {
    return this.membersRepository.listShippingAddresses(memberId);
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
    return this.membersRepository.createShippingAddress(memberId, input);
  }

  async setDefaultShippingAddress(memberId: string, shippingAddressId: string) {
    return this.membersRepository.setDefaultShippingAddress(
      memberId,
      shippingAddressId,
    );
  }

  async activateProductCycle(input: {
    memberId: string;
    productDetailId?: string;
    packageId?: string;
    activatedAt?: string;
  }) {
    return this.membersRepository.activateProductCycle(input);
  }

  async resetMemberPassword(memberId: string, newPassword: string) {
    return this.membersRepository.updateMemberPassword(memberId, newPassword);
  }
}
