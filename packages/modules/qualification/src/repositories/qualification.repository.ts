import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import {
  QualificationCycleSnapshot,
  QualificationDecisionInput,
} from "../domain/qualification.types";
import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";

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
            and mpc."activatedAt" <= (${evaluationAt}::timestamptz at time zone 'UTC')
            and mpc."activeUntil" >= (${evaluationAt}::timestamptz at time zone 'UTC')
        )
    `);

    return Number(rows[0]?.active_direct_referral_count ?? 0);
  }

  private async findCyclesAt(
    memberId: string,
    evaluationAt: string,
  ): Promise<QualificationCycleSnapshot[]> {
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
        mpc."isReceivable" as "isReceivable",
        case when mpc."earningStatus" = 'ACTIVE' then 'active' else 'capped' end as "earningStatus"
      from "MemberPackageCycle" mpc
      where mpc."userId" = ${BigInt(memberId)}
        and mpc.status = 'ACTIVE'
        and mpc."activatedAt" <= (${evaluationAt}::timestamptz at time zone 'UTC')
        and mpc."activeUntil" >= (${evaluationAt}::timestamptz at time zone 'UTC')
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
      isReceivable: cycle.isReceivable,
      earningStatus: cycle.earningStatus,
    }));
  }
}
