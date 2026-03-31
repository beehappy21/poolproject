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
- set `APP_WAP_URL=https://wap.blifehealthy.com`
- set `APP_PUBLIC_BASE_URL=https://api.blifehealthy.com`
- set real `LINE_CHANNEL_ID` or `LINE_LOGIN_CHANNEL_ID`
- set real `LINE_LOGIN_CHANNEL_SECRET` in the backend/API env only
- set `LINE_LOGIN_CALLBACK_URL=https://wap.blifehealthy.com/line/liff/signin`
- set `LINE_LIFF_ID=2009662380-OAbgN6VR`
- set `LINE_LIFF_SIGNIN_URL=https://wap.blifehealthy.com/line/liff/signin`
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

7. LINE real-domain preflight
- confirm `https://wap.blifehealthy.com/line/liff/signin` opens the WAP LIFF entry route directly
- confirm the query string survives on the WAP entry route:
  - `https://wap.blifehealthy.com/line/liff/signin?mode=signup&sponsorCode=TH0000001`
- if `wap.blifehealthy.com/line/liff/signin` fails to open or drops query parameters, treat it as a launch blocker for LINE web activation

## BAO Deploy

1. Set environment
- copy [backend/.env.staging.example](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/.env.staging.example) to the real environment
- set real `APP_URL`
- set real `APP_WAP_URL`
- set real `APP_API_URL`
- set real `POOL_DB_*`
- set real mail settings if email is needed
- keep `LINE_LOGIN_CALLBACK_URL` and `LINE_LIFF_SIGNIN_URL` aligned with the LINE Developers console on `wap.blifehealthy.com`

## WAP Build Env

1. Frontend public env
- copy [stephub/.env.example](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/.env.example) into the real build env
- set `REACT_APP_LINE_LIFF_ID=2009662380-OAbgN6VR`
- set `REACT_APP_LINE_LIFF_SIGNIN_URL=https://wap.blifehealthy.com/line/liff/signin`
- set `REACT_APP_LINE_LOGIN_CALLBACK_URL=https://wap.blifehealthy.com/line/liff/signin`
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

5. BAO LINE readiness check
- open the BAO LINE workspace after env injection
- confirm `LINE System Status` shows:
  - LIFF ID configured
  - callback URL configured
  - LIFF sign-in URL configured
  - public host alignment on `wap.blifehealthy.com`
  - backend `APP_WAP_URL` declared
  - LINE channel secret configured server-side
  - strict verification enabled
  - `line-login API reachable`

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

4. LINE live UAT inside the LINE app
- returning member LINE sign-in
  - preconditions:
    - member already exists
    - member account is already linked to the tester's LINE account
    - production env is injected and BAO `LINE System Status` is green for core items
  - entry URL:
    - `https://wap.blifehealthy.com/line/liff/signin?mode=signin&returnTo=%2FTabNavigator`
  - expected:
    - LIFF opens inside LINE
    - member session is created
    - app lands on `TabNavigator` without manual sign-in
- first-time connect from Profile
  - preconditions:
    - member can sign in normally with member credentials
    - tester's LINE account is not yet bound to another member
  - entry steps:
    - open `https://wap.blifehealthy.com`
    - sign in normally
    - go to `Profile`
    - tap `เชื่อมต่อ LINE`
  - expected:
    - LIFF/auth handoff returns to the app
    - profile shows connected LINE status
    - sign out and LINE sign-in works on the next attempt
- invite / sponsorCode sign-up flow
  - preconditions:
    - inviter has a valid sponsor code
    - tester uses a LINE account not already bound to an existing member
  - entry URL:
    - `https://wap.blifehealthy.com/line/liff/signin?mode=signup&sponsorCode=<SPONSOR_CODE>`
  - expected:
    - LIFF opens inside LINE
    - sign-up page keeps the sponsor code
    - new member is created under the expected sponsor
- BAO readiness confirmation after env injection
  - preconditions:
    - API and BAO deploy completed
  - entry URL:
    - BAO `LINE > Settings`
  - expected:
    - no fake green states
    - missing env values show as missing
    - runtime panel helps operators identify config gaps without exposing the channel secret

## Cleanup

- decide whether to remove smoke rows:
  - `ProductDetail.id = 12`
  - `Order.id = 260`
  - `Order.id = 262`
- remove cashback smoke artifacts if they were created:
  - `npm run cleanup:cashback-smoke -- --apply`
