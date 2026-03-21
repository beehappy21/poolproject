# Project Handoff

Updated: 2026-03-21

## Current Status

The project now has working local flows for:

- admin login and dashboard
- member signup via referral link
- referral code generation and referral fallback to `TH0000001`
- member profile completion after signup
- package creation, activation, and order processing
- direct commission with multi-level direct rates
- compressed unilevel commission
- matrix cycles, matrix payouts, and wallet posting
- daily pool close and pool payouts
- member wallet, matrix, and payout visibility
- product catalog foundation for supplier/category/product/product detail/package composition

Main verification that currently passes:

- `npm run lint`
- `bash scripts/local-smoke.sh`
- `bash scripts/calc-scenarios.sh`

## Latest Important Change

The latest unfinished feature area is the new product catalog model.

The admin product area has been expanded from a simple `package` form into a catalog flow:

- `supplier`
- `category`
- `product`
- `product detail`
- `package` built from one or more product details

This is now backed by new Prisma models and new `/packages/*` endpoints, and the admin page can create these records.

Important: catalog `% pool` data is stored now, but it is not yet wired into the live pool calculation engine.

## Main Files To Know

### Product Catalog

- `prisma/schema.prisma`
- `packages/modules/packages/src/controllers/packages.controller.ts`
- `packages/modules/packages/src/services/packages.service.ts`
- `packages/modules/packages/src/repositories/packages.repository.ts`
- `apps/api/public/admin/index.html`
- `apps/api/public/admin/app.js`
- `apps/api/public/admin/styles.css`

### Referral / Signup / Member App

- `packages/modules/members/src/controllers/members.controller.ts`
- `packages/modules/members/src/repositories/members.repository.ts`
- `packages/modules/auth/src/controllers/auth.controller.ts`
- `packages/modules/auth/src/repositories/auth.repository.ts`
- `apps/api/public/signup/index.html`
- `apps/api/public/signup/app.js`
- `apps/api/public/app/index.html`
- `apps/api/public/app/app.js`

### Commission / Matrix / Pool

- `packages/modules/commissions/src/services/commissions.service.ts`
- `packages/modules/matrix/src/services/matrix.service.ts`
- `packages/modules/pool/src/services/pool.service.ts`
- `packages/shared/utils/src/commission-settings.util.ts`
- `packages/shared/utils/src/matrix-settings.util.ts`
- `scripts/local-smoke.sh`
- `scripts/calc-scenarios.sh`
- `scripts/calc-scenarios.js`

## Current Product Catalog Data Model

New models added in `prisma/schema.prisma`:

- `Supplier`
- `ProductCategory`
- `Product`
- `ProductDetail`
- `PackageItem`

`Package` now also stores:

- `costPriceUsdt`
- `memberPriceUsdt`
- `retailPriceUsdt`
- `poolRate`
- relation to `PackageItem`

Current package behavior:

- if built from `productDetailItems`, totals are computed from selected details
- `Package.priceUsdt` is currently set from total `memberPriceUsdt`
- existing order flow still works because orders still buy by `packageId`

## New Product Catalog API

Implemented endpoints:

- `GET /packages`
- `POST /packages`
- `GET /packages/suppliers`
- `POST /packages/suppliers`
- `GET /packages/categories`
- `POST /packages/categories`
- `GET /packages/products`
- `POST /packages/products`
- `GET /packages/product-details`
- `POST /packages/product-details`
- `POST /packages/:packageId/status`

Current request rules:

- product detail `poolRate` is sent as decimal `0..1`
- admin UI currently accepts pool as percent and converts before submit
- package creation requires at least one selected product detail in the new builder flow

## Admin UI State

The admin page now has a product catalog section with:

- create supplier form
- create category form
- create product form
- create product detail form
- package builder
- live package preview
- catalog snapshot counters
- package table with:
  - cost
  - member
  - retail
  - PV
  - pool %
  - active days
  - earning cap
  - item count

What works in the UI:

- creating catalog entities in order
- adding product details into package builder
- live preview totals from selected items
- package creation from selected items
- package list rendering with expanded columns

What is still incomplete in the UI:

- no separate tables yet for suppliers, categories, products, product details
- no edit/delete actions for catalog entities
- package clone does not yet reconstruct existing `PackageItem` rows back into the builder

## Referral / Signup Notes

Current member onboarding behavior:

- referral links use `referralCode`, not `memberCode`
- signup accepts `email or phone` plus password
- password rule is alphanumeric, minimum 6 chars
- if no `ref`, sponsor falls back to `TH0000001`
- if `TH0000001` does not exist, signup fails clearly
- signup auto-logs in and redirects to `/app`
- member completes profile later inside `/app`

## Commission / Matrix / Pool Notes

Current status:

- direct commission supports multi-level direct rates
- unilevel still works
- matrix payouts are posted to wallet
- member app exposes matrix and payout history
- commission/matrix/pool consistency fixes were already merged before this round

Open business-rule gap:

- catalog-level `poolRate` is not yet applied to `pool.service.ts`
- current live pool logic still uses existing global pool settings flow

## How To Run

### Lint

```bash
npm run lint
```

### Prisma

```bash
npm run prisma:generate
npm run prisma:push
```

### Local smoke

```bash
bash scripts/local-smoke.sh
```

### Calculation scenarios

```bash
bash scripts/calc-scenarios.sh
```

### Local UI

After API is running:

- admin: `http://127.0.0.1:3000/admin`
- signup: `http://127.0.0.1:3000/signup`
- member app: `http://127.0.0.1:3000/app`

## Important Runtime Notes

- local DB schema has already been pushed successfully for the new catalog models
- Prisma client has already been regenerated successfully
- `runtime/` remains file-backed for settings/session artifacts
- `logs/` and `runtime/` are gitignored

If the API needs to be run interactively and localhost DB access fails in sandbox, the previously working pattern was:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/poolproject?schema=public npm run start:api
```

## What Is Still Not Production-Ready

- product catalog edit/delete lifecycle
- package composition history / full builder reload
- catalog-specific automated smoke coverage
- catalog-specific calc scenarios
- pool calculation driven by package or product-level `poolRate`
- deeper transaction/concurrency hardening
- payout reconciliation lifecycle
- richer role/permission controls

## Best Next Steps

1. Finish the product catalog admin UI.
   - add tables for suppliers, categories, products, product details
   - add prefill or quick-jump actions between catalog levels
   - add package detail breakdown view

2. Extend package read APIs.
   - include `PackageItem` rows in package list/detail responses
   - enable true `Clone to Studio` from existing package composition

3. Lock the business rule for `% pool`.
   - decide whether pool uses `package.poolRate`
   - or weighted aggregation from `productDetail.poolRate`
   - then wire that into live pool funding logic

4. Add verification.
   - extend `scripts/local-smoke.sh` with catalog creation flow
   - add calc or integration scenario for package built from product details

5. Then refine UX.
   - edit/delete/archive states
   - validations and duplicate guards
   - better catalog search/filtering

## Suggested Restart Point

If resuming next round, start here:

1. Open `/admin` and manually verify the new product catalog section.
2. Add list tables for:
   - suppliers
   - categories
   - products
   - product details
3. Extend package API to return `packageItems` so `Clone to Studio` can rebuild a package from saved data.
4. Decide and implement the real `poolRate` business rule.
