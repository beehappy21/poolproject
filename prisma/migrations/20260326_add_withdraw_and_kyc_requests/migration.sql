CREATE TYPE "WithdrawRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'EXPORTED',
  'PAID'
);

CREATE TYPE "KycRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE "WithdrawRequest" (
  "id" BIGSERIAL NOT NULL,
  "userId" BIGINT NOT NULL,
  "amount" DECIMAL(18,8) NOT NULL DEFAULT 0,
  "bankName" VARCHAR(255) NOT NULL,
  "bankBranch" VARCHAR(255),
  "accountNumber" VARCHAR(100) NOT NULL,
  "accountName" VARCHAR(255) NOT NULL,
  "accountType" VARCHAR(100),
  "taxAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
  "autoSweepAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
  "feeAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
  "netBankAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
  "note" TEXT,
  "status" "WithdrawRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" BIGINT,
  "exportedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WithdrawRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KycRequest" (
  "id" BIGSERIAL NOT NULL,
  "userId" BIGINT NOT NULL,
  "nationalId" VARCHAR(30),
  "bankName" VARCHAR(255),
  "bankBranch" VARCHAR(255),
  "bankAccountNumber" VARCHAR(100),
  "bankAccountName" VARCHAR(255),
  "bankAccountType" VARCHAR(100),
  "personalIdImageUrl" TEXT,
  "bankBookImageUrl" TEXT,
  "selfieImageUrl" TEXT,
  "note" TEXT,
  "status" "KycRequestStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" BIGINT,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KycRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WithdrawRequest_userId_status_requestedAt_idx"
  ON "WithdrawRequest" ("userId", "status", "requestedAt");
CREATE INDEX "WithdrawRequest_status_requestedAt_idx"
  ON "WithdrawRequest" ("status", "requestedAt");
CREATE INDEX "WithdrawRequest_approvedByUserId_idx"
  ON "WithdrawRequest" ("approvedByUserId");

CREATE INDEX "KycRequest_userId_status_submittedAt_idx"
  ON "KycRequest" ("userId", "status", "submittedAt");
CREATE INDEX "KycRequest_status_submittedAt_idx"
  ON "KycRequest" ("status", "submittedAt");
CREATE INDEX "KycRequest_approvedByUserId_idx"
  ON "KycRequest" ("approvedByUserId");

ALTER TABLE "WithdrawRequest"
  ADD CONSTRAINT "WithdrawRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WithdrawRequest"
  ADD CONSTRAINT "WithdrawRequest_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "KycRequest"
  ADD CONSTRAINT "KycRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KycRequest"
  ADD CONSTRAINT "KycRequest_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
