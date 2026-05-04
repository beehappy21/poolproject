# Commission Reuse Map From couponweb3

Updated: 2026-04-27

## Purpose

This document maps the commission-related implementation found in `/Users/macbook/couponweb3`
to the current `poolproject` monorepo so we can reuse the right ideas, data shapes, and tests
without blindly porting code across different architectures.

Source repo used for reference:

- `/Users/macbook/couponweb3`

Target repo:

- `/Users/macbook/poolproject`

## Summary

`couponweb3` contains a closer implementation of the requested commission plan than the current
`poolproject` runtime.

The best reuse candidates are:

- business terminology and locked rule wording
- commission ledger field design for gross/final/discarded/release status
- daily cap tracking shape
- buyback progress and buyback event state model
- 3-leg team settlement formula and matching-after-cap behavior
- test anchors for direct, team, matching, pool, cap, and buyback gating

The weakest reuse candidates are:

- service code copied verbatim
- ORM entities copied directly
- pool logic copied without adapting to the new signed-off pool basis

Reason:

- `couponweb3` uses NestJS + TypeORM entities
- `poolproject` uses NestJS modules + Prisma schema + Prisma repositories
- some business rules match closely, but pool and buyback details are not 1:1

## High-Value Source Files

### Business and rule alignment

- `/Users/macbook/couponweb3/commission-prd-code-matrix.md`
  - Best single source for wording, rule snapshots, and test anchors
  - Reuse as the structure for future `poolproject` business sign-off docs

### Commission core

- `/Users/macbook/couponweb3/backend/src/modules/commissions/commissions.service.ts`
  - Direct L1/L2 = 50%
  - Daily cap application
  - Gross vs final vs discarded
  - Buyback disposition split before wallet credit

- `/Users/macbook/couponweb3/backend/src/database/entities/commission-ledger.entity.ts`
  - Strong reference for ledger field expansion

- `/Users/macbook/couponweb3/backend/src/database/entities/daily-commission-cap.entity.ts`
  - Strong reference for cap tracking table

### Team and matching

- `/Users/macbook/couponweb3/backend/src/modules/tree/tree.service.ts`
  - End-of-day team settlement orchestration
  - Matching based on actual team payable after cap

- `/Users/macbook/couponweb3/backend/src/modules/tree/tree-settlement.util.ts`
  - Strongest source for team calculation formula

- `/Users/macbook/couponweb3/backend/src/database/entities/team-settlement-batch-item.entity.ts`
  - Good reference for storing per-day per-user settlement snapshots

### Buyback

- `/Users/macbook/couponweb3/backend/src/modules/buyback/buyback.service.ts`
  - Good reference for state machine structure
  - Good reference for split between withdrawable and held slices

- `/Users/macbook/couponweb3/backend/src/database/entities/user-buyback-progress.entity.ts`
  - Strong reference for user-level buyback progress state

- `/Users/macbook/couponweb3/backend/src/database/entities/buyback-event.entity.ts`
  - Good reference for traceable buyback event audit

### Pool

- `/Users/macbook/couponweb3/backend/src/modules/pool/pool.service.ts`
  - Good reference for daily pool settlement batch orchestration
  - Good reference for checking active direct buyers rather than registered-only directs

- `/Users/macbook/couponweb3/backend/src/database/entities/pool-settlement-batch.entity.ts`
  - Good reference for batch summary storage

### Tests

- `/Users/macbook/couponweb3/backend/src/modules/commissions/commissions.service.spec.ts`
- `/Users/macbook/couponweb3/backend/src/modules/tree/tree.service.spec.ts`
- `/Users/macbook/couponweb3/backend/src/modules/pool/pool.service.spec.ts`

These are the highest-value files to copy ideas from because they lock the intended behavior in a
form that can be translated into `poolproject` tests.

## Mapping To poolproject

### 1. Commission types and ledger data

Source:

- `couponweb3/backend/src/common/enums/commission-type.enum.ts`
- `couponweb3/backend/src/database/entities/commission-ledger.entity.ts`

Target:

- [prisma/schema.prisma](/Users/macbook/poolproject/prisma/schema.prisma)
- [packages/modules/commissions/src/domain/commissions.types.ts](/Users/macbook/poolproject/packages/modules/commissions/src/domain/commissions.types.ts)
- [packages/modules/commissions/src/repositories/commissions.repository.ts](/Users/macbook/poolproject/packages/modules/commissions/src/repositories/commissions.repository.ts)
- [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts)
- [packages/modules/wallets/src/domain/wallets.types.ts](/Users/macbook/poolproject/packages/modules/wallets/src/domain/wallets.types.ts)

