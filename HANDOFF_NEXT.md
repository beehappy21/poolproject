# Handoff Next

Updated: 2026-04-08

## Current State

- current branch: `main`
- current HEAD: `123b072f`
- working tree: clean
- latest merged PRs:
  - `#116` merged as `a94fd077`
  - `#117` merged as `123b072f`

## What Was Completed

### BAO product editor

- upgraded the product `Description` field into a rich editor in:
  - `/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/product/edit-form.blade.php`
- added support for:
  - bold / italic / underline
  - paragraph / heading
  - left / center / right align
  - bullet / numbered list
  - font size
  - text color
  - quick icons and emoji
  - `More icons` popup
  - insert image by URL
  - upload image directly into description
  - preview panel
  - remove selected image / remove all images
  - image overlay remove button

### BAO image handling

- added client-side image compression before submit for:
  - gallery images
  - home card image
  - uploaded images inside description
- this was done to avoid `PostTooLargeException`
- BAO local server is currently running with:
  - `upload_max_filesize=32M`
  - `post_max_size=64M`

### BAO gallery ordering

- gallery images can now be reordered in BAO
- desktop:
  - drag and drop
  - `←` / `→` buttons
- mobile:
  - touch drag and drop
- first image is marked as `ภาพหลัก`
- gallery order is persisted on save through:
  - `product[gallery_order][]`
  - backend merge logic in `ProductEditScreen.php`

### WAP product rendering

- WAP product page now renders rich HTML descriptions safely
- description images are constrained to fit the container
- long description area is collapsed with show more / collapse behavior
- product page refreshes latest product data from API instead of relying only on route state
- product image URLs get cache-busting query params to reduce stale image issues
- top product slider was adjusted to fit images more safely in frame

### WAP route stability

- added lowercase route aliases for:
  - `/product`
  - `/description`
- fixed the local static server fallback so nested routes use the current `build/index.html`
- this removed the old blank white page issue when reloading subroutes

### Runbook

- added:
  - `/Users/macbook/poolproject/RUNBOOK.md`
- purpose:
  - quick startup verification
  - bundle check
  - BAO/WAP product smoke steps

## Important Files

- static server:
  - `/Users/macbook/poolproject/scripts/serve_stephub_build.mjs`
- BAO product screen save logic:
  - `/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Product/ProductEditScreen.php`
- BAO product edit UI:
  - `/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/product/edit-form.blade.php`
- WAP product page:
  - `/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Product.tsx`
- WAP description page:
  - `/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Description.tsx`
- WAP route config:
  - `/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/navigation/StackNavigator.tsx`
- rich text sanitizer/render helper:
  - `/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/utils/index.tsx`
- live catalog mapper:
  - `/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/utils/liveCatalog.ts`

## Verified Runtime State

- local API health:
  - `http://127.0.0.1:3000/health` returns `{"status":"ok"}`
- local storefront products:
  - `http://127.0.0.1:3000/products/storefront` returns live storefront payload
- local BAO:
  - `http://127.0.0.1:8001/admin/login` returns login redirect/page correctly
- local WAP:
  - `http://127.0.0.1:3002/` returns `200`
  - `http://127.0.0.1:3002/product` returns `200`
  - `http://127.0.0.1:3002/description` returns `200`
- public surface:
  - `https://wap.blifehealthy.com` returns `200`
  - `https://bao.blifehealthy.com/admin/login` returns `200`
  - `https://api.blifehealthy.com/health` returns `200`
- smoke / verify:
  - `node scripts/check_wap_public_surface.js` returned `result: ok`
  - `bash scripts/wap-refresh-verify.sh --verify-only` completed successfully
- local and nested WAP routes were verified to use the same bundle hash

## Processes Currently Running

- API on `3000`
- BAO on `8001`
- WAP static build server on `3002`
- `cloudflared tunnel run blifehealthy`

These were intentionally left running.

## Backup / Recovery Points

- backup tag for PR `#116` work:
  - `backup-pr116-20260408`
- backup branch for PR `#116` work:
  - `backup/latest-pr116-20260408`

## PR / Commit Reference

- PR `#116`
  - title: `Polish BAO product editor and WAP product rendering`
  - merged commit on `main`: `a94fd077`
- PR `#117`
  - title: `Add local runbook for BAO and WAP checks`
  - merged commit on `main`: `123b072f`

## Recommended Next Steps

1. If continuing product/admin work, start from `main` only.
2. Use `RUNBOOK.md` for startup checks instead of older ad hoc notes.
3. If touching BAO product media again, preserve:
   - gallery order behavior
   - touch drag support
   - client-side compression
4. If touching WAP routing or static serving, preserve:
   - lowercase `/product` and `/description`
   - current nested-route fallback in `serve_stephub_build.mjs`
5. If any image-staleness issue appears again, inspect:
   - `Product.tsx`
   - `liveCatalog.ts`
   - cache-busting on image URLs

## Quick Start Next Session

1. `git -C /Users/macbook/poolproject status --short`
2. `curl -s http://127.0.0.1:3000/health`
3. open `http://127.0.0.1:8001/admin/login`
4. open `http://127.0.0.1:3002/`
5. run:

```bash
bash /Users/macbook/poolproject/scripts/wap-refresh-verify.sh --verify-only
```

6. if WAP looks stale, compare bundle hash on `/` and `/product`

## Notes

- local storefront route is `http://127.0.0.1:3000/products/storefront`
- earlier `404` seen on `/api/products/storefront` was only a wrong check path, not a runtime bug
- branch cleanup was already done for:
  - `codex/product-sales-channel-modes`
  - `codex/add-runbook`
