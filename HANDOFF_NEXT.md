# Project Handoff

Updated: 2026-03-24

## Current State

Current local branch:

- `main`

Current local status:

- local `main` is synced with `origin/main`
- latest synced commit is `5575dc0`
- `git status` is clean before this handoff update
- current working tree now includes local dev-start tooling updates and storefront load-state safeguards

Main working area:

- Stephub admin: `http://127.0.0.1:8001/admin`
- Stephub app: `http://localhost:3002`
- API: `http://127.0.0.1:3000`

Default local-start flow:

- run `npm run dev:up`
- if ports/watchers are stale, run `npm run dev:restart`
- run `npm run dev:check`
- use this flow as the default before reviewing storefront/profile UI so the app, BAO, API, DB, and seed data come up in a predictable state

Recent merged PRs:

- PR #20: `Add manual payment settings and order QR flow`
- PR #21: `Add pickup and multi-package order flow`
- PR #22: `Polish BAO order shipment screens`
- PR #23: `Enrich package catalog product details`
- PR #24: `Polish Stephub storefront copy`
- PR #25: `Shift storefront toward product-first browsing`
- PR #26: `Extend product-first storefront order flow`
  - https://github.com/beehappy21/poolproject/pull/26
  - merged into `main` as `1aebf6ad6b29626b1da0167c341c3d93e0a87c35`
- PR #27: `Restore Stephub home and product design`
  - https://github.com/beehappy21/poolproject/pull/27
  - merged into `main` as `5575dc082b42ae265470c51f0486aab17c87065e`

## What Changed In PR #26

PR #26 pushed the product-first migration further without removing the package bridge underneath.

Backend:

- added public product aliases under:
  - `/products`
  - `/products/suppliers`
  - `/products/categories`
  - `/products/details`
  - `/products/storefront`
- storefront catalog can now read from `ProductDetail` via product-first API routes
- order creation now accepts `productItems` alongside legacy `items`
- order detail now returns `productItems`
- order list now includes lightweight product summary fields:
  - `firstProductName`
  - `firstProductImageUrl`
  - `productItemCount`

Stephub app:

- Home / Categories / Shop / Product / Cart / Checkout / OrderHistory now use product-oriented wording
- tab label `แพ็กเกจ` was changed to `สินค้า`
- cart page now presents itself as `ตะกร้าสินค้า`
- checkout sends `productItems`
- order success shows a short purchased-product summary
- order history list shows product summary before expanding
- order history detail renders `productItems`
- product page keeps package behavior hidden behind product-style presentation

## What Changed In PR #27

PR #27 restored the richer storefront presentation that had been lost on `main`.

Stephub app:

- Home page was rebuilt with:
  - sticky header
  - burger + search + basket top bar
  - auto-playing slide carousel
  - category icon row
  - banner under categories
  - lazy-loaded product grid
  - injected banners inside the product feed
- Product page was rebuilt with:
  - refreshed media gallery
  - video thumbnail opening inside the app
  - updated hero layout for product title / price / rating
  - product overview cards
  - refreshed description / actions / reviews layout

Important note:

- PR #27 was a design restoration pass only
- product-first data flow from PR #26 remains intact underneath

## What Is Working

Storefront:

- Home is product-first in wording and restored in design
- Categories reads from product-first category API
- Shop uses product wording
- Product page presents media and details as products, not packages
- Cart and checkout use product wording

Orders:

- checkout still works through the package bridge underneath
- `/auth/orders` accepts `productItems`
- `/auth/orders/:orderId` returns `productItems`
- order history shows product summary and product line items
- order success and order failed screens use product-first copy

Admin / BAO:

- manual payment settings and QR flow from PR #20 remain merged
- BAO shipment / pickup polish from PR #22 remains merged
- catalog enrichment from PR #23 remains merged

## Important Files

Backend / API:

- [main.ts](/Users/macbook/poolproject/apps/api/src/main.ts)
- [api.config.ts](/Users/macbook/poolproject/apps/api/src/config/api.config.ts)
- [auth.controller.ts](/Users/macbook/poolproject/packages/modules/auth/src/controllers/auth.controller.ts)
- [orders.controller.ts](/Users/macbook/poolproject/packages/modules/orders/src/controllers/orders.controller.ts)
- [orders.service.ts](/Users/macbook/poolproject/packages/modules/orders/src/services/orders.service.ts)
- [orders.repository.ts](/Users/macbook/poolproject/packages/modules/orders/src/repositories/orders.repository.ts)
- [packages.controller.ts](/Users/macbook/poolproject/packages/modules/packages/src/controllers/packages.controller.ts)
- [products.controller.ts](/Users/macbook/poolproject/packages/modules/packages/src/controllers/products.controller.ts)
- [packages.service.ts](/Users/macbook/poolproject/packages/modules/packages/src/services/packages.service.ts)
- [packages.repository.ts](/Users/macbook/poolproject/packages/modules/packages/src/repositories/packages.repository.ts)

Stephub app:

- [index.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/config/index.tsx)
- [liveCatalog.ts](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/utils/liveCatalog.ts)
- [ProductType.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/types/ProductType.tsx)
- [Header.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/components/Header.tsx)
- [BottomTabBar.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/navigation/BottomTabBar.tsx)
- [Home.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/tabs/Home.tsx)
- [Categories.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/tabs/Categories.tsx)
- [Order.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/tabs/Order.tsx)
- [Shop.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Shop.tsx)
- [Product.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Product.tsx)
- [Checkout.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Checkout.tsx)
- [OrderHistory.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/OrderHistory.tsx)
- [OrderSuccessful.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/OrderSuccessful.tsx)
- [OrderFailed.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/OrderFailed.tsx)

Local tooling:

- [dev-up.sh](/Users/macbook/poolproject/scripts/dev-up.sh)
- [dev-restart.sh](/Users/macbook/poolproject/scripts/dev-restart.sh)
- [dev-check.sh](/Users/macbook/poolproject/scripts/dev-check.sh)

## Smoke Tests To Run Next

Storefront:

1. Open Home and verify:
- sticky top bar is visible while scrolling
- search field filters product cards
- category row shows below the slide
- banner shows under categories
- product grid loads more items on scroll

2. Open Product and verify:
- video thumbnail appears first when `youtubeUrl` exists
- tapping the video thumbnail opens playback inside the app
- image swipe still works after the video slide
- title / price / description / reviews render with the restored layout

Order flow:

3. Add product to cart from Home and Product
4. Complete checkout through `/auth/orders`
5. Verify OrderSuccessful shows purchased product summary
6. Verify OrderHistory shows product summary and expanded product lines

BAO / admin:

7. Confirm slides, banners, categories, and products still load from BAO
8. Confirm manual payment and transfer-review flows still work after storefront changes

## Recommended Next Steps

Product-first migration:

- continue reducing package bridge dependency in backend order creation and order responses
- decide whether to keep `package` as an internal bridge only, or fully phase it out later

Storefront:

- restore or redesign `Shop` if its presentation also looks older than intended
- run a manual browser smoke on Home and Product after PR #27 merge
- keep the standard local-start flow above as the default entry point before deciding whether a storefront regression is real or just a local stack/data issue

Repo hygiene:

- commit this updated handoff file if you want it tracked on `main`
