# Local Runbook

## Quick Start

1. Check repo is clean.

```bash
git -C /Users/macbook/poolproject status --short
```

Expected: no output

2. Check local API.

```bash
curl -s http://127.0.0.1:3000/health
```

Expected:

```json
{"status":"ok"}
```

3. Check BAO login page.

Open:

```text
http://127.0.0.1:8001/admin/login
```

4. Check WAP local routes.

Open:

```text
http://127.0.0.1:3002/
http://127.0.0.1:3002/product
http://127.0.0.1:3002/description
```

Expected: all routes return and do not blank on reload.

5. Verify local/public WAP surface.

```bash
bash /Users/macbook/poolproject/scripts/wap-refresh-verify.sh --verify-only
```

Expected: finishes with `WAP refresh/verify complete.`

## Bundle Check

If WAP looks stale or you suspect an old bundle is being used, compare the root route and a nested route:

```bash
curl -s http://127.0.0.1:3002/ | rg -o 'main\.[a-f0-9]+\.js'
curl -s http://127.0.0.1:3002/product | rg -o 'main\.[a-f0-9]+\.js'
```

Expected: both commands return the same hash.

## Product Smoke

For product editor and WAP product verification:

1. Open BAO product edit page.
2. Update gallery images.
3. Reorder gallery images.
4. Update rich description.
5. Save.
6. Open the matching WAP product page and confirm:
   - slider image order matches BAO
   - updated description renders correctly
   - images fit the layout

## Known Good Local Endpoints

- API: `http://127.0.0.1:3000/health`
- BAO: `http://127.0.0.1:8001/admin/login`
- WAP: `http://127.0.0.1:3002/`
- Public WAP: `https://wap.blifehealthy.com`
- Public BAO: `https://bao.blifehealthy.com/admin/login`
- Public API: `https://api.blifehealthy.com/health`

## Notes

- Local storefront API path is:

```text
http://127.0.0.1:3000/products/storefront
```

- If BAO product save fails with large images, confirm BAO is running with raised PHP upload limits.
- The WAP static server is expected to serve the current `build/index.html` for nested routes like `/product` and `/description`.