What to reuse:

- introduce new logical types for:
  - `TEAM_2LEG`
  - `TEAM_3LEG`
  - `MATCHING_L1`
  - `MATCHING_L2`
- extend ledger fields to separate:
  - gross amount
  - final payable amount
  - discarded or capped amount
  - release status
  - commission date
  - optional source ledger linkage for matching

What not to copy directly:

- TypeORM entity class syntax
- direct wallet-credit logic placement inside one service method

### 2. Daily cap

Source:

- `couponweb3/backend/src/database/entities/daily-commission-cap.entity.ts`
- `couponweb3/backend/src/modules/commissions/commissions.service.ts`

Target:

- [prisma/schema.prisma](/Users/macbook/poolproject/prisma/schema.prisma)
- new Prisma-backed repository under `packages/modules/commissions`
- [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts)

What to reuse:

- one row per `user + date`
- track `cap_amount` and `used_amount`
- apply cap before final wallet release
- preserve both gross and final payable for downstream matching

### 3. Team settlement batch

Source:

- `couponweb3/backend/src/modules/tree/tree.service.ts`
- `couponweb3/backend/src/modules/tree/tree-settlement.util.ts`
- `couponweb3/backend/src/database/entities/team-settlement-batch-item.entity.ts`

Target:

- new module recommended:
  - `packages/modules/team/src/...`
- or fold into current commissions module if team is kept as a sub-flow
- schema additions in [prisma/schema.prisma](/Users/macbook/poolproject/prisma/schema.prisma)

What to reuse:

- end-of-day batch structure
- per-user settlement snapshot
- available PV by leg
- planned consumed PV by leg
- carry-forward PV by leg
- payable PV and computed bonus amount
- idempotent processing by `settlementDate`

What must be adapted:

- `couponweb3` assumes 3 direct legs exist in tree placement
- `poolproject` currently shows strong evidence of `LEFT/RIGHT` structure, not `LEFT/MIDDLE/RIGHT`

Blocked design question:

- if the new Stephub rule truly requires `L/M/R`, genealogy and placement data must be expanded first

### 4. Matching

Source:

- `couponweb3/backend/src/modules/tree/tree.service.ts`
- `couponweb3/backend/src/modules/tree/tree.service.spec.ts`

Target:

- new team settlement orchestration inside `poolproject`
- [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts)

What to reuse:

- matching must use actual payable team commission after cap
- matching should be created only after the team settlement item is finalized
- matching should keep a source reference back to the team settlement or source commission

### 5. Buyback gating and progress

Source:

- `couponweb3/backend/src/modules/buyback/buyback.service.ts`
- `couponweb3/backend/src/database/entities/user-buyback-progress.entity.ts`
- `couponweb3/backend/src/database/entities/buyback-event.entity.ts`
- `couponweb3/backend/src/common/enums/commission-release-status.enum.ts`
- `couponweb3/backend/src/common/enums/buyback-progress-status.enum.ts`

Target:

- [prisma/schema.prisma](/Users/macbook/poolproject/prisma/schema.prisma)
- new `packages/modules/buyback`
- [packages/modules/wallets/src/services/wallets.service.ts](/Users/macbook/poolproject/packages/modules/wallets/src/services/wallets.service.ts)
- [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts)

What to reuse:

- explicit user-level buyback progress record
- explicit buyback event log
- release statuses:
  - `withdrawable`
  - `held_buyback`
  - `blocked_after_expiry`
- commission creation may be blocked at the gating layer

What must be adapted:

- Stephub rule says blocked state should prevent new commission ledger creation and wallet credit
- `poolproject` should still record an audit event for visibility even when no ledger row is created

### 6. Pool daily settlement

Source:

- `couponweb3/backend/src/modules/pool/pool.service.ts`
- `couponweb3/backend/src/database/entities/pool-settlement-batch.entity.ts`
- `couponweb3/backend/src/modules/pool/pool.service.spec.ts`

Target:

- [packages/modules/pool/src/services/pool.service.ts](/Users/macbook/poolproject/packages/modules/pool/src/services/pool.service.ts)
- [packages/modules/pool/src/domain/pool.types.ts](/Users/macbook/poolproject/packages/modules/pool/src/domain/pool.types.ts)
- [packages/modules/pool/src/repositories/pool.repository.ts](/Users/macbook/poolproject/packages/modules/pool/src/repositories/pool.repository.ts)
- [prisma/schema.prisma](/Users/macbook/poolproject/prisma/schema.prisma)

What to reuse:

