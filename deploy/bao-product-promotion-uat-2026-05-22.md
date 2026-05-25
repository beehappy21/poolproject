# BAO Product Promotion UAT Release 2026-05-22

This release packages the BAO product-promotion work completed on 2026-05-21 plus the SKU/Product Detail dropdown usability fix completed on 2026-05-22.

## Scope

- add promotion snapshot fields to `ProductDetail`
- apply promotion pricing and PV in API order creation
- show promotion-aware pricing in BAO order creation
- allow selecting promotion on SKU/Product Detail
- make `Supplier`, `Category`, `Product family code`, and `Product family name` selectable from dropdowns on the SKU/Product Detail page

## Bundle Contents

- `packages/modules/orders/src/repositories/orders.repository.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260521_add_product_detail_promotion_snapshot/migration.sql`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Models/ProductDetailRecord.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Order/OrderCreateScreen.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Product/ProductEditScreen.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/order/create-member-sale.blade.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/product/edit-form.blade.php`
- `docs/bao-local-product-promotion-checklist.md`

## Local Verification Already Recorded

- `php -l` passed for the touched Laravel model/screen/view files
- `npm run prisma:generate` passed on local
- `tsc --noEmit -p apps/api/tsconfig.app.json` passed on local
- `nest build api` passed on local
- BAO local flow test recorded in [docs/bao-local-product-promotion-checklist.md](/Users/macbook/poolproject/docs/bao-local-product-promotion-checklist.md:1)

## Prepare Command

```bash
bash scripts/prepare_bao_product_promotion_uat_release.sh
```

This writes:

- staged folder: `deploy/releases/bao-product-promotion-uat-2026-05-22/`
- zip bundle: `deploy/releases/bao-product-promotion-uat-2026-05-22.zip`

## UAT Deploy Commands

Run from your local machine:

```bash
scp deploy/releases/bao-product-promotion-uat-2026-05-22.zip nc-user@202.94.169.245:/home/nc-user/
ssh nc-user@202.94.169.245
```

Run on the server:

```bash
cd /home/nc-user/poolproject
mkdir -p /home/nc-user/tmp/bao-product-promotion-uat-2026-05-22
unzip -o /home/nc-user/bao-product-promotion-uat-2026-05-22.zip -d /home/nc-user/tmp/bao-product-promotion-uat-2026-05-22
cp /home/nc-user/tmp/bao-product-promotion-uat-2026-05-22/packages/modules/orders/src/repositories/orders.repository.ts /home/nc-user/poolproject/packages/modules/orders/src/repositories/orders.repository.ts
cp /home/nc-user/tmp/bao-product-promotion-uat-2026-05-22/prisma/schema.prisma /home/nc-user/poolproject/prisma/schema.prisma
mkdir -p /home/nc-user/poolproject/prisma/migrations/20260521_add_product_detail_promotion_snapshot
cp /home/nc-user/tmp/bao-product-promotion-uat-2026-05-22/prisma/migrations/20260521_add_product_detail_promotion_snapshot/migration.sql /home/nc-user/poolproject/prisma/migrations/20260521_add_product_detail_promotion_snapshot/migration.sql
cp /home/nc-user/tmp/bao-product-promotion-uat-2026-05-22/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Models/ProductDetailRecord.php /home/nc-user/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Models/ProductDetailRecord.php
cp /home/nc-user/tmp/bao-product-promotion-uat-2026-05-22/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Order/OrderCreateScreen.php /home/nc-user/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Order/OrderCreateScreen.php
cp /home/nc-user/tmp/bao-product-promotion-uat-2026-05-22/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Product/ProductEditScreen.php /home/nc-user/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Product/ProductEditScreen.php
cp /home/nc-user/tmp/bao-product-promotion-uat-2026-05-22/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/order/create-member-sale.blade.php /home/nc-user/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/order/create-member-sale.blade.php
cp /home/nc-user/tmp/bao-product-promotion-uat-2026-05-22/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/product/edit-form.blade.php /home/nc-user/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/product/edit-form.blade.php
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml build api bao
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml --profile tools run --rm migrate
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up -d api bao
docker exec poolproject-uat-bao-1 php /var/www/html/backend/artisan optimize:clear
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml restart bao
```

## Verification

Run on the server:

```bash
docker exec poolproject-uat-api-1 wget -qO- http://127.0.0.1:3000/health
docker exec poolproject-uat-bao-1 php -l /var/www/html/backend/app/Orchid/Screens/Product/ProductEditScreen.php
docker exec poolproject-uat-bao-1 php -l /var/www/html/backend/resources/views/product/edit-form.blade.php
curl -I http://127.0.0.1:18001/admin/product/edit/5
```

Then verify in browser:

1. Open BAO SKU/Product Detail edit page.
2. Confirm `Supplier`, `Category`, `Product family code`, and `Product family name` are selectable.
3. Confirm selecting product family syncs the related supplier/category.
4. Confirm promotion dropdown still fills promotion summary fields.
5. Create a test order for a promoted product with quantity below and above the minimum threshold.
