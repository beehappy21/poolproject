CREATE TABLE IF NOT EXISTS "MemberShippingAddress" (
  "id" BIGSERIAL NOT NULL,
  "userId" BIGINT NOT NULL,
  "label" VARCHAR(100),
  "recipientName" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(50) NOT NULL,
  "email" VARCHAR(255),
  "countryCode" VARCHAR(10),
  "countryName" VARCHAR(100),
  "provinceCode" VARCHAR(20),
  "provinceName" VARCHAR(255),
  "districtCode" VARCHAR(20),
  "districtName" VARCHAR(255),
  "subdistrictCode" VARCHAR(20),
  "subdistrictName" VARCHAR(255),
  "postalCode" VARCHAR(20),
  "addressLine" TEXT NOT NULL,
  "note" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MemberShippingAddress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MemberShippingAddress_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MemberShippingAddress_userId_isDefault_idx"
  ON "MemberShippingAddress"("userId", "isDefault");

CREATE INDEX IF NOT EXISTS "MemberShippingAddress_userId_createdAt_idx"
  ON "MemberShippingAddress"("userId", "createdAt");

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "shippingAddressId" BIGINT,
  ADD COLUMN IF NOT EXISTS "shippingLabel" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "shippingRecipientName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "shippingPhone" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "shippingEmail" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "shippingCountryCode" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "shippingCountryName" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "shippingProvinceCode" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "shippingProvinceName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "shippingDistrictCode" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "shippingDistrictName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "shippingSubdistrictCode" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "shippingSubdistrictName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "shippingPostalCode" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "shippingAddressLine" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingAddressNote" TEXT;

CREATE INDEX IF NOT EXISTS "Order_shippingAddressId_idx"
  ON "Order"("shippingAddressId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Order_shippingAddressId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_shippingAddressId_fkey"
      FOREIGN KEY ("shippingAddressId") REFERENCES "MemberShippingAddress"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
