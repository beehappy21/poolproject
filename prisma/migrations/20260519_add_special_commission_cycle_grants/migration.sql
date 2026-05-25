CREATE TABLE "SpecialCommissionCycleGrant" (
  "id" BIGSERIAL NOT NULL,
  "userId" BIGINT NOT NULL,
  "memberPackageCycleId" BIGINT,
  "cycleNo" INTEGER NOT NULL,
  "grantCode" VARCHAR(50) NOT NULL,
  "grantedPv" DECIMAL(18, 8) NOT NULL,
  "purchaseBase" DECIMAL(18, 8) NOT NULL,
  "earningCap" DECIMAL(18, 8) NOT NULL,
  "cycleCapTier" "CycleCapTier" NOT NULL,
  "reason" VARCHAR(255) NOT NULL,
  "note" TEXT,
  "grantedByAdminName" VARCHAR(255),
  "grantedByAdminEmail" VARCHAR(255),
  "activatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SpecialCommissionCycleGrant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SpecialCommissionCycleGrant_userId_createdAt_idx"
  ON "SpecialCommissionCycleGrant"("userId", "createdAt");

CREATE INDEX "SpecialCommissionCycleGrant_grantCode_createdAt_idx"
  ON "SpecialCommissionCycleGrant"("grantCode", "createdAt");

CREATE INDEX "SpecialCommissionCycleGrant_memberPackageCycleId_idx"
  ON "SpecialCommissionCycleGrant"("memberPackageCycleId");

ALTER TABLE "SpecialCommissionCycleGrant"
  ADD CONSTRAINT "SpecialCommissionCycleGrant_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "User"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "SpecialCommissionCycleGrant"
  ADD CONSTRAINT "SpecialCommissionCycleGrant_memberPackageCycleId_fkey"
  FOREIGN KEY ("memberPackageCycleId")
  REFERENCES "MemberPackageCycle"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
