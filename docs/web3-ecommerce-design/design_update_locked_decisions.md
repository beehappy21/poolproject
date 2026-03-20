# Technical Design Update: Locked Decisions

**Source of truth:** [web3_ecommerce_planning_pack_detailed.md](/Users/macbook/poolproject/web3_ecommerce_planning_pack_detailed.md)  
**Purpose:** Convert newly locked business decisions into deterministic, implementation-ready design rules without changing the core business model.

---

## 1. Decision Log

### DL-01 Multiple active cycles are allowed
- A member may hold multiple active package cycles at the same time.
- The system must not assume a single "current package cycle".
- Member-level active status means the member has at least one active cycle that is active and not capped.
- All earning cap accounting remains per-cycle.
- Every bonus item must be assigned to exactly one beneficiary cycle before finalization.

### DL-02 Daily pool funding source and eligibility are locked
- Daily pool fund is calculated from PV of approved orders only.
- Pool recipient eligibility is member-based, not sales-contribution-based.
- A member is eligible for pool if:
  - the member is active
  - the member has at least 2 active direct referrals
- Same-day sales contribution is not required.
- Non-contributing eligible members may receive pool.
- Pool has no roll-up.

### DL-03 Approved orders are final in normal business flow
- There is no normal refund flow after an order becomes approved.
- Exceptional post-approval reversals are admin-only actions.
- Exceptional post-approval reversals may push recipient wallets negative.
- Negative balances are recovered through future earnings offset.

### DL-04 Full-block earning cap is intentional policy
- If a bonus item would exceed the assigned beneficiary cycle cap, the full bonus item is blocked.
- The system must not split partial payout.
- The full blocked amount goes to company fallback.
- This is a deliberate business policy and must appear in decision logs, operator docs, and support docs.

### DL-05 Security and anti-abuse scope is expanded
- The design must include wallet binding history, wallet rebind controls, risk flags, payout holds, manual review workflow, immutable audit logs, abuse signals, and role separation.

### DL-06 Commission and pool rates are configurable
- Direct referral bonus must support configurable tier rows with configurable percentages.
- Uni level bonus must support configurable level ranges and percentages.
- Daily pool rate must be configurable, not hardcoded.
- Rate configuration must be versioned and auditable.
- Every generated bonus item and daily pool cycle must retain the exact plan/rule reference used at calculation time.

---

## 2. Updated Technical Design

### 2.1 Design principles
- Keep business logic off-chain and settlement on-chain.
- Prefer deterministic allocation over operator interpretation.
- Treat all financial state transitions as ledgered events.
- Preserve auditability from order -> bonus item -> assigned cycle -> wallet entry -> payout batch -> on-chain tx.
- Use conservative controls when data is incomplete or risk is elevated.

### 2.2 Qualification model overview
- Qualification is evaluated at two layers:
  - member-level qualification
  - cycle-level qualification
- Member-level qualification answers whether a member is active for sponsor-tree and pool-recipient purposes.
- Cycle-level qualification answers whether a specific cycle can receive and absorb a bonus item under its own earning cap.

### 2.3 Member-level state
- A member is `member_active = true` if the member has at least one cycle where:
  - `cycle_status = active`
  - `activated_at <= evaluation_time`
  - `evaluation_time <= active_until`
  - `earning_status != capped`
- A member is `member_active = false` if no such cycle exists.
- Member-level active state is derived, not manually edited.

### 2.4 Cycle-level state
- Each cycle is independently tracked with:
  - activation window
  - earning cap
  - earned total
  - cap status
  - package reference
- A cycle is `cycle_receivable = true` if:
  - `cycle_status = active`
  - `activated_at <= evaluation_time`
  - `evaluation_time <= active_until`
  - `earning_status != capped`
- A cycle can be active for qualification even if the member has other cycles that are expired or capped.

### 2.5 Bonus item lifecycle
- `candidate_created`
- `beneficiary_resolved`
- `beneficiary_cycle_assigned`
- `pending`
- `approved`
- `withdrawable`
- `reserved_for_payout`
- `paid_out`
- `reversed`
- `fallback_to_company`
- Cycle assignment happens before approval and before cap enforcement.

