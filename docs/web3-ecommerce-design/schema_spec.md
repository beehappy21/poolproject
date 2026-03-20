# Migration-Ready Schema Spec

**Depends on:** [web3_ecommerce_planning_pack_detailed.md](/Users/macbook/poolproject/web3_ecommerce_planning_pack_detailed.md), [design_update_locked_decisions.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/design_update_locked_decisions.md)

---

## 1. Schema Conventions

- Primary keys: `bigint`
- Monetary / PV fields: `decimal(18,8)`
- Timestamps: `datetime`
- Status / type fields: `varchar(50)` unless noted
- JSON fields: `json`
- All financial tables must include `created_at`, `updated_at`
- All ledger-like rows are append-oriented; avoid destructive update patterns

---

## 2. Core Identity Tables

### 2.1 `users`
Purpose:
- Member identity
- Sponsor binding
- High-level risk / payout status

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| member_code | varchar(50) | no |  | unique |
| name | varchar(255) | no |  |  |
| email | varchar(255) | yes | null | unique nullable |
| phone | varchar(50) | yes | null | unique nullable |
| password_hash | varchar(255) | no |  |  |
| wallet_address | varchar(255) | yes | null | current active bound wallet only |
| wallet_verified_at | datetime | yes | null | last effective verification |
| sponsor_id | bigint | yes | null | FK `users.id` |
| status | varchar(50) | no | `active` | `active`, `blocked`, `pending` |
| risk_level | varchar(50) | no | `normal` | `normal`, `watch`, `high`, `critical` |
| payout_status | varchar(50) | no | `active` | `active`, `hold`, `locked` |
| manual_review_required | boolean | no | false |  |
| manual_review_reason | varchar(255) | yes | null |  |
| last_risk_reviewed_at | datetime | yes | null |  |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- unique(`member_code`)
- unique(`email`) where not null
- unique(`phone`) where not null
- FK `sponsor_id -> users.id`

Indexes:
- idx_users_sponsor_id (`sponsor_id`)
- idx_users_status (`status`)
- idx_users_risk_level (`risk_level`)
- idx_users_payout_status (`payout_status`)

Notes:
- `wallet_address` is a pointer to the current active wallet.
- Historical wallet bindings must not be stored only here.

### 2.2 `identity_signals`
Purpose:
- Store hashed abuse / duplication signals

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| user_id | bigint | no |  | FK `users.id` |
| signal_type | varchar(50) | no |  | e.g. `device_hash`, `ip_hash`, `kyc_hash` |
| signal_value_hash | varchar(255) | no |  | hashed value |
| signal_strength | varchar(50) | no |  | `weak`, `medium`, `strong` |
| observed_at | datetime | no |  |  |
| expires_at | datetime | yes | null |  |
| created_at | datetime | no |  |  |

Constraints:
- FK `user_id -> users.id`

Indexes:
- idx_identity_signals_user_id (`user_id`)
- idx_identity_signals_type_hash (`signal_type`, `signal_value_hash`)

---

## 3. Wallet Security and Risk Tables

### 3.1 `wallet_binding_history`
Purpose:
- Immutable wallet bind / rebind / unbind history

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| user_id | bigint | no |  | FK `users.id` |
| wallet_address | varchar(255) | no |  | normalized format |
| action_type | varchar(50) | no |  | `bind`, `rebind`, `unbind` |
| action_status | varchar(50) | no |  | `requested`, `verified`, `effective`, `rejected`, `ended` |
| signature_nonce | varchar(255) | yes | null |  |
| signature_payload_hash | varchar(255) | yes | null |  |
| requested_at | datetime | no |  |  |
| verified_at | datetime | yes | null |  |
| effective_at | datetime | yes | null |  |
| ended_at | datetime | yes | null |  |
| requested_by_user_id | bigint | yes | null | member/admin actor |
| review_case_id | bigint | yes | null | FK `review_cases.id` |
| reason | varchar(255) | yes | null |  |
| created_at | datetime | no |  |  |

Constraints:
- FK `user_id -> users.id`
- FK `requested_by_user_id -> users.id`

