# API Hardening

## Security Headers

The API uses Helmet during bootstrap. It standardizes security headers including:

- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- HSTS when `APP_ENABLE_HSTS=true`

Content Security Policy is deferred because this API also supports storefront, LINE, and receipt flows. CSP should be reviewed separately with the frontend origins and callback paths.

## Validation Policy

Global `ValidationPipe` is enabled with:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`
- `forbidUnknownValues: true`

New write endpoints should use DTO classes with validation decorators. Unknown fields should be rejected instead of silently accepted.

## Body Limits

Default JSON and URL-encoded body limit is controlled by `APP_BODY_LIMIT` and should stay small. Production validation requires it to be `2mb` or lower.

Upload-like routes use `APP_UPLOAD_BODY_LIMIT`, capped at `10mb` in production. This is reserved for slip, KYC, and upload payloads that legitimately carry larger base64 data.

## Upload And Base64 Safety

Image references may be HTTPS URLs or data URLs using:

- `image/jpeg`
- `image/png`
- `image/webp`

Script-like or HTML data URLs are rejected. Base64 image payloads are size-checked before use with `APP_UPLOAD_MAX_BASE64_BYTES`.

## CORS Policy

Production CORS origins must come from `APP_CORS_ORIGINS`. Do not broaden CORS with wildcards when credentials are enabled.

Expected production origins should include only the real WAP, API, and admin/storefront domains that need browser access.

## Follow-Up

- Review CSP once frontend and LINE callback requirements are fully mapped.
- Continue converting legacy inline `@Body()` object types to DTO classes as routes are touched.
