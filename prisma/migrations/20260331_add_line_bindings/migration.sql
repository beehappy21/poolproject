CREATE TABLE "LineBinding" (
  "id" BIGSERIAL PRIMARY KEY,
  "userId" BIGINT NOT NULL UNIQUE,
  "lineUserId" VARCHAR(255) NOT NULL UNIQUE,
  "displayName" VARCHAR(255),
  "pictureUrl" TEXT,
  "statusMessage" TEXT,
  "source" VARCHAR(100),
  "boundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LineBinding_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LineBinding_lineUserId_idx" ON "LineBinding"("lineUserId");
CREATE INDEX "LineBinding_lastSyncedAt_idx" ON "LineBinding"("lastSyncedAt");
