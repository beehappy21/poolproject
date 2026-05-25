# Monitoring And Alerting

PR7 adds safe health/readiness endpoints and lightweight process metrics for production monitoring.

## Health Endpoints

- `GET /health`: public lightweight liveness check. Does not call database or Redis.
- `GET /health/live`: public liveness check. Confirms the API process can respond.
- `GET /health/ready`: public readiness check. Verifies database, Redis, audit log writability, and loaded config.
- `GET /metrics`: public Prometheus-style text metrics when `METRICS_ENABLED=true`.

Expected status codes:

- `/health` and `/health/live` return `200` when the process is alive.
- `/health/ready` returns `200` only when critical dependencies are ready.
- `/health/ready` returns `503` with sanitized dependency status when database, Redis, or audit log readiness fails.

Health responses must never include `DATABASE_URL`, Redis URLs, tokens, secrets, stack traces, or internal file paths.

## Recommended Checks

- Uptime monitor: `GET https://api.blifehealthy.com/health/live`
- Load balancer readiness: `GET http://127.0.0.1:3000/health/ready`
- Container healthcheck: `GET http://127.0.0.1:3000/health/ready`
- Metrics scrape: `GET https://api.blifehealthy.com/metrics` if exposed to a trusted monitoring network

## Recommended Alerts

- `/health/ready` fails for 2 consecutive checks.
- API 5xx rate is above baseline for 5 minutes.
- Database dependency is `down`.
- Redis dependency is `down`.
- Login failures spike above baseline.
- Brute-force lock events spike above baseline.
- Rate-limit events spike above baseline.
- Audit log write failures appear in logs.
- Disk usage exceeds 80%, especially the log volume.
- Backup failure alert, dependent on the future backup/restore PR.

## Suggested Notification Channels

- Primary: on-call chat channel.
- Secondary: email or SMS for `/health/ready` sustained failure.
- Security: separate security channel for login spikes, brute-force locks, and audit failures.

## Incident Runbook

API down:

- Check `/health/live` and container status.
- Check recent deploy/startup logs.
- Verify environment validation did not fail at boot.
- Roll back the latest deployment if startup failure follows a release.

Database down:

- Confirm `/health/ready` reports database `down`.
- Check Postgres container/service health and disk usage.
- Verify credentials were not rotated incorrectly.
- Avoid restarting the API repeatedly until database health is restored.

Redis down:

- Confirm `/health/ready` reports Redis `down`.
- Check Redis container/service health and network reachability.
- Expect sessions, rate limits, and brute-force protection to be affected in production.
- Restore Redis before scaling API instances.

Suspicious login spike:

- Review centralized audit events for `auth.login.failed`, `auth.login.lock.created`, and `auth.login.locked`.
- Confirm rate-limit events for `/auth/login`.
- Temporarily tighten edge/WAF rules if attack traffic is obvious.
- Do not reveal whether specific accounts exist.

Disk or log growth:

- Check audit log rotation settings: `AUDIT_LOG_MAX_BYTES` and `AUDIT_LOG_MAX_FILES`.
- Verify host-level disk usage and log volume mount.
- Archive or ship logs before deleting if incident evidence may be needed.

## Smoke Test

Run:

```bash
npm run smoke:health
```

Override the target API without secrets:

```bash
API_BASE_URL=https://api.blifehealthy.com npm run smoke:health
```

## Follow-Up TODOs

- Restrict `/metrics` to trusted networks or protect it at the edge if public exposure is not desired.
- Add centralized log shipping and alert routing.
- Share a single Redis provider across health, sessions, brute-force, and rate limiting.
- Add worker-specific health checks if/when the worker exposes an HTTP endpoint.
- Add backup/restore alerts in the backup PR.
