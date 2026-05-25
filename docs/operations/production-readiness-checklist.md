# Production Readiness Checklist

Use this checklist before the first production launch and before any high-risk production deployment. Do not treat a partial pass as go-live approval unless the owner records the exception and rollback plan.

## A. Code Readiness

- [ ] PR1 deny-by-default access control is merged: `4fe0c25d`.
- [ ] PR2 environment and secret validation is merged: `9f65f493`.
- [ ] PR3 Redis-backed session store is merged: `98fec475`.
- [ ] PR4 Redis-backed rate limiting and brute-force protection is merged: `2c194bcc`.
- [ ] PR5 API hardening is merged: `e304ffe1`.
- [ ] PR6 production audit logging is merged: `8b84ffa0`.
- [ ] PR7 health monitoring is merged: `cd62e391`.
- [ ] PR8 backup and restore workflows are merged: `d9b2eba5`.
- [ ] PR9 CI/CD security workflow is merged: `61df47ac`.
- [ ] GitHub Actions are passing for the deployed commit.
- [ ] `git status` is clean except explicitly excluded local notes.
- [ ] Dependency audit policy is understood. Critical advisories block release; known high advisories are documented until fixed.
- [ ] Gitleaks is configured in CI and no secret findings are open.

## B. Environment Readiness

- [ ] Production environment passes `npm run security:check-env`.
- [ ] Every value in `.env.production.example` is mapped to a real production value.
- [ ] No default, local, test, or placeholder secrets are used.
- [ ] `DATABASE_URL` points to the production database.
- [ ] `APP_REDIS_URL` or `REDIS_URL` points to production Redis.
- [ ] LINE settings are confirmed if LINE login is enabled.
- [ ] `LINE_STRICT_VERIFY=true` in production when LINE login is enabled.
- [ ] `CORS_ALLOWED_ORIGINS` contains only approved production origins.
- [ ] Audit log directory, rotation size, and retained file count are confirmed.
- [ ] Backup directory, retention days, and restore drill target are confirmed.

## C. Infrastructure Readiness

- [ ] HTTPS and reverse proxy routing are configured.
- [ ] API process can reach PostgreSQL.
- [ ] API process can reach Redis.
- [ ] Disk capacity and log retention are configured.
- [ ] Database backup storage is available and access-controlled.
- [ ] Monitoring checks are configured for `/health/ready`.
- [ ] Health endpoints are reachable from the load balancer or uptime monitor.
- [ ] Firewall/security groups expose only required ports.

## D. Security Readiness

- [ ] API routes are private by default and public routes use `@Public()`.
- [ ] Role-restricted routes use `@Roles()`.
- [ ] Production rejects missing, short, default, or unsafe secrets.
- [ ] Sessions use Redis-backed shared storage.
- [ ] Raw session tokens are not persisted.
- [ ] Rate limiting uses Redis in production.
- [ ] Login brute-force lockout is enabled.
- [ ] Helmet, global `ValidationPipe`, DTO validation, and body limits are active.
- [ ] Audit logs redact sensitive fields and rotate.
- [ ] CI runs build, lint, tests, env validation, audit, shell syntax, and secret scanning.

## E. Data Readiness

- [ ] Pre-deploy database backup is taken with `npm run ops:backup:db`.
- [ ] Backup retention cleanup has been dry-run and reviewed.
- [ ] Restore drill has completed successfully in staging/test.
- [ ] RPO and RTO are recorded in `docs/operations/backup-and-restore.md`.
- [ ] Migration plan is reviewed, including whether rollback requires app-only rollback or data restore.
- [ ] Data owners approve launch timing.

## F. Business Flow Readiness

- [ ] Member login works.
- [ ] Admin login works.
- [ ] LINE login works if enabled.
- [ ] Referral flow works.
- [ ] Product and package listing works.
- [ ] Order creation works.
- [ ] Slip upload or payment proof submission works.
- [ ] Admin approve/reject order flow works.
- [ ] Wallet topup and withdraw flows work if enabled.
- [ ] Commission and pool checks match expected launch rules.
- [ ] Receipt generation works.

## G. Go/No-Go Criteria

- [ ] All mandatory checks above pass.
- [ ] `npm run smoke:production` passes against the target environment.
- [ ] Rollback runbook has been reviewed by the deploy owner.
- [ ] Incident response owner is assigned for the launch window.
- [ ] Monitoring owner is watching the first 30-60 minutes.
- [ ] Business owner gives final go approval.

If any required check fails, the default decision is no-go until the issue is fixed or explicitly accepted with an owner, expiry date, and rollback plan.
