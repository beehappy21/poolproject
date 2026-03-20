# Service and Module Breakdown

**Depends on:** [design_update_locked_decisions.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/design_update_locked_decisions.md), [schema_spec.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/schema_spec.md), [api_contracts.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/api_contracts.md)

---

## 1. Purpose

Define a practical implementation module breakdown for Phase 1 without requiring a microservice split from day one.

Recommendation:
- Start as a modular monolith with clear domain boundaries.
- Keep future extraction paths obvious for settlement, risk, and commission domains.

---

## 2. Recommended Top-Level Modules

### 2.1 Auth and Identity Module
Responsibilities:
- register / login
- password auth
- sponsor code validation
- session / token handling
- actor role resolution

Key tables:
- `users`

Key APIs:
- auth endpoints

### 2.2 Wallet Binding and Security Module
Responsibilities:
- wallet connect flow
- signature nonce verification
- bind / rebind workflow
- duplicate wallet detection
- wallet binding history
- payout freeze on sensitive wallet changes

Key tables:
- `wallet_binding_history`
- `identity_signals`
- `risk_flags`
- `payout_holds`
- `audit_logs`

### 2.3 Member and Genealogy Module
Responsibilities:
- member profile
- sponsor tree reads
- upline traversal
- direct referral listing
- active direct referral counting

Key tables:
- `users`
- `member_package_cycles`

### 2.4 Package and Cycle Module
Responsibilities:
- package CRUD
- cycle activation
- cycle numbering
- cycle receivable-state derivation
- per-cycle cap tracking

Key tables:
- `packages`
- `member_package_cycles`

### 2.5 Order and Approval Module
Responsibilities:
- order creation
- payment confirmation
- refund-window tracking
- approval transition
- pre-approval order adjustments

Key tables:
- `orders`
- `order_items`
- `order_adjustments` or legacy `refunds`

### 2.6 Qualification Module
Responsibilities:
- member-level active evaluation
- cycle-level receivable evaluation
- cap acceptance checks
- pool eligibility snapshot inputs

Key tables:
- `member_package_cycles`
- optional read models

### 2.7 Commission Module
Responsibilities:
- commission plan resolution
- direct tier schedule handling
- uni level schedule handling
- beneficiary member resolution
- beneficiary cycle assignment
- cap enforcement
- company fallback creation

Key tables:
- `commission_plans`
- `commission_plan_direct_rules`
- `commission_plan_uni_rules`
- `commission_ledger`
- `company_bonus_ledger`

### 2.8 Pool Module
Responsibilities:
- approved-order PV aggregation
- configurable pool-rate resolution
- daily eligibility snapshots
- daily pool close
- pool payout item creation

Key tables:
- `commission_plans`
- `daily_pool_cycles`
- `daily_pool_eligibility_snapshots`
- `daily_pool_payouts`
- `commission_ledger`

### 2.9 Wallet Ledger Module
Responsibilities:
- wallet bucket postings
- negative offset application
- hold-to-withdrawable release
- wallet statements

Key tables:
- `wallets`
- `wallet_transactions`
- `payout_holds`

### 2.10 Review and Risk Module
Responsibilities:
- risk flag lifecycle
- manual review cases
- payout hold placement and release
- abuse-signal scoring hooks

Key tables:
- `review_cases`
- `risk_flags`
- `payout_holds`
- `identity_signals`
- `audit_logs`

### 2.11 Reversal Module
Responsibilities:
- exceptional reversal request / approval / apply
- wallet debit and negative offset creation
- audit evidence

Key tables:
- `commission_reversals`
- `review_cases`
- `wallet_transactions`

### 2.12 Treasury and Settlement Module
Responsibilities:
- payout candidate selection
- payout batch creation
- treasury approval / submit / reconcile
- on-chain settlement recording

Key tables:
- `payout_batches`
- `payout_batch_items`
- `wallet_transactions`

