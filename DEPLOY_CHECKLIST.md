# Deploy Checklist

Updated: 2026-03-22

## Scope

This checklist covers the current local sales flow that has already been smoke-tested:

- create order
- submit transfer slip
- approve
- mark shipped
- mark delivered
- view delivered bucket
- export order reports

## API Deploy

1. Set environment
- copy [.env.staging.example](/Users/macbook/poolproject/.env.staging.example) to the real environment
- set the real `DATABASE_URL`

2. Apply schema
- run `npm run prisma:generate`
- run `npm run prisma:push`

3. Build and start
- run `npm run build`
- run `npm run start:api`

4. Verify
- `GET /health`
- `POST /orders/:id/deliver` exists
- delivered bucket works:
  - `GET /orders?bucket=delivered`

## BAO Deploy

1. Set environment
- copy [backend/.env.staging.example](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/.env.staging.example) to the real environment
- set real `APP_URL`
- set real `POOL_DB_*`
- set real mail settings if email is needed

2. Public files
- if using local disk, run `php artisan storage:link`
- verify [storage/app/public](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/storage/app/public) is served through [public/storage](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/public/storage)

3. Compatibility views
- apply [create_stephub_compat_views.sql](/Users/macbook/poolproject/scripts/migrations/create_stephub_compat_views.sql)
- this step is required because BAO reads from `stephub_*_v1` views including `stephub_orders_v1`

Example:

```bash
docker exec -i <postgres-container> psql \
  postgresql://<user>:<password>@127.0.0.1:5432/<db> \
  < scripts/migrations/create_stephub_compat_views.sql
```

4. Serve BAO
- run `php artisan serve --host=0.0.0.0 --port=8001`

## Post-Deploy Smoke

1. Product
- open product create/edit
- upload real images
- verify gallery and PV behavior

2. Sales flow
- create a new order
- submit transfer slip from app/member side
- approve from BAO
- mark shipped from BAO
- mark delivered from BAO

3. Reports
- verify BAO order buckets:
  - awaiting payment
  - transfer review
  - awaiting shipment
  - shipped
  - delivered
- verify `CSV / Excel / PDF` from order reports after login

## Cleanup

- decide whether to remove smoke rows:
  - `ProductDetail.id = 12`
  - `Order.id = 260`
  - `Order.id = 262`