- daily batch mentality instead of current weekly-only close
- qualification based on active package buyers, not registered-only directs
- settlement batch summary table
- per-recipient settlement item records

What must be rewritten:

- current Stephub requirement says pool basis is `100% of PV of approved sales`
- current `poolproject` implementation is weekly and fixed-rate oriented
- same-day repurchase inclusion rule must be preserved in batch ordering

## Draft Target Changes For poolproject

## A. Schema draft

Recommended additions to [prisma/schema.prisma](/Users/macbook/poolproject/prisma/schema.prisma):

1. Extend `CommissionType`
- add `TEAM_2LEG`
- add `TEAM_3LEG`
- add `MATCHING_L1`
- add `MATCHING_L2`

2. Extend `CommissionStatus` only if needed
- keep existing `APPROVED`, `HELD`, `WITHDRAWABLE`, `FALLBACK`
- consider whether `BLOCKED` is needed
- if the rule says no ledger row should exist when blocked after expiry, then a new status is not required

3. Add `CommissionReleaseStatus` enum
- `WITHDRAWABLE`
- `HELD_BUYBACK`
- `BLOCKED_AFTER_EXPIRY`

4. Extend `CommissionLedger`
- `grossAmount Decimal(18,8)`
- `finalPayableAmount Decimal(18,8)`
- `discardedAmount Decimal(18,8)`
- `releaseStatus`
- `commissionDate Date`
- `sourceCommissionLedgerId BigInt?`
- `metadata Json?`

5. Add `DailyCommissionCapUsage`
- `userId`
- `capDate`
- `capAmount`
- `usedAmount`
- unique `(userId, capDate)`

6. Add `TeamSettlementBatch`
- `settlementDate`
- `status`
- `processedAt`
- `totalUsers`
- `totalPayablePv`
- `totalBonusAmount`

7. Add `TeamSettlementBatchItem`
- `batchId`
- `userId`
- `availablePvByLeg Json`
- `plannedPaidPvByLeg Json`
- `carryForwardPvByLeg Json`
- `payablePv`
- `bonusAmount`
- `status`
- `processedAt`

8. Add `UserBuybackProgress`
- `userId`
- `accumulatedAmount`
- `status`
- `thresholdReachedAt`
- `graceExpiresAt`
- `blockedAt`
- `currentBuybackCycleId`
- `lastQualifyingOrderId`

9. Add `BuybackEvent`
- `userId`
- `status`
- `triggerAmount`
- `message`
- `referenceType`
- `referenceId`
- `metadata Json`

10. Add `PoolSettlementBatch`
- `settlementDate`
- `status`
- `processedAt`
- `qualifiedUsers`
- `totalSalesPv`
- `poolBasisPv`
- `poolAmount`
- `sharePerUser`

11. Add `PoolSettlementBatchItem`
- `batchId`
- `userId`
- `qualifiedDirectBuyerCount`
- `grossAmount`
- `finalAmount`
- `status`
- `processedAt`

## B. Runtime settings draft

Recommended expansion of [packages/shared/utils/src/commission-settings.util.ts](/Users/macbook/poolproject/packages/shared/utils/src/commission-settings.util.ts):

- `directLevelRates = ["0.5", "0.5"]`
- `matchingLevelRates = ["0.05", "0.05"]`
- `teamTwoLegRate = "0.3"`
- `teamThreeLegRate = "0.5"`
- `dailyCommissionCap = "5000"`
- `buybackThreshold = "10000"`
- `buybackExecutionAmount = "1000"`
- `buybackGraceDays = 3`
- `poolBasisMode = "approved_sales_pv_100_percent"`
- `poolMinActivePackageBuyerDirects = 3`
- `poolMaxShareRatePerEntitlement = "0.03"`

## C. Processing order draft

Recommended daily sequence for `poolproject`:

1. approved order posts direct commission only
2. approved order updates genealogy or leg PV source state
3. end-of-day team settlement batch runs
4. apply cap to team result
5. create matching from actual team final payable
6. apply buyback split and block rules
7. create buyback side-effect repurchase if required by signed-off flow
8. run daily pool settlement after the buyback side effect

This ordering is necessary to preserve the locked interpretation:

- `team -> buyback side effect -> pool`

## D. Test draft

Recommended new tests in `poolproject`:

1. Direct
- approved order with `1000 PV`
- verify `L1 = 500`, `L2 = 500`

2. Team 2-leg
- `L=2000, M=1000`
- payable PV `1000`
- bonus `300`
- carry `L=1000`

