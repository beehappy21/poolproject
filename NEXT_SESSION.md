# Next Session

Updated: 2026-03-23

## Branch

- Current branch: `main`
- Latest merged PR: `#17` `https://github.com/beehappy21/poolproject/pull/17`
- Main is currently at merge commit `ffa680f`

## Recently Merged Work

- PR `#14` is already merged into `main`
- PR `#15` is already merged into `main`
- PR `#16` is already merged into `main`
- PR `#17` is already merged into `main`
- Recent pool/commission/browser-check commits:
  - `03632e5` Add configurable pool rule coverage and commission summaries
  - `9e652b6` Snapshot pool item rates on orders and fix pool-rate precision
  - `56bb3ed` Merge PR `#15` into `main`
  - `78da058` Merge PR `#16` into `main`
  - `ffa680f` Merge PR `#17` into `main`

## What To Do Next

1. If deployment work continues, follow `DEPLOY_CHECKLIST.md`
2. Use `docs/technical-design/commission_plan_summary.md` as the single summary for plan-calculation status
3. If wallet work continues, the next high-value slice is member-facing wallet UI and/or richer admin review tooling beyond the current local admin panel
4. Reuse the BAO browser-check scripts before deploys or after commission/order-report changes
5. Keep `member003` legacy matrix analysis positioned as research/sandbox work unless we explicitly want to productionize it further

## Latest Verified Status

- Pool rules are merged into `main` and verified locally for:
  - default `50%` funding
  - `CUSTOM_RATE`
  - `DISABLED`
  - `POOL_ONLY` partial payout to cap
  - `ALL_COMMISSIONS` partial payout to remaining combined cap
  - `ALL_COMMISSIONS` full-flow accumulation from real `process-approved` direct/uni commissions before next-day pool close
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
- Shopping-wallet and mixed-payment flow are now merged into `main`, including:
  - commission-to-shopping conversion with fee
  - shopping-wallet transfer to downline with fee
  - admin shopping-wallet top-up
  - member wallet top-up request plus admin approve/reject flow
  - mixed `wallet + cash` order creation with allowed payment-method checks
- Local admin UI now includes:
  - wallet payment settings management
  - allowed cash/top-up payment-method configuration
  - wallet top-up request review actions
- Wallet top-up admin actions now require a real authenticated admin session and no longer trust `actorUserId` from request body

## Review Notes

- No open merge blocker remains from the configurable pool rules, BAO browser-check, and wallet/payment work that landed in PR `#15`, PR `#16`, and PR `#17`
- The previously requested browser verification of BAO cashback and Stephub shipment-state flows is now covered by local reusable smoke scripts
- Wallet smoke now covers:
  - commission credit
  - convert to shopping wallet
  - downline transfer
  - admin top-up
  - member top-up request and admin approval
  - mixed `wallet + cash` order split
- Current matrix docs still describe a separate sandbox-only legacy placement engine and do not change production matrix code
- If matrix work resumes, treat it as a product decision rather than a merge-readiness issue

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
  - commission wallet summary and transaction history
  - shopping-wallet balance bucket
  - commission-to-shopping conversion with configurable fee
  - shopping-wallet transfer to downline with configurable fee
  - admin top-up
  - member top-up requests with admin approve/reject
  - mixed wallet + cash order payments
  - configurable allowed payment methods for cash checkout and wallet top-up
- Latest wallet smoke suite after merge: `npm run smoke:wallet:mixed`
- Current admin tooling is in the local admin app under `/admin`; member-facing wallet UI is still the most obvious next product slice if wallet work continues

## Current Local State

- Working tree has no tracked file changes left from this work
- These files are intentionally local-only and should be ignored unless explicitly needed:
  - `Book1.xlsx`
  - `allcom22032026.xlsx`
  - `allmember.xlsx`
  - `stephub_app_live_order_flow.patch`

## Notes

- `app` should default to Stephub in future discussion
- BAO paths live under `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend`
- For a cleaner starting point, also check the worktree guidance in `HANDOFF_NEXT.md`