### 2.6 Deterministic cycle assignment strategy
- Every direct and uni bonus item is assigned to a single beneficiary member first.
- After beneficiary member resolution, the engine selects exactly one beneficiary cycle using the cycle allocation rule.
- Daily pool payout is also assigned to exactly one cycle per recipient member.

### 2.7 Cycle allocation rule
- For any bonus item payable to member `M` at evaluation time `T`, gather all receivable cycles of `M`.
- Sort candidate cycles by:
  1. earliest `activated_at`
  2. lowest `id` as deterministic tie-breaker
- Assign the bonus item to the first cycle in that ordered set.
- If no receivable cycle exists, the bonus item is not payable to the member and goes to company fallback with reason `no_receivable_cycle`.

### 2.8 Rationale for allocation strategy
- Earliest-active-first is conservative and auditable.
- It minimizes operator discretion.
- It prevents a member or admin from manually steering income into a preferred cycle unless a separate future business rule is introduced.

### 2.9 Company fallback treatment
- Company fallback is not just a reporting view.
- It is a first-class financial ledger.
- Every blocked or unpayable bonus item must create:
  - a failed/blocked beneficiary record
  - a company fallback ledger entry
  - an audit log entry with machine-readable reason code

### 2.10 Configurable commission plan model
- The system must not hardcode direct, uni, or pool percentages in the engine.
- The system uses versioned commission plans.
- A commission plan contains:
  - direct referral tier rules
  - uni level tier rules
  - pool rate
- Only one commission plan may be active for new approvals at a time unless future scoped plans are introduced.
- The applicable plan is frozen at the event that creates financial effect:
  - direct / uni: freeze plan at order approval time
  - pool: freeze plan at pool close time
- Future plan changes must not rewrite historical bonus amounts.

---

## 3. Deterministic Rules

### 3.1 Member-level qualification
- Evaluate at a specific timestamp `T`.
- `member_active = true` if at least one cycle is receivable at `T`.
- `member_active = false` otherwise.
- Member-level active status is used for:
  - direct sponsor roll-up searching
  - compressed uni active-upline counting
  - daily pool recipient eligibility
  - direct active referral counting

### 3.2 Cycle-level qualification
- Evaluate only after beneficiary member is known.
- A cycle qualifies to receive a bonus item if:
  - it belongs to the beneficiary member
  - it is receivable at the item evaluation timestamp
  - its projected earned total after applying the full item would not exceed cap
- If a cycle is receivable but the item would exceed cap, the cycle is considered `cap_blocked_for_item`.
- Since items are not split, `cap_blocked_for_item` means the item cannot move to that cycle.

### 3.3 Bonus-to-cycle allocation

#### General rule
- Resolve beneficiary member first.
- Gather all receivable cycles for that member at the item evaluation time.
- Order cycles by earliest `activated_at`, then lowest cycle `id`.
- Test each ordered cycle for cap acceptance using the full item amount.
- Assign the item to the first cycle that can absorb the full amount.
- If no cycle can absorb the full amount, route the item to company fallback with reason `cap_blocked_all_receivable_cycles`.

#### Notes
- This rule applies to direct, uni, and pool payout items.
- A member may be active at member level but still fail cycle assignment if all receivable cycles are cap-blocked for the item.

### 3.4 Direct finalization
- Trigger source: approved order.
- Resolve the active commission plan for the order approval event.
- Load configured direct referral tiers ordered by `tier_no`.
- For each configured direct tier:
  - walk buyer upline chain upward
  - count only member-active uplines
  - the first member-active upline is direct tier 1
  - the second member-active upline is direct tier 2
  - continue until the configured direct tier number is reached
- For each direct tier item:
  - if no matching member-active upline exists, route that tier amount to company fallback with reason `insufficient_active_direct_tiers`
  - otherwise compute amount using the configured tier rate
  - run bonus-to-cycle allocation
  - if cycle assignment succeeds, create direct ledger item linked to beneficiary cycle and post wallet credit
  - if cycle assignment fails, create blocked direct ledger item and company fallback record

### 3.4.1 Direct tier compatibility note
- If only one direct tier is configured, the behavior is equivalent to the previous single direct bonus model.

### 3.5 Uni finalization
- Trigger source: approved order.
- Resolve the active commission plan for the order approval event.
- Load configured uni tier rows ordered by level range.
- Determine `max_uni_level` from the highest configured `level_to`.
- Walk buyer upline chain upward.
- Count only member-active uplines.
- The first member-active upline is level 1, second is level 2, continuing until `max_uni_level`.
- For each level item:
  - determine rate by level from the configured uni tier row
  - resolve beneficiary member
  - run bonus-to-cycle allocation independently
