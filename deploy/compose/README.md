# Docker Compose Deployment

Updated: 2026-04-09

This stack packages the current UAT deployment into Docker Compose services:

- `nginx`
- `postgres`
- `redis`
- `api`
- `worker` as an optional profile-driven service
- `bao`
- `wap`

## Files

- Compose file: [docker-compose.yml](/Users/macbook/poolproject/deploy/compose/docker-compose.yml)
- Nginx main config: [deploy/compose/nginx/nginx.conf](/Users/macbook/poolproject/deploy/compose/nginx/nginx.conf)
- Nginx vhosts: [deploy/compose/nginx/conf.d/api.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/api.conf), [deploy/compose/nginx/conf.d/bao.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/bao.conf), [deploy/compose/nginx/conf.d/wap.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/wap.conf)
- Compose env template: [deploy/compose/.env.example](/Users/macbook/poolproject/deploy/compose/.env.example)
- API env template: [deploy/compose/api.env.example](/Users/macbook/poolproject/deploy/compose/api.env.example)
- BAO env template: [deploy/compose/bao.env.example](/Users/macbook/poolproject/deploy/compose/bao.env.example)
- WAP env template: [deploy/compose/wap.env.example](/Users/macbook/poolproject/deploy/compose/wap.env.example)

## First-Time Setup

1. Copy the env templates.

```bash
npm run ops:init:compose-env
```

2. Update real secrets and domains.

- keep all public URLs aligned:
  - `APP_PUBLIC_BASE_URL=https://api.blifehealthy.com`
  - `APP_URL=https://bao.blifehealthy.com`
  - `APP_WAP_URL=https://wap.blifehealthy.com`
  - `LINE_LOGIN_CALLBACK_URL=https://wap.blifehealthy.com/line/liff/signin`
  - `LINE_LIFF_SIGNIN_URL=https://wap.blifehealthy.com/line/liff/signin`
- keep internal Docker targets unchanged:
  - `DATABASE_URL=...@postgres:5432/...`
  - `POOL_DB_HOST=postgres`
  - `REDIS_HOST=redis`
  - `STEPHUB_API_PROXY_TARGET=http://api:3000`
  - `STEPHUB_BAO_PROXY_TARGET=http://bao:8001`
- replace every placeholder secret before first boot:
  - `POSTGRES_PASSWORD`
  - `DATABASE_URL` password segment
  - `LINE_LOGIN_CHANNEL_SECRET`
  - `APP_KEY`
  - `POOL_DB_PASSWORD`
  - `MAIL_USERNAME`
  - `MAIL_PASSWORD`
- keep `PUBLIC_BIND_IP=127.0.0.1` unless you intentionally want direct public port exposure without Nginx
- generate `APP_KEY` if needed with:

```bash
docker run --rm php:8.2-cli php -r 'echo "base64:".base64_encode(random_bytes(32)).PHP_EOL;'
```

3. Build the images.

```bash
npm run ops:check:stephub-tree
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml build
```

Validate env files before the first build:

```bash
npm run ops:check:api-env -- deploy/compose/api.env
npm run ops:check:bao-env -- deploy/compose/bao.env
npm run ops:check:wap-env -- deploy/compose/wap.env
npm run ops:check:stephub-tree
npm run ops:check:secrets
npm run ops:preflight:deploy
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml config
```

## Source Tree Guard

Before any `bao` or `wap` rebuild, verify the Stephub source tree is complete on the machine that will run Docker Compose:

```bash
npm run ops:check:stephub-tree
```

This guard checks the required BAO and WAP build/runtime files, including:

- `backend/artisan`
- `backend/composer.json`
- `backend/public/index.php`
- `backend/vendor/autoload.php`
- `backend/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php`
- `stephub/package.json`
- `stephub/public/index.html`
- `stephub/src/App.tsx`

If this check fails, stop before `docker compose build bao wap`.

Known failure mode from April 2026:

- a partial copy on the VPS left `backend` and `stephub` missing critical files
- `bao` then served a fatal PHP page because `server.php` and related Laravel files were missing
- `wap` could restart against an incomplete or stale build context and show the wrong public surface

