CREATE TYPE "MatrixAccumulationSourceType" AS ENUM ('ORDER', 'REENTRY');

ALTER TABLE "MatrixCycle"
ADD COLUMN "cwReentryAmount" DECIMAL(18, 8) NOT NULL DEFAULT 0,
ADD COLUMN "currentBoardRoundNo" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "MatrixBoard"
ADD COLUMN "roundNo" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "reentrySourceBoardId" BIGINT;

ALTER TABLE "MatrixPosition"
ADD COLUMN "roundNo" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "MatrixPayout"
ADD COLUMN "roundNo" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "MatrixAccumulationEvent"
ADD COLUMN "sourceType" "MatrixAccumulationSourceType" NOT NULL DEFAULT 'ORDER',
ADD COLUMN "sourceRoundNo" INTEGER;

ALTER TABLE "MatrixBoard"
ADD CONSTRAINT "MatrixBoard_reentrySourceBoardId_fkey"
FOREIGN KEY ("reentrySourceBoardId") REFERENCES "MatrixBoard"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "MatrixBoard_cycleId_boardNo_key";
CREATE UNIQUE INDEX "MatrixBoard_cycleId_boardNo_roundNo_key"
ON "MatrixBoard"("cycleId", "boardNo", "roundNo");
