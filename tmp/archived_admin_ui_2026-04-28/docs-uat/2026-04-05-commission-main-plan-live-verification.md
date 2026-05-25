# Commission Main Plan Live Verification

Use this checklist to verify the new `main plan` screens against real database data before business users begin normal operation.

This checklist covers:
- WAP route `/CommissionMainPlan`
- BAO route `/admin/commission-main-plan/report`
- database truth from `CommissionLedger`, `MatrixPayout`, `DailyPoolPayout`, and `CompanyBonusLedger`

## Scope

- WAP screen: [CommissionMainPlan.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/CommissionMainPlan.tsx)
- BAO screen: [CommissionMainPlanReportScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionMainPlanReportScreen.php)
- BAO view: [main-plan-report.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/main-plan-report.blade.php)
- helper script: [check_commission_main_plan_live_data.sh](/Users/macbook/poolproject/scripts/check_commission_main_plan_live_data.sh)

## Preconditions

- Local API is running on `http://127.0.0.1:3000`
- Local WAP is running on `http://127.0.0.1:3001`
- Local BAO is running on `http://127.0.0.1:8001`
- Postgres container `poolproject-postgres` is available
- At least one member exists with real commission data in:
  - `CommissionLedger`
  - `MatrixPayout`
  - `DailyPoolPayout`

## Quick DB Summary

Run:

```bash
bash scripts/check_commission_main_plan_live_data.sh
```

Run for a specific member:

```bash
MEMBER_CODE=MB0001 bash scripts/check_commission_main_plan_live_data.sh
```

Run for a date window:

```bash
DATE_FROM=2026-04-01 DATE_TO=2026-04-05 bash scripts/check_commission_main_plan_live_data.sh
```

## Meaning Of Numbers

### WAP summary cards

- `All Entries`
  - from `AUTH_COMMISSIONS`
  - effectively based on `CommissionLedger` rows returned to the member
- `Approved`
  - count of commission ledger rows that are still counted in the member view
  - excludes `fallback` and `reversed`
- `Fallback`
  - count of `CommissionLedger.status = FALLBACK`
- `Ledger`
  - amount from `CommissionLedger`
  - includes `Direct`, `Unilevel`, and `Cashback` rows that are still counted
- `Matrix`
  - amount from `MatrixPayout`
  - includes statuses `pending`, `approved`, `paid`
- `Pool`
  - amount from `DailyPoolPayout`
  - includes statuses that are still counted in payout flow
- `Latest Approved`
  - latest timestamp found across counted ledger, matrix, and pool rows

### BAO live summary cards

- `Ledger จริง`
  - sum of `CommissionLedger.commissionAmount`
  - commission types: `DIRECT`, `UNI`, `CASHBACK`
- `Matrix จริง`
  - sum of `MatrixPayout.payoutAmount`
- `Pool จริง`
  - sum of `DailyPoolPayout.payoutAmount`
- `Fallback บริษัท`
  - sum of `CompanyBonusLedger.amount`
- `Approved Entries`
  - counted ledger entries only
- `Latest Approved`
  - latest counted timestamp across ledger, matrix, and pool

## Verification Steps

### 1. Verify route availability

- Open `http://127.0.0.1:3001/CommissionMainPlan`
- Confirm the page loads after member login
- Open `http://127.0.0.1:8001/admin/commission-main-plan/report`
- Confirm the BAO login page or report page appears

### 2. Verify WAP summary against database

- Run the helper script
- Compare the following values on WAP:
  - `Ledger`
  - `Matrix`
  - `Pool`
  - `Latest Approved`
- Confirm the WAP values match the DB summary for the same member and date range

### 3. Verify WAP detail cards

- Open `Cashback`
  - confirm rows are from `CommissionLedger.commissionType = CASHBACK`
- Open `Direct`
  - confirm rows are from `CommissionLedger.commissionType = DIRECT`
- Open `Unilevel`
  - confirm rows are from `CommissionLedger.commissionType = UNI`
- Open `Pool`
  - confirm rows are from `DailyPoolPayout`
- Open `Matrix`
  - confirm board layout appears
  - confirm matrix payout panel shows real `MatrixPayout` rows

### 4. Verify BAO summary against database

- Open the BAO report route
- Compare:
  - `Ledger จริง`
  - `Matrix จริง`
  - `Pool จริง`
  - `Fallback บริษัท`
  - `Latest Approved`
- Apply the same date filter in BAO as used in the helper script
- Confirm the card totals align with the SQL output

### 5. Verify BAO overview table

- Check that the overview table still renders daily rows
- Confirm the row totals remain consistent with existing commission report logic
- Confirm the new live summary cards do not replace or corrupt the older overview table

### 6. Verify approved-order basis

- Select a known approved order
- Confirm its related commission appears only after approval
- Confirm the value contributes through:
  - `CommissionLedger`
  - `MatrixPayout`
  - `DailyPoolPayout`
  as applicable
- Confirm pre-approval rows do not appear in the user-visible totals

### 7. Verify fallback handling

- Find a member with at least one fallback record
- Confirm:
  - WAP `Fallback` count reflects fallback ledger entries
  - BAO `Fallback บริษัท` reflects `CompanyBonusLedger`
- Confirm fallback amounts do not inflate normal payable totals

### 8. Verify cancellation and negative balance traceability

- Select a cancelled approved order if available
- Confirm reversal rows are visible in ledger or downstream records
- Confirm any negative commission outcome can still be traced back to the cancelled order in BAO or supporting report outputs

## Expected Pass Criteria

- WAP route works without using the old commission screen
- BAO route works without using the old commission report screen
- WAP summary amounts match the database source for the member under test
- BAO live summary amounts match the database source for the same filter window
- Detail sections show real rows from the correct source tables
- No value is counted twice across display-only overlaps

## Notes

- WAP count cards are member-facing and primarily ledger-count based
- BAO live cards are admin-facing and aggregate across the actual source tables
- When validating totals, always compare using the same:
  - member
  - date range
  - route environment
