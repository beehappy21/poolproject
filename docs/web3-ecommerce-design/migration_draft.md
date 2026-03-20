# DB Migration Draft

**Depends on:** [schema_spec.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/schema_spec.md)

---

## 1. Purpose

Translate the schema spec into a migration-oriented rollout plan that a backend team can implement in phases with minimal reconciliation risk.

This is not framework-specific code. It is an ordered migration draft.

---

## 2. Migration Strategy

Principles:
- additive-first
- backfill before enforcing strict constraints
- dual-read / dual-write where needed
- no destructive removal of legacy assumptions until reconciliation passes

Recommended phases:
1. foundation columns
2. commission plan configuration tables
3. new risk and workflow tables
4. cycle-aware commission support
5. wallet hold and negative-offset support
6. payout-role and audit enhancements
7. data backfill and integrity checks
8. constraint hardening
9. legacy cleanup

---

## 3. Phase 1: Foundation Columns

### 3.1 `users`
Add:
- `risk_level`
- `payout_status`
- `manual_review_required`
- `manual_review_reason`
- `last_risk_reviewed_at`

Backfill:
- `risk_level = normal`
- `payout_status = active`
- `manual_review_required = false`

### 3.2 `orders`
Add:
- `approved_at`
- `approval_batch_ref`
- `approval_status`
- `exceptional_reversal_status`
- `commission_plan_id`

Backfill:
- if `status = approved`, set `approval_status = approved`
- otherwise set sensible mapped default

### 3.3 `member_package_cycles`
Add:
- `cycle_no`
- `is_receivable`
- `capped_at`
- `closed_at`

Backfill:
- assign `cycle_no` per user ordered by `activated_at`, then `id`
- derive `is_receivable` from status, active window, and earning status

Indexes:
- add non-unique indexes after backfill

---

## 4. Phase 2: Create Commission Plan Configuration Tables

Create:
- `commission_plans`
- `commission_plan_direct_rules`
- `commission_plan_uni_rules`

Notes:
- seed one default active plan that matches current business defaults if needed
- historical calculations must remain tied to their frozen plan reference

---

## 5. Phase 3: Create New Workflow and Risk Tables

Create:
- `identity_signals`
- `wallet_binding_history`
- `risk_flags`
- `review_cases`
- `payout_holds`
- `audit_logs`

Notes:
- `wallet_binding_history` should be seeded from current `users.wallet_address` where available
- create one synthetic `bind` history row per currently verified wallet if legacy data exists

---

## 6. Phase 4: Cycle-Aware Commission Support

### 5.1 `commission_ledger`
Add:
- `commission_plan_id`
- `commission_rule_id`
- `tier_no`
- `beneficiary_cycle_id`
- `evaluation_at`
- `finalized_at`
- `block_reason`
- `company_fallback_reason`
- `hold_status`
- `hold_reason`
- `released_to_withdrawable_at`

Backfill:
- legacy rows may have null `beneficiary_cycle_id`
- mark them as `legacy_unassigned_cycle` in a migration note table or audit record if precise backfill is not possible

Constraint rollout:
1. add nullable column
2. deploy application logic that writes `beneficiary_cycle_id`
3. reconcile new rows
4. only then enforce stricter not-null checks for payable statuses

### 5.2 `daily_pool_cycles`
Add:
- `commission_plan_id`
- `snapshot_at`
- `funding_approved_order_count`
- `funding_total_approved_pv`
- `company_fallback_amount`

### 5.3 `daily_pool_payouts`
Add:
- `beneficiary_cycle_id`
- `commission_ledger_id`
- `block_reason`
- `hold_status`
- `hold_reason`

---

## 7. Phase 5: Wallet Evolution

### 6.1 `wallets`
Add:
- `held_balance`
- `negative_offset_balance`
- `payout_lock_status`
- `payout_lock_reason`

Backfill:
- `held_balance = 0`
- `negative_offset_balance = 0`
- `payout_lock_status = unlocked`

### 6.2 `wallet_transactions`
Add:
- `balance_bucket`
- `counterparty_user_id`
- `operator_user_id`
- `review_case_id`
- `audit_log_id`

Constraint rollout:
- add columns nullable first where operationally needed
- switch application writes
- enforce not-null on `balance_bucket` after write path is live

---

## 8. Phase 6: Reversal and Treasury Enhancements

### 7.1 `commission_reversals`
Add:
- `order_id`
- `beneficiary_user_id`
- `beneficiary_cycle_id`
- `review_case_id`
- `approved_by_user_id`
- `applied_at`
- `is_exceptional_post_approval`

### 7.2 `payout_batches`
Add:
- `approved_by_user_id`
- `submitted_by_user_id`
- `reconciled_by_user_id`
- `risk_snapshot_ref`

### 7.3 `payout_batch_items`
Add:
- `wallet_transaction_id`
- `hold_cleared_at`
- `excluded_reason`

---

## 9. Phase 7: Backfills

### 8.1 Cycle numbering backfill
Method:
1. for each user, order cycles by `activated_at`, then `id`
2. assign sequential `cycle_no` starting at `1`

### 8.2 Wallet binding history backfill
Method:
1. select users with non-null `wallet_address`
2. create history rows:
   - `action_type = bind`
   - `action_status = effective`
   - `effective_at = wallet_verified_at` if available else `created_at`

### 8.3 Order approval backfill
Method:
1. map historical approved orders to `approved_at`
2. if exact approved timestamp is unknown:
   - use best available proxy
   - mark low-confidence provenance in audit note
3. `REQUIRES BUSINESS DECISION`:
   - whether historical approved orders must be backfilled to a specific `commission_plan_id`

### 8.4 Commission cycle backfill
Status:
- `REQUIRES BUSINESS DECISION` if historical payable rows must be assigned to a precise cycle retrospectively

Recommended conservative path:
- only require strict cycle assignment for rows created after migration cutover

---

## 10. Phase 8: Integrity Checks

Run checks before enforcing stricter constraints:
- every active user wallet has at most one current `users.wallet_address`
- every current wallet pointer has corresponding effective `wallet_binding_history`
- every approved order has non-null `commission_plan_id` after cutover
- every new payable commission row has non-null `beneficiary_cycle_id`
- no `fallback` commission row has member wallet postings
- wallet transaction sums match wallet bucket balances
- no payout batch item references held or locked funds

---

## 11. Phase 9: Constraint Hardening

After application cutover and reconciliation:
- enforce check on payable `commission_ledger` rows requiring `beneficiary_cycle_id`
- enforce wallet bucket defaults and not-null constraints
- enforce role-actor foreign keys where missing
- add uniqueness / partial indexes as supported by chosen database

---

## 12. Optional Legacy Cleanup

Possible later cleanup:
- rename `refunds` to `order_adjustments`
- remove any code paths assuming single current cycle
- deprecate legacy wallet posting types that do not specify `balance_bucket`

---

## 13. Recommended Release Order

1. deploy additive DB migrations
2. deploy write paths for new columns/tables
3. backfill data
4. run reconciliation scripts
5. enable reads from new structures
6. harden constraints
7. remove old assumptions

---

## 14. REQUIRES BUSINESS DECISION

- Whether historical commission rows must be retro-assigned to cycles
- Whether historical approved orders must be backfilled to a specific `commission_plan_id`
- Whether to rename `refunds` to `order_adjustments` during the same migration wave or later
