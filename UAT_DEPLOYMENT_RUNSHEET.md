# UAT Deployment Runsheet

Updated: 2026-04-09

Use this as the short deploy-day checklist.

## Before Deploy

- [ ] Confirm deploy commit / branch
- [ ] Confirm owner for deploy, smoke test, and rollback
- [ ] Confirm target URLs:
  - [ ] `https://api.blifehealthy.com`
  - [ ] `https://bao.blifehealthy.com`
  - [ ] `https://wap.blifehealthy.com`
- [ ] Confirm API env is complete from [.env.staging.example](/Users/macbook/poolproject/.env.staging.example)
- [ ] Confirm API hardening env is reviewed:
  - [ ] `APP_CORS_ORIGINS`
  - [ ] `APP_BODY_LIMIT`
  - [ ] `APP_TRUST_PROXY_HOPS`
  - [ ] `APP_RATE_LIMIT_WINDOW_MS`
  - [ ] `APP_RATE_LIMIT_MAX_REQUESTS`
  - [ ] `APP_REDIS_URL`
- [ ] Confirm BAO env is complete from [backend/.env.staging.example](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/.env.staging.example)
- [ ] Confirm WAP env is complete from [stephub/.env.example](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/.env.example)
- [ ] Run env validation:
  - [ ] `npm run ops:check:api-env -- deploy/compose/api.env`
  - [ ] `npm run ops:check:bao-env -- deploy/compose/bao.env`
  - [ ] `npm run ops:check:wap-env -- deploy/compose/wap.env`
- [ ] Run `npm run ops:check:secrets`
- [ ] Run `npm run ops:preflight:deploy`
- [ ] Run `docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml config`
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Create backup:
  - [ ] `npm run uat:backup`
- [ ] Record rollback target and backup path

## Deploy Order

1. [ ] Apply server env / secret changes
2. [ ] Run `npm run prisma:generate`
3. [ ] Run `npm run prisma:push`
4. [ ] Apply [create_stephub_compat_views.sql](/Users/macbook/poolproject/scripts/migrations/create_stephub_compat_views.sql)
5. [ ] If needed, run `npm run line:bindings:migrate-runtime`
6. [ ] Start API: `npm run start:api`
7. [ ] Start worker only if this release depends on worker flows: `npm run start:worker`
8. [ ] Start BAO: `bash scripts/start_bao_server.sh`
9. [ ] Deploy WAP build
10. [ ] If needed, run `php artisan storage:link`
11. [ ] If using Docker Compose, run `npm run ops:check:compose-stack`

## Immediate Checks

- [ ] API health works: `https://api.blifehealthy.com/health`
- [ ] BAO login works: `https://bao.blifehealthy.com/admin/login`
- [ ] WAP works: `https://wap.blifehealthy.com`
- [ ] Run `npm run ops:check:public-urls` after public DNS is active
- [ ] Run `npm run dev:check:public-auth`
- [ ] Run `npm run wap:verify`
- [ ] Confirm BAO `LINE System Status` is green on required items
- [ ] Confirm `https://wap.blifehealthy.com/line/liff/signin` opens correctly

## Smoke Tests

- [ ] `npm run smoke:cashback`
- [ ] `npm run smoke:bao:cashback`
- [ ] `npm run smoke:bao:shipment`
- [ ] `npm run smoke:bao:withdraw-kyc`
- [ ] Skip destructive smoke helpers unless explicitly approved for this environment

## Manual UAT

- [ ] Create one test member
- [ ] Create one order
- [ ] Submit transfer slip
- [ ] Approve in BAO
- [ ] Mark shipped
- [ ] Mark delivered
- [ ] Confirm delivered bucket
- [ ] Confirm stock / wallet / commission movement
- [ ] Confirm export/report works
- [ ] Confirm LINE sign-in and sponsor flow

## Rollback Trigger

- [ ] API health fails after deploy
- [ ] BAO login fails
- [ ] WAP blank screen or broken route reload
- [ ] LINE sign-in breaks
- [ ] Order flow cannot complete
- [ ] Data migration issue detected

## Rollback

1. [ ] Stop new writes if needed
2. [ ] Revert app release to previous version
3. [ ] Restore previous env if needed
4. [ ] Restore backup if data/schema issue exists
5. [ ] Verify public URLs again
6. [ ] Record incident and final status

## References

- Full checklist: [UAT_DEPLOYMENT_CHECKLIST.md](/Users/macbook/poolproject/UAT_DEPLOYMENT_CHECKLIST.md)
- Deploy details: [DEPLOY_CHECKLIST.md](/Users/macbook/poolproject/DEPLOY_CHECKLIST.md)
- Live usage checklist: [CHECKLIST_LIVE_OPERATIONS.md](/Users/macbook/poolproject/CHECKLIST_LIVE_OPERATIONS.md)