Prefer deploying from a complete Git checkout or a verified full source archive. Do not rebuild from an ad hoc partial folder on the VPS.

## Server-Ready Example Values

These values are safe as committed examples for a single VPS deployment where Docker Compose runs the app stack and Nginx will be added later in front of it.

### deploy/compose/.env

```dotenv
COMPOSE_PROJECT_NAME=poolproject-uat
PUBLIC_BIND_IP=127.0.0.1
NGINX_BIND_IP=0.0.0.0
NGINX_HTTP_PORT=80
POSTGRES_DB=poolproject
POSTGRES_USER=postgres
POSTGRES_PASSWORD=replace-with-real-postgres-password
POSTGRES_PORT=5432
REDIS_PORT=6379
API_PORT=3000
BAO_PORT=8001
WAP_PORT=3002
WAP_REACT_APP_API_BASE_URL=/api
WAP_REACT_APP_BAO_BASE_URL=/bao-api
WAP_REACT_APP_LINE_LIFF_ID=2009662380-OAbgN6VR
WAP_REACT_APP_LINE_LIFF_SIGNIN_URL=https://wap.blifehealthy.com/line/liff/signin
WAP_REACT_APP_LINE_LOGIN_CALLBACK_URL=https://wap.blifehealthy.com/line/liff/signin
```

### deploy/compose/api.env

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://postgres:replace-with-real-postgres-password@postgres:5432/poolproject?schema=public
APP_PORT=3000
APP_WAP_URL=https://wap.blifehealthy.com
APP_PUBLIC_BASE_URL=https://api.blifehealthy.com
APP_CORS_ORIGINS=https://wap.blifehealthy.com,https://api.blifehealthy.com,https://bao.blifehealthy.com
APP_BODY_LIMIT=12mb
APP_TRUST_PROXY_HOPS=1
APP_RATE_LIMIT_WINDOW_MS=60000
APP_RATE_LIMIT_MAX_REQUESTS=120
APP_REDIS_URL=redis://redis:6379
LINE_CHANNEL_ID=2009662380
LINE_LOGIN_CHANNEL_ID=2009662380
LINE_LOGIN_CHANNEL_SECRET=replace-with-real-line-channel-secret
LINE_LOGIN_CALLBACK_URL=https://wap.blifehealthy.com/line/liff/signin
LINE_LIFF_ID=2009662380-OAbgN6VR
LINE_LIFF_SIGNIN_URL=https://wap.blifehealthy.com/line/liff/signin
LINE_STRICT_VERIFY=true
```

### deploy/compose/bao.env

```dotenv
APP_NAME=StepHub
APP_ENV=staging
APP_KEY=base64:replace-with-real-laravel-app-key
APP_DEBUG=false
APP_URL=https://bao.blifehealthy.com
APP_WAP_URL=https://wap.blifehealthy.com
APP_API_URL=https://api.blifehealthy.com
LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=info
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120
DB_CONNECTION=sqlite
DB_DATABASE=/var/www/html/backend/database/database.sqlite
POOL_DB_HOST=postgres
POOL_DB_PORT=5432
POOL_DB_DATABASE=poolproject
POOL_DB_USERNAME=postgres
POOL_DB_PASSWORD=replace-with-real-postgres-password
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379
BAO_UPLOAD_MAX_FILESIZE=32M
BAO_POST_MAX_SIZE=64M
BAO_MAX_FILE_UPLOADS=20
MAIL_MAILER=smtp
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=replace-with-real-mail-username
MAIL_PASSWORD=replace-with-real-mail-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=no-reply@example.com
MAIL_FROM_NAME="${APP_NAME}"
LINE_LIFF_ID=2009662380-OAbgN6VR
LINE_LOGIN_CALLBACK_URL=https://wap.blifehealthy.com/line/liff/signin
LINE_LIFF_SIGNIN_URL=https://wap.blifehealthy.com/line/liff/signin
LINE_STRICT_VERIFY=true
```

### deploy/compose/wap.env

```dotenv
HOST=0.0.0.0
PORT=3002
STEPHUB_API_PROXY_TARGET=http://api:3000
STEPHUB_BAO_PROXY_TARGET=http://bao:8001
```

## Safe Examples vs Secrets

Safe to commit as examples:

- domain URLs
- internal Docker hostnames such as `postgres`, `redis`, `api`, `bao`
- internal ports
- upload limits
- non-secret feature flags such as `LINE_STRICT_VERIFY=true`

Must be replaced on the server:

- `POSTGRES_PASSWORD`
- `DATABASE_URL` password segment
- `LINE_LOGIN_CHANNEL_SECRET`
- `APP_KEY`
- `POOL_DB_PASSWORD`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`

