# UAT PV Cycle Cap Scenario Check

Updated: 2026-05-18

## Goal

Verify the new `PV-only` cycle-cap behavior on UAT using real approved orders against fresh isolated test members.

## Test Catalog Used

- `COMMTEST1000` / `COMMTESTPKG1000`
  - `1000 THB`
  - `200 PV`
  - `earningCap = 10000`
- `COMMTEST650` / `COMMTESTPKG650`
  - `650 THB`
  - `100 PV`
  - `earningCap = 5000`

## Runtime Script

- [scripts/uat_pv_cycle_cap_scenarios.sh](/Users/macbook/poolproject/scripts/uat_pv_cycle_cap_scenarios.sh:1)
- UAT raw runtime log:
  - first pass: `~/poolproject/runtime/pv-cycle-cap-uat-20260518-135422.log`
  - fix + promotion pass: `~/poolproject/runtime/pv-cycle-cap-uat-20260518-fix-promote.log`
  - round reopen validation pass: `~/poolproject/runtime/pv-cycle-cap-uat-20260518-reopen-r3.log`

## Test Members Created

- `UTPV100A-135422`
- `UTPV200A-135422`
- `UTPV2X100-135422`
- `UTPV200P100-135422`
- `UTPV100A-140522`
- `UTPV200A-140522`
- `UTPV2X100-140522`
- `UTPV200P100-140522`
- `UTPVPROMO-140522`
- `UTPVPCHD-140522`

These members were created as isolated UAT test members under sponsor `TH0000001` so the new cycle behavior could be checked without mutating older member cycles.

## Results

### 1. Single `100 PV`

Member:

- `UTPV100A-135422`

Order:

- `COMMTEST650`

Observed `MemberPackageCycle`:

- `cycleNo = 1`
- `accumulatedPv = 100`
- `cycleCapTier = BELOW_200_PV`
- `earningCap = 5000`
- `isReceivable = true`

Status:

- pass

## Remaining Targeted Scenarios Before Production Sign-off

These are the next high-signal runtime checks that should be executed on UAT from the same script family before final production sign-off:

### A. Threshold upgrade with uneven split

- scenario: `150 PV + 60 PV`
- expected:
  - first order opens `cycleNo = 1` with `< 200 PV => 5000`
  - second order upgrades the same cycle to `>= 200 PV => 10000`
  - the overflow `10 PV` should seed `cycleNo = 2`
  - if cycle `1` is still receivable, `cycleNo = 2` should remain queued with `< 200 PV => 5000`

### B. Grace expiry

- scenario:
  - push member to threshold
  - do not repurchase during grace
  - evaluate commission after `graceExpiresAt`
- expected:
  - `UserBuybackProgress = BLOCKED_EXPIRED`
  - held rows from grace are marked blocked by expiry
  - new commission after expiry is no longer created as member-payable

### C. Late reopen after expiry with `100 PV`

- scenario:
  - let member expire first
  - then approve a `100 PV` self-purchase
- expected:
  - member returns to active round state
  - new cycle opens with `100 PV / 5000`

### D. Late reopen after expiry with `200 PV`

- scenario:
  - let member expire first
  - then approve a `200 PV` self-purchase
- expected:
  - member returns to active round state
  - new cycle opens with `200 PV / 10000`

### E. Repurchase cancel / recompute

- scenario:
  - reopen a round with a qualifying repurchase
  - then cancel or reverse the qualifying order and force recompute if the runtime supports it
- expected:
  - round state should not remain incorrectly `CLEAR` if the qualifying basis disappears
  - if rollback is not supported yet, record the exact current behavior as an operational limitation

### 2. Single `200 PV`

Member:

- `UTPV200A-135422`

Order:

- `COMMTEST1000`

Observed `MemberPackageCycle`:

- `cycleNo = 1`
- `accumulatedPv = 200`
- `cycleCapTier = AT_LEAST_200_PV`
- `earningCap = 10000`
- `isReceivable = true`

Status:

- pass

### 3. `100 PV + 100 PV`

Member:

- `UTPV2X100-135422`

Orders:

- first: `COMMTEST650`
- second: `COMMTEST650`

Observed after first order:

- `cycleNo = 1`
- `accumulatedPv = 100`
- `cycleCapTier = BELOW_200_PV`
- `earningCap = 5000`

Observed after second order:

- still `cycleNo = 1`
- `accumulatedPv = 200`
- `cycleCapTier = AT_LEAST_200_PV`
- `earningCap = 10000`
- `isReceivable = true`

Status:

- pass

### 4. `200 PV + 100 PV`

Member:

- `UTPV200P100-135422`

Orders:

- first: `COMMTEST1000`
- second: `COMMTEST650`

Observed after first order:

