# Project Handoff

Updated: 2026-03-22

## Current State

Current local branch:

- `feat/member-profile-import`

Recent merged PRs:

- PR #9: `Add Stephub commission reports and settings UX`
  - https://github.com/beehappy21/poolproject/pull/9
- PR #10: `Add product detail editor flow and commission export wiring`
  - https://github.com/beehappy21/poolproject/pull/10
- PR #11: `Add member003 commission sandbox test kit`
  - https://github.com/beehappy21/poolproject/pull/11

Current local worktree:

- only `HANDOFF_NEXT.md` is modified
- large local dump/workbook noise is hidden with `.git/info/exclude`
- repo `git status` is intentionally clean for day-to-day work

Main working area:

- Stephub admin: `http://127.0.0.1:8001/admin`

## What Is Working

Stephub admin now has working commission areas:

- `Commission Setting`
- `Commission Report`
- `Commission Report > Direct Bonus`
- `Commission Report > Unilevel Bonus`
- `Commission Report > Matrix Bonus`
- `Commission Report > Pool Bonus`

Commission settings behavior:

- main settings page shows latest saved summary
- content-area settings menu is shown only on the main settings page
- `Direct / Unilevel / Pool` pages allow editing and saving rates
- `Matrix` page supports board width, personal PV threshold, board thresholds, board rates, and dynamic board/level rows
- entering `0` is supported for direct/unilevel/matrix arrays

Commission report behavior:

- main report shows daily totals per member
- report modes include:
  - direct
  - unilevel
  - matrix
  - pool
  - overview total
- report pages use Thai labels
- report tables show 2 decimal places
- report pages show totals row and summary cards

Export behavior:

- report page supports `CSV`, `Excel`, and `PDF`
- `CSV` and `Excel` use export cursor/meta flow instead of reusing screen pagination flow
- `PDF` has a guardrail and rejects exports over `500` rows

Product admin behavior:

- product list can open existing editable detail records
- create flow can open without a bound Product model
- product edit/create redirect now uses product detail ids consistently
- commission export route is wired in platform routes

## Important Files

### Commission Settings

- [CommissionSettingsScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionSettingsScreen.php)
- [CommissionSettingsController.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/CommissionSettingsController.php)
- [PoolprojectSettingsStore.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/PoolprojectSettingsStore.php)
- [settings.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/settings.blade.php)

### Commission Reports

- [CommissionReportScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionReportScreen.php)
- [CommissionReportBuilder.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionReportBuilder.php)
- [CommissionReportController.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/CommissionReportController.php)
- [report.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/report.blade.php)
- [report-export-pdf.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/report-export-pdf.blade.php)

### Product Edit Flow

- [ProductDetailRecord.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Models/ProductDetailRecord.php)
- [ProductEditScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Product/ProductEditScreen.php)
- [ProductListScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Product/ProductListScreen.php)

### Routes and Menu

- [PlatformProvider.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/PlatformProvider.php)
- [platform.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/routes/platform.php)

### Commission Sandbox

- [commission_sandbox.md](/Users/macbook/poolproject/docs/technical-design/commission_sandbox.md)
- [commission-sandbox.js](/Users/macbook/poolproject/scripts/commission-sandbox.js)
- [matrix-sandbox.js](/Users/macbook/poolproject/scripts/matrix-sandbox.js)
- [member003-members.json](/Users/macbook/poolproject/scripts/member003-members.json)
- [member003-pv-table.json](/Users/macbook/poolproject/scripts/member003-pv-table.json)
- [run_member003_direct_test.sh](/Users/macbook/poolproject/scripts/run_member003_direct_test.sh)
- [run_member003_matrix_test.sh](/Users/macbook/poolproject/scripts/run_member003_matrix_test.sh)

## Current Report Shape

Main report columns:

- `วันที่`
- `รหัสสมาชิก`
- `ชื่อสมาชิก`
- `โบนัสแนะนำ`
- `พูลโบนัส`
- `ยูนิลีเวล`
- `เมทริกซ์`
- `จำนวนรวม`

Direct / Unilevel columns:

- `วันที่`
- `รหัสสมาชิก`
- `ชื่อสมาชิก`
- `จาก`
- `ชื่อ`
- `ลำดับชั้น`
- `พีวี`
- `เปอร์เซ็นต์`
- `จำนวน`

Matrix columns:

- `วันที่`
- `รหัสสมาชิก`
- `ชื่อสมาชิก`
- `จาก`
- `ชื่อ`
- `บอร์ด`
- `ลำดับชั้น`
- `พีวี`
- `เปอร์เซ็นต์`
- `จำนวน`

Pool columns:

- `วันที่`
- `รหัสสมาชิก`
- `ชื่อสมาชิก`
- `พีวี`
- `เปอร์เซ็นต์`
- `จำนวน`

## Verification Already Done

These were verified during the recent rounds:

- `php -l` on the commission PHP files
- report queries checked against local Postgres data
- detail report modes use DB pagination
- overview uses DB-side union/aggregate pagination
- `CSV` and `Excel` export paths use export cursor/meta flow
- `PDF` export guardrail rejects `> 500` rows
- `bash scripts/run_member003_direct_test.sh`
- `bash scripts/run_member003_matrix_test.sh`
- `PYTHONPYCACHEPREFIX=/tmp/pycache-member003 python3 -m py_compile ...` for the sandbox Python scripts

## What Still Needs Browser Verification

1. Recheck commission pages in browser:
- `/admin/commission/settings`
- `/admin/commission/report`
- `/admin/commission/report/direct`
- `/admin/commission/report/unilevel`
- `/admin/commission/report/matrix`
- `/admin/commission/report/pool`

2. Recheck export in browser:
- `CSV`
- `Excel`
- `PDF`

Especially verify:

- Thai font rendering in PDF
- Excel readability / column widths
- export keeps current filters
- PDF limit message is understandable

## Best Next Steps

1. Browser-smoke the commission report/export flow after the merged changes.

2. Decide whether any remaining UX cleanup is needed in commission report:
- wording
- spacing
- summary card clarity

3. If product admin is next, continue from the editable product detail flow that is already merged.

4. Keep `.git/info/exclude` local-only.
- do not move those dump-ignore rules into repo `.gitignore` unless the team explicitly wants that behavior
