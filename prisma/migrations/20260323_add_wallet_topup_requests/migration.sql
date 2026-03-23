CREATE TYPE "WalletTopupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "WalletTopupRequest" (
  "id" BIGSERIAL PRIMARY KEY,
  "userId" BIGINT NOT NULL,
  "amount" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  "paymentMethod" VARCHAR(100) NOT NULL,
  "transferSlipUrl" TEXT,
  "note" TEXT,
  "status" "WalletTopupRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" BIGINT,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "WalletTopupRequest_userId_status_requestedAt_idx"
  ON "WalletTopupRequest" ("userId", "status", "requestedAt");

CREATE INDEX "WalletTopupRequest_status_requestedAt_idx"
  ON "WalletTopupRequest" ("status", "requestedAt");

CREATE INDEX "WalletTopupRequest_approvedByUserId_idx"
  ON "WalletTopupRequest" ("approvedByUserId");

ALTER TABLE "WalletTopupRequest"
  ADD CONSTRAINT "WalletTopupRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WalletTopupRequest"
  ADD CONSTRAINT "WalletTopupRequest_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
