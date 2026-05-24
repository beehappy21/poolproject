# Env And Secrets

Production startup now validates API environment configuration before Nest boots.

## Required Production Variables

- `NODE_ENV=production`
- `DATABASE_URL`
- `APP_WAP_URL`
- `APP_PUBLIC_BASE_URL` or `APP_BASE_URL`
- `APP_CORS_ORIGINS`
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
- `LINE_CHANNEL_SECRET`
- `LINE_LOGIN_CHANNEL_SECRET`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_OVERRIDE_PASSWORD`
- database passwords embedded inside `DATABASE_URL`

## Minimum Length Guidance

- secret/token values: at least `32` characters
- production passwords: at least `12` characters

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
