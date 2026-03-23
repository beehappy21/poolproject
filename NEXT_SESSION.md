# Next Session

Updated: 2026-03-23

## Branch

- Current branch: `feat/member-profile-import`
- Draft PR: `https://github.com/beehappy21/poolproject/pull/14`

## Main Commits On Branch

- `3a00c63` Add cashback smoke and cleanup scripts
- `e44ab42` Add cashback commission settings and BAO report support
- `fe753d8` Polish Stephub order status UI and BAO catalog screens
- `2f2a455` Add member003 legacy matrix analysis toolkit
- `f44f396` Update handoff notes for cashback and clean worktree flow

## What To Do Next

1. Review PR `#14` in 4 logical groups:
   - cashback runtime + BAO support
   - cashback smoke/cleanup scripts
   - Stephub order status UI + BAO catalog screen polish
   - member003 legacy matrix analysis toolkit
2. Browser-check the real UI flows:
   - BAO cashback settings/report/export
   - Stephub order list/detail shipment state flow
3. Default recommendation: keep the matrix legacy analysis as research-only unless we explicitly want docs/scripts-heavy reverse-engineering work in `main`
4. If deployment work continues, follow `DEPLOY_CHECKLIST.md`

## Review Notes

- PR `#14` is a wide branch with `57` changed files and about `6k` inserted lines versus `main`
- The first three groups are product/runtime-facing and align with already smoke-tested BAO / Stephub work
- The matrix legacy group is mostly:
  - sandbox scripts
  - reverse-engineering docs
  - validation utilities
- Current matrix docs describe a separate sandbox-only legacy placement engine and explicitly avoid changing production matrix code
- Unless we want that research history in `main`, splitting or parking the matrix legacy work remains the safer merge choice

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
- Test matrix and latest expected numbers are documented in `docs/technical-design/pool_rule_test_matrix.md`

## Commission Summary

- Full cross-plan summary now lives in `docs/technical-design/commission_plan_summary.md`

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
