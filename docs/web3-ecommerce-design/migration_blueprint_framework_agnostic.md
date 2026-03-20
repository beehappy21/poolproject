# Migration Blueprint (Framework-Agnostic)

**Depends on:** [schema_spec.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/schema_spec.md), [migration_draft.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/migration_draft.md)

---

## 1. Purpose

Provide a concrete migration blueprint that can be translated into:
- SQL migrations
- ORM migrations
- framework migration classes

This blueprint intentionally stays framework-agnostic because the repository does not yet contain an application stack.

---

## 2. Suggested Migration Files / Units

Recommended ordering:
1. `001_expand_users_for_risk_and_payout_status`
2. `002_expand_orders_for_approval_and_exceptional_reversal`
3. `003_create_commission_plans`
4. `004_create_commission_plan_direct_rules`
5. `005_create_commission_plan_uni_rules`
6. `006_expand_member_package_cycles_for_multi_cycle_accounting`
7. `007_create_identity_signals`
8. `008_create_review_cases`
9. `009_create_wallet_binding_history`
10. `010_create_risk_flags`
11. `011_create_payout_holds`
12. `012_create_audit_logs`
13. `013_expand_commission_ledger_for_cycle_assignment_and_holds`
14. `014_expand_daily_pool_cycles_and_payouts`
15. `015_expand_wallets_and_wallet_transactions`
16. `016_expand_commission_reversals_for_exceptional_flow`
17. `017_expand_payout_batches_and_items_for_role_separation`
18. `018_backfill_cycle_numbers_and_receivable_flags`
19. `019_backfill_wallet_binding_history_from_current_wallet_pointer`
20. `020_backfill_order_approval_fields`
21. `021_add_indexes_and_soft_constraints`
22. `022_harden_constraints_after_cutover`

---

## 3. Concrete Migration Units

### 3.1 `001_expand_users_for_risk_and_payout_status`
Changes:
- add `risk_level`
- add `payout_status`
- add `manual_review_required`
- add `manual_review_reason`
- add `last_risk_reviewed_at`

Defaults:
- `risk_level = 'normal'`
- `payout_status = 'active'`
- `manual_review_required = false`

Safe rollout notes:
- add as nullable with backfill, then harden to not null where needed

### 3.2 `002_expand_orders_for_approval_and_exceptional_reversal`
Changes:
- add `approved_at`
- add `approval_batch_ref`
- add `approval_status`
- add `exceptional_reversal_status`
- add `commission_plan_id`

Default mappings:
- `approval_status = 'pending'`
- `exceptional_reversal_status = 'none'`

### 3.3 `003_create_commission_plans`
Create table:
- `commission_plans`

### 3.4 `004_create_commission_plan_direct_rules`
Create table:
- `commission_plan_direct_rules`

### 3.5 `005_create_commission_plan_uni_rules`
Create table:
- `commission_plan_uni_rules`

### 3.6 `006_expand_member_package_cycles_for_multi_cycle_accounting`
Changes:
- add `cycle_no`
- add `is_receivable`
- add `capped_at`
- add `closed_at`

Backfill logic:
- partition by `user_id`
- order by `activated_at`, `id`
- assign sequential `cycle_no`
- derive `is_receivable`

### 3.7 `007_create_identity_signals`
Create table:
- `identity_signals`

### 3.8 `008_create_review_cases`
Create table:
- `review_cases`

### 3.9 `009_create_wallet_binding_history`
Create table:
- `wallet_binding_history`

### 3.10 `010_create_risk_flags`
Create table:
- `risk_flags`

### 3.11 `011_create_payout_holds`
Create table:
- `payout_holds`

### 3.12 `012_create_audit_logs`
Create table:
- `audit_logs`

### 3.13 `013_expand_commission_ledger_for_cycle_assignment_and_holds`
Changes:
- add `commission_plan_id`
- add `commission_rule_id`
- add `tier_no`
- add `beneficiary_cycle_id`
- add `evaluation_at`
- add `finalized_at`
- add `block_reason`
- add `company_fallback_reason`
- add `hold_status`
- add `hold_reason`
- add `released_to_withdrawable_at`

Rollout note:
- keep `beneficiary_cycle_id` nullable until all new write paths are live

### 3.14 `014_expand_daily_pool_cycles_and_payouts`
Changes to `daily_pool_cycles`:
- add `commission_plan_id`
- add `snapshot_at`
- add `funding_approved_order_count`
- add `funding_total_approved_pv`
- add `company_fallback_amount`