3. Team 3-leg
- `L=2000, M=1000, R=1000`
- payable PV `2000`
- bonus `1000`
- carry strongest leg `1000`

4. Matching after cap
- team gross `500`
- team final payable `100`
- matching L1 `5`
- matching L2 `5`

5. Buyback threshold split
- part before threshold -> withdrawable
- excess -> held buyback

6. Block after expiry
- when buyback progress is expired-blocked
- no commission ledger row is created
- no wallet credit is posted
- audit event is still created

7. Pool qualification
- only active package-buyer directs count
- registered-only directs do not qualify

8. Same-day repurchase in pool
- repurchase created in the same business day
- pool basis includes same-day repurchase according to locked batch order

## Implementation Advice

Recommended approach:

1. Reuse `couponweb3` tests and docs as the behavioral source
2. Re-implement the logic in Prisma style rather than porting TypeORM code
3. Build team settlement as a new bounded module instead of forcing it into the existing direct/uni flow
4. Keep buyback gating as a distinct service that commission creation calls before wallet posting
5. Convert pool from weekly close semantics to daily settlement semantics only after the new data model exists

## Copy Priority

Highest priority to reuse:

1. `commission-prd-code-matrix.md`
2. `tree-settlement.util.ts`
3. `commissions.service.spec.ts`
4. `tree.service.spec.ts`
5. `buyback.service.ts`
6. `commission-ledger.entity.ts`
7. `daily-commission-cap.entity.ts`
8. `user-buyback-progress.entity.ts`

Lower priority:

1. pool service code
2. wallet credit code placement
3. exact entity field names where `poolproject` naming conventions already differ

## Bottom Line

`couponweb3` is a strong donor for:

- rule wording
- state model
- settlement formula
- test cases

It is not a safe donor for:

- direct copy-paste service code
- direct ORM entity migration
- unchanged pool logic

The best migration path is:

- copy the tests and specs conceptually
- copy the ledger and buyback data shapes structurally
- re-implement in `poolproject` with Prisma-native modules

## Implementation Phases

This section breaks the work into practical delivery phases for `poolproject`.

### Phase 0. Lock decisions

Goal:

- remove ambiguity before schema work starts

Required sign-off items:

1. Confirm whether `3-team` really requires `L/M/R`
2. Confirm the cap unit for Stephub runtime
3. Confirm whether blocked-after-expiry should create audit only, with no ledger row
4. Confirm pool entitlement meaning for `per 1 right per day`
5. Confirm whether team and matching use the same business date cutoff as pool and buyback

Deliverables:

- one signed-off business note
- one updated rule table in this doc or a linked source-of-truth doc

Suggested owners:

- business owner
- backend lead
- QA lead

### Phase 1. Data model foundation

Goal:

- create the minimum schema needed to support the new commission plan without yet switching runtime behavior

Scope:

1. Extend `CommissionType`
2. Add `CommissionReleaseStatus`
3. Extend `CommissionLedger` with:
   - `grossAmount`
   - `finalPayableAmount`
   - `discardedAmount`
   - `releaseStatus`
   - `commissionDate`
   - `sourceCommissionLedgerId`
   - `metadata`
4. Add `DailyCommissionCapUsage`
5. Add `TeamSettlementBatch`
6. Add `TeamSettlementBatchItem`
7. Add `UserBuybackProgress`
8. Add `BuybackEvent`
9. Add `PoolSettlementBatch`
10. Add `PoolSettlementBatchItem`

Target files:

- [prisma/schema.prisma](/Users/macbook/poolproject/prisma/schema.prisma)

Exit criteria:

- Prisma schema compiles
- migration is generated cleanly
- no existing module breaks on type generation

### Phase 2. Settings and runtime contract

Goal:

- make the new rules configurable and readable by runtime modules

Scope:

1. Extend [commission-settings.util.ts](/Users/macbook/poolproject/packages/shared/utils/src/commission-settings.util.ts:1)
2. Add defaults for:
   - direct L1/L2
   - team 2-leg rate
   - team 3-leg rate
   - matching L1/L2
   - daily cap
   - buyback threshold
   - buyback execution amount
   - buyback grace days
   - pool qualification settings
3. Define one normalized settings snapshot contract used by:
   - order approval
   - team settlement
   - pool settlement
   - buyback gating

Target files:

- [packages/shared/utils/src/commission-settings.util.ts](/Users/macbook/poolproject/packages/shared/utils/src/commission-settings.util.ts:1)
- [packages/modules/commissions/src/domain/commissions.types.ts](/Users/macbook/poolproject/packages/modules/commissions/src/domain/commissions.types.ts:1)
- [packages/modules/pool/src/domain/pool.types.ts](/Users/macbook/poolproject/packages/modules/pool/src/domain/pool.types.ts:1)

