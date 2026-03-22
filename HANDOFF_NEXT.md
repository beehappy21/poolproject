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

- product admin create form improvements were committed and pushed in `3441cf1`
- local worktree still has separate in-progress matrix sandbox / admin files from other parallel work
- large local dump/workbook noise is hidden with `.git/info/exclude`
- repo `git status` is not fully clean right now because of that parallel work

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
- product create/edit now supports supplier/category-assisted product family selection
- product form supports primary image plus gallery images up to `10` total
- PV default formula is `(member price - cost price) x 80%`
- admin can override PV manually with an explicit warning state
- product create smoke test passed
- product update smoke test passed
- commission export route is wired in platform routes

Order transfer and shipping behavior:

- BAO order list supports:
  - `ทั้งหมด`
  - `รอชำระ`
  - `รอตรวจสอบการโอน`
  - `รอจัดส่ง`
  - `จัดส่งแล้ว`
- member app can submit transfer slips from order detail
- BAO order detail shows transfer slip, transfer note, and transfer submitted time
- BAO approval now writes through source `Order` instead of trying to update `stephub_orders_v1`
- BAO order detail supports shipment update fields:
  - tracking number
  - carrier
  - shipment note
- BAO can mark an approved order as shipped from the same order detail page
- app order detail shows shipment status, tracking number, carrier, and shipment note
- compat view `stephub_orders_v1` now includes shipping fields
- order report pages now show summary cards for:
  - total orders
  - total sales amount
  - total PV
- BAO now has `Order Reports` menu with report shortcuts
- order report pages support `CSV` export per current bucket
- order report pages support `CSV`, `Excel`, and `PDF` export per current bucket

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
- [edit-form.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/product/edit-form.blade.php)

### Routes and Menu

- [PlatformProvider.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/PlatformProvider.php)
- [platform.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/routes/platform.php)

### Orders Transfer And Shipping

- [schema.prisma](/Users/macbook/poolproject/prisma/schema.prisma)
- [create_stephub_compat_views.sql](/Users/macbook/poolproject/scripts/migrations/create_stephub_compat_views.sql)
- [auth.controller.ts](/Users/macbook/poolproject/packages/modules/auth/src/controllers/auth.controller.ts)
- [orders.controller.ts](/Users/macbook/poolproject/packages/modules/orders/src/controllers/orders.controller.ts)
- [orders.service.ts](/Users/macbook/poolproject/packages/modules/orders/src/services/orders.service.ts)
- [orders.repository.ts](/Users/macbook/poolproject/packages/modules/orders/src/repositories/orders.repository.ts)
- [Order.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Models/Order.php)
- [OrderSource.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Models/OrderSource.php)
- [OrderListScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Order/OrderListScreen.php)
- [OrderDetailScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Order/OrderDetailScreen.php)
- [OrderReportController.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/OrderReportController.php)
- [report-summary.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/order/report-summary.blade.php)
- [report-export-pdf.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/order/report-export-pdf.blade.php)
- [index.html](/Users/macbook/poolproject/apps/api/public/app/index.html)
- [app.js](/Users/macbook/poolproject/apps/api/public/app/app.js)
- [styles.css](/Users/macbook/poolproject/apps/api/public/app/styles.css)

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
- `php -l` on the latest product admin files
- product create page loads after fixing `stephub_products_v1.id` lookup
- product create smoke test created `ProductDetail.id = 12`
- product update smoke test updated `ProductDetail.id = 12`
- transfer slip smoke flow passed:
  - create order
  - submit transfer slip
  - BAO detail shows slip and allows approve
- shipping smoke flow passed on `Order.id = 260`
  - app order moved to `paid`
  - BAO approve succeeded
  - BAO mark shipped succeeded
  - tracking `TRACK-260-SMOKE` persisted
  - app order detail returned `shippedAt`, `shipmentTrackingNo`, `shipmentCarrier`, and `shipmentNote`
  - BAO shipped bucket includes `Order.id = 260`
- order report summary query returned:
  - `all`: `173` orders, amount `19860`, pv `19860`
  - `shipped`: `1` order, amount `100`, pv `100`
- order report CSV export route returned `text/csv` attachment for bucket `shipped`
- order report `CSV / Excel / PDF` export responses all returned correct attachment content types for bucket `shipped`

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

For product admin, still worth checking manually in browser:

- gallery upload UX with real images
- supplier/category/product-family filtering behavior
- PV auto/manual toggle wording and clarity
- whether to keep or remove smoke product `ProductDetail.id = 12`

## Best Next Steps

1. Browser-smoke the commission report/export flow after the merged changes.

2. Clean up or keep the smoke test product row `ProductDetail.id = 12`.

3. Decide whether to keep or clean up smoke test orders such as `Order.id = 260`.

4. Decide whether any remaining UX cleanup is needed in commission report:
- wording
- spacing
- summary card clarity

5. If product admin continues next, focus on:
- gallery UX polish
- product update/remove follow-up
- whether supplier/category should remain helper-only or become persisted schema fields

6. If orders continue next, likely follow-ups are:
- delivered status action
- shipping report/export
- shipping filters/search polish in BAO

7. Keep `.git/info/exclude` local-only.
- do not move those dump-ignore rules into repo `.gitignore` unless the team explicitly wants that behavior
