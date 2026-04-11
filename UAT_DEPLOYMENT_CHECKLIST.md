# UAT / Trial Server Deployment Checklist

Updated: 2026-04-09

Use this checklist before moving the current project to a real server for UAT, limited real-user trial, or internal production-like testing.

This checklist is tailored to the current repo and covers:

- `Postgres`
- `Nest API` in `apps/api`
- `Nest worker` in `apps/worker`
- BAO admin
- WAP frontend
- LINE login / LIFF integration
- backup, rollback, and post-deploy verification

## 1. Decide the UAT Scope

- [ ] Confirm the UAT server is for `internal only`, `selected users`, or `open public test`
- [ ] Confirm the real URLs to be used:
  - [ ] `https://api.blifehealthy.com`
  - [ ] `https://bao.blifehealthy.com`
  - [ ] `https://wap.blifehealthy.com`
- [ ] Confirm whether UAT will use:
  - [ ] copied production-like data
  - [ ] seeded demo data
  - [ ] empty clean database
- [ ] Confirm who owns deploy approval, smoke signoff, and rollback approval

## 2. Infrastructure Readiness

- [ ] Server sizing is enough for API, worker, BAO, and database load
- [ ] Reverse proxy is ready for all public hosts
- [ ] HTTPS certificates are installed and auto-renew is configured
- [ ] Firewall only exposes required ports
- [ ] Process supervision is configured for long-running services
- [ ] Log storage location is defined
- [ ] Disk free space is enough for:
  - [ ] database growth
  - [ ] backups
  - [ ] uploaded files
  - [ ] app logs

## 3. Source and Release Readiness

- [ ] Working tree is reviewed and intended deploy commit is known
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Prisma client is up to date:
  - [ ] `npm run prisma:generate`
- [ ] The branch/tag for UAT deploy is recorded in the handoff note
- [ ] Any required manual SQL or migration step is listed in the deploy ticket

## 4. Environment Variables

Use [.env.staging.example](/Users/macbook/poolproject/.env.staging.example) as the API baseline.

### API env

- [ ] `DATABASE_URL` points to the correct UAT database
- [ ] `APP_PORT=3000`
- [ ] `APP_WAP_URL=https://wap.blifehealthy.com`
- [ ] `APP_PUBLIC_BASE_URL=https://api.blifehealthy.com`
- [ ] `APP_CORS_ORIGINS` includes `wap`, `api`, and `bao` domains
- [ ] `APP_BODY_LIMIT` is intentionally reviewed for slip upload size
- [ ] `APP_TRUST_PROXY_HOPS` matches the reverse proxy hop count
- [ ] `APP_RATE_LIMIT_WINDOW_MS` is set intentionally
- [ ] `APP_RATE_LIMIT_MAX_REQUESTS` is set intentionally
- [ ] `APP_REDIS_URL` is set if worker/Redis are in scope for this environment
- [ ] `LINE_CHANNEL_ID` is set
- [ ] `LINE_LOGIN_CHANNEL_ID` is set
- [ ] `LINE_LOGIN_CHANNEL_SECRET` is set only on the backend
- [ ] `LINE_LOGIN_CALLBACK_URL=https://wap.blifehealthy.com/line/liff/signin`
- [ ] `LINE_LIFF_ID=2009662380-OAbgN6VR`
- [ ] `LINE_LIFF_SIGNIN_URL=https://wap.blifehealthy.com/line/liff/signin`
- [ ] `LINE_STRICT_VERIFY=true`

### BAO env

Use [backend/.env.staging.example](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/.env.staging.example) as the BAO baseline.

- [ ] `APP_URL` is set correctly
- [ ] `APP_WAP_URL` is set correctly
- [ ] `APP_API_URL` is set correctly
- [ ] `POOL_DB_*` values point to the intended database
- [ ] mail settings are configured if UAT needs email delivery
- [ ] BAO and API use the same LINE callback/sign-in domain values

### WAP env

Use [stephub/.env.example](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/.env.example) as the frontend baseline.

- [ ] `REACT_APP_LINE_LIFF_ID=2009662380-OAbgN6VR`
- [ ] `REACT_APP_LINE_LIFF_SIGNIN_URL=https://wap.blifehealthy.com/line/liff/signin`
- [ ] `REACT_APP_LINE_LOGIN_CALLBACK_URL=https://wap.blifehealthy.com/line/liff/signin`
- [ ] No server secret is exposed to frontend build env

## 5. Database and Data Safety

