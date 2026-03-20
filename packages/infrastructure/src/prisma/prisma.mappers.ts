import { QualificationCycleSnapshot } from "../../../modules/qualification/src/domain/qualification.types";

export function toIdString(value: bigint): string {
  return value.toString();
}

export function toDecimalString(value: { toString(): string } | null | undefined): string {
  return value?.toString() ?? "0";
}

export function toIsoString(value: Date | null | undefined): string {
  return value?.toISOString() ?? "";
}

export function toQualificationCycleSnapshot(cycle: {
  id: bigint;
  activatedAt: Date;
  activeUntil: Date;
  earningCap: { toString(): string };
  earnedTotalInCycle: { toString(): string };
  isReceivable: boolean;
  earningStatus: "ACTIVE" | "CAPPED";
}): QualificationCycleSnapshot {
  return {
    cycleId: toIdString(cycle.id),
    activatedAt: toIsoString(cycle.activatedAt),
    activeUntil: toIsoString(cycle.activeUntil),
    earningCap: toDecimalString(cycle.earningCap),
    earnedTotalInCycle: toDecimalString(cycle.earnedTotalInCycle),
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
