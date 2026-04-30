export interface CapBucketSummary {
  bucketId: string;
  userId: string;
  sourceOrderId: string | null;
  sourceOrderItemId: string | null;
  memberPackageCycleId: string | null;
  sourceType: string;
  grantIndex: number;
  grantedAmount: string;
  usedByCommission: string;
  reservedByDcw: string;
  usedByDcw: string;
  adjusted: string;
  remaining: string;
  status: "open" | "exhausted" | "reversed" | "cancelled";
  sourceApprovedAt: string | null;
  createdAt: string;
}

export interface CapSummary {
  userId: string;
  totalGranted: string;
  usedByCommission: string;
  reservedByDcw: string;
  usedByDcw: string;
  adjusted: string;
  remaining: string;
  buckets: CapBucketSummary[];
}

export interface CapAllocation {
  bucketId: string;
  amount: string;
  remainingBefore: string;
  remainingAfter: string;
}