Indexes:
- idx_wallet_binding_history_user_id (`user_id`)
- idx_wallet_binding_history_wallet (`wallet_address`)
- idx_wallet_binding_history_status (`action_status`)

### 3.2 `risk_flags`
Purpose:
- Machine or manual risk indicators

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| user_id | bigint | no |  | FK `users.id` |
| flag_type | varchar(50) | no |  | e.g. `duplicate_wallet`, `ip_cluster` |
| severity | varchar(50) | no |  | `low`, `medium`, `high`, `critical` |
| status | varchar(50) | no | `open` | `open`, `reviewing`, `cleared`, `suppressed` |
| score | decimal(10,2) | yes | null |  |
| detected_at | datetime | no |  |  |
| cleared_at | datetime | yes | null |  |
| source | varchar(50) | no |  | `system`, `admin`, `reviewer` |
| details_json | json | no |  |  |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `user_id -> users.id`

Indexes:
- idx_risk_flags_user_status (`user_id`, `status`)
- idx_risk_flags_type_status (`flag_type`, `status`)
- idx_risk_flags_severity_status (`severity`, `status`)

### 3.3 `review_cases`
Purpose:
- Manual review queue for risk, payout holds, wallet rebinding, exceptional reversals

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| case_type | varchar(50) | no |  | `risk_review`, `wallet_rebind`, `payout_hold`, `exceptional_reversal` |
| user_id | bigint | no |  | subject user |
| status | varchar(50) | no | `open` | `open`, `assigned`, `resolved`, `rejected` |
| priority | varchar(50) | no | `normal` | `low`, `normal`, `high`, `urgent` |
| opened_at | datetime | no |  |  |
| assigned_to_user_id | bigint | yes | null | reviewer |
| resolved_at | datetime | yes | null |  |
| resolution_code | varchar(100) | yes | null |  |
| resolution_notes | text | yes | null |  |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `user_id -> users.id`
- FK `assigned_to_user_id -> users.id`

Indexes:
- idx_review_cases_user_status (`user_id`, `status`)
- idx_review_cases_type_status (`case_type`, `status`)

### 3.4 `payout_holds`
Purpose:
- Hold or release payout at member or item scope

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| user_id | bigint | no |  | FK `users.id` |
| scope_type | varchar(50) | no |  | `member`, `commission_item`, `pool_item`, `wallet` |
| scope_ref_id | bigint | yes | null | nullable for member-wide hold |
| reason_code | varchar(100) | no |  |  |
| status | varchar(50) | no | `active` | `active`, `released`, `expired`, `cancelled` |
| placed_at | datetime | no |  |  |
| released_at | datetime | yes | null |  |
| placed_by_user_id | bigint | no |  | actor |
| released_by_user_id | bigint | yes | null | actor |
| review_case_id | bigint | yes | null | FK `review_cases.id` |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `user_id -> users.id`
- FK `placed_by_user_id -> users.id`
- FK `released_by_user_id -> users.id`

Indexes:
- idx_payout_holds_user_status (`user_id`, `status`)
- idx_payout_holds_scope (`scope_type`, `scope_ref_id`)

### 3.5 `audit_logs`
Purpose:
- Immutable audit log for security-sensitive and financial actions

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| actor_user_id | bigint | yes | null | FK `users.id` |
| actor_role | varchar(50) | no |  |  |
| action_type | varchar(100) | no |  |  |
| entity_type | varchar(50) | no |  |  |
| entity_id | bigint | no |  |  |
| before_json | json | yes | null |  |
| after_json | json | yes | null |  |
| reason_code | varchar(100) | yes | null |  |
| request_id | varchar(100) | yes | null |  |
| ip_address | varchar(64) | yes | null |  |
| user_agent | varchar(255) | yes | null |  |
| created_at | datetime | no |  |  |

Indexes:
- idx_audit_logs_entity (`entity_type`, `entity_id`)
- idx_audit_logs_actor (`actor_user_id`, `created_at`)
- idx_audit_logs_action_type (`action_type`)

---

## 4. Package and Cycle Tables

