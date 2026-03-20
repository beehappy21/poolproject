import { MembersRepository } from "../repositories/members.repository";

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
}

export class MembersService implements MembersServiceContract {
  constructor(private readonly membersRepository: MembersRepository) {}

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
}
