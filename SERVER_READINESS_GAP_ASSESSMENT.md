# Server Readiness Gap Assessment

Updated: 2026-04-09

Assessment scope:

- current repo structure
- build/lint status
- deploy artifacts
- runtime dependencies
- operational readiness for UAT / limited real usage

## Current Status

- `npm run lint`: pass
- `npm run build`: pass
- API health endpoint exists
- backup / restore scripts exist
- public auth and WAP verification scripts exist
- BAO / WAP / LINE deploy notes already exist

## Main Gaps Before Real Server Use

### 1. Worker and async infrastructure are not production-complete

Why this matters:

- If background jobs, queue processing, retries, or scheduled work are required in UAT/production, the current worker setup looks incomplete.

Evidence:

- [apps/worker/src/main.ts](/Users/macbook/poolproject/apps/worker/src/main.ts#L5) only starts an application context and prints `"[worker] started"`.
- [apps/worker/src/app.module.ts](/Users/macbook/poolproject/apps/worker/src/app.module.ts#L6) imports modules but has no providers/processors registered locally.
- [packages/infrastructure/src/queues/queue.registry.ts](/Users/macbook/poolproject/packages/infrastructure/src/queues/queue.registry.ts#L4) is a BullMQ placeholder.
- [packages/infrastructure/src/redis/redis.client.ts](/Users/macbook/poolproject/packages/infrastructure/src/redis/redis.client.ts#L1) is a Redis placeholder.
- [packages/shared/config/src/redis.config.ts](/Users/macbook/poolproject/packages/shared/config/src/redis.config.ts#L5) still hardcodes `redis://localhost:6379`.

Recommended action:

- Decide whether the worker is truly required for this release.
- If yes, wire real queue/cron dependencies and deploy Redis explicitly.
- If no, document that this release does not depend on background processing.

### 2. Container/server deploy artifacts are incomplete

Why this matters:

- The repo does not yet describe a full server deployment topology for API, worker, BAO, and WAP.

Evidence:

- [docker-compose.yml](/Users/macbook/poolproject/docker-compose.yml#L1) defines only Postgres.
- No app `Dockerfile` or server unit files were found in the repo inventory.
- [package.json](/Users/macbook/poolproject/package.json#L26) and [package.json](/Users/macbook/poolproject/package.json#L27) start API/worker directly, but there is no checked-in production process definition for `systemd`, `pm2`, or container runtime.

Recommended action:

- Pick one deploy style now: `Docker Compose`, `systemd`, or `PaaS`.
- Check in the production start definitions for API, worker, BAO, and WAP.
- Add reverse proxy configuration ownership outside or inside this repo.

### 3. Automated test coverage is still light for release confidence

Why this matters:

- Build passing is good, but it does not prove real flows are safe.

Evidence:

- [package.json](/Users/macbook/poolproject/package.json#L29) maps `test` to `pnpm run lint`.
- [tests/README.md](/Users/macbook/poolproject/tests/README.md#L3) still describes the test directories as scaffold placeholders.
- Current confidence depends heavily on smoke scripts and manual verification.

Recommended action:

- Keep using the smoke scripts for this UAT.
- Add at least one automated CI-ready end-to-end path for login, create order, approve, and deliver.

### 4. API hardening is still basic

Why this matters:

- A real public server needs stronger default protection than local/UAT-friendly defaults.

Evidence:

- [apps/api/src/main.ts](/Users/macbook/poolproject/apps/api/src/main.ts#L18) accepts request bodies up to `12mb`.
- [apps/api/src/main.ts](/Users/macbook/poolproject/apps/api/src/main.ts#L22) enables CORS but does not show `helmet`, request throttling, proxy trust, or other common edge hardening.
- [apps/api/src/main.ts](/Users/macbook/poolproject/apps/api/src/main.ts#L90) uses route-path-based access control in app code, which is workable but deserves careful regression testing before public exposure.

Recommended action:

- Put the API behind a reverse proxy.
- Add rate limiting and confirm upload limits intentionally match business needs.
- Review admin/session cookie handling and proxy headers in the deployed environment.

### 5. Secrets and runtime configuration management are not yet formalized

Why this matters:

- UAT may work with manual `.env` files, but real server operation needs a clear secret ownership model.

Evidence:

- API deployment still starts from [.env.staging.example](/Users/macbook/poolproject/.env.staging.example).
- BAO deployment still starts from [backend/.env.staging.example](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/.env.staging.example).
- WAP deployment still starts from [stephub/.env.example](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/.env.example).

Recommended action:

- Decide where secrets live on the server.
- Record who updates LINE secrets, DB credentials, and mail credentials.
- Version the non-secret env shape and keep real secrets outside the repo.

### 6. Monitoring and alerting are not visible in the repo

Why this matters:

- When UAT goes wrong, response time matters more than local convenience.

Evidence:

- There are runbooks and smoke scripts, but no checked-in monitoring, alerting, or log shipping configuration was found.

Recommended action:

- At minimum, define:
  - health check source
  - log location
  - restart command
  - on-call owner
- Prefer adding uptime checks for API, BAO, and WAP.

## What Looks Good

- [apps/api/src/health.controller.ts](/Users/macbook/poolproject/apps/api/src/health.controller.ts) exists for health verification.
- [DEPLOY_CHECKLIST.md](/Users/macbook/poolproject/DEPLOY_CHECKLIST.md) already captures important BAO/WAP/LINE flow checks.
- [CHECKLIST_LIVE_OPERATIONS.md](/Users/macbook/poolproject/CHECKLIST_LIVE_OPERATIONS.md) already captures day-to-day operator safety checks.
- [scripts/blifehealthy_uat.sh](/Users/macbook/poolproject/scripts/blifehealthy_uat.sh) already checks public UAT URLs.
- Backup and restore scripts are already present in [package.json](/Users/macbook/poolproject/package.json#L17) to [package.json](/Users/macbook/poolproject/package.json#L19).

## Practical Release Call

### Safe for UAT if

- env is injected carefully
- backups are taken first
- deploy is supervised manually
- smoke checks are run every release
- the current release does not depend on unfinished worker/queue behavior

### Not yet ideal for full production if

- you need guaranteed async jobs
- you need repeatable one-command infra boot
- you need automated rollback/deploy orchestration
- you need strong monitoring, alerting, and hardening

## Recommended Next 5 Actions

1. Decide whether worker/Redis are in scope for this release.
2. Standardize one real deploy method for API, worker, BAO, and WAP.
3. Add a small production-hardening pass to the API edge.
4. Define secret management and restart ownership.
5. Run the new runsheet plus full UAT checklist on the first server deploy.
