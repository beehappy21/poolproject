# Next Session

Updated: 2026-05-05

## Branch

- Current branch: `main`
- Latest merged PR: `#129` `https://github.com/beehappy21/poolproject/pull/129`
- Main is currently at merge commit `9cab767b`

## Latest Session Update

- PR `#129` is merged into `main`:
  - worker bootstrap circular-dependency fix
  - direct module-file imports in the auth/members/wallets/commissions/worker chain
  - `AuthCoreModule` added to narrow the auth dependency surface used by wallets
  - temporary `AuthModule` debug logging removed before merge
- Local validation passed before merge:
  - `npm run lint`
  - `npm run build`
- VPS dry-run status reached a usable pre-server checkpoint:
  - Stage 1 local pre-copy verification passed
  - Stage 2 VPS pre-boot verification passed after installing user-level `nvm` and `Node 20`
  - Stage 3 core stack passed for `postgres`, `redis`, `api`, `bao`, `wap`, and `nginx`
  - compatibility views were applied
  - host-header checks passed for API / BAO / WAP
- Worker is now stable on VPS after the merged bootstrap fix:
  - `docker compose ps worker` reached stable `Up`
  - logs show `[worker] started`
  - no remaining Nest module/import bootstrap error
- Stage 4 status so far:
  - `npm run smoke:wap:surface` passed
  - `npm run smoke:bao:all` is blocked on the VPS host because `./node_modules/.bin/prisma` is missing there
  - `npm run smoke:pool:all` is blocked by the destructive reset guard and should not be forced on a non-disposable VPS DB
- Important worker note:
  - worker stability was not solved by source sync alone
  - worker needed the module-bootstrap fix from PR `#129`
  - stale Docker cache was explicitly ruled out with a `--no-cache` worker rebuild during investigation
- Current safest next step:
  - inspect the BAO and pool smoke scripts
  - decide whether each smoke is intended for VPS host execution, local-only execution, or a dockerized smoke runner
  - do not force `ALLOW_DESTRUCTIVE_LOCAL_RESET=1` on the VPS unless using a disposable/test DB

## Immediate Next Steps

1. Inspect `smoke:bao:all` and determine whether it assumes host-installed `node_modules` / Prisma tooling on the VPS
2. Inspect `smoke:pool:all` and determine whether it is intentionally local-only because of destructive reset behavior
3. Decide whether BAO/pool smoke should run:
   - on local only
   - in Docker on the VPS
   - or against a disposable VPS test DB
4. If commission-round / pool baseline work resumes after deploy verification, first clean the local baseline test orders and rerun the baseline once for a final clean report

## Recently Merged Work

- PR `#14` is already merged into `main`
- PR `#15` is already merged into `main`
- PR `#16` is already merged into `main`
- PR `#17` is already merged into `main`
- PR `#18` is already merged into `main`
- PR `#19` is already merged into `main`
- Recent pool/commission/browser-check commits:
  - `03632e5` Add configurable pool rule coverage and commission summaries
  - `9e652b6` Snapshot pool item rates on orders and fix pool-rate precision
  - `56bb3ed` Merge PR `#15` into `main`
  - `78da058` Merge PR `#16` into `main`
  - `ffa680f` Merge PR `#17` into `main`
  - `cde35ea` Merge PR `#18` into `main`
  - `05b20f0` Merge PR `#19` into `main`

## What To Do Next

1. If the commission-round / pool baseline work continues, first clean the local baseline test orders and rerun the baseline once for a final clean report
2. If deployment work continues, follow `DEPLOY_CHECKLIST.md`
3. Use `docs/technical-design/commission_plan_summary.md` as the single summary for plan-calculation status
4. If wallet/DCW work continues, the next high-value slice is member-facing CW/SW/DCW UI and/or richer admin review tooling beyond the current local admin panel
5. If member work continues, the next obvious slice is a reusable member import/reset helper plus explicit login/reset guidance in admin beyond the current list-page note
6. Reuse the BAO browser-check scripts before deploys or after commission/order-report changes
7. Keep `member003` legacy matrix analysis positioned as research/sandbox work unless we explicitly want to productionize it further

## Latest Verified Status

- Pool rules are merged into `main` and verified locally for:
  - default `50%` funding
  - `CUSTOM_RATE`
  - `DISABLED`
  - `POOL_ONLY` partial payout to cap
  - `ALL_COMMISSIONS` partial payout to remaining combined cap
  - `ALL_COMMISSIONS` full-flow accumulation from real `process-approved` direct/uni commissions before next-day pool close