- [ ] Create a fresh backup before deploy
- [ ] If this is the shared UAT environment, create a UAT snapshot:
  - [ ] `npm run uat:backup`
- [ ] If using Docker Postgres, confirm container/database access works
- [ ] Prisma schema matches deploy target:
  - [ ] `npm run prisma:generate`
  - [ ] `npm run prisma:push`
- [ ] If BAO uses Stephub compatibility views, apply:
  - [ ] [create_stephub_compat_views.sql](/Users/macbook/poolproject/scripts/migrations/create_stephub_compat_views.sql)
- [ ] If older LINE runtime data still exists in `runtime/line-bindings.json`, run:
  - [ ] `npm run line:bindings:migrate-runtime`
- [ ] Rollback restore path is tested or documented:
  - [ ] `npm run uat:restore -- <backup-dir> --yes`

## 6. File Storage and Public Assets

- [ ] Uploaded product/media files are present on the server
- [ ] Public file serving path is correct
- [ ] If using BAO local disk storage, run:
  - [ ] `php artisan storage:link`
- [ ] Confirm [storage/app/public](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/storage/app/public) is served through [public/storage](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/public/storage)
- [ ] Large image upload limits are set high enough for BAO product management

## 7. Service Boot and Runtime Readiness

### Database

- [ ] Database service is running
- [ ] Connection from API host works
- [ ] Connection from BAO host works

### API

- [ ] Dependencies installed
- [ ] Build completed:
  - [ ] `npm run build`
- [ ] API starts cleanly:
  - [ ] `npm run start:api`
- [ ] Health check responds:
  - [ ] `GET /health`

### Worker

- [ ] Worker build completed with the main build
- [ ] Worker starts cleanly when this release needs it:
  - [ ] `npm run start:worker`
- [ ] Decision is recorded:
  - [ ] worker is required for this UAT
  - [ ] worker is intentionally not used for this UAT
- [ ] If worker is required, Redis is reachable from the app runtime
- [ ] Scheduled jobs / background workflows expected for UAT are enabled

### BAO

- [ ] BAO starts cleanly:
  - [ ] `bash scripts/start_bao_server.sh`
- [ ] Login page responds
- [ ] Admin credentials are verified

### WAP

- [ ] Frontend build uses the intended public env
- [ ] WAP root route loads
- [ ] Deep links reload correctly
- [ ] Static asset paths are correct after deploy

## 8. Public Host and Cross-System Verification

- [ ] Public API health responds:
  - [ ] `https://api.blifehealthy.com/health`
- [ ] Public BAO login responds:
  - [ ] `https://bao.blifehealthy.com/admin/login`
- [ ] Public WAP responds:
  - [ ] `https://wap.blifehealthy.com`
- [ ] Public auth bridge passes:
  - [ ] `npm run dev:check:public-auth`
- [ ] WAP public surface verification passes when frontend bundle changed:
  - [ ] `npm run wap:verify`

## 9. LINE / LIFF Readiness

- [ ] LINE Developers console values match deployed env exactly
- [ ] `wap.blifehealthy.com` is used consistently for callback and LIFF sign-in
- [ ] BAO `LINE System Status` shows the required values as configured
- [ ] `LINE_LOGIN_CHANNEL_SECRET` exists server-side only
- [ ] `LINE_STRICT_VERIFY=true` in UAT

### Real-domain LINE preflight

- [ ] `https://wap.blifehealthy.com/line/liff/signin` opens correctly
- [ ] Query strings survive on the LIFF sign-in route
- [ ] This URL keeps parameters:
  - [ ] `https://wap.blifehealthy.com/line/liff/signin?mode=signup&sponsorCode=TH0000001`

### LINE flow checks

- [ ] Existing member can sign in through LINE
- [ ] Existing member can connect LINE from `Profile`
- [ ] Sign out then LINE sign-in still restores the member session
- [ ] Invite flow keeps `sponsorCode`
- [ ] Signup through LIFF creates the member under the expected sponsor

## 10. BAO Feature Readiness

- [ ] `Delivered Orders` is visible in the BAO menu
- [ ] Product create/edit opens
- [ ] Product image upload works
- [ ] Gallery order persists correctly
- [ ] Order buckets load:
  - [ ] awaiting payment
  - [ ] transfer review
  - [ ] awaiting shipment
  - [ ] shipped
  - [ ] delivered
- [ ] Order export works:
  - [ ] CSV
  - [ ] Excel
  - [ ] PDF
