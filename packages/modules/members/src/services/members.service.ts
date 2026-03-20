import { Injectable } from "@nestjs/common";

import { PrismaMembersRepository } from "../repositories/members.repository";

export interface MembersServiceContract {
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
export class MembersService implements MembersServiceContract {
  constructor(
    private readonly membersRepository: PrismaMembersRepository,
  ) {}

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

  async createMember(input: {
    memberCode: string;
    name: string;
    email?: string;
    phone?: string;
    sponsorId?: string | null;
    sponsorCode?: string | null;
  }) {
    return this.membersRepository.createMember(input);
  }

  async activatePackageCycle(input: { memberId: string; packageId: string }) {
    return this.membersRepository.activatePackageCycle(input);
  }
}