### 4.1 `packages`
Purpose:
- Package master

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| code | varchar(50) | no |  | unique |
| name | varchar(255) | no |  |  |
| price_usdt | decimal(18,8) | no |  |  |
| pv | decimal(18,8) | no |  |  |
| active_days | integer | no |  |  |
| earning_cap_type | varchar(50) | no |  | `fixed_amount`, `price_multiple` |
| earning_cap_amount | decimal(18,8) | no |  |  |
| status | varchar(50) | no | `active` |  |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- unique(`code`)

### 4.2 `member_package_cycles`
Purpose:
- Per-cycle qualification and cap accounting

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| user_id | bigint | no |  | FK `users.id` |
| package_id | bigint | no |  | FK `packages.id` |
| cycle_no | integer | no |  | sequential per user |
| activated_at | datetime | no |  |  |
| active_until | datetime | no |  |  |
| earning_cap | decimal(18,8) | no |  | computed at activation |
| earned_total_in_cycle | decimal(18,8) | no | 0 |  |
| earning_status | varchar(50) | no | `active` | `active`, `capped` |
| repurchase_required | boolean | no | false |  |
| is_receivable | boolean | no | true | derived materialized flag optional |
| status | varchar(50) | no | `active` | `active`, `expired`, `closed` |
| capped_at | datetime | yes | null |  |
| closed_at | datetime | yes | null |  |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `user_id -> users.id`
- FK `package_id -> packages.id`
- unique(`user_id`, `cycle_no`)

Indexes:
- idx_cycles_user_status_activated (`user_id`, `status`, `activated_at`)
- idx_cycles_user_earning_active_until (`user_id`, `earning_status`, `active_until`)
- idx_cycles_receivable (`user_id`, `is_receivable`, `activated_at`)

---

## 5. Order Tables

### 5.1 `orders`
Purpose:
- Commercial order lifecycle up to approval

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| order_no | varchar(50) | no |  | unique |
| user_id | bigint | no |  | buyer |
| subtotal_usdt | decimal(18,8) | no | 0 |  |
| total_usdt | decimal(18,8) | no | 0 |  |
| total_pv | decimal(18,8) | no | 0 |  |
| paid_at | datetime | yes | null |  |
| approved_at | datetime | yes | null |  |
| commission_plan_id | bigint | yes | null | frozen plan at approval time |
| refund_window_ends_at | datetime | yes | null | pre-approval only |
| approval_batch_ref | varchar(100) | yes | null | optional |
| approval_status | varchar(50) | no | `pending` | `pending`, `approved`, `voided` |
| exceptional_reversal_status | varchar(50) | no | `none` | `none`, `requested`, `approved`, `applied` |
| status | varchar(50) | no | `pending` | `pending`, `paid`, `approved`, `cancelled`, `voided` |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `user_id -> users.id`
- FK `commission_plan_id -> commission_plans.id`
- unique(`order_no`)

Indexes:
- idx_orders_user_status (`user_id`, `status`)
- idx_orders_approved_at (`approved_at`)
- idx_orders_approval_status (`approval_status`)

### 5.2 `order_items`
Purpose:
- Package lines and future product lines

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| order_id | bigint | no |  | FK `orders.id` |
| package_id | bigint | yes | null | FK `packages.id` |
| product_id | bigint | yes | null | reserved |
| qty | integer | no | 1 |  |
| unit_price_usdt | decimal(18,8) | no | 0 |  |
| unit_pv | decimal(18,8) | no | 0 |  |
| line_total_usdt | decimal(18,8) | no | 0 |  |
| line_total_pv | decimal(18,8) | no | 0 |  |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `order_id -> orders.id`
- FK `package_id -> packages.id`

Indexes:
- idx_order_items_order_id (`order_id`)

### 5.3 `order_adjustments`
Purpose:
- Pre-approval cancel / void / refund-window adjustments

Status:
- `REQUIRES BUSINESS DECISION`: keep legacy name `refunds` or rename to `order_adjustments`

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| order_id | bigint | no |  | FK `orders.id` |
| adjustment_type | varchar(50) | no |  | `cancel`, `void`, `pre_approval_refund`, `partial_pre_approval_refund` |
| amount | decimal(18,8) | no | 0 |  |
| pv_reversal_amount | decimal(18,8) | no | 0 |  |
| status | varchar(50) | no | `requested` | `requested`, `approved`, `done`, `rejected` |
| reason | varchar(255) | yes | null |  |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `order_id -> orders.id`