Exit criteria:

- settings can round-trip through runtime JSON
- modules can read new values without fallback confusion

### Phase 3. Ledger and cap refactor

Goal:

- refactor commission creation so all future bonus types can share one gross/final/cap/release pipeline

Scope:

1. Extend commission repository create and finalize flows
2. Introduce daily cap lookup and update flow
3. Add commission creation path that:
   - accepts gross amount
   - resolves cap
   - computes final payable
   - computes discarded amount
   - stores release status
4. Preserve compatibility for current `DIRECT`, `UNI`, `POOL`, `CASHBACK`

Target files:

- [packages/modules/commissions/src/repositories/commissions.repository.ts](/Users/macbook/poolproject/packages/modules/commissions/src/repositories/commissions.repository.ts:1)
- [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts:1)
- [packages/modules/wallets/src/domain/wallets.types.ts](/Users/macbook/poolproject/packages/modules/wallets/src/domain/wallets.types.ts:1)

Exit criteria:

- direct and cashback still work
- ledger stores both gross and final amounts
- cap is enforced consistently by date and user

### Phase 4. Buyback gating module

Goal:

- add the threshold, hold, release, and expiry-block state machine

Scope:

1. Create a dedicated buyback module
2. Implement user progress locking and update flow
3. Implement commission disposition resolution:
   - withdrawable slice
   - held-buyback slice
   - blocked result
4. Implement grace expiry transition
5. Implement release path after successful buyback completion
6. Emit audit or event records for every transition

Suggested module:

- `packages/modules/buyback/src/...`

Target integration points:

- [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts:1)
- [packages/modules/wallets/src/services/wallets.service.ts](/Users/macbook/poolproject/packages/modules/wallets/src/services/wallets.service.ts:1)

Exit criteria:

- threshold crossing splits amount correctly
- blocked-after-expiry prevents new commission creation
- release from held to withdrawable is traceable

### Phase 5. Team settlement engine

Goal:

- implement the end-of-day 2-leg and 3-leg team bonus engine with carry forward

Scope:

1. Decide whether to introduce a new `team` module
2. Implement reusable settlement util
3. Load available PV by leg
4. Compute:
   - 2-leg payable PV and carry forward
   - 3-leg payable PV and carry forward
5. Persist batch and batch items
6. Create commission rows using the refactored commission pipeline
7. Mark consumed paid PV

Suggested files:

- new `packages/modules/team/src/services/team.service.ts`
- new `packages/modules/team/src/domain/team.types.ts`
- new `packages/modules/team/src/repositories/team.repository.ts`

Dependency:

- requires Phase 1 to 4

Exit criteria:

- team settlement is idempotent per settlement date
- carry-forward survives reruns
- strongest-leg overconsumption does not occur

### Phase 6. Matching engine

Goal:

- generate matching from actual team final payable after cap

Scope:

1. Run matching only after team commission finalization
2. Use `sourceCommissionLedgerId` or equivalent link
3. Create L1 and L2 matching rows
4. Reuse the same cap and buyback gating pipeline

Primary target:

- team settlement orchestration
- [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts:1)

Exit criteria:

- matching amount uses final payable, not gross
- matching is traceable back to the source team payout

### Phase 7. Pool settlement rewrite

Goal:

- replace or isolate the current weekly pool flow with the new daily settlement flow

Scope:

1. Keep current weekly pool untouched until the daily flow is verified
2. Add a new daily settlement path
3. Qualify users only by active package-buyer directs
4. Use approved sales PV basis according to Stephub rule
5. Cap pool share per entitlement as signed off
6. Ensure sequence supports:
   - `team -> buyback side effect -> pool`

Target files:

- [packages/modules/pool/src/services/pool.service.ts](/Users/macbook/poolproject/packages/modules/pool/src/services/pool.service.ts:1)
- [packages/modules/pool/src/repositories/pool.repository.ts](/Users/macbook/poolproject/packages/modules/pool/src/repositories/pool.repository.ts:1)
- [packages/modules/pool/src/domain/pool.types.ts](/Users/macbook/poolproject/packages/modules/pool/src/domain/pool.types.ts:1)

Exit criteria:

- daily pool batch is rerunnable and auditable
- same-day repurchase inclusion behaves as signed off

### Phase 8. Order approval integration

Goal:

- connect approval-time events to the new deferred batch flows without double-paying

Scope:

