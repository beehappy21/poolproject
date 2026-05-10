import { QualificationCycleSnapshot } from "../../../modules/qualification/src/domain/qualification.types";

export function toIdString(value: bigint): string {
  return value.toString();
}

export function toDecimalString(value: { toString(): string } | null | undefined): string {
  return value?.toString() ?? "0";
}

export function toIsoString(value: Date | null | undefined): string {
  if (!value) {
    return "";
  }

  return new Date(
    Date.UTC(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds(),
    ),
  ).toISOString();
}

export function toQualificationCycleSnapshot(cycle: {
  id: bigint;
  activatedAt: Date;
  activeUntil: Date;
  purchaseBase?: { toString(): string } | null;
  poolRateMode?: { toString(): string } | null;
  poolRate?: { toString(): string } | null;
  poolCapMultiple?: { toString(): string } | null;
  commissionCapScope?: { toString(): string } | null;
  commissionCapMultiple?: { toString(): string } | null;
  earningCap: { toString(): string };
  earnedTotalInCycle: { toString(): string };
  dailyPoolPayouts?: Array<{
    payoutAmount: { toString(): string };
  }>;
  isReceivable: boolean;
  earningStatus: "ACTIVE" | "CAPPED";
}): QualificationCycleSnapshot {
  const poolEarnedToDate = (cycle.dailyPoolPayouts ?? []).reduce((total, payout) => {
    const next = Number(total) + Number(toDecimalString(payout.payoutAmount));
    return String(next);
  }, "0");

  return {
    cycleId: toIdString(cycle.id),
    activatedAt: toIsoString(cycle.activatedAt),
    activeUntil: toIsoString(cycle.activeUntil),
    earningCap: toDecimalString(cycle.earningCap),
    earnedTotalInCycle: toDecimalString(cycle.earnedTotalInCycle),
    purchaseBase: toDecimalString(cycle.purchaseBase),
    poolRateMode:
      cycle.poolRateMode?.toString().toLowerCase() as
        | "default_50_percent"
        | "custom_rate"
        | "disabled"
        | undefined,
    poolRate: toDecimalString(cycle.poolRate),
    poolCapMultiple: toDecimalString(cycle.poolCapMultiple),
    commissionCapScope:
      cycle.commissionCapScope?.toString().toLowerCase() as
        | "pool_only"
        | "all_commissions"
        | undefined,
    commissionCapMultiple: toDecimalString(cycle.commissionCapMultiple),
    poolEarnedToDate,
    isReceivable: cycle.isReceivable,
    earningStatus: cycle.earningStatus === "ACTIVE" ? "active" : "capped",
  };
}

export function toApprovedOrderSummary(order: {
  id: bigint;
  userId: bigint;
  approvedAt: Date | null;
  totalPv: { toString(): string };
}) {
  return {
    orderId: toIdString(order.id),
    sourceUserId: toIdString(order.userId),
    approvedAt: toIsoString(order.approvedAt),
    totalPv: toDecimalString(order.totalPv),
  };
}

export function buildUtcDayRange(poolDate: string): { gte: Date; lt: Date } {
  const start = new Date(`${poolDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { gte: start, lt: end };
}
