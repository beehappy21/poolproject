# Daily Pool And End-Of-Day Commission Spec

Updated: 2026-04-29

## Goal

Lock the current business rules for:

- immediate `Direct` payout on approved orders
- end-of-day `2leg / 3leg`, `Matching`, and `Pool`
- team-only daily cap
- unchanged `Buyback / Recycle`
- new daily pool qualification and payout limits

This file is the working source of truth for the next implementation round unless a later approved revision replaces it.

## Locked Rules

### 1. Direct

- `Direct` is calculated immediately when an order becomes `approved`.
- `Direct` does not wait for the end-of-day batch.
- `Direct` does not use the team daily cap.
- `Direct` still goes through the existing finalization and buyback path.

### 2. Team

- `2leg / 3leg` is calculated only after the business day ends.
- The daily cap applies only to `2leg / 3leg`.
- The current cap amount remains the existing configured team daily cap.
- Cap is applied per beneficiary per Bangkok business date.

### 3. Matching

- `Matching` is calculated only after the business day ends.
- `Matching` does not have its own daily cap.
- `Matching` must be based on the actual `2leg / 3leg finalPayableAmount` after the team daily cap is applied.

### 4. Pool

- `Pool` is calculated only after the business day ends.
- Pool funding uses `approved PV` from the same Bangkok business day only.
- Pool should use only products explicitly marked as pool-enabled.
- Product-level pool configuration should be reduced to a simple `enabled / disabled` rule where possible.

### 5. Pool Qualification Timing

- If a member completes pool qualification on day `D`, the member starts receiving pool on day `D + 1`.
- There is no same-day retroactive pool entitlement.
- Once qualified, the member can receive pool every day until the related `memberPackageCycle` ends.

### 6. Pool Payout Limit

- A member's daily pool payout must not exceed `3%` of that member's real paid purchase amount for pool-enabled products on that same day.
- The cap basis is `real paid purchase amount`, not `purchaseBase`, and not pure PV.
- If a member has no real paid purchase amount from pool-enabled products that day, the member's daily pool cap is `0`.

Suggested formula:

- `memberDailyPoolCap = realPaidPoolEnabledPurchaseAmountOfDay x 0.03`
- `memberPoolPayable = min(calculatedPoolShare, memberDailyPoolCap)`

### 7. Buyback / Recycle

- `Buyback / Recycle` remains unchanged in this round.
- The threshold rule stays based on accumulated commission `finalPayableAmount` after applicable cap logic.
- No new pool-specific buyback rule is introduced in this round.

## Daily Runtime Order

### Immediate On Order Approval

1. persist `approved_at`
2. calculate `Direct`
3. finalize `Direct` through the existing cycle allocation and buyback path
4. store the approved order for end-of-day team / matching / pool processing

### End Of Day Batch

1. load the same-day approved orders
2. calculate `2leg / 3leg`
3. apply the team-only daily cap
4. calculate `Matching` from team `finalPayableAmount` after cap
5. preserve existing buyback side effects from the finalized commission flow
6. calculate and close `Pool` for the same business day

## Pool Funding Basis

- The pool fund uses approved-order PV from the same Bangkok business day.
- Pool-enabled products decide whether that order line contributes to the pool source.
- The per-member pool payout limit uses real paid purchase amount, not PV.

This means the system intentionally uses:

- `PV` to build the pool fund
- `real paid amount` to cap each member's daily pool payout

## Working Terms

- Commission cycle in the current runtime is referred to as `cycle`.
- The member-facing earning window should be treated as `memberPackageCycle`.
- Pool eligibility should continue to bind to that earning window unless a later business revision changes the entitlement model.

## Implementation Checklist For This Spec

- add or confirm a product-level `pool enabled` flag
- remove or hide unused pool-rate-per-product controls if the business no longer needs them
- split immediate-vs-end-of-day commission execution paths
- keep `Direct` on approval
- keep `2leg / 3leg`, `Matching`, and `Pool` in the end-of-day batch
- restrict daily cap logic to `2leg / 3leg` only
- keep `Matching` based on team `finalPayableAmount` after cap
- update pool entitlement timing to `qualified today -> payable tomorrow`
- enforce the `3% of real paid amount` daily pool ceiling per member
- update handoff and checklist files at the end of every implementation session
