export const QUEUE_NAMES = {
  DEFAULT: "default",
  ORDERS: "orders",
  COMMISSIONS: "commissions",
  POOL: "pool",
  PAYOUTS: "payouts",
  RISK: "risk",
  AUDIT: "audit",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