- Pool rerun behavior now has an explicit force-reprocess path across runtime and API:
  - `closePool()` in `pool.service.ts` accepts `forceReprocess`
  - end-of-day processing calls pool close with `forceReprocess`
  - `POST /pool/:poolDate/close?force=1` is available for direct rerun validation
- Local baseline rerun after the force-reprocess fix now confirms recipient-positive pool payouts again:
  - `2025-11-17` -> `poolLedgerAmount = 60`, `poolPayoutCount = 2`
  - `2025-11-18` -> `poolLedgerAmount = 60`, `poolPayoutCount = 2`
  - `2025-12-02` -> `poolLedgerAmount = 360`, `poolPayoutCount = 12`
- Direct validation of `2025-11-22` after the fix returned `eligibleMemberCount = 6`, confirming pool reprocess is working
- Pool funding now snapshots rate config on `OrderItem`, so later package edits do not retroactively change historical pool funding
- Effective pool-rate snapshots were updated to use decimal-safe math instead of JS `Number`
- Commission plan summary doc is up to date and can be used as the current handoff source for direct / unilevel / pool / matrix / cashback status
- BAO cashback settings/report/export now have a reusable local browser-check smoke
- Stephub order shipment-state flow now has a reusable local browser-check smoke covering:
  - transfer review
  - awaiting shipment
  - shipped
  - delivered
- BAO cashback CSV export bug was fixed so `cashback` export mode now returns `CASHBACK` rows instead of falling back to `DIRECT`
- SW and mixed-payment flow are now merged into `main`, including:
  - CW-to-SW conversion with fee
  - SW transfer to downline with fee
  - admin SW top-up
  - member SW top-up request plus admin approve/reject flow
  - mixed `wallet + cash` order creation with allowed payment-method checks
- Local admin UI now includes:
  - wallet payment settings management
  - allowed cash/top-up payment-method configuration
  - SW top-up request review actions
- SW top-up admin actions now require a real authenticated admin session and no longer trust `actorUserId` from request body
- DCW controls are now merged into `main`, including:
  - BAO product create/edit fields for DCW spend, DCW usage amount, and DCW reward rate
  - single DCW reward-rate rule for mixed `cash + SW` purchases
  - DCW usage and credited reward amounts rounded down to whole numbers
  - CW / SW terminology updated across admin/member-facing labels, notes, and smoke/docs
- Member import/login updates are now merged into `main`, including:
  - `member003.xlsx` remains the default member-import source
  - member spreadsheet imports now allow duplicate `phone` and `nationalId` values
  - imported member passwords now derive from the last 6 digits of national ID, with fallback to `123456`
  - BAO member list now has a top search bar plus an inline login hint for imported members

## Review Notes

- No open merge blocker remains from the configurable pool rules, BAO browser-check, wallet/payment work, and member import/login updates that landed in PR `#15`, PR `#16`, `#17`, `#18`, and `#19`
- The latest local commission baseline is functionally correct for direct / team / matching / pool, but the working dataset is not yet a fully clean reset because older reruns still affect some order/PV totals
- If a final report is needed, the next operator should clear the baseline test orders and rerun once from a clean state before freezing numbers
- The previously requested browser verification of BAO cashback and Stephub shipment-state flows is now covered by local reusable smoke scripts
- Wallet smoke now covers:
  - commission credit
  - convert CW to SW
  - downline transfer
  - admin SW top-up
  - member SW top-up request and admin approval
  - mixed `wallet + cash` order split
  - DCW reward from mixed `cash + SW` purchases
- Current matrix docs still describe a separate sandbox-only legacy placement engine and do not change production matrix code
- If matrix work resumes, treat it as a product decision rather than a merge-readiness issue
- Member import now uses a more spreadsheet-friendly assumption set than the original core-user model:
  - duplicate `phone` values are allowed
  - duplicate `nationalId` values are allowed
  - `email` is still unique, so duplicate/conflicting emails are skipped during seed

## Useful Commands

- Cashback API smoke:
  - `npm run smoke:cashback`
- Pool cap smoke:
  - `npm run smoke:pool:cap`
- Pool configurable rules smoke:
  - `npm run smoke:pool:rules`
- Pool full-flow all-commissions smoke:
  - `npm run smoke:pool:all-comm-e2e`
- Run all pool smokes:
  - `npm run smoke:pool:all`
- BAO cashback smoke:
  - `npm run smoke:bao:cashback`
- BAO shipment browser-check smoke:
  - `npm run smoke:bao:shipment`
- Run all BAO browser-checks:
  - `npm run smoke:bao:all`
- Wallet mixed-payment and top-up flow smoke:
  - `npm run smoke:wallet:mixed`
