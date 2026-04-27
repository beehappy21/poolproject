Handoff Next

Updated: 2026-04-27 18:05 +07
Branch: `main`

Current Goal

Continue the Stephub commission-plan refactor from `COMM-05` onward.
Do not go back to the old receipt/PDF work unless explicitly asked.

What Was Completed In This Round

- `COMM-04` is now complete.
- The shared commission finalize path now computes and persists:
  - `grossAmount`
  - `finalPayableAmount`
  - `discardedAmount`
  - `releaseStatus`
- The real daily-cap runtime path is wired in:
  - `DailyCommissionCapUsage` lookup by `user + Bangkok business date`
  - remaining-cap calculation before cycle allocation
  - cap usage increment only when a beneficiary commission actually survives fallback
- Minimal buyback-gating skeleton is wired in:
  - user progress lookup/upsert
  - `HELD_PENDING_REPURCHASE`
  - `BLOCKED_AFTER_EXPIRY`
  - buyback audit-event creation
- `direct`, `uni`, and `cashback` now use the shared cap/gating finalize path.
- Held commissions now flow into wallet posting correctly through the held bucket path.
- Commission/fallback filters now accept the new commission types:
  - `TEAM_2LEG`
  - `TEAM_3LEG`
  - `MATCHING_L1`
  - `MATCHING_L2`

Validation Completed

- `npx prisma validate --schema prisma/schema.prisma` passed
- `npm run lint` passed

Current Working Files

- [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md:1)
- [CHECKLIST_LIVE_OPERATIONS.md](/Users/macbook/poolproject/CHECKLIST_LIVE_OPERATIONS.md:1)
- [docs/technical-design/commission_couponweb3_reuse_map.md](/Users/macbook/poolproject/docs/technical-design/commission_couponweb3_reuse_map.md:1)
- [packages/modules/commissions/src/controllers/commissions.controller.ts](/Users/macbook/poolproject/packages/modules/commissions/src/controllers/commissions.controller.ts:1)
- [packages/modules/commissions/src/domain/commissions.types.ts](/Users/macbook/poolproject/packages/modules/commissions/src/domain/commissions.types.ts:1)
- [packages/modules/commissions/src/repositories/commissions.repository.ts](/Users/macbook/poolproject/packages/modules/commissions/src/repositories/commissions.repository.ts:1)
- [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts:1)
- [packages/modules/orders/src/services/orders.service.ts](/Users/macbook/poolproject/packages/modules/orders/src/services/orders.service.ts:1)
- [apps/api/public/admin/index.html](/Users/macbook/poolproject/apps/api/public/admin/index.html:1)

Current Working Tree

- modified:
  - `CHECKLIST_LIVE_OPERATIONS.md`
  - `HANDOFF_NEXT.md`
  - `apps/api/public/admin/index.html`
  - `apps/api/src/admin-settings.controller.ts`
  - `packages/modules/auth/src/controllers/auth.controller.ts`
  - `packages/modules/commissions/src/controllers/commissions.controller.ts`
  - `packages/modules/commissions/src/domain/commissions.types.ts`
  - `packages/modules/commissions/src/repositories/commissions.repository.ts`
  - `packages/modules/commissions/src/services/commissions.service.ts`
  - `packages/modules/members/src/repositories/members.repository.ts`
  - `packages/modules/members/src/services/members.service.ts`
  - `packages/modules/orders/src/services/orders.service.ts`
  - `packages/modules/qualification/src/domain/qualification.types.ts`
  - `packages/shared/utils/src/commission-settings.util.ts`
  - `prisma/schema.prisma`
- untracked:
  - `docs/technical-design/commission_couponweb3_reuse_map.md`
- unrelated existing file to ignore unless user asks:
  - Thai-named `.xlsx` file in repo root

Exactly What To Do Next

Start from `COMM-05`, not from cap/gating rework.

1. Build team settlement runtime on top of the shared finalize path
- use `TeamSettlementBatch` and `TeamSettlementBatchItem`
- support `L / M / R`
- compute payable PV and carry-forward snapshots
- if 3-team has only 2 payable legs, fall back to 2-leg logic
- create `TEAM_2LEG` or `TEAM_3LEG` ledger rows through the shared finalize path

2. Add matching creation after team settlement
- matching must use actual payable team commission after cap
- keep source linkage back to the originating team commission ledger
- create `MATCHING_L1` and `MATCHING_L2` through the shared finalize path

3. Reconcile pool order against team and buyback side effects
- keep the locked batch order:
  - `team -> buyback side effect -> pool`
- keep pool basis at `100% of approved PV`
- keep pool qualification rule:
  - own purchase order
  - `3` directs
  - each direct has `1` purchase order

Important Locked Rules To Use

- team structure is real `L / M / R`
- daily cap is `5000 THB`
- cap applies across all commission channels combined
- buyback threshold uses `final payable after cap`
- no auto-deducted recycle purchase
- excess above threshold is held pending member-initiated repurchase for `3` calendar days in `Asia/Bangkok`
- if not completed in time: `BLOCKED_AFTER_EXPIRY`
- pool basis is `100% of approved PV`
- pool qualification:
  - member has own purchase order
  - member has `3` directs
  - each direct has `1` purchase order
- matching is calculated from actual team payable after cap
- batch order is locked:
  - `team -> buyback side effect -> pool`
- if 3-team does not have 3 legs but has 2 payable legs, fall back to 2-leg logic

What Not To Do Next Time

- do not return to receipt/PDF work
- do not re-open daily-cap or buyback skeleton work unless a bug is found
- do not generate large UI/report changes before backend team/matching runtime is stable
- do not remove backward compatibility from commission settings JSON

Recommended First Commands Next Session

```bash
git status --short
npx prisma validate --schema prisma/schema.prisma
npm run lint
```

Recommended First Files Next Session

1. [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md:1)
2. [docs/technical-design/commission_couponweb3_reuse_map.md](/Users/macbook/poolproject/docs/technical-design/commission_couponweb3_reuse_map.md:1)
3. [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts:1)
4. [packages/modules/commissions/src/repositories/commissions.repository.ts](/Users/macbook/poolproject/packages/modules/commissions/src/repositories/commissions.repository.ts:1)
5. [prisma/schema.prisma](/Users/macbook/poolproject/prisma/schema.prisma:1)

Bottom Line

The repo has moved past the `COMM-04` cap/gating milestone.
The next person should build team settlement and matching on top of the shared finalize path, not redo the cap work again.
