# Env And Secrets

Production startup now validates API environment configuration before Nest boots.

## Required Production Variables

- `NODE_ENV=production`
- `DATABASE_URL`
- `APP_WAP_URL`
- `APP_PUBLIC_BASE_URL` or `APP_BASE_URL`
- `APP_CORS_ORIGINS`
- `APP_REDIS_URL` or `REDIS_URL`
- `AUDIT_LOG_ENABLED=true`
- `AUTH_SESSION_HMAC_SECRET`
- `INTERNAL_BAO_BASE_URL`
- `INTERNAL_RECEIPT_TOKEN`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_MEMBER_CODE`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_OVERRIDE_PASSWORD`

If LINE login is enabled, production must also provide:

- `LINE_CHANNEL_ID` or `LINE_LOGIN_CHANNEL_ID`
- `LINE_CHANNEL_SECRET` or `LINE_LOGIN_CHANNEL_SECRET`
- `LINE_LOGIN_CALLBACK_URL`
- `LINE_LIFF_ID`
- `LINE_LIFF_SIGNIN_URL`
- `LINE_STRICT_VERIFY=true`

## Secrets

Treat these as secrets and keep them out of source control:

- `INTERNAL_RECEIPT_TOKEN`
- `AUTH_SESSION_HMAC_SECRET`
- `LINE_CHANNEL_SECRET`
- `LINE_LOGIN_CHANNEL_SECRET`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_OVERRIDE_PASSWORD`
- database passwords embedded inside `DATABASE_URL`
- database passwords embedded inside `BACKUP_DATABASE_URL`, `RESTORE_DATABASE_URL`, or `DRILL_DATABASE_URL`

## Minimum Length Guidance

- secret/token values: at least `32` characters
- production passwords: at least `12` characters
- `AUTH_SESSION_TTL_SECONDS` must be a positive integer if provided
- `AUTH_SESSION_KEY_PREFIX` must not be empty if provided
- `APP_BODY_LIMIT` must be a positive size and must be `2mb` or lower in production
- `APP_UPLOAD_BODY_LIMIT` must be a positive size and must be `10mb` or lower in production
- `APP_UPLOAD_MAX_BASE64_BYTES` must be a positive integer if provided
- `APP_ENABLE_HSTS` must be `true` or `false` if provided
- `AUDIT_LOG_ENABLED` and `AUDIT_LOG_CONSOLE` must be `true` or `false` if provided
- `AUDIT_LOG_DIR` and `AUDIT_LOG_FILE` must not be empty if provided
- `AUDIT_LOG_MAX_BYTES` and `AUDIT_LOG_MAX_FILES` must be positive integers if provided
- `HEALTH_READINESS_TIMEOUT_MS` must be a positive integer if provided
- `METRICS_ENABLED` must be `true` or `false` if provided
- `METRICS_PATH` must be a safe relative HTTP path if provided
- backup scripts use `BACKUP_DATABASE_URL`, `RESTORE_DATABASE_URL`, or `DRILL_DATABASE_URL` when provided; treat them as secrets like `DATABASE_URL`
- rate limit and login lockout numeric values must be positive integers if provided
- `RATE_LIMIT_KEY_PREFIX` and `AUTH_LOGIN_BRUTE_FORCE_KEY_PREFIX` must not be empty if provided

## Strong Secret Generation

Examples:

```bash
openssl rand -base64 48
openssl rand -hex 32
```

## Rules

- Never commit real `.env` files
- Production must not use default/dev secrets
- Production must not use placeholder values
- Secret values must never appear in validation error output
- Production session storage must use Redis-backed shared state rather than local memory/file persistence
- Production rate limiting and login brute-force protection must use Redis-backed shared state
- Production audit logging must remain enabled and use bounded file rotation or external log shipping

## Validation

Run:

```bash
npm run security:check-env
```

This validates `.env.production.example` by default using the same rules enforced at API startup.

To validate a different file, run the built validator directly:

```bash
node dist/apps/api/apps/api/src/config/env.validation.run.js path/to/file.env
```
