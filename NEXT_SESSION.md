# Next Session

Updated: 2026-03-23

## Branch

- Current branch: `main`
- Latest merged PR: `#15` `https://github.com/beehappy21/poolproject/pull/15`
- Main is currently at merge commit `56bb3ed`

## Recently Merged Work

- PR `#14` is already merged into `main`
- PR `#15` is already merged into `main`
- Recent pool/commission summary commits:
  - `03632e5` Add configurable pool rule coverage and commission summaries
  - `9e652b6` Snapshot pool item rates on orders and fix pool-rate precision
  - `56bb3ed` Merge PR `#15` into `main`

## What To Do Next

1. Browser-check the real UI flows that now matter most after the merges:
   - BAO cashback settings/report/export
   - Stephub order list/detail shipment state flow
2. If deployment work continues, follow `DEPLOY_CHECKLIST.md`
3. Use `docs/technical-design/commission_plan_summary.md` as the single summary for plan-calculation status
4. Keep `member003` legacy matrix analysis positioned as research/sandbox work unless we explicitly want to productionize it further

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

## Review Notes

- No open merge blocker remains from the configurable pool rules work that landed in PR `#15`
- The remaining highest-value follow-up is browser verification of BAO cashback and Stephub shipment-state flows
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