1. Keep direct at approval time
2. Register approved order PV for team and pool source state
3. Make sure matrix side effects still work
4. Prevent duplicate commission generation on re-entry or rerun

Target files:

- [packages/modules/orders/src/services/orders.service.ts](/Users/macbook/poolproject/packages/modules/orders/src/services/orders.service.ts:443)

Exit criteria:

- approved orders feed the new daily engines exactly once

### Phase 9. Reporting and admin visibility

Goal:

- expose the new states in BAO and operational reports

Scope:

1. Add new commission types to report queries
2. Add gross, final, discarded, and release status columns
3. Expose buyback progress and blocked state
4. Add team settlement and pool settlement batch views if needed

Target files:

- [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionReportBuilder.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionReportBuilder.php:1)
- [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionMainPlanReportScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionMainPlanReportScreen.php:1)

Exit criteria:

- ops can distinguish gross, capped, held-buyback, and blocked behavior from reports

### Phase 10. Tests and cutover

Goal:

- make the new plan safe to enable

Scope:

1. Unit tests for:
   - team formula
   - matching-after-cap
   - buyback split
   - buyback expiry block
   - pool qualification
2. Integration tests for:
   - approve order -> direct
   - approve order -> team batch
   - team batch -> matching
   - buyback side effect -> pool
3. Define cutover strategy:
   - dark launch
   - dual-write
   - report-only validation
   - full enable

Exit criteria:

- all locked rule anchors have executable tests
- team confirms rollout strategy and rollback strategy

## Suggested Ticket Breakdown

Recommended ticket order:

1. `COMM-01` Lock remaining business decisions
2. `COMM-02` Add Prisma schema for new commission data model
3. `COMM-03` Extend runtime commission settings contract
4. `COMM-04` Refactor ledger creation to support gross/final/release status
5. `COMM-05` Add buyback progress and buyback event module
6. `COMM-06` Implement daily cap usage pipeline
7. `COMM-07` Implement team settlement util and repository
8. `COMM-08` Implement daily team settlement batch processing
9. `COMM-09` Implement matching from final payable team bonus
10. `COMM-10` Implement daily pool settlement batch
11. `COMM-11` Integrate approved order source registration
12. `COMM-12` Extend BAO reports and admin visibility
13. `COMM-13` Add unit and integration regression coverage
14. `COMM-14` Run shadow validation and rollout cutover

## Suggested Milestones

Milestone A:

- Phase 0 to 3
- output: new data model and reusable commission pipeline

Milestone B:

- Phase 4 to 6
- output: buyback, team, and matching working in backend

Milestone C:

- Phase 7 to 9
- output: daily pool and admin reporting working

Milestone D:

- Phase 10
- output: validated rollout-ready release

## Dev Checklist By Ticket

This section expands each ticket into implementation-ready developer tasks.

### COMM-01 Lock remaining business decisions

Checklist:

1. Confirm whether team structure is truly `L/M/R`
   - Answer: `Yes`
2. Confirm whether the daily cap `5000` is stored and enforced in `THB` or `USDT`
   - Answer: `THB`
   - Scope: `all commission channels combined`
3. Confirm whether blocked-after-expiry means:
   - no ledger row
   - no wallet credit
   - audit event only
   - Answer: `Yes to all 3`
4. Confirm exact meaning of pool entitlement for `per 1 right per day`
   - Answer:
   - one entitlement belongs to `the member themself`
   - the member must have `1 purchase order`
   - and must have `3 direct members`
   - each direct must have `1 purchase order`
   - then the member qualifies for `1 entitlement`
5. Confirm whether pool basis uses:
   - `100% of approved PV`
   - or approved sales monetary amount
   - Answer: `100% of approved PV`
6. Confirm whether buyback threshold counts:
   - final payable after cap
   - or gross before cap
   - Answer: `final payable after cap`
7. Confirm whether same-day repurchase inclusion in pool is mandatory for all runs
   - Answer: `Yes`
8. Confirm buyback execution behavior
   - Answer:
   - `no auto-deducted recycle purchase`
   - `member must make a new purchase`
   - excess commission over threshold is held temporarily while waiting for the member-initiated repurchase
9. Confirm threshold crossing behavior
   - Answer: `Yes`
   - interpretation:
   - up to threshold goes to `withdrawable`
   - excess over threshold is held pending repurchase during the grace period
10. Confirm grace-period interpretation
   - Answer:
   - `3 calendar days`
   - business timezone `Asia/Bangkok`
   - held excess remains pending for those 3 days
   - if repurchase is completed within that window, the held portion can be released
   - if not completed within that window, status becomes `BLOCKED_AFTER_EXPIRY`
