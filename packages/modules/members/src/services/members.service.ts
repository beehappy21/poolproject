import { Injectable } from "@nestjs/common";

import { PrismaMembersRepository } from "../repositories/members.repository";

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
        name: string;
        sponsorId: string | null;
      }>
    | {
        items: Array<{
          memberId: string;
          memberCode: string;
          name: string;
          sponsorId: string | null;
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
      name: string;
      sponsorId: string | null;
    };
    sponsor: {
      memberId: string;
      memberCode: string;
      name: string;
      sponsorId: string | null;
    } | null;
    directReferrals: Array<{
      memberId: string;
      memberCode: string;
      name: string;
      sponsorId: string | null;
    }>;
    uplineChain: Array<{
      memberId: string;
      memberCode: string;
      name: string;
      sponsorId: string | null;
    }>;
  } | null>;

  getMemberCycles(
    memberId: string,
    evaluationAt: string,
  ): Promise<
    Array<{
      cycleId: string;
      activatedAt: string;
      activeUntil: string;
      earningCap: string;
      earnedTotalInCycle: string;
      isReceivable: boolean;
      earningStatus: "active" | "capped";
    }>
  >;

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
    name: string;
    sponsorId: string | null;
  } | null>;

  getMemberByCode(memberCode: string): Promise<{
    memberId: string;
    memberCode: string;
    name: string;
    sponsorId: string | null;
  } | null>;

  getReferralLink(memberCode: string, baseUrl?: string): Promise<{
    memberCode: string;
    referralLink: string;
  }>;

  createMember(input: {
    memberCode: string;
    name: string;
    email?: string;
    phone?: string;
    sponsorId?: string | null;
    sponsorCode?: string | null;
    ref?: string | null;
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
  ): Promise<
    Array<{
      cycleId: string;
      activatedAt: string;
      activeUntil: string;
      earningCap: string;
      earnedTotalInCycle: string;
      isReceivable: boolean;
      earningStatus: "active" | "capped";
    }>
  > {
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

  async getReferralLink(memberCode: string, baseUrl = "http://localhost:3000") {
    const member = await this.membersRepository.findMemberByCode(memberCode);

    if (!member) {
      throw new Error("Member not found.");
    }

    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

    return {
      memberCode: member.memberCode,
      referralLink: `${normalizedBaseUrl}/signup?ref=${encodeURIComponent(member.memberCode)}`,
    };
  }

  async createMember(input: {
    memberCode: string;
    name: string;
    email?: string;
    phone?: string;
    sponsorId?: string | null;
    sponsorCode?: string | null;
    ref?: string | null;
  }) {
    return this.membersRepository.createMember(input);
  }

  async activatePackageCycle(input: { memberId: string; packageId: string }) {
    return this.membersRepository.activatePackageCycle(input);
  }

  async resetMemberPassword(memberId: string, newPassword: string) {
    return this.membersRepository.updateMemberPassword(memberId, newPassword);
  }
}
