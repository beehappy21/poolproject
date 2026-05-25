# PV Cycle Cap Accumulation Plan

Updated: 2026-05-18

Depends on:

- [referral_commission_plan_thb.md](/Users/macbook/poolproject/docs/technical-design/referral_commission_plan_thb.md:1)
- [commission_round_repurchase_spec.md](/Users/macbook/poolproject/docs/technical-design/commission_round_repurchase_spec.md:1)

## Goal

Implement the new `PV-only` cycle-cap rule on both local and UAT/server without using order amount as the cycle-cap gate.

## Current Implementation Status

- Local schema proposal is now implemented in source:
  - `CycleCapTier` enum added
  - `MemberPackageCycle` now carries PV accumulation and queue-state fields
- Local approved-order runtime path is now changed in source:
  - approved orders allocate `totalPv` into cycles
  - cycle creation is no longer item-count-only for the approved-order path
  - a cycle stops accumulating at `200 PV`
  - overflow PV opens or fills the next queued cycle
  - queued cycles stay non-receivable until older active cycles are no longer active for payout
- Local cycle receivability normalization is now added in source:
  - capped cycles are marked non-receivable
  - the next oldest active cycle becomes receivable
- Validation completed on local source:
  - `npx prisma validate --schema prisma/schema.prisma`
  - `npx prisma generate --schema prisma/schema.prisma`
  - `npm run lint`
- UAT/server rollout is now partially completed:
- UAT/server rollout is now partially completed:
  - source files copied to server
  - `api` and `worker` rebuilt and restarted
  - migration SQL applied manually on UAT via `psql`
  - existing `MemberPackageCycle` rows were backfilled heuristically from `earningCap >= 10000` to `accumulatedPv = 200`
- UAT scenario verification now exists:
  - [docs/archive/uat-history/2026-05-18-pv-cycle-cap-uat-scenarios.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-05-18-pv-cycle-cap-uat-scenarios.md:1)
- Not completed yet:
  - unit/integration smoke coverage for new PV scenarios
  - final decision on large-quantity self-purchase fan-out expectations
  - unit/integration coverage that proves promotion without relying on a large runtime report

## Locked Business Rules

1. Use `PV total` only to decide cycle cap.
2. If PV for the current bill or accumulated current round is `< 200`, cycle cap for that round is `5000 THB`.
3. If PV for the current bill or accumulated current round is `>= 200`, cycle cap for that round is `10000 THB`.
4. PV can accumulate across orders.
5. If the member reaches `>= 200 PV` before the current cycle finishes paying out, keep paying the older cycle first but allow the next cycle to be prepared in queue.
6. If an existing current cycle started below `200 PV` and later personal PV pushes that same cycle to `>= 200 PV`, upgrade that cycle cap from `5000` to `10000` immediately.
7. If PV exceeds the amount needed to complete the current cycle threshold state, carry the excess PV into the next queued cycle.
8. If a queued next cycle is still `< 200 PV` when the previous cycle completes, that next cycle stays at `5000` until later PV pushes it to `>= 200`.

## Current Runtime Status

What already exists:

- `MemberPackageCycle` exists and is used as the commission receiving cycle.
- Commission payout order is already `oldest receivable cycle first`.
- Approved orders already create product/package cycles from the order path.
- Team daily cap is already configurable and is currently `5000`.

What is still missing:

- no `PV accumulation` state on the cycle model
- no `queued next cycle` state driven by PV carry-over
- no runtime logic to upgrade a current cycle from `5000` to `10000`
- no runtime logic to downgrade or keep the queued cycle at `5000` when PV is still below `200`
- current cycle creation still snapshots `earningCap` directly from product/package master data
- CAP grant logic still resolves cap from `earningCapAmount` instead of the new PV rule

## Design Direction

Treat `MemberPackageCycle` as the payout target, but make its cap dynamic from accumulated PV.

Recommended runtime additions:

