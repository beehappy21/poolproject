ALTER TABLE "ProductDetail"
ADD COLUMN IF NOT EXISTS "activeDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "earningCapAmount" DECIMAL(18, 8) NOT NULL DEFAULT 0;

ALTER TABLE "MemberPackageCycle"
ADD COLUMN IF NOT EXISTS "productDetailId" BIGINT,
ADD COLUMN IF NOT EXISTS "purchaseBase" DECIMAL(18, 8),
ADD COLUMN IF NOT EXISTS "poolRateMode" "PoolRateMode",
ADD COLUMN IF NOT EXISTS "poolRate" DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS "poolCapMultiple" DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS "commissionCapScope" "CommissionCapScope",
ADD COLUMN IF NOT EXISTS "commissionCapMultiple" DECIMAL(10, 8);

ALTER TABLE "MemberPackageCycle"
ALTER COLUMN "packageId" DROP NOT NULL;

ALTER TABLE "OrderItem"
ALTER COLUMN "packageId" DROP NOT NULL;

UPDATE "ProductDetail" pd
SET
  "activeDays" = COALESCE(src."activeDays", pd."activeDays"),
  "earningCapAmount" = COALESCE(src."earningCapAmount", pd."earningCapAmount")
FROM (
  SELECT DISTINCT ON (pi."productDetailId")
    pi."productDetailId",
    p."activeDays",
    p."earningCapAmount"
  FROM "PackageItem" pi
  JOIN "Package" p ON p."id" = pi."packageId"
  ORDER BY pi."productDetailId", p."createdAt" ASC, p."id" ASC
) src
WHERE src."productDetailId" = pd."id";

UPDATE "MemberPackageCycle" cycle
SET
  "productDetailId" = COALESCE(cycle."productDetailId", src."productDetailId"),
  "purchaseBase" = COALESCE(cycle."purchaseBase", src."memberPriceUsdt", src."priceUsdt"),
  "poolRateMode" = COALESCE(cycle."poolRateMode", src."poolRateMode"),
  "poolRate" = COALESCE(cycle."poolRate", src."poolRate"),
  "poolCapMultiple" = COALESCE(cycle."poolCapMultiple", src."poolCapMultiple"),
  "commissionCapScope" = COALESCE(cycle."commissionCapScope", src."commissionCapScope"),
  "commissionCapMultiple" = COALESCE(cycle."commissionCapMultiple", src."commissionCapMultiple")
FROM (
  SELECT
    p."id" AS "packageId",
    p."memberPriceUsdt",
    p."priceUsdt",
    p."poolRateMode",
    p."poolRate",
    p."poolCapMultiple",
    p."commissionCapScope",
    p."commissionCapMultiple",
    lead_pi."productDetailId"
  FROM "Package" p
  LEFT JOIN LATERAL (
    SELECT pi."productDetailId"
    FROM "PackageItem" pi
    WHERE pi."packageId" = p."id"
    ORDER BY pi."id" ASC
    LIMIT 1
  ) AS lead_pi ON TRUE
) src
WHERE cycle."packageId" = src."packageId";