11. Confirm pool qualification rule
   - Answer:
   - member must have at least `3 directs`
   - directs must be `active package-buyer directs`
   - registered-only directs do `not` count
12. Confirm matching rule
   - Answer:
   - matching uses actual team bonus payable after cap
   - matching itself also remains inside the all-channel daily cap
13. Confirm batch sequence
   - Answer: `Yes`
   - locked order:
   - `team -> buyback side effect -> pool`
   - matching occurs after `team final payable after cap`
14. Confirm 2-leg rule
   - Answer: `Yes`
   - payable PV uses only the weaker leg
15. Confirm 3-leg rule
   - Answer: `Yes`
   - payable PV uses the sum of the 2 weakest legs
   - carry forward uses `rank 1 - rank 2` on the strongest leg
16. Confirm fallback between 3-leg and 2-leg
   - Answer: `Yes`
   - if 3-team does not have 3 legs available but does have 2 legs available, use the 2-leg rule
17. Capture all answers in one signed-off doc

Definition of done:

- no unresolved business-rule ambiguity remains for schema design

### COMM-01 Locked Answers Snapshot

Use this snapshot as the current working source of truth unless a later business sign-off replaces it.

1. Team structure is real `L/M/R`
2. Daily commission cap is `5000 THB`
3. Daily cap applies across all commission channels combined
4. Blocked-after-expiry means:
   - no new commission ledger
   - no wallet credit
   - audit/event logging still exists
5. Buyback threshold uses `final payable after cap`
6. There is `no auto-deducted recycle purchase`
7. Excess above threshold is held temporarily while waiting for a member-initiated repurchase
8. Buyback requires a new purchase from the member
9. The hold window is `3 calendar days` in `Asia/Bangkok`
10. If repurchase completes within the 3-day window, the held portion can be released
11. If repurchase does not complete within the 3-day window, status becomes `BLOCKED_AFTER_EXPIRY`
12. Pool basis is `100% of approved PV`
13. Pool qualification requires:
   - the member has their own purchase order
   - the member has 3 direct members
   - each direct has 1 purchase order
   - registered-only directs do not count
14. One qualified member meeting the above rule gets `1 entitlement`
15. Matching is calculated from actual team payable after cap
16. Matching is still subject to the same all-channel daily cap
17. Locked daily sequence:
   - `team -> buyback side effect -> pool`
18. Two-leg team rule:
   - weaker-leg basis only
   - if exactly 2 payable legs exist, use the 2-leg formula
19. Three-leg team rule:
   - use the sum of the 2 weakest legs
   - carry forward on strongest leg = `largest - second-largest`
20. If 3-leg conditions are not met but 2 payable legs exist, fall back to the 2-leg rule

### COMM-02 Add Prisma schema for new commission data model

Checklist:

1. Extend `CommissionType` enum
2. Add `CommissionReleaseStatus` enum
3. Add new fields to `CommissionLedger`
4. Add `DailyCommissionCapUsage` model
5. Add `TeamSettlementBatch` model
6. Add `TeamSettlementBatchItem` model
7. Add `UserBuybackProgress` model
8. Add `BuybackEvent` model
9. Add `PoolSettlementBatch` model
10. Add `PoolSettlementBatchItem` model
11. Add indexes for:
   - `beneficiaryUserId + commissionDate`
   - `status + releaseStatus`
   - `sourceCommissionLedgerId`
   - `userId + settlementDate`
12. Run Prisma format and generate
13. Generate migration
14. Sanity-check existing Prisma client types

Definition of done:

- schema compiles
- migration is clean
- generated client builds

### COMM-03 Extend runtime commission settings contract

Checklist:

1. Add new setting fields to the shared settings type
2. Add normalization logic for each field
3. Add default values
4. Ensure settings round-trip to runtime JSON without dropping fields
5. Add parser support in all consuming modules
6. Add compatibility fallback for older runtime JSON

Definition of done:

- old settings still parse
- new settings are available to services

### COMM-04 Refactor ledger creation to support gross/final/release status

Checklist:

1. Update commission repository create flow to persist gross and final fields
2. Add one common commission creation method that accepts gross input
3. Add cap resolution step before final ledger finalize
4. Add release-status resolution hook before wallet posting
5. Preserve support for current direct/uni/pool/cashback rows
6. Add optional metadata payload support
7. Add optional source-ledger linkage for matching

Definition of done:

- direct flow still works
- ledger rows now preserve gross vs final

### COMM-05 Add buyback progress and buyback event module

Checklist:

