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
- PR #12: `feat: integrate Stephub PWA with live package and order flow`
  - https://github.com/beehappy21/poolproject/pull/12
  - merged into `main` as `e66e54b536dc5acd6ab6bccbea2427ab506be554`

Current local worktree:

- product admin create form improvements were committed and pushed in `3441cf1`
- local worktree still has separate in-progress matrix sandbox / admin files from other parallel work
- large local dump/workbook noise is hidden with `.git/info/exclude`
- repo `git status` is not fully clean right now because of that parallel work
- a clean post-merge `main` worktree is available at `/tmp/poolproject-main-clean`
- `/tmp/poolproject-main-clean` is currently checked out at `e66e54b`

Main working area:

- Stephub admin: `http://127.0.0.1:8001/admin`
- Stephub app: `http://127.0.0.1:3001`

Recommended starting point for the next round:

- use `/tmp/poolproject-main-clean` if you need the latest merged code without touching the noisy local worktree
- use `/Users/macbook/poolproject` only when you intentionally need the in-progress local files that were not part of the merge

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
  - `ส่งถึงแล้ว`
- member app can submit transfer slips from order detail
- BAO order detail shows transfer slip, transfer note, and transfer submitted time
- BAO approval now writes through source `Order` instead of trying to update `stephub_orders_v1`
- BAO order detail supports shipment update fields:
  - tracking number
  - carrier
  - shipment note
- BAO can mark an approved order as shipped from the same order detail page
- BAO can mark a shipped order as delivered from the same order detail page
- app order detail shows shipment status, tracking number, carrier, and shipment note
- compat view `stephub_orders_v1` now includes shipping fields
- order report pages now show summary cards for:
  - total orders
  - total sales amount
  - total PV
- BAO now has `Order Reports` menu with report shortcuts
- order report pages support `CSV`, `Excel`, and `PDF` export per current bucket
- shipped bucket now excludes delivered orders
- delivered bucket is available in BAO, API, and order report export

Stephub app behavior:

- sign in now uses the live API and works from the browser app with local CORS enabled
- profile and order history use live member session data
- home, categories, shop, product, cart empty, wishlist empty, and order history empty now use package-oriented copy and live package data
- product detail is package-aware and shows package code, PV, active days, included items, and status
- checkout creates real orders through `/auth/orders`
- shipping and payment info is read from the local store and shown back on checkout
- order success screen shows the real `orderNo`
- order history shows live order states:
  - `Awaiting Payment`
  - `Transfer Review`
  - `Awaiting Shipment`
  - `Shipped`
  - `Delivered`
- order history shows timeline, approval status, submitted slip time, approved time, delivered time, tracking, carrier, and transfer note when available
- member can submit transfer slips from the Stephub app using image upload instead of pasting a URL
- transfer slip images are resized in-browser before upload
- Stephub app `npm run build` is currently clean with no warnings

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

### Stephub App

- [main.ts](/Users/macbook/poolproject/apps/api/src/main.ts)
- [index.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/config/index.tsx)
- [InputField.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/custom/InputField.tsx)
- [BottomTabBar.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/navigation/BottomTabBar.tsx)
- [Header.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/components/Header.tsx)
- [Home.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/tabs/Home.tsx)
- [Categories.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/tabs/Categories.tsx)
- [Shop.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Shop.tsx)
- [Product.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Product.tsx)
- [Checkout.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Checkout.tsx)
- [ShippingAndPaymentInfo.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/ShippingAndPaymentInfo.tsx)
- [OrderHistory.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/OrderHistory.tsx)
- [OrderSuccessful.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/OrderSuccessful.tsx)
- [OrderFailed.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/OrderFailed.tsx)
- [CartEmpty.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/tabs/CartEmpty.tsx)
- [WishlistEmpty.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/tabs/WishlistEmpty.tsx)
- [OrderHistoryEmpty.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/OrderHistoryEmpty.tsx)
- [liveCatalog.ts](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/utils/liveCatalog.ts)
- [paymentSlice.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/store/slices/paymentSlice.tsx)

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
- delivered smoke flow passed on `Order.id = 260`
  - BAO mark delivered succeeded
  - `deliveredAt` persisted to source order and compat view
  - shipment note updated to `Delivered to customer at doorstep`
  - BAO bucket moved from `shipped` to `delivered`
  - app order detail returned `deliveredAt`
- end-to-end sales smoke passed on `Order.id = 262`
  - create order
  - member submit transfer slip
  - admin approve
  - admin mark shipped
  - admin mark delivered
  - app order detail returned `approved / approved`, `shippedAt`, `deliveredAt`
  - API delivered bucket includes `Order.id = 262`
  - API shipped bucket no longer includes `Order.id = 262`
- Stephub app browser smoke passed:
  - sign in at `http://127.0.0.1:3001`
  - browse live packages
  - create order from checkout
  - view order history with live statuses
  - upload transfer slip image from the app
  - BAO received the slip and approval succeeded
