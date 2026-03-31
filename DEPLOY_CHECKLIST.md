# Deploy Checklist

Updated: 2026-03-24

## Scope

This checklist covers the current local sales flow that has already been smoke-tested:

- create order
- submit transfer slip
- approve
- mark shipped
- mark delivered
- view delivered bucket
- export order reports

## Local Start Standard

Use this as the default local-start flow before UI, BAO, or app/API integration work:

1. Start or resume the standard local stack
- run `npm run dev:up`

2. If ports or watchers look stale, restart the standard local stack
- run `npm run dev:restart`

3. Verify readiness before testing UI
- run `npm run dev:check`

4. Standard local URLs
- Stephub app: `http://127.0.0.1:3002`
- BAO admin: `http://127.0.0.1:8001/admin`
- API health: `http://127.0.0.1:3000/health`

Notes:
- this flow should be the team default starting point for local storefront/profile work
- `Home` now distinguishes load failure from true empty catalog state, so if API/BAO is unavailable the app should no longer silently look like an empty latest build

## API Deploy

1. Set environment
- copy [.env.staging.example](/Users/macbook/poolproject/.env.staging.example) to the real environment
- set the real `DATABASE_URL`
- set real `LINE_CHANNEL_ID` or `LINE_LOGIN_CHANNEL_ID`
- set real `LINE_LOGIN_CHANNEL_SECRET` in the backend/API env only
- set `LINE_LOGIN_CALLBACK_URL=https://www.blifehealthy.com/auth/line/callback`
- set `LINE_LIFF_ID=2009662380-OAbgN6VR`
- set `LINE_LIFF_SIGNIN_URL=https://www.blifehealthy.com/line/liff/signin`
- set `LINE_STRICT_VERIFY=true` for UAT/production

2. LINE data migration
- if an older environment still has `runtime/line-bindings.json`, run:
- `npm run line:bindings:migrate-runtime`
- this imports legacy runtime LINE bindings into the new `LineBinding` database table

3. Apply schema
- run `npm run prisma:generate`
- run `npm run prisma:push`

4. Build and start
- run `npm run build`
- run `npm run start:api`

5. Verify
- `GET /health`
- `POST /auth/line-login` accepts LIFF payload
- `GET /auth/line-bindings` shows DB-backed rows
- `POST /orders/:id/deliver` exists
- delivered bucket works:
  - `GET /orders?bucket=delivered`

6. LINE flow verification
- legacy member:
  - sign in once and connect LINE from Profile
  - sign out
  - re-enter via LINE and confirm `LINE login` opens member session
- referral flow:
  - open member referral card
  - share via LINE
  - confirm invite opens `SignIn?sponsorCode=...`
  - continue to signup and verify sponsor attribution remains correct

## BAO Deploy

1. Set environment
- copy [backend/.env.staging.example](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/.env.staging.example) to the real environment
- set real `APP_URL`
- set real `APP_WAP_URL`
- set real `APP_API_URL`
- set real `POOL_DB_*`
- set real mail settings if email is needed
- keep `LINE_LOGIN_CALLBACK_URL` and `LINE_LIFF_SIGNIN_URL` aligned with the LINE Developers console

## WAP Build Env

1. Frontend public env
- copy [stephub/.env.example](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/.env.example) into the real build env
- set `REACT_APP_LINE_LIFF_ID=2009662380-OAbgN6VR`
- set `REACT_APP_LINE_LIFF_SIGNIN_URL=https://www.blifehealthy.com/line/liff/signin`
- set `REACT_APP_LINE_LOGIN_CALLBACK_URL=https://www.blifehealthy.com/auth/line/callback`
- do not expose `LINE_LOGIN_CHANNEL_SECRET` to the frontend

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
- run `bash scripts/start_bao_server.sh`

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
- run `npm run smoke:cashback` after API deploy when commission settings or wallet posting changed
- run `npm run smoke:bao:cashback` after BAO deploy when commission report or export changed

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
- remove cashback smoke artifacts if they were created:
  - `npm run cleanup:cashback-smoke -- --apply`
