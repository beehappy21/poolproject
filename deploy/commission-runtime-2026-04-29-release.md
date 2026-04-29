# Commission Runtime Release 2026-04-29

This bundle contains the commission and admin runtime changes completed on 2026-04-29.

## Scope

- Direct commission runs immediately when an order becomes `approved`
- `2leg / 3leg`, `Matching`, and `Pool` run in the end-of-day flow
- Daily cap applies only to `2leg / 3leg`
- Pool uses same-day approved PV funding
- Pool qualification is `qualify today -> receive tomorrow`
- Pool payout per member is capped at `3%` of real paid pool-enabled purchase amount for that day
- `/admin` local commission console is restored for runtime controls

## Bundle Contents

- `apps/api/public/admin/index.html`
- `apps/api/public/app/index.html`
- `apps/api/src/admin-ui.controller.ts`
- `packages/modules/commissions/src/commissions.module.ts`
- `packages/modules/commissions/src/controllers/commissions.controller.ts`
- `packages/modules/commissions/src/domain/commissions.types.ts`
- `packages/modules/commissions/src/services/commissions.service.ts`
- `packages/modules/orders/src/repositories/orders.repository.ts`
- `packages/modules/pool/src/domain/pool.types.ts`
- `packages/modules/pool/src/repositories/pool.repository.ts`
- `packages/modules/pool/src/services/pool.service.ts`
- `docs/technical-design/pool_daily_eod_spec.md`
- `HANDOFF_NEXT.md`
- `CHECKLIST_LIVE_OPERATIONS.md`
- `tmp/archived_admin_ui_2026-04-28/admin/index.html`
- `tmp/archived_admin_ui_2026-04-28/admin/app.js`
- `tmp/archived_admin_ui_2026-04-28/admin/styles.css`

## Server Notes

1. Unzip from the project root so paths land in the same locations.
2. Rebuild/restart the API runtime after replacing files.
3. Verify:
   - `/health`
   - `/admin`
   - `POST /commissions/end-of-day/:settlementDate/process`
4. Current local operator login reference:
   - `TH0000013 / a1a1a1`