Indexes:
- idx_order_adjustments_order_id (`order_id`)

---

## 6. Commission and Pool Tables

### 6.1 `commission_plans`
Purpose:
- Versioned commission and pool rate configuration used for financial calculations

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| code | varchar(50) | no |  | unique |
| name | varchar(255) | no |  |  |
| status | varchar(50) | no | `draft` | `draft`, `active`, `inactive`, `archived` |
| effective_from | datetime | no |  |  |
| effective_until | datetime | yes | null |  |
| pool_rate | decimal(10,8) | no | 0 | configurable daily pool rate |
| notes | text | yes | null |  |
| created_by_user_id | bigint | yes | null | FK `users.id` |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- unique(`code`)
- FK `created_by_user_id -> users.id`

Indexes:
- idx_commission_plans_status_effective (`status`, `effective_from`, `effective_until`)

### 6.2 `commission_plan_direct_rules`
Purpose:
- Configurable direct/referral payout tiers

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| commission_plan_id | bigint | no |  | FK `commission_plans.id` |
| tier_no | integer | no |  | payout tier number starting at 1 |
| rate | decimal(10,8) | no | 0 | percentage as decimal |
| status | varchar(50) | no | `active` |  |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `commission_plan_id -> commission_plans.id`
- unique(`commission_plan_id`, `tier_no`)

Indexes:
- idx_commission_plan_direct_rules_plan (`commission_plan_id`, `tier_no`)

### 6.3 `commission_plan_uni_rules`
Purpose:
- Configurable uni level ranges and rates

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| commission_plan_id | bigint | no |  | FK `commission_plans.id` |
| level_from | integer | no |  | inclusive |
| level_to | integer | no |  | inclusive |
| rate | decimal(10,8) | no | 0 | percentage as decimal |
| status | varchar(50) | no | `active` |  |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `commission_plan_id -> commission_plans.id`

Indexes:
- idx_commission_plan_uni_rules_plan (`commission_plan_id`, `level_from`, `level_to`)

### 6.4 `commission_ledger`
Purpose:
- Direct, uni, and pool bonus items at the single-item level

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| beneficiary_user_id | bigint | yes | null | null only for some fallback rows if modeled separately |
| beneficiary_cycle_id | bigint | yes | null | assigned payable cycle |
| source_user_id | bigint | no |  | buyer / source member |
| order_id | bigint | yes | null | null for some pool entries if using cycle ref |
| commission_type | varchar(50) | no |  | `direct`, `uni`, `pool` |
| commission_plan_id | bigint | yes | null | frozen plan used for calculation |
| commission_rule_id | bigint | yes | null | direct or uni rule row if applicable |
| tier_no | integer | yes | null | direct tier number if applicable |
| level_no | integer | yes | null | uni level number if applicable |
| rate | decimal(10,8) | no | 0 |  |
| base_pv | decimal(18,8) | no | 0 |  |
| commission_amount | decimal(18,8) | no | 0 |  |
| original_target_user_id | bigint | yes | null | original sponsor / upline |
| rollup_from_user_id | bigint | yes | null | first inactive skipped target if any |
| rollup_depth | integer | no | 0 |  |
| cycle_ref_id | bigint | yes | null | pool cycle id or other cycle ref |
| evaluation_at | datetime | no |  | qualification time |
| finalize_checked_at | datetime | yes | null |  |
| finalized_at | datetime | yes | null |  |
| status | varchar(50) | no | `pending` | `pending`, `approved`, `held`, `withdrawable`, `reserved_for_payout`, `paid_out`, `reversed`, `fallback` |
| fallback_to_company | boolean | no | false |  |
| block_reason | varchar(100) | yes | null |  |
| company_fallback_reason | varchar(100) | yes | null |  |
| hold_status | varchar(50) | no | `none` | `none`, `held`, `released` |
| hold_reason | varchar(100) | yes | null |  |
| released_to_withdrawable_at | datetime | yes | null |  |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `commission_plan_id -> commission_plans.id`
- FK `beneficiary_user_id -> users.id`
- FK `beneficiary_cycle_id -> member_package_cycles.id`
- FK `source_user_id -> users.id`
- FK `order_id -> orders.id`
- FK `original_target_user_id -> users.id`
- FK `rollup_from_user_id -> users.id`