1. Extend `MemberPackageCycle` with PV-tracking fields:
   - `accumulatedPv`
   - `queuedCarryPv`
   - `capTier`
   - `capTierLockedAt`
   - `sourceOpenMode`
2. Add order-to-cycle allocation logic:
   - feed approved self-purchase PV into the current active/open cycle first
   - if PV exceeds the current cycle threshold state, push carry PV into the next queued cycle
3. Recompute `earningCap` from PV rule:
   - `< 200 PV => 5000`
   - `>= 200 PV => 10000`
4. Keep payout settlement order unchanged:
   - always pay the oldest receivable cycle first
5. Keep product/package `pv` as the source of contributed PV.
6. Stop using `purchaseBase` or order amount as the cycle-cap qualification rule.

## Recommended Schema Shape

Start with `MemberPackageCycle` extension first. Do not introduce a new table in phase 1 unless implementation proves the cycle row cannot safely hold the accumulation state.

### Why extend `MemberPackageCycle` first

- payout already targets this table
- `CommissionLedger.beneficiaryCycleId` already links commission rows to this table
- qualification already selects the oldest receivable cycle from this table
- the new rule is mainly about `how a cycle is formed and upgraded`, not about adding a second payout object

### Recommended new enum

```prisma
enum CycleCapTier {
  BELOW_200_PV
  AT_LEAST_200_PV
}
```

### Recommended new fields on `MemberPackageCycle`

```prisma
model MemberPackageCycle {
  // existing fields...

  accumulatedPv         Decimal      @default(0) @db.Decimal(18, 8)
  carryOverPvIn         Decimal      @default(0) @db.Decimal(18, 8)
  carryOverPvOut        Decimal      @default(0) @db.Decimal(18, 8)
  cycleCapTier          CycleCapTier @default(BELOW_200_PV)
  capThresholdPv        Decimal      @default(200) @db.Decimal(18, 8)
  capUpgradedAt         DateTime?
  queuedAt              DateTime?
  readyToReceiveAt      DateTime?
  sourceOrderCount      Int          @default(0)
  lastPvAccruedAt       DateTime?
  lastSourceOrderId     BigInt?
}
```

### Meaning of each new field

- `accumulatedPv`
  - PV currently assigned to this cycle from approved self-purchase orders
  - this is the main value used to determine `5000` vs `10000`
- `carryOverPvIn`
  - PV that arrived from the previous cycle as overflow
  - audit-friendly; avoids hiding the fact that this cycle started from carry-forward
- `carryOverPvOut`
  - PV overflow sent onward to the next queued cycle
  - useful when one order both finishes/updates the current cycle and seeds the next cycle
- `cycleCapTier`
  - normalized tier for business logic and filtering
  - avoids repeatedly deriving state only from decimal comparisons
- `capThresholdPv`
  - keep the threshold explicit in data even if currently fixed at `200`
  - makes future threshold changes safer
- `capUpgradedAt`
  - when a cycle moves from `< 200 PV` to `>= 200 PV`
- `queuedAt`
  - when this cycle is created in waiting state before it becomes the receiving cycle
- `readyToReceiveAt`
  - when this cycle becomes the active PV receiver or becomes payable-ready after older cycle completion
- `sourceOrderCount`
  - number of approved self-purchase orders that contributed PV into this cycle
- `lastPvAccruedAt`
  - last time PV was added into this cycle
- `lastSourceOrderId`
  - latest self-purchase order that changed the cycle state

### Recommended indexes

```prisma
@@index([userId, status, cycleNo])
@@index([userId, isReceivable, activatedAt])
@@index([userId, cycleCapTier, earningStatus])
@@index([userId, lastSourceOrderId])
```

### Recommended phase-1 approach for queued cycles

Keep queued cycles in the same table instead of introducing a separate queue table.