- If fewer member-active uplines exist than the configured uni maximum, unmatched levels go to company fallback with reason `insufficient_active_uplines`.
- If a level has a beneficiary member but no cycle can absorb the item, route that item to company fallback with reason `cap_blocked_all_receivable_cycles`.

### 3.6 Pool finalization
- Trigger source: daily pool close for date `D`.
- Pool fund source is sum of PV from orders that became `approved` on date `D`.
- Resolve the active commission plan for the pool close event.
- Use the configured `pool_rate` from that plan.
- Pool recipient eligibility is evaluated from a daily snapshot for date `D`.
- Eligible recipients are members who at snapshot time:
  - are member-active
  - have at least 2 direct referrals that are member-active
- Same-day sales contribution is ignored for eligibility.
- Non-contributing eligible members are included.
- Pool has no roll-up and no sponsor traversal.
- For each eligible member:
  - compute `payout_per_member`
  - run bonus-to-cycle allocation
  - if cycle assignment succeeds, post pool payout to that cycle
  - if cycle assignment fails, route that member's pool item to company fallback with reason `cap_blocked_all_receivable_cycles`
- If eligible member count is zero, route the full pool fund to company fallback with reason `no_eligible_pool_members`.

### 3.7 Daily pool funding source
- Funding date basis is the order approval date, not paid date and not order creation date.
- Include only orders with:
  - `approved_at` within the target pool date window
  - status `approved`
- Exclude:
  - pending orders
  - paid but not yet approved orders
  - cancelled orders
  - pre-approval voided orders
  - exceptional post-approval reversal entries
- Exceptional post-approval reversals do not rewrite historical pool funding.
- Instead, any exceptional correction is handled through explicit reversal and offset ledgers.
- Pool fund formula is:
  - `pool_fund = funding_total_approved_pv * frozen_pool_rate`

### 3.8 Daily pool eligibility
- Create a pool eligibility snapshot once per pool date.
- Snapshot timestamp = configurable daily cut-off time.
- At snapshot time, each member gets:
  - `member_active`
  - `active_direct_referral_count`
  - `is_pool_eligible`
  - reason code
- A direct referral counts as active if that referred member is member-active at snapshot time.
- Package type is not currently part of pool eligibility.
- If future package-type filters are introduced, that is `REQUIRES BUSINESS DECISION`.

### 3.9 Earning cap enforcement
- Cap enforcement happens at cycle level after cycle assignment candidate selection.
- For each tested cycle:
  - calculate `projected_total = earned_total_in_cycle + full_bonus_amount`
  - if `projected_total <= earning_cap`, the cycle can absorb the item
  - if `projected_total > earning_cap`, that cycle rejects the item
- If another receivable cycle can absorb the item, the engine assigns to that later cycle.
- If no receivable cycle can absorb the full item, the item is blocked in full and redirected to company fallback.
- No partial payout is permitted.
- If a cycle reaches cap exactly after applying an item:
  - mark cycle `earning_status = capped`
  - mark cycle `repurchase_required = true`
  - future items cannot be assigned to that cycle

### 3.10 Exceptional reversal handling
- Normal business flow ends at approval.
- Post-approval reversal is admin-only and must require:
  - allowed reason code
  - operator justification
  - reviewer approval
  - audit log
- Exceptional reversals do not delete or mutate original approved bonus records.
- They create explicit reversal ledger entries referencing:
  - original order
  - original bonus item
  - original cycle assignment
  - reversal reason
  - reversal amount
- If the recipient has sufficient available wallet balance, apply debit immediately.
- If not, allow wallet balance to go negative and track deficit.

### 3.11 Wallet negative balance offset
- Wallet supports negative net withdrawable position for exceptional reversal cases only.
- Define:
  - `available_withdrawable_balance`
  - `held_balance`
  - `negative_offset_balance`
- If reversal exceeds available positive wallet amounts:
  - debit available funds first
  - remainder becomes `negative_offset_balance`
- While `negative_offset_balance > 0`:
  - future approved earnings are first applied against that negative offset
  - the member cannot receive net withdrawable release until the negative offset is fully cleared