1. Create `packages/modules/buyback`
2. Add buyback domain types
3. Add repository methods:
   - get progress by user
   - lock progress row
   - save progress
   - append event
4. Add service methods:
   - resolve commission disposition
   - complete buyback cycle
   - expire grace periods
   - release held commission
5. Add audit/event writing for each state transition
6. Expose module contract to commissions and wallets

Definition of done:

- buyback state machine exists as a standalone reusable service

### COMM-06 Implement daily cap usage pipeline

Checklist:

1. Create repository helpers for cap lookup and update
2. Create service helper to compute remaining cap
3. Persist used amount after each finalized commission
4. Handle zero-payable capped rows correctly
5. Ensure matching reads actual final payable from the source team row
6. Add test coverage for partial cap and full cap exhaustion

Definition of done:

- cap behavior is centralized and deterministic

### COMM-07 Implement team settlement util and repository

Checklist:

1. Add a new team domain type file
2. Implement pure function for:
   - 2-leg settlement
   - 3-leg settlement
3. Make function return:
   - available PV by leg
   - planned paid PV by leg
   - carry forward PV by leg
   - payable PV
   - bonus amount
4. Add repository methods to load and persist per-user leg volumes
5. Add repository methods to create and fetch team settlement batches
6. Add unit tests for the util with locked numeric examples

Definition of done:

- pure settlement formula is covered by tests and independent of DB code

### COMM-08 Implement daily team settlement batch processing

Checklist:

1. Add team settlement scaffold creation
2. Group users with available leg PV
3. Persist one batch item per user
4. Create team commission rows through the new commission pipeline
5. Mark consumed paid PV after successful processing
6. Make the batch rerunnable and idempotent by settlement date
7. Add skip logic for already-processed batches

Definition of done:

- one end-of-day command can plan and process team settlement safely

### COMM-09 Implement matching from final payable team bonus

Checklist:

1. Resolve source team commission final payable amount
2. Resolve L1 and L2 uplines
3. Create matching rows from final team payable, not gross
4. Store linkage back to the source team commission or batch item
5. Reuse cap and buyback gating logic
6. Add tests for the `gross 500 -> final 100 -> matching 5/5` case

Definition of done:

- matching is traceable and mathematically aligned to the signed-off rule

### COMM-10 Implement daily pool settlement batch

Checklist:

1. Decide whether to keep the current weekly pool code path in parallel
2. Add repository methods to load same-day approved orders
3. Build list of active package-buyer directs
4. Compute qualified members
5. Compute pool basis and gross pool share
6. Apply per-entitlement cap rule
7. Create pool commission rows through the shared pipeline
8. Persist batch and batch items
9. Add tests for:
   - active direct buyers only
   - same-day repurchase inclusion

Definition of done:

- daily pool settlement is reproducible and auditable

### COMM-11 Integrate approved order source registration

Checklist:

1. Keep direct commission at approval time
2. Register approved order PV into team-source state
3. Register approved sales source into pool-source state
4. Ensure matrix side effects still run in correct order
5. Prevent duplicate source registration on re-entry or reprocessing
6. Add integration test for approve-order orchestration

Definition of done:

- approved orders feed deferred batch engines exactly once

### COMM-12 Extend BAO reports and admin visibility

Checklist:

1. Extend report query mapping for new commission types
2. Show gross amount
3. Show final payable amount
4. Show discarded or capped amount
5. Show release status
6. Add buyback progress visibility
7. Add blocked-after-expiry visibility
8. Add team and pool batch detail views if needed

Definition of done:

- admins can explain every commission state from the UI

### COMM-13 Add unit and integration regression coverage

Checklist:

1. Unit test direct L1/L2 = 50/50
2. Unit test 2-leg team logic
3. Unit test 3-leg team logic
4. Unit test matching-after-cap
5. Unit test buyback threshold split
6. Unit test blocked-after-expiry behavior
7. Unit test daily pool qualification
8. Integration test approve order -> direct
9. Integration test team batch -> matching
10. Integration test buyback side effect -> pool
11. Regression test current matrix and cashback paths

Definition of done:

- every locked business anchor has executable test coverage

### COMM-14 Run shadow validation and rollout cutover

Checklist:

1. Define rollout mode:
   - dark-launch
   - report-only
   - dual-write
   - direct cutover
2. Run shadow calculations for a sample date range
3. Compare new outputs with manual expected scenarios
4. Review discrepancies with business and QA
5. Prepare rollback plan
6. Prepare cutover checklist
7. Enable production flag only after sign-off

Definition of done:

- rollout path and rollback path are both documented and approved