- `status = ACTIVE`
- `isReceivable = false` when the cycle is only queued and should not receive payout yet
- `queuedAt` is populated
- `readyToReceiveAt` is null until the older cycle is finished or until business logic marks it active for payout routing

When the older cycle is done:

- set queued cycle `isReceivable = true`
- set `readyToReceiveAt`
- keep `cycleNo` ordering intact

### Recommended phase-1 approach for audit trail

Do not add a dedicated PV event table yet.

Use these existing references first:

- `Order.id`
- `Order.totalPv`
- `OrderItem.lineTotalPv`
- `MemberPackageCycle.lastSourceOrderId`

If phase-1 implementation shows that we need row-by-row PV audit history, add a follow-up table such as:

```prisma
model MemberCyclePvEvent {
  id                 BigInt   @id @default(autoincrement())
  userId             BigInt
  memberPackageCycleId BigInt
  sourceOrderId      BigInt
  appliedPv          Decimal  @db.Decimal(18, 8)
  overflowPv         Decimal  @default(0) @db.Decimal(18, 8)
  eventType          String   @db.VarChar(50)
  createdAt          DateTime @default(now())
}
```

But this should be phase 2 unless the implementation gets too opaque without it.

## Recommended Data Rules

### Cycle creation

- first cycle for a self-purchase member can start with:
  - `accumulatedPv = order/self-purchase PV`
  - `cycleCapTier = BELOW_200_PV` and `earningCap = 5000` if PV `< 200`
  - `cycleCapTier = AT_LEAST_200_PV` and `earningCap = 10000` if PV `>= 200`

### Cycle upgrade

- when more self-purchase PV is allocated into the same cycle and `accumulatedPv` crosses `200`:
  - update `cycleCapTier`
  - update `earningCap` from `5000` to `10000`
  - set `capUpgradedAt`

### Carry-forward

- if new PV causes overflow beyond what should stay on the current cycle:
  - increment current cycle `carryOverPvOut`
  - create or update the next queued cycle `carryOverPvIn`
  - add overflow into the queued cycle `accumulatedPv`

### Payout gating

- `isReceivable = true` only for the oldest cycle that should receive new commission payout
- queued future cycle can exist with PV already accumulated but must remain `isReceivable = false` until the older cycle is done

## Recommendation Summary

Phase 1 schema recommendation:

- extend `MemberPackageCycle`
- add `CycleCapTier`
- do not create a separate queue table yet
- do not create a separate PV event table yet
- continue using `CommissionLedger.beneficiaryCycleId` as the payout linkage

## Workstreams

### 1. Spec and Data Model

- [x] Confirm whether `MemberPackageCycle` is enough or whether a companion accumulation table is needed.
- [x] Lock exact meaning of `current cycle`, `queued cycle`, and `carry PV`.
- [x] Define whether one order can both upgrade the current cycle and seed the next queued cycle.
- [x] Define whether `200 PV` is the only tier for now or the first tier of a future ladder.
- [x] Document the final field list and migration plan.

### 2. Local Runtime Implementation

- [x] Add schema fields or a companion table for PV accumulation state.
- [x] Create a service that allocates approved self-purchase PV into current and queued cycles.
- [x] Replace direct item-by-item cycle opening from approved order flow with PV-aware allocation.
- [x] Update cycle creation so the initial cap can be `5000` or `10000` from PV state, not fixed product cap only.
- [x] Update cycle upgrade logic so a current `< 200 PV` cycle becomes `10000` once accumulated PV reaches `200`.
- [x] Update carry-forward logic so excess PV seeds the queued cycle.
- [x] Keep FIFO payout targeting the oldest receivable cycle.
- [ ] Review CAP grant flow and decide whether CAP grant must follow the same dynamic cycle cap or remain product-master based.
- [x] Add idempotency protection for approval retries and force-reprocess flows.

### 3. Local Validation