- Future earnings offset order:
  1. clear negative offset
  2. move remaining amount through normal approval/hold/release path

### 3.12 Payout hold / release workflow
- Any approved earning may be placed on hold before becoming withdrawable.
- Holds are evaluated per member and optionally per item.
- Hold sources include:
  - new wallet bind
  - wallet rebind
  - risk flag escalation
  - manual compliance review
  - suspicious referral cluster
  - abnormal earning spike
- Workflow:
  1. item is approved
  2. risk engine determines whether member or item is on hold
  3. if on hold, credit goes to held wallet state, not withdrawable
  4. reviewer may release, extend hold, or send to reversal workflow
  5. released items move to withdrawable
- Payout batch selection must exclude held items and members with active payout lock.

---

## 4. Proposed Schema Changes (Migration-Ready Draft Level)

### 4.1 Existing table changes

#### `users`
- keep core identity fields
- add:
  - `risk_level` varchar not null default `normal`
  - `payout_status` varchar not null default `active`
  - `manual_review_required` boolean not null default false
  - `manual_review_reason` varchar null
  - `last_risk_reviewed_at` datetime null

#### `member_package_cycles`
- clarify cycle-level accounting
- add:
  - `cycle_no` integer not null
  - `is_receivable` boolean not null default true
  - `capped_at` datetime null
  - `closed_at` datetime null
- indexes:
  - `(user_id, status, activated_at)`
  - `(user_id, earning_status, active_until)`

#### `orders`
- add:
  - `approved_at` datetime null
  - `approval_batch_ref` varchar null
  - `approval_status` varchar not null default `pending`
  - `exceptional_reversal_status` varchar not null default `none`
  - `commission_plan_id` bigint null
- note:
  - `refund_window_ends_at` remains valid only pre-approval
  - normal post-approval refund is not supported

#### `commission_ledger`
- add:
  - `commission_plan_id` bigint null
  - `commission_rule_id` bigint null
  - `tier_no` integer null
  - `beneficiary_cycle_id` bigint null
  - `evaluation_at` datetime not null
  - `finalized_at` datetime null
  - `block_reason` varchar null
  - `company_fallback_reason` varchar null
  - `hold_status` varchar not null default `none`
  - `hold_reason` varchar null
  - `released_to_withdrawable_at` datetime null
- constraints:
  - `beneficiary_cycle_id` required for payable direct/uni/pool items
  - `beneficiary_cycle_id` null for pure fallback items

#### `daily_pool_cycles`
- add:
  - `commission_plan_id` bigint null
  - `snapshot_at` datetime not null
  - `funding_approved_order_count` integer not null default 0
  - `funding_total_approved_pv` decimal(18,8) not null default 0
  - `company_fallback_amount` decimal(18,8) not null default 0

#### `daily_pool_payouts`
- add:
  - `beneficiary_cycle_id` bigint null
  - `block_reason` varchar null
  - `hold_status` varchar not null default `none`
  - `hold_reason` varchar null

#### `wallets`
- replace ambiguous balance-only model with explicit states
- add:
  - `held_balance` decimal(18,8) not null default 0
  - `negative_offset_balance` decimal(18,8) not null default 0
  - `payout_lock_status` varchar not null default `unlocked`
  - `payout_lock_reason` varchar null

#### `wallet_transactions`
- add:
  - `balance_bucket` varchar not null
  - `counterparty_user_id` bigint null
  - `operator_user_id` bigint null
  - `review_case_id` bigint null
  - `audit_log_id` bigint null

#### `refunds`
- rename business meaning in docs to pre-approval refund/cancel handling
- `REQUIRES BUSINESS DECISION`:
  - whether to keep the table name `refunds` or replace it with a more precise `order_adjustments`

#### `commission_reversals`
- add:
  - `order_id` bigint not null
  - `beneficiary_user_id` bigint not null
  - `beneficiary_cycle_id` bigint null
  - `review_case_id` bigint not null
  - `approved_by_user_id` bigint not null
  - `applied_at` datetime null
  - `is_exceptional_post_approval` boolean not null default false

#### `payout_batches`
- add:
  - `approved_by_user_id` bigint null
  - `submitted_by_user_id` bigint null
  - `reconciled_by_user_id` bigint null
  - `risk_snapshot_ref` varchar null

