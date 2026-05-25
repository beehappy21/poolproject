-- Phase 1 CAP foundation: immutable ledger plus per-source CAP buckets.
-- CAP is intentionally separate from Wallet/FIRM/DCW balances.

CREATE TYPE "CapBucketStatus" AS ENUM ('OPEN', 'EXHAUSTED', 'REVERSED', 'CANCELLED');

CREATE TYPE "CapLedgerMovementType" AS ENUM (
  'GRANT',
  'COMMISSION_COMMIT',
  'DCW_RESERVE',
  'DCW_COMMIT',
  'DCW_RELEASE',
  'ADMIN_ADJUST',
  'REVERSAL'
);

CREATE TYPE "CapLedgerStatus" AS ENUM ('PENDING', 'POSTED', 'REVERSED');

CREATE TABLE "CapBucket" (
  "id" BIGSERIAL PRIMARY KEY,
  "userId" BIGINT NOT NULL,
  "memberPackageCycleId" BIGINT,
  "sourceOrderId" BIGINT,
  "sourceOrderItemId" BIGINT,
  "sourceType" VARCHAR(50) NOT NULL,
  "grantIndex" INTEGER NOT NULL DEFAULT 0,
  "grantedAmount" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  "usedCommissionAmount" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  "reservedDcwAmount" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  "usedDcwAmount" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  "adjustedAmount" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  "status" "CapBucketStatus" NOT NULL DEFAULT 'OPEN',
  "sourceApprovedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CapBucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CapBucket_memberPackageCycleId_fkey" FOREIGN KEY ("memberPackageCycleId") REFERENCES "MemberPackageCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CapBucket_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CapBucket_sourceOrderItemId_fkey" FOREIGN KEY ("sourceOrderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "CapLedger" (
  "id" BIGSERIAL PRIMARY KEY,
  "bucketId" BIGINT,
  "userId" BIGINT NOT NULL,
  "memberPackageCycleId" BIGINT,
  "sourceOrderId" BIGINT,
  "sourceOrderItemId" BIGINT,
  "sourceType" VARCHAR(50) NOT NULL,
  "movementType" "CapLedgerMovementType" NOT NULL,
  "amount" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  "status" "CapLedgerStatus" NOT NULL DEFAULT 'POSTED',
  "relatedOrderId" BIGINT,
  "relatedCommissionLedgerId" BIGINT,
  "actorUserId" BIGINT,
  "idempotencyKey" VARCHAR(150),
  "metadata" JSONB,
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CapLedger_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "CapBucket"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CapLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CapLedger_memberPackageCycleId_fkey" FOREIGN KEY ("memberPackageCycleId") REFERENCES "MemberPackageCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CapLedger_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CapLedger_sourceOrderItemId_fkey" FOREIGN KEY ("sourceOrderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CapLedger_relatedOrderId_fkey" FOREIGN KEY ("relatedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CapLedger_relatedCommissionLedgerId_fkey" FOREIGN KEY ("relatedCommissionLedgerId") REFERENCES "CommissionLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CapLedger_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CapBucket_sourceOrderItemId_grantIndex_key" ON "CapBucket"("sourceOrderItemId", "grantIndex");
CREATE UNIQUE INDEX "CapLedger_idempotencyKey_key" ON "CapLedger"("idempotencyKey");
CREATE INDEX "CapBucket_userId_status_sourceApprovedAt_id_idx" ON "CapBucket"("userId", "status", "sourceApprovedAt", "id");
CREATE INDEX "CapBucket_sourceOrderId_idx" ON "CapBucket"("sourceOrderId");
CREATE INDEX "CapBucket_memberPackageCycleId_idx" ON "CapBucket"("memberPackageCycleId");
CREATE INDEX "CapLedger_bucketId_status_idx" ON "CapLedger"("bucketId", "status");
CREATE INDEX "CapLedger_userId_createdAt_idx" ON "CapLedger"("userId", "createdAt");
CREATE INDEX "CapLedger_sourceOrderId_idx" ON "CapLedger"("sourceOrderId");
CREATE INDEX "CapLedger_relatedOrderId_idx" ON "CapLedger"("relatedOrderId");
CREATE INDEX "CapLedger_relatedCommissionLedgerId_idx" ON "CapLedger"("relatedCommissionLedgerId");
CREATE INDEX "CapLedger_movementType_status_idx" ON "CapLedger"("movementType", "status");