Review intentionally before go-live:

- `APP_BODY_LIMIT`
- `APP_TRUST_PROXY_HOPS`
- `APP_RATE_LIMIT_WINDOW_MS`
- `APP_RATE_LIMIT_MAX_REQUESTS`
- `APP_REDIS_URL`

## Database Bootstrap

1. Start infra only.

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up -d postgres redis
```

2. Apply Prisma schema.

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml --profile tools run --rm migrate
```

3. Apply Stephub compatibility views.

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml exec -T postgres \
  psql -U postgres -d poolproject \
  < scripts/migrations/create_stephub_compat_views.sql
```

4. If needed, migrate legacy LINE bindings.

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml run --rm api \
  npm run line:bindings:migrate-runtime
```

## Start the Full Stack

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up -d api bao wap nginx
```

Start the worker only for releases that depend on background processing:

```bash
docker compose --profile worker --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up -d worker
```

## Validation After Startup

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml ps
curl -H "Host: api.blifehealthy.com" http://127.0.0.1/health
curl -I -H "Host: bao.blifehealthy.com" http://127.0.0.1/admin/login
curl -I -H "Host: wap.blifehealthy.com" http://127.0.0.1/
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml logs --tail=100 api
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml logs --tail=100 bao
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml logs --tail=100 wap
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml logs --tail=100 nginx
npm run ops:check:compose-stack
```

Direct app-port checks are still available on the VPS if needed:

- `curl -s http://127.0.0.1:3000/health`
- `curl -I http://127.0.0.1:8001/admin/login`
- `curl -I http://127.0.0.1:3002/`

Public-domain validation to run after DNS is pointed at the VPS and Cloudflare proxy is enabled:

- `https://api.blifehealthy.com/health`
- `https://bao.blifehealthy.com/admin/login`
- `https://wap.blifehealthy.com`
- `https://wap.blifehealthy.com/line/liff/signin`

Or run:

```bash
npm run ops:check:public-urls
```

## Cloudflare Setup Later

1. Point these DNS records to the VPS public IP:

- `api.blifehealthy.com`
- `bao.blifehealthy.com`
- `wap.blifehealthy.com`

2. Enable the Cloudflare proxy for those records if you want Cloudflare to terminate public TLS first.

3. Keep Nginx on HTTP origin initially:

- Cloudflare edge: `HTTPS`
- VPS origin to Nginx: `HTTP :80`

4. When ready for origin TLS later, keep the same vhost split and change only:

- publish `443`
- add certificate mounts
- add `listen 443 ssl`
- optionally redirect `80 -> 443`

No application env values should need to change if the public URLs stay the same.

## Useful Commands

Show logs:

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml logs -f api
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml logs -f bao
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml logs -f wap
```

Restart a service:

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml restart api
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml restart nginx
```

Stop the stack:

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml down
```

Stop the stack and remove volumes:

```bash
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml down -v
```

## Notes

- `nginx` is now the only service intended for public exposure on the VPS.
- App services still bind to `127.0.0.1` through `PUBLIC_BIND_IP`, so they remain private behind Nginx.
- Postgres and Redis remain non-public and should not be exposed at the cloud firewall layer.
- `bao` keeps SQLite and uploads in named volumes.
- `api` keeps `logs/` and `runtime/` in named volumes.
- `worker` currently shares the same image and runtime volume as the API.
- If this release does not need Redis-backed async processing yet, `redis` can stay in place as reserved infrastructure for BAO/app compatibility.