#### `payout_batch_items`
- add:
  - `wallet_transaction_id` bigint null
  - `hold_cleared_at` datetime null
  - `excluded_reason` varchar null

### 4.2 New tables

#### `commission_plans`
- purpose: versioned commission and pool configuration
- fields:
  - `id` bigint PK
  - `code` varchar not null
  - `name` varchar not null
  - `status` varchar not null
  - `effective_from` datetime not null
  - `effective_until` datetime null
  - `pool_rate` decimal(10,8) not null
  - `notes` text null
  - `created_by_user_id` bigint null
  - `created_at` datetime not null
  - `updated_at` datetime not null

#### `commission_plan_direct_rules`
- purpose: configurable direct/referral payout tiers
- fields:
  - `id` bigint PK
  - `commission_plan_id` bigint not null
  - `tier_no` integer not null
  - `rate` decimal(10,8) not null
  - `status` varchar not null
  - `created_at` datetime not null
  - `updated_at` datetime not null

#### `commission_plan_uni_rules`
- purpose: configurable uni level ranges and rates
- fields:
  - `id` bigint PK
  - `commission_plan_id` bigint not null
  - `level_from` integer not null
  - `level_to` integer not null
  - `rate` decimal(10,8) not null
  - `status` varchar not null
  - `created_at` datetime not null
  - `updated_at` datetime not null

#### `wallet_binding_history`
- purpose: immutable wallet bind / unbind / rebind history
- fields:
  - `id` bigint PK
  - `user_id` bigint not null
  - `wallet_address` varchar not null
  - `action_type` varchar not null
  - `action_status` varchar not null
  - `signature_nonce` varchar null
  - `signature_payload_hash` varchar null
  - `requested_at` datetime not null
  - `verified_at` datetime null
  - `effective_at` datetime null
  - `ended_at` datetime null
  - `requested_by_user_id` bigint null
  - `review_case_id` bigint null
  - `reason` varchar null
  - `created_at` datetime not null

#### `risk_flags`
- purpose: machine/manual risk indicators
- fields:
  - `id` bigint PK
  - `user_id` bigint not null
  - `flag_type` varchar not null
  - `severity` varchar not null
  - `status` varchar not null
  - `score` decimal(10,2) null
  - `detected_at` datetime not null
  - `cleared_at` datetime null
  - `source` varchar not null
  - `details_json` json not null
  - `created_at` datetime not null
  - `updated_at` datetime not null

#### `review_cases`
- purpose: manual review workflow for risk, payout hold, reversals, wallet rebinding
- fields:
  - `id` bigint PK
  - `case_type` varchar not null
  - `user_id` bigint not null
  - `status` varchar not null
  - `priority` varchar not null
  - `opened_at` datetime not null
  - `assigned_to_user_id` bigint null
  - `resolved_at` datetime null
  - `resolution_code` varchar null
  - `resolution_notes` text null
  - `created_at` datetime not null
  - `updated_at` datetime not null

#### `payout_holds`
- purpose: hold/release state for member or item payout
- fields:
  - `id` bigint PK
  - `user_id` bigint not null
  - `scope_type` varchar not null
  - `scope_ref_id` bigint null
  - `reason_code` varchar not null
  - `status` varchar not null
  - `placed_at` datetime not null
  - `released_at` datetime null
  - `placed_by_user_id` bigint not null
  - `released_by_user_id` bigint null
  - `review_case_id` bigint null
  - `created_at` datetime not null
  - `updated_at` datetime not null

#### `audit_logs`
- purpose: immutable audit trail for financial and security-sensitive actions
- fields:
  - `id` bigint PK
  - `actor_user_id` bigint null
  - `actor_role` varchar not null
  - `action_type` varchar not null
  - `entity_type` varchar not null
  - `entity_id` bigint not null
  - `before_json` json null
  - `after_json` json null
  - `reason_code` varchar null
  - `request_id` varchar null
  - `ip_address` varchar null
  - `user_agent` varchar null
  - `created_at` datetime not null

#### `identity_signals`
- purpose: reusable abuse-signal store
- fields:
  - `id` bigint PK
  - `user_id` bigint not null
  - `signal_type` varchar not null
  - `signal_value_hash` varchar not null
  - `signal_strength` varchar not null
  - `observed_at` datetime not null
  - `expires_at` datetime null
  - `created_at` datetime not null