Indexes:
- idx_commission_beneficiary_status (`beneficiary_user_id`, `status`)
- idx_commission_cycle_status (`beneficiary_cycle_id`, `status`)
- idx_commission_order_type (`order_id`, `commission_type`)
- idx_commission_status_hold (`status`, `hold_status`)
- idx_commission_cycle_ref (`cycle_ref_id`)

Check recommendations:
- if `fallback_to_company = true` then `status = fallback`
- payable rows should have non-null `beneficiary_cycle_id`

### 6.5 `company_bonus_ledger`
Purpose:
- Track blocked / unallocated / company-retained amounts

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| source_type | varchar(50) | no |  | `direct`, `uni`, `pool`, `reversal` |
| source_ref_id | bigint | no |  | original source record id |
| bonus_type | varchar(50) | no |  | `direct`, `uni`, `pool` |
| amount | decimal(18,8) | no | 0 |  |
| reason | varchar(100) | no |  | e.g. `no_active_sponsor`, `cap_blocked_all_receivable_cycles` |
| created_at | datetime | no |  |  |

Indexes:
- idx_company_bonus_source (`source_type`, `source_ref_id`)
- idx_company_bonus_reason (`reason`)

### 6.6 `daily_pool_cycles`
Purpose:
- Daily pool close records

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| cycle_date | date | no |  | unique |
| commission_plan_id | bigint | yes | null | frozen plan used for this pool close |
| snapshot_at | datetime | no |  |  |
| total_pv | decimal(18,8) | no | 0 | may mirror funding_total_approved_pv |
| funding_approved_order_count | integer | no | 0 |  |
| funding_total_approved_pv | decimal(18,8) | no | 0 | approved-order basis |
| pool_rate | decimal(10,8) | no | 0.50000000 |  |
| pool_fund | decimal(18,8) | no | 0 |  |
| eligible_member_count | integer | no | 0 |  |
| payout_per_member | decimal(18,8) | no | 0 |  |
| company_fallback_amount | decimal(18,8) | no | 0 |  |
| status | varchar(50) | no | `open` | `open`, `closed`, `adjusted` |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- unique(`cycle_date`)
- FK `commission_plan_id -> commission_plans.id`

Indexes:
- idx_daily_pool_status (`status`)

### 6.7 `daily_pool_eligibility_snapshots`
Purpose:
- Snapshot eligibility inputs and result per member per day

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| cycle_id | bigint | no |  | FK `daily_pool_cycles.id` |
| user_id | bigint | no |  | FK `users.id` |
| is_member_active | boolean | no | false |  |
| active_direct_referral_count | integer | no | 0 |  |
| is_eligible | boolean | no | false |  |
| reason | varchar(100) | yes | null |  |
| created_at | datetime | no |  |  |

Constraints:
- FK `cycle_id -> daily_pool_cycles.id`
- FK `user_id -> users.id`
- unique(`cycle_id`, `user_id`)

Indexes:
- idx_pool_snapshot_cycle_eligible (`cycle_id`, `is_eligible`)

### 6.8 `daily_pool_payouts`
Purpose:
- Optional pool-specific payout view; may be kept in sync with `commission_ledger`

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| cycle_id | bigint | no |  | FK `daily_pool_cycles.id` |
| user_id | bigint | no |  | FK `users.id` |
| beneficiary_cycle_id | bigint | yes | null | FK `member_package_cycles.id` |
| commission_ledger_id | bigint | yes | null | FK `commission_ledger.id` |
| payout_amount | decimal(18,8) | no | 0 |  |
| status | varchar(50) | no | `pending` | `pending`, `approved`, `held`, `withdrawable`, `paid_out`, `reversed`, `fallback` |
| block_reason | varchar(100) | yes | null |  |
| hold_status | varchar(50) | no | `none` |  |
| hold_reason | varchar(100) | yes | null |  |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `cycle_id -> daily_pool_cycles.id`
- FK `user_id -> users.id`
- FK `beneficiary_cycle_id -> member_package_cycles.id`
- FK `commission_ledger_id -> commission_ledger.id`

