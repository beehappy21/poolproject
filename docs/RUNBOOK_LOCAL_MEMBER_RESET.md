# Runbook: Local Reset for Member Plan Rebuild

## Purpose
Reset local data so we can rebuild member plan logic (2-leg/3-leg), starting from a clean baseline.

Target outcomes:
- Remove existing non-admin members and sales/commission/wallet runtime data.
- Re-import members from `member003.xlsx`.
- Reconcile member identity so `memberCode = id` for all non-admin users.

## Scope and Safety
- Local only.
- This is destructive for member and sales runtime data.
- BAO admin users are kept (`User.isAdmin = true`).

## Prerequisites
1. Local Postgres container is running (`poolproject-postgres` by default).
2. `DATABASE_URL` points to local DB (or use script default).
3. File `member003.xlsx` exists at repo root.

## Step 0: Optional local backup
```bash
npm run dev:backup
```

## Step 1: Dry-run preflight (no write)
```bash
npm run reset:local:members-sales
```

This prints counts for:
- total/non-admin users
- orders/order items
- wallet transactions
- topup/withdraw requests
- line bindings

## Step 2: Apply destructive reset
```bash
npm run reset:local:members-sales:apply
```

What this does:
- Deletes sales/commission/wallet/matrix/workflow runtime tables.
- Deletes `LineBinding` and `MemberProfile`.
- Deletes all non-admin users.
- Resets key identity sequences.

## Step 3: Import member003 baseline
Dry-run first:
```bash
npm run seed:members:member003
```

Apply:
```bash
npm run seed:members:member003:apply
```

Notes:
- Uses `scripts/seed_members_from_xlsx.mjs`.
- Sponsor links are restored from the workbook where possible.

## Step 4: Reconcile memberCode with id
Dry-run first:
```bash
npm run reconcile:member-code:id
```

Apply:
```bash
npm run reconcile:member-code:id:apply
```

This updates non-admin users:
- `memberCode = id::text`
- `referralCode = memberCode`

## Step 5: Validation SQL checks
Run in psql:
```sql
select count(*) as non_admin_users
from public."User"
where coalesce("isAdmin", false) = false;

select count(*) as membercode_mismatch
from public."User"
where coalesce("isAdmin", false) = false
  and "memberCode" is distinct from "id"::text;

select count(*) as orders_left from public."Order";
select count(*) as order_items_left from public."OrderItem";
select count(*) as wallet_tx_left from public."WalletTransaction";
```

Expected:
- `non_admin_users` matches imported member target (for member003, expected 210 if file unchanged).
- `membercode_mismatch = 0`.
- Sales runtime counts are expected to restart from clean state.

## Rollback
If result is not correct:
1. Stop writes.
2. Restore local backup created in Step 0.
3. Re-run from Step 1 after fixing input/script assumptions.

## Important Assumptions
- We preserve admin users intentionally.
- We do not reset catalog/product config tables in this runbook.
- We use local defaults: container `poolproject-postgres`, DB `poolproject`.