### 4.3 New or changed relationships
- commission_plans 1:N commission_plan_direct_rules
- commission_plans 1:N commission_plan_uni_rules
- users 1:N member_package_cycles
- member_package_cycles 1:N commission_ledger
- member_package_cycles 1:N daily_pool_payouts
- users 1:N wallet_binding_history
- users 1:N risk_flags
- users 1:N review_cases
- users 1:N payout_holds
- users 1:N identity_signals
- review_cases 1:N payout_holds
- review_cases 1:N wallet_binding_history
- review_cases 1:N commission_reversals

---

## 5. Updated Jobs / Events / Cron Flows

### 5.1 Event-driven flows

#### Order paid
- Create order in `paid` state.
- No pool funding yet.
- No final direct/uni approval yet.

#### Order approval
- Transition order to `approved`.
- Stamp `approved_at`.
- Freeze `commission_plan_id`.
- Emit `order_approved` event.
- On `order_approved`:
  - generate direct candidate
  - generate uni candidates
  - resolve beneficiary members
  - assign beneficiary cycles
  - enforce cap
  - route payable items to approved/held state
  - route blocked items to company fallback

#### Exceptional admin reversal requested
- Create `review_case`.
- Lock affected payout items if still unpaid.
- On approval:
  - create reversal entries
  - apply wallet debit / negative offset
  - create audit log

#### Wallet bind / rebind requested
- Create `wallet_binding_history` row with pending state.
- Run signature verification.
- Run duplicate/risk checks.
- If risk threshold exceeded:
  - create `review_case`
  - place payout hold
- If approved:
  - mark wallet binding effective
  - update user active wallet pointer
  - create audit log

### 5.2 Scheduled jobs

#### `member_active_projection_job`
- Recompute or materialize member-level active state cache.
- Frequency: every 5-15 minutes or event-triggered hybrid.

#### `wallet_hold_evaluation_job`
- Evaluate new risk flags and open holds where needed.
- Frequency: every 5 minutes.

#### `pool_snapshot_job`
- At configured daily cut-off:
  - snapshot member activity
  - snapshot active direct referral counts
  - mark pool eligibility for date `D`

#### `pool_close_job`
- After end-of-day approval cut-off for date `D`:
  - resolve active commission plan and freeze its `pool_rate`
  - sum approved PV for `D`
  - calculate pool fund
  - count eligible members from snapshot
  - compute payout per member
  - create pool payout items
  - assign cycles
  - enforce cap
  - create fallback records where needed

#### `wallet_release_job`
- Move held approved amounts to withdrawable when:
  - no active payout hold applies
  - negative offset has been cleared in required order

#### `negative_offset_apply_job`
- When new approved earnings arrive:
  - automatically consume earnings against `negative_offset_balance`
  - only residual amounts proceed to held/withdrawable flow

#### `payout_batch_candidate_job`
- Select only:
  - withdrawable items
  - no active payout hold
  - no payout lock
  - no unresolved review case that blocks payout

#### `payout_reconciliation_job`
- Reconcile submitted on-chain payout batches.
- Update paid-out balances.
- Log failures and return failed items to controlled status, not silently to withdrawable.

### 5.3 Recommended daily sequence
1. Close approval window for orders included in pool date `D`.
2. Run `pool_snapshot_job`.
3. Run `pool_close_job`.
4. Run hold/risk evaluation.
5. Release safe items to withdrawable.
6. Prepare payout candidates.

### 5.4 REQUIRES BUSINESS DECISION
- Exact daily cut-off timezone for:
  - order approval inclusion
  - pool snapshot
  - pool close
- Whether order approval is real-time continuous or batched into approval windows.

---

## 6. Security / Anti-Abuse Design Additions

### 6.1 Role separation
- `member`
- `admin`
- `finance_operator`
- `risk_reviewer`
- `treasury_submitter`
- `treasury_approver`
- `super_admin`

### 6.2 Separation rules
- The same actor should not both approve and submit treasury payout batches.
- Exceptional post-approval reversals require reviewer approval distinct from requester.
- Wallet rebind approval should be separated from the requesting admin when practical.
- Risk review and finance payout release should be separable roles.

