# BAO and WAP Baseline

Recorded at: 2026-04-11 16:53:02 +07
Timezone: Asia/Bangkok
Git branch: `main`
Git commit: `3414dbb7`
Git tag: `bao-wap-baseline-2026-04-11`

## Scope

This baseline captures the agreed runtime state for the BAO and WAP systems after the category image URL fix, BAO GD installation, and live Firm Catalog image re-upload verification completed in this session.

## Baseline State

- BAO category image URLs now resolve to public-facing storage URLs that browsers can load.
- WAP can consume category image URLs from BAO without falling back to `Image unavailable` for the Firm Catalog case addressed in this session.
- BAO runtime image includes PHP GD with JPEG, PNG, WebP, and FreeType support.
- BAO category image uploads now support automatic server-side resize when the uploaded image exceeds the configured dimension limit.

## Runtime Verification

- BAO container rebuilt and restarted successfully on `nc-user@202.94.169.245`.
- `php -m` inside BAO includes `gd`.
- `function_exists("gd_info")` returned `true` inside BAO.
- BAO container health status reached `healthy` after restart.

## Firm Catalog Verification

- Category verified: `Firm Catalog`
- Category id: `16`
- Previous stored image path: `categories/ddaf6626-f955-45b8-b932-50e81d5c79ad.png`
- New stored image path after re-upload: `categories/98576da3-8655-4c3b-aec5-8d0952e16bff.png`
- Previous file size: `7,045,510 bytes`
- New file size after resize: `3,222,077 bytes`
- Previous dimensions: `2816x1536`
- New dimensions after resize: `2048x1117`
- Public URL verified with HTTP 200:
  `https://wap.blifehealthy.com/storage/categories/98576da3-8655-4c3b-aec5-8d0952e16bff.png`

## Notes

- This document is the written baseline reference for BAO and WAP as of the timestamp above.
- The matching Git baseline marker is the annotated tag `bao-wap-baseline-2026-04-11`.