- Stephub app `npm run build` now compiles successfully with no warnings
- order report summary query returned:
  - `all`: `173` orders, amount `19860`, pv `19860`
  - `shipped`: `1` order, amount `100`, pv `100`
- order report CSV export route returned `text/csv` attachment for bucket `shipped`
- order report `CSV / Excel / PDF` export responses all returned correct attachment content types for bucket `shipped`

## Deploy Readiness

Current readiness:

- core sales flow is working locally end-to-end
- API health is up on `:3000`
- BAO login is up on `:8001/admin/login`
- BAO order routes and export routes are reachable and protected by auth

Main deployment risks still open:

- Nest side still relies on `prisma db push` flow in [package.json](/Users/macbook/poolproject/package.json)
- compat views must be applied separately from [create_stephub_compat_views.sql](/Users/macbook/poolproject/scripts/migrations/create_stephub_compat_views.sql)
- the compat view script already includes `stephub_orders_v1` and shipping fields, so this SQL step is required for order reporting on a fresh target DB
- BAO env is still local-oriented:
  - `APP_URL=http://127.0.0.1:8001`
  - `FILESYSTEM_DISK=local`
  - `QUEUE_CONNECTION=sync`
  - `SESSION_DRIVER=file`
- BAO `.env` is still using `DB_CONNECTION=sqlite` with a local sqlite path for the Laravel app side
- root API `.env` still points at local Postgres only:
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/poolproject?schema=public`
- BAO mail config still contains placeholder/local values in [backend/.env](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/.env)
- PHP 8.5 deprecation warnings are noisy across the Laravel/Orchid stack
- BAO public storage link is currently missing:
  - [public/storage](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/public/storage)
  - [storage/app/public](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/storage/app/public)

Staging / production checklist:

1. Database
- apply Prisma schema changes on the target DB
- apply compat views from [create_stephub_compat_views.sql](/Users/macbook/poolproject/scripts/migrations/create_stephub_compat_views.sql)
- verify order fields exist:
  - `transferSubmittedAt`
  - `transferSlipUrl`
  - `transferSlipNote`
  - `shippedAt`
  - `deliveredAt`
  - `shipmentTrackingNo`
  - `shipmentCarrier`
  - `shipmentNote`

2. API runtime
- run `npm run build`
- start the API with the built code
- verify `GET /health`
- verify latest routes are loaded:
  - `POST /orders/:id/deliver`
  - order bucket `delivered`

3. BAO runtime
- set real `APP_URL`
- verify session and cookie domain settings
- verify `storage` URLs resolve correctly from BAO
- check BAO login, delivered list, order detail, and order export after deploy

4. Storage and uploads
- decide whether production uses local disk or S3
- verify product image URLs and transfer slip URLs resolve from the final domain
- if using local disk on BAO, verify `storage:link` and public asset serving
- current local state still needs `public/storage` linkage on the BAO side

5. Operational checks
- verify product create/update with real images
- verify one full sales flow on staging:
  - order
  - slip
  - approve
  - shipped
  - delivered
- run `npm run smoke:cashback` if commission, wallet posting, or cashback settings changed
- run `npm run smoke:bao:cashback` if Stephub BAO cashback report/export changed
- verify `CSV / Excel / PDF` exports from BAO after login

6. Cleanup before go-live
- decide whether to keep or remove smoke rows:
  - `ProductDetail.id = 12`
  - `Order.id = 260`
  - `Order.id = 262`
- if cashback smoke created `CASHSMK*` members locally, remove them with `npm run cleanup:cashback-smoke -- --apply`
- decide whether to keep local-only helper data out of deploy docs

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

1. For any new work on merged code, start from `/tmp/poolproject-main-clean` and avoid the noisy root worktree unless needed.

2. Before deploy/staging work, walk through [DEPLOY_CHECKLIST.md](/Users/macbook/poolproject/DEPLOY_CHECKLIST.md) and record which DB/env/storage steps were actually applied.

3. Clean up or keep the smoke test product row `ProductDetail.id = 12`.

4. Decide whether to keep or clean up smoke test orders such as `Order.id = 260` and `Order.id = 262`.

5. Browser-smoke the commission report/export flow after the merged changes.

6. Decide whether any remaining UX cleanup is needed in commission report:
- wording
- spacing
- summary card clarity

7. If product admin continues next, focus on:
- gallery UX polish
- product update/remove follow-up
- whether supplier/category should remain helper-only or become persisted schema fields

8. If orders continue next, likely follow-ups are:
- delivered search/filter polish in BAO
- delivered-specific summary/export review
- optional cleanup of smoke test orders such as `Order.id = 260`

9. Keep `.git/info/exclude` local-only.
- do not move those dump-ignore rules into repo `.gitignore` unless the team explicitly wants that behavior