### 6.3 Wallet security additions
- Immutable wallet binding history.
- Rebind cooldown support.
- Rebind risk scoring.
- Duplicate wallet detection across all historical bindings, not only current active wallet.
- Optional payout freeze after rebind.

### 6.4 Abuse signals
- duplicate wallet address
- repeated wallet reuse across accounts
- shared identity artifacts
- same device cluster
- same IP cluster
- abnormal sponsor graph density
- referral burst pattern
- unusual cap-hitting pattern
- high reversal rate
- repeated wallet rebinding
- rapid earnings spike

### 6.5 Manual review workflow
- Open case from risk engine or operator action.
- Associate relevant users, wallet events, payout holds, and ledger items.
- Reviewer records resolution and reason code.
- All case actions produce audit logs.

### 6.6 Audit requirements
- Log all:
  - payout holds
  - payout releases
  - reversal requests
  - reversal approvals
  - wallet bind/rebind changes
  - risk flag open/clear actions
  - company fallback manual adjustments
  - payout batch approval/submission/reconciliation
- Audit logs must be immutable at application level.

### 6.7 Conservative payout controls
- Members with unresolved high-severity risk flags cannot enter payout batch selection.
- Members under manual review can continue earning approval, but release to withdrawable may be blocked.
- `REQUIRES BUSINESS DECISION`:
  - whether high-risk members may continue to receive approved credits into held balance or should be blocked pre-approval in some cases

---

## 7. Impact Notes

### 7.1 Fairness
- Multi-cycle support increases member flexibility but can make income distribution across cycles harder to explain.
- Earliest-active-first cycle allocation is predictable and auditable, but some members may perceive it as less favorable than newest-cycle-first.
- Full-block cap policy is intentionally strict and should be explained in support materials to reduce disputes.
- Non-contributing pool eligibility increases inclusiveness, but may be viewed as unfair by members who generated same-day sales.

### 7.2 Accounting complexity
- Multi-cycle assignment materially increases ledger and reconciliation complexity.
- Exceptional reversal with negative carry-forward is auditable but introduces long-lived receivable-like deficits at member wallet level.
- Historical pool funding remains immutable after approval, which simplifies closed-period accounting but shifts corrections into explicit reversal ledgers.

### 7.3 Abuse resistance
- Wallet history, risk flags, payout holds, and role separation significantly improve sybil resistance and operator accountability.
- Abuse prevention becomes much stronger if duplicate detection uses historical bindings and clustered signals rather than only current wallet match.

### 7.4 Support risk
- Support load will likely rise around:
  - why a bonus went to one cycle and not another
  - why a pool payout was blocked into company fallback
  - why wallet balance became negative after exceptional admin reversal
  - why approved earnings are still on hold
- The product should expose:
  - beneficiary cycle reference
  - hold reasons
  - fallback reasons
  - negative offset summary

### 7.5 Operational risk
- Admin-only exceptional reversal must stay rare.
- Weak reviewer discipline could undermine the value of the approval-finality model.
- Treasury and payout role separation is necessary to reduce internal fraud risk.

---

## 8. Remaining REQUIRES BUSINESS DECISION Items

### RBD-01 Time boundaries
- Exact timezone and cut-off timestamps for:
  - order approval day attribution
  - daily pool snapshot
  - daily pool close

### RBD-02 Approval operating model
- Whether order approval is:
  - immediate after refund window
  - batched at fixed times
  - manually approved under some thresholds

### RBD-03 Wallet rebind controls
- Required cooldown duration after rebind before payout release resumes.
- Whether any balance should remain frozen during the cooldown period.

### RBD-04 Pre-approval cancellation vocabulary
- Whether existing `refunds` terminology should remain for pre-approval order unwinds, or be renamed to a more precise accounting term.

### RBD-05 Risk policy severity mapping
- Which risk flags should:
  - place a payout hold
  - require manual review
  - lock payout batch inclusion
  - block wallet rebind

### RBD-06 Commission plan scoping
- Whether commission plans are global only or may later be scoped by:
  - package
  - member segment
  - country / market

---

## 9. Recommended Next Design Step

- Convert this document into:
  - migration-ready schema spec
  - wallet posting rules matrix
  - state machine diagrams for order, commission, payout hold, and exceptional reversal
  - API contract updates for review cases, payout holds, wallet binding history, and cycle-aware income views
