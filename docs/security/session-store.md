# Session Store

Production session persistence must use a shared store rather than in-memory or runtime-file state.

## Why Memory/File Sessions Are Not Safe

- in-memory sessions do not survive restarts
- in-memory sessions do not work across multiple API instances
- runtime JSON files can leak stale session state
- local file persistence is not suitable for revoke/logout-all across replicas

## Redis Session Store Behavior

- production uses Redis-backed session storage
- session records are stored under a configurable key prefix
- session TTL is enforced through Redis expiration
- each member also has a Redis set of active session hashes for logout-all

## Token Hashing Rule

- raw session tokens are never stored in Redis or local files
- the API hashes the raw token with HMAC-SHA256 before persistence and lookup
- `AUTH_SESSION_HMAC_SECRET` must be present and strong in production

## TTL Behavior

- `AUTH_SESSION_TTL_SECONDS` controls session lifetime
- active requests refresh the session TTL
- expired sessions are treated as invalid and are not returned

## Revoke And Logout-All

- logout revokes only the current session token
- logout-all revokes every active session for the current member
- both flows operate on hashed token records

## Required Env Vars

- `APP_REDIS_URL` or `REDIS_URL`
- `AUTH_SESSION_HMAC_SECRET`

Optional:

- `AUTH_SESSION_TTL_SECONDS`
- `AUTH_SESSION_KEY_PREFIX`

## Local Dev/Test Behavior

- development and test may use the in-memory session store when Redis is not configured
- the in-memory store is dev/test only and must not be used in production
- runtime `auth-sessions.json` persistence is no longer part of the API session flow

## Operations Notes

- Redis availability is required for production login/session validation
- if Redis is unavailable, production startup should fail rather than silently falling back to local state
- rotate `AUTH_SESSION_HMAC_SECRET` carefully because changing it invalidates existing sessions