Indexes:
- idx_pool_payouts_cycle_status (`cycle_id`, `status`)
- idx_pool_payouts_user_status (`user_id`, `status`)

---

## 7. Wallet and Settlement Tables

### 7.1 `wallets`
Purpose:
- Member wallet balances across explicit buckets

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| user_id | bigint | no |  | unique FK `users.id` |
| pending_balance | decimal(18,8) | no | 0 | reserved for compatibility if needed |
| approved_balance | decimal(18,8) | no | 0 | not yet released |
| held_balance | decimal(18,8) | no | 0 | payout hold bucket |
| withdrawable_balance | decimal(18,8) | no | 0 | payout candidate bucket |
| paid_out_balance | decimal(18,8) | no | 0 | cumulative |
| negative_offset_balance | decimal(18,8) | no | 0 | exceptional reversal deficit |
| payout_lock_status | varchar(50) | no | `unlocked` | `unlocked`, `hold`, `locked` |
| payout_lock_reason | varchar(255) | yes | null |  |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- unique(`user_id`)
- FK `user_id -> users.id`

### 7.2 `wallet_transactions`
Purpose:
- Full wallet posting journal

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| user_id | bigint | no |  | FK `users.id` |
| tx_type | varchar(50) | no |  | e.g. `direct_credit`, `negative_offset_apply` |
| direction | varchar(10) | no |  | `credit`, `debit` |
| balance_bucket | varchar(50) | no |  | `approved`, `held`, `withdrawable`, `paid_out`, `negative_offset` |
| ref_type | varchar(50) | no |  | `commission`, `pool`, `reversal`, `payout_batch`, `hold` |
| ref_id | bigint | no |  |  |
| counterparty_user_id | bigint | yes | null |  |
| operator_user_id | bigint | yes | null | admin/reviewer if applicable |
| review_case_id | bigint | yes | null | FK `review_cases.id` |
| audit_log_id | bigint | yes | null | FK `audit_logs.id` |
| amount | decimal(18,8) | no | 0 | positive absolute amount |
| status | varchar(50) | no | `posted` | `posted`, `reversed` |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `user_id -> users.id`
- FK `counterparty_user_id -> users.id`
- FK `operator_user_id -> users.id`

Indexes:
- idx_wallet_tx_user_created (`user_id`, `created_at`)
- idx_wallet_tx_ref (`ref_type`, `ref_id`)
- idx_wallet_tx_bucket (`balance_bucket`, `status`)

### 7.3 `payout_batches`
Purpose:
- Payout batch header

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| batch_no | varchar(50) | no |  | unique |
| total_amount | decimal(18,8) | no | 0 |  |
| item_count | integer | no | 0 |  |
| chain_id | varchar(50) | no |  |  |
| token_address | varchar(255) | no |  |  |
| approved_by_user_id | bigint | yes | null | treasury approver |
| submitted_by_user_id | bigint | yes | null | submitter |
| reconciled_by_user_id | bigint | yes | null | reconciler |
| risk_snapshot_ref | varchar(100) | yes | null | optional |
| submitted_tx_hash | varchar(255) | yes | null |  |
| submitted_at | datetime | yes | null |  |
| confirmed_at | datetime | yes | null |  |
| status | varchar(50) | no | `draft` | `draft`, `approved`, `submitted`, `confirmed`, `failed` |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- unique(`batch_no`)

Indexes:
- idx_payout_batches_status (`status`)

