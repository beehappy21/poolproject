DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'MatrixHoldbackAccountStatus'
  ) THEN
    CREATE TYPE "MatrixHoldbackAccountStatus" AS ENUM (
      'ACCUMULATING',
      'TARGET_REACHED',
      'CONSUMED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'MatrixReorderStatus'
  ) THEN
    CREATE TYPE "MatrixReorderStatus" AS ENUM (
      'PENDING',
      'ORDER_CREATED',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;
END $$;

ALTER TABLE "MatrixPayout"
ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(18, 8) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "holdbackAmount" DECIMAL(18, 8) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "MatrixHoldbackAccount" (
  "id" BIGSERIAL NOT NULL,
  "userId" BIGINT NOT NULL,
  "boardNo" INTEGER NOT NULL,
  "targetRoundNo" INTEGER NOT NULL,
  "accumulatedAmount" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  "targetAmount" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  "status" "MatrixHoldbackAccountStatus" NOT NULL DEFAULT 'ACCUMULATING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MatrixHoldbackAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MatrixReorder" (
  "id" BIGSERIAL NOT NULL,
  "userId" BIGINT NOT NULL,
  "triggerBoardId" BIGINT NOT NULL,
  "holdbackAccountId" BIGINT NOT NULL,
  "generatedOrderId" BIGINT,
  "requiredPv" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  "status" "MatrixReorderStatus" NOT NULL DEFAULT 'PENDING',
  "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MatrixReorder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MatrixHoldbackAccount_userId_boardNo_targetRoundNo_key"
ON "MatrixHoldbackAccount"("userId", "boardNo", "targetRoundNo");

CREATE INDEX IF NOT EXISTS "MatrixHoldbackAccount_userId_status_idx"
ON "MatrixHoldbackAccount"("userId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "MatrixReorder_triggerBoardId_holdbackAccountId_key"
ON "MatrixReorder"("triggerBoardId", "holdbackAccountId");

CREATE INDEX IF NOT EXISTS "MatrixReorder_userId_status_idx"
ON "MatrixReorder"("userId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MatrixHoldbackAccount_userId_fkey'
  ) THEN
    ALTER TABLE "MatrixHoldbackAccount"
    ADD CONSTRAINT "MatrixHoldbackAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MatrixReorder_userId_fkey'
  ) THEN
    ALTER TABLE "MatrixReorder"
    ADD CONSTRAINT "MatrixReorder_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MatrixReorder_triggerBoardId_fkey'
  ) THEN
    ALTER TABLE "MatrixReorder"
    ADD CONSTRAINT "MatrixReorder_triggerBoardId_fkey"
    FOREIGN KEY ("triggerBoardId") REFERENCES "MatrixBoard"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MatrixReorder_holdbackAccountId_fkey'
  ) THEN
    ALTER TABLE "MatrixReorder"
    ADD CONSTRAINT "MatrixReorder_holdbackAccountId_fkey"
    FOREIGN KEY ("holdbackAccountId") REFERENCES "MatrixHoldbackAccount"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MatrixReorder_generatedOrderId_fkey'
  ) THEN
    ALTER TABLE "MatrixReorder"
    ADD CONSTRAINT "MatrixReorder_generatedOrderId_fkey"
    FOREIGN KEY ("generatedOrderId") REFERENCES "Order"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