- `cycleNo = 1`
- `accumulatedPv = 200`
- `cycleCapTier = AT_LEAST_200_PV`
- `earningCap = 10000`
- `isReceivable = true`

Observed after second order:

- `cycleNo = 1`
  - `accumulatedPv = 200`
  - `earningCap = 10000`
  - `isReceivable = true`
- `carryOverPvOut = 100`
- `cycleNo = 2`
  - `accumulatedPv = 100`
  - `cycleCapTier = BELOW_200_PV`
  - `earningCap = 5000`
  - `carryOverPvIn = 100`
  - `isReceivable = false`

Status:

- pass for business behavior

### 5. Queue promotion after the older cycle is truly capped

Members:

- parent: `UTPVPROMO-140522`
- child: `UTPVPCHD-140522`

Orders:

- parent seed 1: `COMMTEST1000 x1`
- parent seed 2: `COMMTEST650 x1`
- child day 1: `COMMTEST1000 x50`
- child day 2: `COMMTEST1000 x50`

Observed before downline orders:

- parent `cycleNo = 1`
  - `accumulatedPv = 200`
  - `earningCap = 10000`
  - `isReceivable = true`
- parent `cycleNo = 2`
  - `accumulatedPv = 100`
  - `earningCap = 5000`
  - `isReceivable = false`

Observed after child day 1:

- parent `cycleNo = 1`
  - `earnedTotalInCycle = 5000`
  - `earningStatus = ACTIVE`
  - `isReceivable = true`
- parent `cycleNo = 2`
  - still `isReceivable = false`

Observed after child day 2:

- parent `cycleNo = 1`
  - `earnedTotalInCycle = 10000`
  - `earningStatus = CAPPED`
  - `isReceivable = false`
- parent `cycleNo = 2`
  - `earningStatus = ACTIVE`
  - `isReceivable = true`
  - `readyToReceiveAt` was populated when promotion happened

Status:

- pass

### 6. Reopen next round with `100 PV`

Members:

- parent: `UTPVRE100-154659`
- child: `UTPVRC100-154659`

Observed after threshold:

- parent cycle `1` became `CAPPED`
- `UserBuybackProgress = HELD_PENDING_REPURCHASE`

Observed after repurchase order `COMMTEST650 = 100 PV`:

- new `cycleNo = 2`
  - `accumulatedPv = 100`
  - `cycleCapTier = BELOW_200_PV`
  - `earningCap = 5000`
  - `isReceivable = true`
- `UserBuybackProgress = CLEAR`
- `lastQualifyingOrderId` points to the repurchase order

Status:

- pass

### 7. Reopen next round with `200 PV`

Members:

- parent: `UTPVRE200-154659`
- child: `UTPVRC200-154659`

Observed after threshold:

- parent cycle `1` became `CAPPED`
- `UserBuybackProgress = HELD_PENDING_REPURCHASE`

Observed after repurchase order `COMMTEST1000 = 200 PV`:

- new `cycleNo = 2`
  - `accumulatedPv = 200`
  - `cycleCapTier = AT_LEAST_200_PV`
  - `earningCap = 10000`
  - `isReceivable = true`
- `UserBuybackProgress = CLEAR`
- `lastQualifyingOrderId` points to the repurchase order

Status:

- pass

## What Passed

- `< 200 PV` opens a `5000` cycle
- `= 200 PV` opens a `10000` cycle
- later self-purchase can upgrade the same current cycle from `5000` to `10000`
- overflow after a full `200 PV` cycle can open the next queued cycle
- `carryOverPvOut` now records the outbound `100 PV` in the `200 + 100` scenario
- queued next cycle is correctly non-receivable while the older cycle is still receivable
- queued next cycle is promoted to receivable after the older cycle is truly capped by earned commission
- round reopen after threshold now follows repurchase PV correctly:
  - `100 PV => new cycle cap 5000`
  - `200 PV => new cycle cap 10000`

## Notes

- The promotion proof used real downline orders and real commission finalization, not a manual SQL bump of `earnedTotalInCycle`.
- The child `qty=50` orders showed one more runtime characteristic:
  - self-purchase PV allocation currently chunks a large order into many `200 PV` cycles for the buyer
  - this appears consistent with the current allocation rule, but it should be kept in mind when reviewing whether large-quantity orders are expected to fan out into many queued cycles

## Current Conclusion

The core user-facing/business behavior for the new PV rule is now working on UAT for:

- `100`
- `200`
- `100 + 100`
- `200 + 100`
- queued promotion after the older cycle is capped by real earned commission

The next focused check should be:

1. decide whether large-quantity self-purchase orders should intentionally fan out into many cycles or whether quantity should be normalized differently for this rule
2. add smaller automated coverage for promotion without producing a very long runtime report
3. decide whether CAP grant should remain product-master-based or become cycle-cap-aware