- DCW product/rule smoke:
  - `npm run smoke:wallet:dcw`
- Cleanup cashback smoke artifacts:
  - `npm run cleanup:cashback-smoke -- --apply`

## Pool Rule Status

- Configurable pool runtime is now verified by local Docker-based smokes for:
  - default `50%` funding
  - `CUSTOM_RATE`
  - `DISABLED`
  - `POOL_ONLY` partial payout to cap
  - `ALL_COMMISSIONS` partial payout to remaining combined cap
  - `ALL_COMMISSIONS` full-flow accumulation from real `process-approved` direct/uni commissions before next-day pool close
- Latest smoke suite after merge: `npm run smoke:pool:all`
- Test matrix and latest expected numbers are documented in `docs/technical-design/pool_rule_test_matrix.md`

## Commission Summary

- Full cross-plan summary now lives in `docs/technical-design/commission_plan_summary.md`
- Use this doc first before reopening direct / unilevel / pool / cashback investigation work

## Wallet Status

- Wallet system in `main` now supports:
  - CW summary and transaction history
  - SW balance bucket
  - DCW package/product controls with whole-number rounding
  - CW-to-SW conversion with configurable fee
  - SW transfer to downline with configurable fee
  - admin SW top-up
  - member SW top-up requests with admin approve/reject
  - mixed wallet + cash order payments
  - mixed `cash + SW` DCW reward using a single configurable reward rate
  - configurable allowed payment methods for cash checkout and SW top-up
- Latest wallet/DCW smoke suites after merge:
  - `npm run smoke:wallet:mixed`
  - `npm run smoke:wallet:dcw`
- Current admin tooling is in the local admin app under `/admin`; member-facing wallet UI is still the most obvious next product slice if wallet work continues

## Member Status

- Member system currently uses `member003.xlsx` as the main import source for local spreadsheet-style member data
- Local member import flow now consists of:
  - `node scripts/seed_members_from_xlsx.mjs member003.xlsx 123456 --apply`
  - `python3 scripts/import_member_profiles_from_xlsx.py member003.xlsx --apply`
- Imported members now log in with:
  - username = `memberCode`
  - password = last 6 digits of `nationalId`
  - fallback password = `123456` if national ID is missing or shorter than 6 digits
- Latest local import/apply result:
  - `210` `TH...` members in `User`
  - `210` `TH...` members in `stephub_members_v1`
- BAO member tooling now includes:
  - a top search bar on `/admin/member/list`
  - an inline note explaining imported-member login credentials
- Placement import for `member003` was updated on `2026-05-10` for test-fixture use:
  - keep real `sponsorId`
  - rebuild placement by sponsor lineage and member-code order
  - first `3` directs become `LEFT / MIDDLE / RIGHT`
  - directs beyond `3` continue into the next open slot within that sponsor subtree
- This rebuilt placement is now produced consistently by:
  - `scripts/import_member_profiles_from_xlsx.py`
  - `scripts/fill_member_profiles_from_member003.mjs`
  - `scripts/export_member003_members_fixture.py`
  - `scripts/member003-members.json`

## Current Local State

- Working tree had no tracked file changes right after the last push; re-check with `git status --short` before starting new work
- Local runtime was intentionally reset on `2026-05-10` without touching product/catalog data
- Current DB baseline state after reset/import:
  - `User = 210`
  - `Order = 0`
  - `CommissionLedger = 0`
  - `TeamSettlementBatchItem = 0`
  - `DailyPoolPayout = 0`
- The rebuilt placement for the earlier blocked team case is now:
  - `TH0000014 -> TH0000013 / LEFT`
  - `TH0000016 -> TH0000013 / MIDDLE`
  - `TH0000017 -> TH0000013 / RIGHT`
- These files are intentionally local-only and should be ignored unless explicitly needed:
  - `Book1.xlsx`
  - `allcom22032026.xlsx`
  - `allmember.xlsx`
  - `stephub_app_live_order_flow.patch`

## Notes

- `app` should default to Stephub in future discussion
- BAO paths live under `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend`
- For a cleaner starting point, also check the worktree guidance in `HANDOFF_NEXT.md`
- The main commits pushed on `2026-05-10` were:
  - `3c5ff55e` `Fix member003 placement import and baseline timezone flow`
  - `7eb99681` `Auto-open local WAP and BAO after launcher`

## Next Recommended Action

- Re-run the `member003` commission baseline from the now-clean local state and verify that `team / matching / pool` follow the rebuilt `L / M / R` placement tree instead of the old chained-right placement
- Preferred tools:
  - BAO commission baseline controls
  - `node scripts/run_member003_baseline_until_pool.js --apply --reset`
