# VPS Ready Next Steps

Updated: 2026-04-09

Use this file when the VPS is ready and we want to continue deployment work immediately.

## Current Completed Work

- UAT deployment checklist created:
  - [UAT_DEPLOYMENT_CHECKLIST.md](/Users/macbook/poolproject/UAT_DEPLOYMENT_CHECKLIST.md)
  - [UAT_DEPLOYMENT_RUNSHEET.md](/Users/macbook/poolproject/UAT_DEPLOYMENT_RUNSHEET.md)
- Server readiness gap assessment created:
  - [SERVER_READINESS_GAP_ASSESSMENT.md](/Users/macbook/poolproject/SERVER_READINESS_GAP_ASSESSMENT.md)
- Docker Compose deployment base prepared:
  - [deploy/compose/docker-compose.yml](/Users/macbook/poolproject/deploy/compose/docker-compose.yml)
  - [deploy/compose/README.md](/Users/macbook/poolproject/deploy/compose/README.md)
- Server env templates prepared:
  - [deploy/compose/.env.example](/Users/macbook/poolproject/deploy/compose/.env.example)
  - [deploy/compose/api.env.example](/Users/macbook/poolproject/deploy/compose/api.env.example)
  - [deploy/compose/bao.env.example](/Users/macbook/poolproject/deploy/compose/bao.env.example)
  - [deploy/compose/wap.env.example](/Users/macbook/poolproject/deploy/compose/wap.env.example)
- Nginx reverse proxy layer added:
  - [deploy/compose/nginx/nginx.conf](/Users/macbook/poolproject/deploy/compose/nginx/nginx.conf)
  - [deploy/compose/nginx/conf.d/api.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/api.conf)
  - [deploy/compose/nginx/conf.d/bao.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/bao.conf)
  - [deploy/compose/nginx/conf.d/wap.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/wap.conf)

## Confirmed State

- `docker compose config` passes for the current deployment stack.
- App services are still private behind loopback by default.
- Nginx is now the intended public entrypoint on port `80`.
- Target hostname routing is:
  - `api.blifehealthy.com -> api:3000`
  - `bao.blifehealthy.com -> bao:8001`
  - `wap.blifehealthy.com -> wap:3002`

## Important Notes Before First VPS Boot

- Real secrets are still not set.
- `nginx -t` has not been run yet on a machine with Docker daemon available.
- Full stack boot has not been executed yet on the target VPS.
- Public DNS / Cloudflare cutover has not happened yet.

## Files That Need Real Server Values

- `deploy/compose/.env`
- `deploy/compose/api.env`
- `deploy/compose/bao.env`
- `deploy/compose/wap.env`

Must replace placeholders with real values:

- `POSTGRES_PASSWORD`
- `DATABASE_URL` password segment
- `LINE_LOGIN_CHANNEL_SECRET`
- `APP_KEY`
- `POOL_DB_PASSWORD`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`

Must review intentionally for runtime behavior:

- `APP_CORS_ORIGINS`
- `APP_BODY_LIMIT`
- `APP_TRUST_PROXY_HOPS`
- `APP_RATE_LIMIT_WINDOW_MS`
- `APP_RATE_LIMIT_MAX_REQUESTS`
- `APP_REDIS_URL`

## VPS Bootstrap Order

1. Copy repo to VPS
2. Copy env templates into real env files
3. Fill in real secrets
4. Validate compose config
5. Build images
6. Start `postgres` and `redis`
7. Run Prisma schema push
8. Apply Stephub compatibility views
9. If needed, migrate legacy LINE bindings
10. Start `api`, `bao`, `wap`, `nginx`
11. Start `worker` only if this release depends on background processing
12. Run `nginx -t`
13. Validate local Host-header routing
14. Point Cloudflare DNS to VPS
15. Validate public domains
16. Run smoke/UAT checklist

## Exact Commands To Run On The VPS

Copy env templates:

```bash
npm run ops:init:compose-env
```

Validate compose:

```bash
npm run ops:check:api-env -- deploy/compose/api.env
npm run ops:check:bao-env -- deploy/compose/bao.env
npm run ops:check:wap-env -- deploy/compose/wap.env
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml config
```

Build:

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml build
```

Start infra:

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up -d postgres redis
```

Apply schema:

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml --profile tools run --rm migrate
```

Apply Stephub compatibility views:

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml exec -T postgres \
  psql -U postgres -d poolproject \
  < scripts/migrations/create_stephub_compat_views.sql
```

Optional LINE migration:

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml run --rm api \
  npm run line:bindings:migrate-runtime
```

Start app stack:

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up -d api bao wap nginx
```

Start worker only when required:

```bash
docker compose --profile worker --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up -d worker
```

Validate Nginx:

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml exec nginx nginx -t
```

Local VPS routing checks:

```bash
curl -H "Host: api.blifehealthy.com" http://127.0.0.1/health
curl -I -H "Host: bao.blifehealthy.com" http://127.0.0.1/admin/login
curl -I -H "Host: wap.blifehealthy.com" http://127.0.0.1/
```

Logs:

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml logs --tail=100 nginx
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml logs --tail=100 api
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml logs --tail=100 bao
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml logs --tail=100 wap
```

One-command stack verification:

```bash
npm run ops:check:compose-stack
```

## Cloudflare / DNS Later

- Point these records to the VPS public IP:
  - `api.blifehealthy.com`
  - `bao.blifehealthy.com`
  - `wap.blifehealthy.com`
- Keep Nginx on HTTP origin first.
- Enable Cloudflare proxy after local Host-header checks pass.
- Later, if needed, add origin TLS on Nginx without changing app URLs.

## First Public Checks After DNS Cutover

- `https://api.blifehealthy.com/health`
- `https://bao.blifehealthy.com/admin/login`
- `https://wap.blifehealthy.com`
- `https://wap.blifehealthy.com/line/liff/signin`
- or `npm run ops:check:public-urls`

## What To Review If Something Fails

- Nginx config and `nginx -t`
- env file alignment across API / BAO / WAP
- Postgres credentials in both API and BAO env
- BAO upload/storage volume behavior
- `LINE_LOGIN_CALLBACK_URL` and `LINE_LIFF_SIGNIN_URL`
- API health and BAO login logs

## Related References

- [deploy/compose/README.md](/Users/macbook/poolproject/deploy/compose/README.md)
- [UAT_DEPLOYMENT_CHECKLIST.md](/Users/macbook/poolproject/UAT_DEPLOYMENT_CHECKLIST.md)
- [UAT_DEPLOYMENT_RUNSHEET.md](/Users/macbook/poolproject/UAT_DEPLOYMENT_RUNSHEET.md)
- [SERVER_READINESS_GAP_ASSESSMENT.md](/Users/macbook/poolproject/SERVER_READINESS_GAP_ASSESSMENT.md)
