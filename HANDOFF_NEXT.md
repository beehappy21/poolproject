Handoff Next

Updated: 2026-04-27 22:02 +07
Branch: `main`

Current Goal

Continue the Stephub commission-plan refactor after `COMM-05` backend completion.
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
- `COMM-05` has started with a minimal team-settlement scaffold:
- `COMM-05` backend scope is now effectively complete
  - scaffold formula now computes real:
    - `plannedPaidPvByLeg`
    - `carryForwardPvByLeg`
    - `payablePv`
    - `bonusAmount`
  - if 3 payable legs exist, scaffold uses 3-leg logic
  - if only 2 payable legs exist, scaffold falls back to 2-leg logic
  - added team settlement scaffold types in [packages/modules/commissions/src/domain/commissions.types.ts](/Users/macbook/poolproject/packages/modules/commissions/src/domain/commissions.types.ts:1)
  - added repository helpers to:
    - list active positioned members by `upline + L/M/R`
    - replace a scaffolded `TeamSettlementBatch` snapshot
    - list scaffolded batch items by `settlementDate`
    - mark processed batch/item statuses and totals
  - added service method `scaffoldTeamSettlementBatch(settlementDate)` in [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts:1)
  - added service method `processTeamSettlementBatch(settlementDate)` in [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts:1)
  - added API endpoint:
    - `POST /commissions/team-settlement-batches/:settlementDate/scaffold`
    - `POST /commissions/team-settlement-batches/:settlementDate/process`
  - current scaffold stores per-upline per-leg:
    - active member counts
    - aggregated `totalPv` from active-cycle `purchaseBase`
  - process now creates `TEAM_2LEG` / `TEAM_3LEG` ledger rows through the shared finalize path
  - process now creates `MATCHING_L1` / `MATCHING_L2` from actual team `finalPayableAmount` after cap
  - matching rows keep `sourceCommissionLedgerId` linkage back to the originating team commission row
  - repeat `process` calls now skip non-`planned` team batch items to reduce duplicate creation risk
  - duplicate protection now also checks existing team rows by batch-item linkage and existing matching rows by source team ledger + level before creating new rows
  - processed team batches no longer get re-scaffolded over the top by the scaffold endpoint
  - team commission source refs now avoid incorrectly forcing non-order refs into `commissionLedger.orderId`
- pool runtime has started moving to the new signed-off rule set:
  - approved pool source orders are now read by Bangkok single-day range, not the old weekly range
  - pool funding now uses runtime `poolRate` from commission settings
  - pool eligibility now targets:
    - own approved purchase order
    - `3` directs
    - `3` direct buyers with approved orders
  - old Sunday-only close restriction was removed from the current pool close path
  - pool close now creates per-recipient `pool` commission rows through the shared finalize path
  - daily pool payout snapshots now link back to `commissionLedgerId`
  - pool wallet posting now uses commission ref ids and respects held-vs-approved payout status
  - pool rerun lookup now keys existing pool commissions by `poolCycleId + beneficiaryUserId`
  - `closePool(poolDate)` is now rerunnable and returns `reprocessed: true` when a previous cycle existed
  - runtime verification endpoints now exist for fast inspection:
    - `GET /commissions/team-settlement-batches/:settlementDate/snapshot`
    - `GET /pool/:poolDate/snapshot`
  - pool snapshot now returns summary counts for approved / held / fallback / linked commission rows
  - admin UI quick actions now expose:
    - team settlement `Scaffold / Process / Snapshot`
    - pool `Snapshot / Payouts`
  - runtime verification can now be executed from BAO admin without manual endpoint calls

Validation Completed

- `npx prisma validate --schema prisma/schema.prisma` passed
- `npm run lint` passed

Runtime Verification Completed This Round

- local stack was restarted successfully and API health recovered on `http://127.0.0.1:3000/health`
- local Prisma schema had been behind runtime initially; `npx prisma db push --schema prisma/schema.prisma` was required once before team batch endpoints could run
- verified login and live API calls against the local stack
- added a focused smoke script for the one-leg carry-forward regression:
  - `npm run smoke:commissions:team-carry-forward`
- added a fixture-based smoke script for `team finalPayable -> matching` regression:
  - `npm run smoke:commissions:team-matching-final-payable`
- added a concurrent rerun smoke script for team settlement race safety:
  - `npm run smoke:commissions:team-concurrent-rerun`