- [ ] Add unit tests for:
  - [ ] `< 200 PV` opens `5000` cycle
  - [ ] `= 200 PV` opens `10000` cycle
  - [ ] `150 PV + 60 PV` upgrades current cycle to `10000`
  - [ ] current cycle still pays first while next cycle waits
  - [ ] excess PV carries into next cycle
  - [ ] queued cycle stays `5000` until it later reaches `200`
- [ ] Add integration or smoke coverage for:
  - [ ] multi-order self-purchase accumulation
  - [ ] approval retry idempotency
  - [ ] end-of-day commission settlement against upgraded cycle cap
- [ ] Run:
  - [x] `npx prisma validate --schema prisma/schema.prisma`
  - [x] `npm run lint`

### 4. Server/UAT Rollout

- [x] Prepare migration and deploy notes before touching UAT.
- [ ] Back up UAT DB and current source tree.
- [x] Apply schema/runtime changes on server from the same local source revision.
- [x] Rebuild `api` and `worker` together because approved-order and commission settlement paths both depend on the new rule.
- [ ] If WAP/BAO surfaces expose cycle-cap details, rebuild them too.
- [ ] Run post-deploy health checks:
  - [x] API health
  - [x] worker startup
  - [ ] BAO login
  - [ ] WAP commission page
- [ ] Run UAT data verification queries for:
  - [x] current cycle accumulated PV
  - [x] current cycle earning cap
  - [x] queued cycle PV
  - [x] queued cycle stays non-receivable while the older cycle is still active
  - [ ] payout still lands on the oldest receivable cycle first after the older cycle is truly capped

### 5. Documentation and Handoff

- [x] Update this file when the data model is finalized.
- [ ] Update [commission_round_repurchase_spec.md](/Users/macbook/poolproject/docs/technical-design/commission_round_repurchase_spec.md:1) if the round spec must explicitly mention PV-tier cycle cap.
- [x] Update [CHECKLIST_LIVE_OPERATIONS.md](/Users/macbook/poolproject/CHECKLIST_LIVE_OPERATIONS.md:1) with the active operator checklist.
- [x] Update [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md:1) after any rule or deployment milestone changes.
- [x] Update [NEXT_SESSION.md](/Users/macbook/poolproject/NEXT_SESSION.md:1) with the next concrete execution step.

## Parallel Execution Checklist

Use this when local and server preparation should move together.

### Phase A: Freeze Rules

- [ ] Confirm the `200 PV` threshold is locked.
- [ ] Confirm cycle cap tiers are only `5000` and `10000`.
- [ ] Confirm the team daily cap remains `5000`.
- [ ] Confirm the server should follow local behavior exactly with no temporary UAT-only override.

### Phase B: Local First, Server Prepared In Parallel

- [ ] Local: implement schema and service changes.
- [ ] Local: add tests and run validation.
- [ ] Server: prepare backup command, compose rebuild command, and DB verification queries in advance.
- [ ] Server: confirm runtime files and envs are ready to receive the same build.

### Phase C: Promote Same Logic To Server

- [ ] Create one source checkpoint or release bundle from the local tested state.
- [ ] Deploy the same revision to UAT `api` and `worker`.
- [ ] Run one controlled self-purchase scenario on UAT.
- [ ] Verify cycle PV and cap state in DB after each order.
- [ ] Verify commission still posts to the oldest open cycle first.

### Phase D: Sign-off

- [ ] Record exact commit or source bundle used for UAT.
- [ ] Record whether historical cycles/orders were left untouched or backfilled.
- [ ] Record any follow-up gap separately from this rule rollout.

## Open Questions

- [ ] Should the new dynamic cycle cap also replace product-level `earningCapAmount` for all future products, or only for the current self-purchase package flow?
- [ ] Should historical already-open cycles be migrated to the new PV-state model, or only new orders after release use it?
- [ ] Should BAO expose the new `accumulated PV / cap tier / queued PV` state for admin audit immediately in this phase?
