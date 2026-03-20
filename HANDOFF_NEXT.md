# Project Handoff

Updated: 2026-03-20

## Current Status

The project is now at a backend-first MVP stage with working local flows for:

- member signup
- sponsor/referral linking
- package creation and activation
- order creation, approval, and processing
- direct commission
- compressed unilevel commission
- daily pool close
- wallet credit posting
- company fallback ledgers
- admin UI
- member-facing signup and app

Core calculation verification is in place and currently passes:

- `bash scripts/calc-scenarios.sh`
- latest result: `10 / 10` passed
- latest report file: `runtime/calc-scenarios-report.json`

## Latest Important Change

Admin can now configure commission settings from `/admin`:

- direct rate
- unilevel level rates
- add/remove unilevel levels
- pool rate

Settings are file-backed at:

- `runtime/commission-settings.json`

These settings are now used by live calculation logic in:

- `packages/modules/commissions/src/services/commissions.service.ts`
- `packages/modules/pool/src/services/pool.service.ts`

## Main Files To Know

- `apps/api/public/admin/index.html`
- `apps/api/public/admin/app.js`
- `apps/api/public/admin/styles.css`
- `apps/api/src/admin-settings.controller.ts`
- `packages/shared/utils/src/commission-settings.util.ts`
- `packages/modules/commissions/src/services/commissions.service.ts`
- `packages/modules/pool/src/services/pool.service.ts`
- `scripts/local-smoke.sh`
- `scripts/calc-scenarios.sh`
- `scripts/calc-scenarios.js`

## Recent Commits

- `77ac93e` Add admin commission settings menu
- `aee399c` Add payout selection calc scenario
- `ab577a3` Write calc scenario report artifacts
- `567150a` Extend calc harness with duplicate guards
- `505be29` Extend calculation scenarios
- `0526650` Add calculation scenario harness
- `94dbee8` Persist auth sessions to disk
- `5e1f562` Add API audit logging
- `c76f190` Tighten route access policy
- `772ebd8` Hash passwords in auth flows

## How To Run

### Local smoke

```bash
bash scripts/local-smoke.sh
```

### Calculation scenarios

```bash
bash scripts/calc-scenarios.sh
```

### Admin UI

After API is running:

- `http://127.0.0.1:3000/admin`

Dev admin login:

- `ALICE`
- `dev-password`

### Member UI

- signup: `http://127.0.0.1:3000/`
- member app: `http://127.0.0.1:3000/app`

## Important Runtime Notes

- `scripts/local-smoke.sh` and `scripts/calc-scenarios.sh` now delete `runtime/commission-settings.json` before running.
- This is intentional so tests stay deterministic even if admin changed rates from the UI.
- Auth sessions are file-backed in `runtime/auth-sessions.json`.
- API audit logs are written to `logs/api-audit.jsonl`.
- `runtime/` and `logs/` are gitignored.

## What Is Still Not Production-Ready

- payout execution lifecycle
- reconciliation and reversals
- strong role/permission model
- transaction/concurrency hardening
- richer automated test coverage beyond current smoke/harness
- deploy/staging/prod hardening

## Best Next Steps

1. Add admin settings coverage to calc harness.
   - Verify changed direct rate affects direct amount.
   - Verify added uni levels produce extra uni drafts.
   - Verify changed pool rate affects pool fund.

2. Add a small admin/settings smoke flow.
   - Save settings through API.
   - Read them back.
   - Confirm admin UI uses returned values.

3. Harden settings behavior.
   - optional reset-to-default action
   - upper bounds / sanity validation for rates and number of levels
   - audit logging for settings updates

4. Then move to payout/reconciliation or staging-readiness work.

## Suggested Restart Point

If resuming next round, start here:

- verify `/settings/commissions` end-to-end with a dedicated scenario
- then extend `scripts/calc-scenarios.js` so it proves admin-configured rates actually change commission and pool outputs
