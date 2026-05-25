DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'CycleCapTier'
  ) THEN
    CREATE TYPE "CycleCapTier" AS ENUM ('BELOW_200_PV', 'AT_LEAST_200_PV');
  END IF;
END $$;

ALTER TABLE "MemberPackageCycle"
  ADD COLUMN IF NOT EXISTS "accumulatedPv" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "carryOverPvIn" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "carryOverPvOut" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cycleCapTier" "CycleCapTier" NOT NULL DEFAULT 'BELOW_200_PV',
  ADD COLUMN IF NOT EXISTS "capThresholdPv" DECIMAL(18, 8) NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS "queuedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "readyToReceiveAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "capUpgradedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sourceOrderCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastPvAccruedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastSourceOrderId" BIGINT;

UPDATE "MemberPackageCycle"
SET
  "accumulatedPv" = GREATEST(COALESCE("accumulatedPv", 0), 0),
  "cycleCapTier" = CASE
    WHEN COALESCE("accumulatedPv", 0) >= 200 THEN 'AT_LEAST_200_PV'::"CycleCapTier"
    ELSE 'BELOW_200_PV'::"CycleCapTier"
  END,
  "readyToReceiveAt" = COALESCE("readyToReceiveAt", CASE WHEN "isReceivable" = true THEN "activatedAt" ELSE NULL END);

CREATE INDEX IF NOT EXISTS "MemberPackageCycle_userId_cycleCapTier_earningStatus_idx"
  ON "MemberPackageCycle"("userId", "cycleCapTier", "earningStatus");

CREATE INDEX IF NOT EXISTS "MemberPackageCycle_userId_lastSourceOrderId_idx"
  ON "MemberPackageCycle"("userId", "lastSourceOrderId");