### 2.13 Reporting and Audit Module
Responsibilities:
- member income views
- cycle views
- pool reports
- company fallback reports
- audit search

Key tables:
- read across all financial and audit tables

---

## 3. Module Boundaries and Ownership Rules

### 3.1 Order module owns commercial truth
- order payment and approval status originate here
- commission and pool modules consume approval events, not raw payment state

### 3.2 Qualification module owns derived eligibility logic
- other modules should call qualification services rather than duplicate active/cap logic

### 3.3 Commission module owns bonus item creation
- wallet module must not invent commission rows
- pool module may request commission-like payout creation through commission abstractions

### 3.4 Wallet ledger module owns balance math
- balance buckets and transaction postings are centralized
- payout, hold, reversal, and release flows must route through wallet posting rules

### 3.5 Review and risk module owns hold decisions
- treasury cannot override holds silently
- holds and releases must be auditable actions

### 3.6 Treasury module owns payout execution only
- treasury does not determine eligibility or cap rules
- treasury consumes withdrawable candidates

---

## 4. Recommended Internal Interfaces

### 4.1 Qualification service interface
Methods:
- `isMemberActive(userId, atTime)`
- `getReceivableCycles(userId, atTime)`
- `findFirstCapAcceptingCycle(userId, atTime, amount)`
- `countActiveDirectReferrals(userId, atTime)`

### 4.2 Commission service interface
Methods:
- `resolveActiveCommissionPlan(atTime)`
- `createDirectItemsForApprovedOrder(orderId)`
- `createUniItemsForApprovedOrder(orderId)`
- `finalizeCommissionItem(itemId)`
- `routeItemToFallback(itemId, reason)`

### 4.3 Pool service interface
Methods:
- `snapshotEligibility(poolDate)`
- `closePool(poolDate)`
- `createPoolPayoutItem(userId, poolCycleId, amount)`
- `resolveFrozenPoolRate(poolDate)`

### 4.4 Wallet ledger service interface
Methods:
- `postApprovedEarning(itemId)`
- `applyNegativeOffset(userId, amount, ref)`
- `placeHold(userId, scope, reason)`
- `releaseHold(holdId)`
- `reserveForPayout(itemIds, batchId)`
- `applyExceptionalReversal(reversalId)`

### 4.5 Review service interface
Methods:
- `openCase(type, userId, context)`
- `assignCase(caseId, reviewerId)`
- `resolveCase(caseId, resolution)`

---

## 5. Suggested Event Model

Domain events:
- `order_paid`
- `order_approved`
- `cycle_activated`
- `commission_item_created`
- `commission_item_fallbacked`
- `pool_snapshot_completed`
- `pool_closed`
- `payout_hold_placed`
- `payout_hold_released`
- `wallet_rebind_requested`
- `wallet_rebind_effective`
- `exceptional_reversal_requested`
- `exceptional_reversal_applied`
- `payout_batch_created`
- `payout_batch_submitted`
- `payout_batch_confirmed`

---

## 6. Recommended Build Order

1. Auth and Identity
2. Package and Cycle
3. Order and Approval
4. Qualification
5. Commission
6. Pool
7. Wallet Ledger
8. Review and Risk
9. Reversal
10. Treasury and Settlement
11. Reporting and Audit

Reason:
- This sequence follows dependency flow from commercial source events to financial settlement.

---

## 7. Team Ownership Option

If one team:
- keep modular monolith boundaries in folders/packages

If two teams:
- Team A: commerce, genealogy, qualification, commission, pool
- Team B: wallet, review/risk, treasury, audit

If later service extraction is needed:
- highest-value extraction candidates are `treasury`, `review/risk`, and `reporting`

---

## 8. REQUIRES BUSINESS DECISION

- None newly introduced here beyond existing unresolved items

Implementation note:
- because the repository currently has no application framework, this module map is the safest next artifact before code scaffolding
