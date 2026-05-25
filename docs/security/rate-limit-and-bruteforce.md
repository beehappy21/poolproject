# Rate Limit And Brute Force Protection

Production rate limiting must use Redis-backed shared state. Process-local memory limits are only acceptable for development and test because they reset on restart and do not work across multiple API instances.

## Redis-Backed Rate Limit

- production uses `APP_REDIS_URL` or `REDIS_URL`
- keys use `RATE_LIMIT_KEY_PREFIX`, defaulting to `poolproject:ratelimit:`
- request identity uses hashed IP, hashed route group, and hashed login identifier when available
- password, raw token, and raw login identifier values must never appear in keys or logs

## Route Profiles

- global default: `RATE_LIMIT_WINDOW_SECONDS` / `RATE_LIMIT_MAX_REQUESTS`, with legacy `APP_RATE_LIMIT_*` fallback
- `POST /auth/login`: `AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS` / `AUTH_LOGIN_RATE_LIMIT_MAX`
- `POST /auth/line-login`: `LINE_LOGIN_RATE_LIMIT_WINDOW_SECONDS` / `LINE_LOGIN_RATE_LIMIT_MAX`
- admin-sensitive auth routes: `ADMIN_AUTH_RATE_LIMIT_WINDOW_SECONDS` / `ADMIN_AUTH_RATE_LIMIT_MAX`
- order and wallet routes: `ORDER_RATE_LIMIT_WINDOW_SECONDS` / `ORDER_RATE_LIMIT_MAX`
- upload, slip, and receipt routes: `UPLOAD_RATE_LIMIT_WINDOW_SECONDS` / `UPLOAD_RATE_LIMIT_MAX`
- public product/package catalog reads: `PUBLIC_CATALOG_RATE_LIMIT_WINDOW_SECONDS` / `PUBLIC_CATALOG_RATE_LIMIT_MAX`

Ambiguous routes keep the global default until reviewed.

## Login Brute Force Lock

- failed login attempts are tracked by hashed identifier and hashed IP
- repeated failures create a temporary lock
- default failure window is 15 minutes
- default lock threshold is 5 failures
- default lock duration is 15 minutes
- successful login clears failed counters for that identifier and IP
- login errors remain non-enumerating and return `Invalid credentials.`

## Operations Notes

- monitor `logs/security-audit.jsonl` for `auth.login.failed`, `auth.login.lock.created`, and `auth.login.locked`
- Redis availability is required in production for shared rate-limit and lockout state
- sensitive auth routes fail closed if Redis rate-limit checks error
- non-sensitive routes fail open on rate-limit store errors to avoid broad API outage from a transient Redis read failure