- [ ] Commission settings pages open without error
- [ ] Withdraw/KYC pages open without `500`

## 11. Member App / WAP Readiness

- [ ] Home loads and does not show a false empty state
- [ ] Product list loads
- [ ] Product detail loads
- [ ] Cart works
- [ ] Checkout works
- [ ] Order success page works
- [ ] Order history works
- [ ] Wallet pages work
- [ ] Firm page works if enabled
- [ ] Commission dashboard works if enabled
- [ ] Amount displays use the intended currency/format

## 12. Core Business Smoke Tests

Run the smallest set that matches the release scope.

### Baseline smoke

- [ ] `npm run smoke:cashback` after API changes affecting cashback/wallet posting
- [ ] `npm run smoke:bao:cashback` after BAO cashback/report changes
- [ ] `npm run smoke:bao:shipment` after order status / shipment changes
- [ ] `npm run smoke:bao:withdraw-kyc` after withdraw or KYC changes

### Optional focused smoke

- [ ] `npm run smoke:firm` for Firm wallet / DCW changes
- [ ] `npm run smoke:wallet:mixed` for mixed wallet + payment changes
- [ ] `npm run smoke:pool:cap` for pool cap rule changes
- [ ] `npm run smoke:pool:rules` for pool rule/config changes
- [ ] `npm run smoke:pool:weekly` for weekly pool close changes

Important:

- [ ] Do not run destructive smoke/reset scripts against shared UAT unless the team explicitly approved it
- [ ] Review [CHECKLIST_LIVE_OPERATIONS.md](/Users/macbook/poolproject/CHECKLIST_LIVE_OPERATIONS.md) before using real data on a persistent environment

## 13. Manual End-to-End UAT

- [ ] Create one real-like member
- [ ] Confirm sponsor/upline is correct
- [ ] Create one real-like order
- [ ] Submit transfer slip from member/app side
- [ ] Approve the order in BAO
- [ ] Mark shipped in BAO
- [ ] Mark delivered in BAO
- [ ] Confirm delivered bucket shows the order
- [ ] Confirm stock movement is correct
- [ ] Confirm wallet movement is correct
- [ ] Confirm commission movement is correct where applicable
- [ ] Confirm reports and exports show the transaction

## 14. Monitoring and Operations

- [ ] Service logs can be accessed quickly during deploy
- [ ] Error logs are separated from normal access logs where possible
- [ ] DB backup retention is defined
- [ ] Restart commands are documented for API, worker, BAO, and proxy
- [ ] Team knows where to check first if:
  - [ ] API is down
  - [ ] BAO is down
  - [ ] WAP is blank
  - [ ] LINE sign-in fails
  - [ ] uploads fail

## 15. Rollback Readiness

- [ ] Previous deploy artifact or commit is available
- [ ] Previous env file or secret version is available
- [ ] Latest backup path is recorded
- [ ] Restore owner is assigned
- [ ] Rollback decision threshold is agreed before deploy
- [ ] Rollback steps are written in the deploy note

## 16. Signoff

- [ ] Infra signoff complete
- [ ] Backend signoff complete
- [ ] BAO signoff complete
- [ ] WAP signoff complete
- [ ] LINE signoff complete
- [ ] Business/UAT owner signoff complete

## Suggested Deploy Order

1. Backup current UAT
2. Apply env changes
3. Apply Prisma/schema changes
4. Apply Stephub compat views
5. Build and start API
6. Start worker
7. Start BAO
8. Deploy WAP build
9. Verify public URLs
10. Verify LINE readiness
11. Run scoped smoke tests
12. Run one manual end-to-end order flow
13. Record signoff

## Quick Commands

```bash
npm run lint
npm run build
npm run prisma:generate
npm run prisma:push
npm run uat:backup
npm run start:api
npm run start:worker
bash scripts/start_bao_server.sh
npm run dev:check:public-auth
npm run wap:verify
npm run smoke:cashback
npm run smoke:bao:cashback
npm run smoke:bao:shipment
bash scripts/blifehealthy_uat.sh check
```

## Notes

- [DEPLOY_CHECKLIST.md](/Users/macbook/poolproject/DEPLOY_CHECKLIST.md) remains the detailed deploy note for the current sales and LINE-related flow.
- [CHECKLIST_LIVE_OPERATIONS.md](/Users/macbook/poolproject/CHECKLIST_LIVE_OPERATIONS.md) remains the operator checklist for day-to-day usage on a persistent environment.
- This file is the higher-level UAT/server readiness checklist that ties those pieces together.
