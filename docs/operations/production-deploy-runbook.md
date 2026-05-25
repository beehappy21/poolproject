# Production Deploy Runbook

This runbook is the human procedure for a production deploy. It assumes the security and operations controls from PR1-PR9 are already merged.

## 1. Pre-Deploy

- Announce the deploy window, expected impact, and rollback owner.
- Confirm the exact commit to deploy with `git rev-parse HEAD`.
- Confirm GitHub Actions passed for the commit.
- Confirm no uncommitted production changes are present.
- Confirm production secrets are loaded outside the repository.
- Run `npm run security:check-env` with the production env file or deployment environment.
- Run `npm run ops:backup:db` before any migration or service restart.
- Confirm the latest backup file exists and is readable by the restore process.

## 2. Release Tagging

Use a timestamped production tag after the deploy candidate is approved:

```bash
git tag prod-YYYYMMDD-HHMM <commit-sha>
git push origin prod-YYYYMMDD-HHMM
```

Record the tag, commit SHA, deploy time, deploy owner, and rollback target in the incident/deploy log.

## 3. Deploy

- Pull or ship the approved artifact for the exact commit.
- Install dependencies with the locked package set.
- Run database migrations only after backup confirmation.
- Restart API and worker services.
- Confirm the running version maps to the expected commit or tag.
- Do not print env files, database URLs, Redis URLs, or tokens in logs or chat.

For Docker Compose deployments, keep the command sequence explicit and environment-specific. A typical flow is:

```bash
docker compose pull
docker compose up -d --remove-orphans
docker compose ps
```

If the environment builds locally instead of pulling images, build from the reviewed commit only.

## 4. Post-Deploy Verification

Run the automated smoke checks:

```bash
npm run smoke:production
```

Then verify:

- `/health` returns success quickly.
- `/health/live` returns success.
- `/health/ready` returns success and covers database, Redis, audit log, and config readiness.
- `/metrics` is reachable if enabled.
- Login endpoint reaches the handler without being blocked by global guards.
- Public storefront package/product routes respond if enabled for the environment.
- Security headers are present.
- CORS returns the approved origin when `SMOKE_ALLOWED_ORIGIN` is configured.

## 5. First 30-60 Minutes

Watch:

- API 5xx rate.
- `/health/ready` failures.
- Database connection errors.
- Redis errors.
- Login failures and brute-force lock counts.
- Rate-limit exceeded events.
- Audit log write failures.
- Disk usage and audit log growth.
- Order/payment/wallet errors reported by business users.

## 6. Communications

- Notify stakeholders when deploy starts.
- Notify stakeholders when smoke tests pass.
- Keep the rollback owner available until the watch window closes.
- Record any warnings, known issues, and follow-up tasks.

## 7. Completion Criteria

The deploy is complete only when health checks, smoke tests, monitoring, and critical business checks pass through the watch window.