- verified `POST /commissions/team-settlement-batches/2025-11-27/process`
  - result stayed stable at:
    - `processedUsers: 1`
    - `carriedForwardUsers: 5`
    - `totalPayablePv: 750`
    - `totalBonusAmount: 225`
- verified `GET /commissions/team-settlement-batches/2025-11-27/snapshot`
  - batch remains `processed`
  - rerunning `process` does not change counts
- fixed a real rerun/concurrency bug in team settlement scaffold/process:
  - `scaffold` on an already processed date now returns `status: processed` with real processed item states
  - repository scaffold/process transactions now run at `Serializable` isolation with retry on `P2034`
  - rerunning `scaffold + process + snapshot` on `2025-11-27` no longer flips the batch back to `scaffolded/planned`
- verified `POST /pool/2025-11-27/close`
  - returns `reprocessed: true` on rerun
  - current sample runtime result is:
    - `fundingTotalApprovedPv: 2000`
    - `poolFund: 600`
    - `eligibleMemberCount: 0`
    - `companyFallbackAmount: 600`
- verified `GET /pool/2025-11-27/snapshot`
  - current sample has `payoutCount: 0`
  - `approvedCount: 0`
  - `heldCount: 0`
  - `fallbackCount: 0`
  - `linkedCommissionCount: 0`
- verified `2025-11-29` team scaffold/process path is safe on a zero-candidate day
  - `scaffold` returns `totalUsers: 0`
  - `process` returns `processedUsers: 0`
- verified the one-leg carry-forward regression on `2025-11-27`
  - smoke script found `userId: 26` with exactly `1` positive leg
  - `payablePv` stayed `0`
  - `bonusAmount` stayed `0`
  - item status stayed `carried_forward` after `process` and `snapshot`
- verified `team finalPayable -> matching` with an isolated fixture on `2030-01-15`
  - script created a temporary 5-user sponsor/team fixture and cleaned it up afterward
  - fixture produced a `TEAM_2LEG` commission with:
    - `grossAmount: 150`
    - `finalPayableAmount: 150`
  - fixture produced:
    - `MATCHING_L1 basePv: 150 amount: 7.5`
    - `MATCHING_L2 basePv: 150 amount: 7.5`
  - this confirms matching is based on the team commission `finalPayableAmount`, not a pre-cap base
- verified concurrent rerun safety on `2025-11-27`
  - smoke ran `scaffold + process + snapshot` concurrently for `3` rounds
  - final snapshot remained:
    - `batchStatus: processed`
    - `processedUsers: 1`
    - `carriedForwardUsers: 5`
    - `totalPayablePv: 750`
    - `totalBonusAmount: 225`
  - no item reverted back to `planned`

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

Treat `COMM-05` as complete. Do not redo cap/gating or team/matching core runtime.

1. Finish adjustment planning and keep scope locked
- treat current backend adjustment work as the active focus, not recipient-positive pool testing
- do not spend more time trying to force a pool-eligible sample from the current dataset
- if more plan cleanup is needed, capture it in handoff/checklist first before reopening runtime verification

2. Keep the locked runtime order intact in every later smoke flow
- `team -> buyback side effect -> pool`
- do not reorder these batches during further verification or test wiring

3. Defer pool recipient-positive testing until after adjustment planning is fully settled
- current `2025-11-27` sample already proves rerun behavior
- recipient-positive pool verification remains a later phase
- when returning to it, use a date or fixture that naturally produces eligible recipients instead of stretching the current sample data

4. If a formal automated test harness is introduced later
- port the three existing smoke checks into durable automated coverage:
  - one-leg carry-forward
  - matching from team `finalPayableAmount`
  - concurrent rerun stability

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
5. [packages/modules/commissions/src/controllers/commissions.controller.ts](/Users/macbook/poolproject/packages/modules/commissions/src/controllers/commissions.controller.ts:1)

Bottom Line

The repo has moved past the `COMM-04` cap/gating milestone.
`COMM-05` backend runtime and close-out hardening are effectively complete, with runtime verification on the local stack for processed-date reruns, concurrent reruns, one-leg carry-forward, and matching-from-final-payable.
Pool payout creation also runs through the shared finalize path; the next person should finish plan cleanup and regression coverage first, then come back to recipient-positive pool verification as a separate phase.
