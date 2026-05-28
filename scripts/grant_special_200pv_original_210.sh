#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_CONTAINER="${DB_CONTAINER:-poolproject-postgres}"
DB_NAME="${DB_NAME:-poolproject}"
DB_USER="${DB_USER:-postgres}"
REASON="${REASON:-Bulk grant SPECIAL_200_PV for original 210 members}"
NOTE="${NOTE:-200 PV / cap 10,000 / purchase base 1,000}"
ADMIN_NAME="${ADMIN_NAME:-Codex Ops}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"

target_count="$(
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -At -c \
    "select count(*) from \"User\" where \"memberCode\" between 'TH0000001' and 'TH0000210' and coalesce(\"isAdmin\", false)=false;"
)"

if [[ "$target_count" != "210" ]]; then
  echo "Expected 210 target members, found: $target_count" >&2
  exit 1
fi

table_exists="$(
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -At -c \
    "select case when to_regclass('public.\"SpecialCommissionCycleGrant\"') is null then '0' else '1' end;"
)"

if [[ "$table_exists" != "1" ]]; then
  echo "Applying SpecialCommissionCycleGrant migration..."
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
    < "$ROOT_DIR/prisma/migrations/20260519_add_special_commission_cycle_grants/migration.sql"
fi

echo "Granting SPECIAL_200_PV to TH0000001-TH0000210..."
docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" <<SQL
BEGIN;

WITH constants AS (
  SELECT
    NOW() AS activated_at,
    '$REASON'::varchar(255) AS reason,
    NULLIF('$NOTE', '')::text AS note,
    NULLIF('$ADMIN_NAME', '')::varchar(255) AS admin_name,
    NULLIF('$ADMIN_EMAIL', '')::varchar(255) AS admin_email
),
target_members AS (
  SELECT
    u.id AS user_id,
    u."memberCode" AS member_code,
    COALESCE(MAX(mpc."cycleNo"), 0) + 1 AS next_cycle_no
  FROM "User" u
  LEFT JOIN "MemberPackageCycle" mpc ON mpc."userId" = u.id
  WHERE u."memberCode" BETWEEN 'TH0000001' AND 'TH0000210'
    AND COALESCE(u."isAdmin", false) = false
  GROUP BY u.id, u."memberCode"
),
missing_targets AS (
  SELECT tm.*
  FROM target_members tm
  WHERE NOT EXISTS (
    SELECT 1
    FROM "SpecialCommissionCycleGrant" grant_row
    WHERE grant_row."userId" = tm.user_id
      AND grant_row."grantCode" = 'SPECIAL_200_PV'
  )
),
inserted_cycles AS (
  INSERT INTO "MemberPackageCycle" (
    "userId",
    "cycleNo",
    "purchaseBase",
    "accumulatedPv",
    "carryOverPvIn",
    "carryOverPvOut",
    "cycleCapTier",
    "capThresholdPv",
    "poolRateMode",
    "poolRate",
    "poolCapMultiple",
    "commissionCapScope",
    "commissionCapMultiple",
    "activatedAt",
    "activeUntil",
    "readyToReceiveAt",
    "capUpgradedAt",
    "sourceOrderCount",
    "lastPvAccruedAt",
    "earningCap",
    "earnedTotalInCycle",
    "earningStatus",
    "repurchaseRequired",
    "isReceivable",
    "status",
    "createdAt",
    "updatedAt"
  )
  SELECT
    mt.user_id,
    mt.next_cycle_no,
    1000::decimal,
    200::decimal,
    0::decimal,
    0::decimal,
    'AT_LEAST_200_PV'::"CycleCapTier",
    200::decimal,
    'DEFAULT_50_PERCENT'::"PoolRateMode",
    0::decimal,
    0::decimal,
    'ALL_COMMISSIONS'::"CommissionCapScope",
    0::decimal,
    c.activated_at,
    c.activated_at + interval '30 days',
    c.activated_at,
    c.activated_at,
    0,
    c.activated_at,
    10000::decimal,
    0::decimal,
    'ACTIVE'::"EarningStatus",
    false,
    true,
    'ACTIVE'::"CycleStatus",
    c.activated_at,
    c.activated_at
  FROM missing_targets mt
  CROSS JOIN constants c
  RETURNING id, "userId", "cycleNo", "activatedAt"
)
INSERT INTO "SpecialCommissionCycleGrant" (
  "userId",
  "memberPackageCycleId",
  "cycleNo",
  "grantCode",
  "grantedPv",
  "purchaseBase",
  "earningCap",
  "cycleCapTier",
  "reason",
  "note",
  "grantedByAdminName",
  "grantedByAdminEmail",
  "activatedAt",
  "updatedAt"
)
SELECT
  ic."userId",
  ic.id,
  ic."cycleNo",
  'SPECIAL_200_PV',
  200::decimal,
  1000::decimal,
  10000::decimal,
  'AT_LEAST_200_PV'::"CycleCapTier",
  c.reason,
  c.note,
  c.admin_name,
  c.admin_email,
  ic."activatedAt",
  c.activated_at
FROM inserted_cycles ic
CROSS JOIN constants c;

COMMIT;
SQL

echo "Verification:"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT count(*) AS special_200_grant_count
FROM \"SpecialCommissionCycleGrant\"
WHERE \"grantCode\" = 'SPECIAL_200_PV'
  AND \"userId\" IN (
    SELECT id
    FROM \"User\"
    WHERE \"memberCode\" BETWEEN 'TH0000001' AND 'TH0000210'
      AND coalesce(\"isAdmin\", false) = false
  );

SELECT count(*) AS cycle_count
FROM \"MemberPackageCycle\"
WHERE \"userId\" IN (
    SELECT id
    FROM \"User\"
    WHERE \"memberCode\" BETWEEN 'TH0000001' AND 'TH0000210'
      AND coalesce(\"isAdmin\", false) = false
  );

SELECT count(*) AS mismatched_rows
FROM \"SpecialCommissionCycleGrant\" grant_row
JOIN \"MemberPackageCycle\" cycle ON cycle.id = grant_row.\"memberPackageCycleId\"
WHERE grant_row.\"grantCode\" = 'SPECIAL_200_PV'
  AND grant_row.\"userId\" IN (
    SELECT id
    FROM \"User\"
    WHERE \"memberCode\" BETWEEN 'TH0000001' AND 'TH0000210'
      AND coalesce(\"isAdmin\", false) = false
  )
  AND (
    grant_row.\"grantedPv\" <> 200::decimal
    OR grant_row.\"purchaseBase\" <> 1000::decimal
    OR grant_row.\"earningCap\" <> 10000::decimal
    OR grant_row.\"cycleCapTier\" <> 'AT_LEAST_200_PV'::\"CycleCapTier\"
    OR cycle.\"accumulatedPv\" <> 200::decimal
    OR cycle.\"purchaseBase\" <> 1000::decimal
    OR cycle.\"earningCap\" <> 10000::decimal
    OR cycle.\"cycleCapTier\" <> 'AT_LEAST_200_PV'::\"CycleCapTier\"
  );
"