Changes to `daily_pool_payouts`:
- add `beneficiary_cycle_id`
- add `commission_ledger_id`
- add `block_reason`
- add `hold_status`
- add `hold_reason`

### 3.15 `015_expand_wallets_and_wallet_transactions`
Changes to `wallets`:
- add `held_balance`
- add `negative_offset_balance`
- add `payout_lock_status`
- add `payout_lock_reason`

Changes to `wallet_transactions`:
- add `balance_bucket`
- add `counterparty_user_id`
- add `operator_user_id`
- add `review_case_id`
- add `audit_log_id`

### 3.16 `016_expand_commission_reversals_for_exceptional_flow`
Changes:
- add `order_id`
- add `beneficiary_user_id`
- add `beneficiary_cycle_id`
- add `review_case_id`
- add `approved_by_user_id`
- add `applied_at`
- add `is_exceptional_post_approval`

### 3.17 `017_expand_payout_batches_and_items_for_role_separation`
Changes to `payout_batches`:
- add `approved_by_user_id`
- add `submitted_by_user_id`
- add `reconciled_by_user_id`
- add `risk_snapshot_ref`

Changes to `payout_batch_items`:
- add `wallet_transaction_id`
- add `hold_cleared_at`
- add `excluded_reason`

### 3.18 `018_backfill_cycle_numbers_and_receivable_flags`
Algorithm:
1. load cycles ordered by user and activation time
2. assign sequential `cycle_no`
3. derive `is_receivable = true` when:
   - `status = active`
   - `earning_status = active`
   - `active_until >= backfill_time`
4. set `capped_at` where earning status already indicates capped if evidence exists

### 3.19 `019_backfill_wallet_binding_history_from_current_wallet_pointer`
Algorithm:
1. read `users.wallet_address`
2. for each non-null value create synthetic `bind` history row
3. use `wallet_verified_at` as `effective_at` when available
4. tag row provenance as migrated legacy state in `reason`

### 3.20 `020_backfill_order_approval_fields`
Algorithm:
1. map legacy approved orders to `approval_status = approved`
2. infer `approved_at` from best available timestamp
3. if timestamp confidence is low, emit audit note
4. `REQUIRES BUSINESS DECISION`:
   - whether historical approved orders must be backfilled with a specific `commission_plan_id`

### 3.21 `021_add_indexes_and_soft_constraints`
Add:
- indexes from [schema_spec.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/schema_spec.md)
- non-blocking check constraints where supported

Soft constraints first:
- approved orders should have `commission_plan_id`
- payable commission rows should have `beneficiary_cycle_id`
- current wallet pointer should have matching effective wallet history row

### 3.22 `022_harden_constraints_after_cutover`
Harden only after application cutover:
- not null where backfill is complete
- check constraints for status/column compatibility
- partial or filtered indexes if DB supports them

---

## 4. Backfill Safety Rules

- Run backfills in id-ordered batches.
- Log backfill provenance for synthetic values.
- Do not overwrite user-entered historical timestamps without preserving source evidence.
- Re-run backfill scripts idempotently where possible.

---

## 5. Constraint Hardening Sequence

Order:
1. add columns nullable
2. deploy writes
3. backfill
4. verify metrics
5. enforce not null / check constraints

Never harden before:
- new write path is live
- reconciliation reports pass

---

## 6. Reconciliation Checklist

- sum of wallet transactions by bucket equals `wallets` table balances
- every approved order has non-null `commission_plan_id` after cutover
- every post-cutover payable commission item has `beneficiary_cycle_id`
- every pool payout row has consistent `commission_ledger_id` linkage where used
- every active user wallet pointer has at most one effective wallet history row
- no payout batch item references funds under active hold or lock

---

## 7. Translation Notes for Common Stacks

### 7.1 SQL-first
- use raw DDL plus backfill scripts

### 7.2 ORM-first
- separate schema migrations from data backfill jobs
- avoid embedding large backfills inside request-time deploys

### 7.3 Event-driven systems
- deploy schema first
- dual-write next
- switch consumers last

---

## 8. REQUIRES BUSINESS DECISION

- Whether historical commission rows must be retro-assigned to cycles
- Whether historical approved orders must be backfilled to a specific `commission_plan_id`
- Whether `refunds` is renamed now or later
- Final DB engine specifics for filtered indexes and enum/check style