### 7.4 `payout_batch_items`
Purpose:
- Concrete payout items included in a batch

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| batch_id | bigint | no |  | FK `payout_batches.id` |
| user_id | bigint | no |  | FK `users.id` |
| wallet_address | varchar(255) | no |  | captured at batch time |
| amount | decimal(18,8) | no | 0 |  |
| ref_type | varchar(50) | no |  | `commission`, `pool`, `wallet` |
| ref_id | bigint | no |  |  |
| wallet_transaction_id | bigint | yes | null | FK `wallet_transactions.id` |
| hold_cleared_at | datetime | yes | null |  |
| excluded_reason | varchar(100) | yes | null | if generated but excluded |
| tx_hash | varchar(255) | yes | null | per-item if available |
| status | varchar(50) | no | `reserved` | `reserved`, `sent`, `confirmed`, `failed`, `excluded` |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `batch_id -> payout_batches.id`
- FK `user_id -> users.id`

Indexes:
- idx_payout_batch_items_batch_status (`batch_id`, `status`)
- idx_payout_batch_items_user_status (`user_id`, `status`)

---

## 8. Reversal Tables

### 8.1 `commission_reversals`
Purpose:
- Explicit reversal records, especially exceptional post-approval cases

Columns:

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | bigint | no |  | PK |
| commission_ledger_id | bigint | no |  | FK `commission_ledger.id` |
| order_id | bigint | no |  | FK `orders.id` |
| beneficiary_user_id | bigint | no |  | FK `users.id` |
| beneficiary_cycle_id | bigint | yes | null | FK `member_package_cycles.id` |
| review_case_id | bigint | no |  | FK `review_cases.id` |
| approved_by_user_id | bigint | no |  | FK `users.id` |
| amount | decimal(18,8) | no | 0 |  |
| reason | varchar(100) | no |  | `refund`, `cancel`, `admin_adjust`, `exceptional_post_approval_reversal` |
| status | varchar(50) | no | `pending` | `pending`, `applied`, `rejected` |
| is_exceptional_post_approval | boolean | no | false |  |
| applied_at | datetime | yes | null |  |
| created_at | datetime | no |  |  |
| updated_at | datetime | no |  |  |

Constraints:
- FK `commission_ledger_id -> commission_ledger.id`
- FK `order_id -> orders.id`
- FK `beneficiary_user_id -> users.id`
- FK `beneficiary_cycle_id -> member_package_cycles.id`
- FK `review_case_id -> review_cases.id`
- FK `approved_by_user_id -> users.id`

Indexes:
- idx_commission_reversals_commission (`commission_ledger_id`)
- idx_commission_reversals_user_status (`beneficiary_user_id`, `status`)

---

## 9. Optional Materialized / Read-Optimized Tables

### 9.1 `member_active_snapshots`
Purpose:
- Optional cache for fast qualification reads

Status:
- Optional, not source of truth

Columns:
- `user_id`
- `as_of_at`
- `is_active`
- `receivable_cycle_count`
- `first_receivable_cycle_id`

---

## 10. Cross-Table Invariants

- A member may have multiple cycles in `active` status.
- Every approved order must freeze one `commission_plan_id`.
- Every direct/uni/pool payout item must preserve the rate and plan references used at calculation time.
- A payable commission item must reference exactly one `beneficiary_cycle_id`.
- A cycle's `earned_total_in_cycle` equals sum of non-reversed approved/held/withdrawable/reserved/paid-out items assigned to that cycle minus applied cycle-linked reversals.
- Company fallback items must not affect any member wallet balance.
- `negative_offset_balance` may be positive only due to exceptional post-approval reversals.
- Items under active payout hold must not be included in payout batch selection.

---

## 11. Migration Order Recommendation

1. Add new non-breaking columns to existing tables.
2. Create new security/risk tables.
3. Create `beneficiary_cycle_id` support and indexes.
4. Backfill cycle numbering and active wallet pointer history.
5. Introduce wallet negative-offset and hold buckets.
6. Deploy code that writes both old and new references if needed.
7. Validate reconciliation.
8. Remove deprecated assumptions about single current cycle.

---

## 12. REQUIRES BUSINESS DECISION

- Whether to rename `refunds` to `order_adjustments`
- Whether commission plans are global only or may be scoped by package / member segment / market later
- Exact chain / token metadata normalization rules
- Exact retention / expiration rules for identity signals
