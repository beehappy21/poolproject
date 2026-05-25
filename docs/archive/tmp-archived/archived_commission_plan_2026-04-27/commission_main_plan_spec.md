# Commission Main Plan Spec

Updated: 2026-04-05

## Status

This document is the primary business and implementation source of truth for commission calculation in the current system.

It reflects the latest approved business rules locked on `2026-04-05`.

From this point forward:

- `Direct`, `Pool`, and `Matrix` runtime implementation should follow this plan first
- older sandbox notes, partial specs, and legacy matrix research do not override this document
- `matrix_rules_v2.md` is supporting background only where it does not conflict with this plan
- if another document conflicts with this plan, this plan takes precedence unless a later approved revision replaces it

## 1. Business Spec

### 1.1 Goal

The commission system contains `Direct`, `Pool`, and `Matrix`.

Its goals are:

- pay rewards according to locked business rules
- prevent duplicated payout from the same source event
- link orders, PV, qualification, board progression, and payout into one auditable flow
- support rollback when an approved order is later cancelled

### 1.2 Calculation Start Point

- commission calculation starts only when an order becomes `approved`
- orders that are not yet approved must not contribute to `PV`, qualification, board opening, pool funding, or payout
- the official calculation timestamp is `approved_at`

### 1.3 Commission Plans

The system has `3` main plans:

- `Direct`
- `Pool`
- `Matrix`

Shared principles:

- all payout must be based on persisted business state
- all plans must check qualification before payout
- all plans must respect cap, holdback, and fallback rules
- display state and payable state may differ
- one source event must not be paid twice unless explicitly defined as separate payable events

### 1.4 Direct

Business meaning:

- `Direct` pays the immediate real sponsor when a directly sponsored member makes a qualifying approved purchase

Business rules:

- pay only the direct sponsor in the real sponsor tree
- do not reroute direct payout to another branch just because another branch is open
- if the direct sponsor is blocked by qualification or cap, follow the configured fallback policy

### 1.5 Pool

Business meaning:

- `Pool` distributes a shared bonus fund to members who qualify in a locked cycle

Business rules:

- allocate a configured portion of qualifying business into pool funding
- evaluate qualification per cycle
- divide the cycle fund among qualified members
- if no member qualifies, the cycle payout is `0` unless a future carry-forward policy is approved

### 1.6 Matrix

Matrix structure:

- width `2`
- `B1` depth `3`
- `B2` depth `2`
- `B3` depth `2`

Payout rates:

- `B1`
  - `L1 = 0.15`
  - `L2 = 0.15`
  - `L3 = 0.15`
- `B2`
  - `L1 = 0.10`
  - `L2 = 0.10`
- `B3`
  - `L1 = 0.20`
  - `L2 = 0.20`

Placement rules:

- every matrix point must follow the `real sponsor line`
- a point must stay inside the true sponsor ancestry of that member
- the system must not move a point to an unrelated branch only to fill another slot

Board opening:

- `B1` opens when the member reaches the required `personal PV`
- `B2` opens when that member completes the current `B1` under the required conditions
- `B3` continues from `B2` using the same progression principle

Additional PV for unfinished `B1`:

- if a member has not completed the current `B1`, any later approved purchase under the same member code must add its `PV` into that same `B1`
- later purchases under the same member code continue contributing to the unfinished `B1`

When `B1` becomes full:

- check accumulated `auto reorder holdback`
- if holdback reaches `750 THB`
  - create a real `Firm 500 PV` order
  - open the next `B1` round immediately
  - allow progression into `B2`
- if holdback is still below `750 THB`
  - do not open the next `B1` round yet
  - keep the board pending until the missing requirement is later satisfied

Delayed open for next `B1` round:

- if `B1` is already full but the next round cannot open yet
- and the same member later makes another approved purchase
- and the new `PV` or accumulated value satisfies the pending requirement
- the system must open the next `B1` round immediately at that time

Overlap and dual placement:

- a single source point may appear in more than one displayed matrix position during overlap
- duplicate display exists for progression and tracking only
- duplicate display does not mean duplicate payout

Single-count payout rule:

- `1 source point = 1 counted payout event`
- that one counted event may still pay all eligible levels of the board
- the system must not create multiple counted payout events from the same source point just because it appears in more than one place

Locked `B2` overlap example:

- when a `yellow point` appears in `B2R2` during overlap, treat it as `1 source event`
- `L1` pays `red`
- `L2` pays `blue-circle` in `B2R1`
- this entire result still counts as `1 time`

`B3` follows the same overlap principle as `B2`:

- display duplication is allowed
- payout duplication is not allowed
- the source event still counts once, but may pay all eligible `B3` levels

### 1.7 Approved Order Cancellation Rule

If an approved order is later cancelled:

- reverse all commission effects created by that order
- deduct the reversal from each affected recipient's commission balance
- if balance is insufficient, allow the resulting balance to go negative
- show traceable negative-balance details, including which cancelled order caused the reversal
- keep traceability by plan type such as `Direct`, `Pool`, and `Matrix`

### 1.8 Final Business Summary

- calculation starts at `approved`
- `Direct` pays the immediate sponsor
- `Pool` pays qualified members in a locked cycle
- `Matrix` follows sponsor-line placement and controlled board progression
- repeated purchases under the same member code can continue building the current unfinished `B1`
- `B1` full requires holdback validation before the next round opens
- `B2` and `B3` may display overlap, but source-event payout remains single-count
- cancelling an approved order must reverse prior payout and may create negative commission balance

## 2. Implementation Rules

### 2.1 Shared Data Rules

The runtime must persist at least:

- member identity
- sponsor relationship
- qualification state
- order state
- `approved_at`
- `cancelled_at`
- `PV`
- commission events
- commission reversal events
- cap usage
- holdback state
- fallback records
- pool cycles
- matrix boards, rounds, placements, and payout references

All commission calculation must use persisted state, not UI-only display state.

### 2.2 Approved Order Trigger

When an order changes to `approved`:

1. persist `approved_at`
2. add the order's `PV` into qualification and board-progression inputs
3. evaluate `Direct`
4. evaluate `Matrix`
5. allocate `Pool` funding according to pool rules
6. persist commission events and related state transitions

The system must not create commission events from orders that are still unapproved.

### 2.3 Direct Engine Rule

- resolve `buyer -> direct sponsor`
- validate sponsor qualification
- validate cap
- create payout, partial payout, or fallback result according to configured policy
- do not automatically reroute direct commission to another upline unless a new approved rule explicitly requires it

### 2.4 Pool Engine Rule

- record pool funding when an approved order enters pool funding rules
- close each configured cycle explicitly
- compute qualified members for that cycle
- if `eligible_member_count > 0`, compute `payout_per_member = total_pool_fund / eligible_member_count`
- if `eligible_member_count = 0`, cycle payout is `0`
- apply cap and fallback policy per recipient

### 2.5 Matrix Placement Engine Rule

- enforce sponsor ancestry for matrix placements
- persist each point with `source member`, `board`, `round`, and `placement path`
- allow displayed placement and payable mapping to differ, but tie both back to the same source event

### 2.6 `B1` Open Rule

- when a member reaches the required personal PV, open `B1 Round 1`
- persist the trigger event and opening timestamp

### 2.7 Additional PV Into Current `B1`

- if the member's current `B1` is not complete, later approved orders from the same member code must add `PV` into that same `B1`
- do not open a replacement `B1` in this case
- update the current board progress state

### 2.8 `B1` Completion Rule

When `B1` becomes full:

- mark the board as `full`
- evaluate accumulated `auto reorder holdback`
- if holdback is `>= 750 THB`
  - create a real `Firm 500 PV` order
  - mark reorder success
  - open the next `B1` round
  - trigger `B2` open eligibility
- if holdback is `< 750 THB`
  - mark state as `pending_next_round_requirement`
  - keep the next round closed

### 2.9 Delayed Next `B1` Round Rule

- if a board is in `pending_next_round_requirement`
- and the same member later places another approved order
- add the new `PV` and re-evaluate the open condition
- if the requirement is now satisfied, open the next `B1` round immediately
- persist that this opening came from a delayed trigger event

### 2.10 `B2` and `B3` Overlap Rule

- one source event may create multiple display placements during overlap
- every display placement must reference the same source event
- payout logic must count from the source event, not from display node count
- persist flags that distinguish:
  - `display-only`
  - `payable-path-participant`

### 2.11 `B2` and `B3` Payout Counting Rule

- `1 source event = 1 counted payout event`
- a single counted event may still distribute payout across all eligible levels of that board
- in the locked `B2` example:
  - level `1` recipient is `red`
  - level `2` recipient is `blue-circle in B2R1`
- do not create another counted payout event from the mirrored or overlapping display node

### 2.12 Cap, Partial, and Fallback Rule

Every commission engine must:

- resolve cap before final payout
- support configured policy for:
  - full payout
  - partial payout
  - blocked payout with fallback
- persist:
  - gross amount
  - paid amount
  - blocked amount
  - fallback amount
  - reason code

### 2.13 Reversal and Rollback Rule

When an approved order is later cancelled:

1. locate all commission events tied to that order
2. create reversal events for each affected payout item
3. deduct reversal amounts from recipient balances
4. allow balances to go negative when necessary
5. persist `reason = cancelled_order`
6. persist the cancelled order reference

The runtime must use append-only ledger behavior:

- keep the original payout entries
- keep the reversal entries
- compute current balance from the full ledger history

### 2.14 Audit Rule

For every commission-related event, persist at least:

- `source_event_id`
- `plan_type`
- `recipient_member_id`
- `trigger_order_id`
- board, round, or cycle reference
- payout level
- gross amount
- paid amount
- holdback amount
- blocked amount
- fallback amount
- status
- created timestamp

### 2.15 Suggested Execution Order

For a newly approved order:

1. persist `approved_at`
2. update `PV` and qualification
3. evaluate `Direct`
4. evaluate `Matrix` progression and payout
5. update holdback and next-round state
6. record pool funding
7. persist commission events

For a cancelled approved order:

1. persist `cancelled_at`
2. find all related commission events
3. create reversal events
4. update balances
5. mark and expose negative-balance impact when present

## 3. Data Model / Tables

### 3.1 Design Goals

The data model should:

- support append-only commission ledger behavior
- separate business triggers from payout results
- keep sponsor lineage and matrix placements auditable
- support overlap display without forcing duplicate payout
- support rollback from cancelled approved orders

### 3.2 Core Order Tables

#### `orders`

Purpose:

- source commercial transaction

Recommended fields:

- `id`
- `member_id`
- `order_no`
- `status`
- `approved_at`
- `cancelled_at`
- `total_amount`
- `total_pv`
- `currency`
- `source_type`
- `is_auto_reorder`
- `auto_reorder_source_board_id`
- `created_at`
- `updated_at`

Notes:

- commission engines should start only when `approved_at` is present
- later cancellation should not delete this row

#### `order_items`

Purpose:

- item-level order basis for PV and pool rules

Recommended fields:

- `id`
- `order_id`
- `product_id`
- `package_id`
- `quantity`
- `unit_price`
- `line_amount`
- `line_pv`
- `pool_rate_mode`
- `pool_rate`
- `pool_cap_multiple`
- `commission_cap_scope`
- `commission_cap_multiple`
- `created_at`

### 3.3 Member and Qualification Tables

#### `member_profiles`

Recommended fields:

- `member_id`
- `sponsor_member_id`
- `upline_member_id`
- `placement_side`
- `active_status`
- `qualified_direct_status`
- `qualified_pool_status`
- `qualified_matrix_status`
- `last_qualified_at`
- `updated_at`

#### `member_pv_ledgers`

Purpose:

- immutable PV movement history

Recommended fields:

- `id`
- `member_id`
- `order_id`
- `pv_amount`
- `entry_type`
- `effective_at`
- `created_at`

### 3.4 Commission Trigger and Ledger Tables

#### `commission_source_events`

Purpose:

- normalized trigger event table used by all plans

Recommended fields:

- `id`
- `plan_type`
- `source_order_id`
- `source_member_id`
- `event_type`
- `event_status`
- `effective_at`
- `metadata_json`
- `created_at`

Examples:

- approved order direct trigger
- approved order pool funding trigger
- matrix board completion trigger
- matrix overlap source trigger

#### `commission_ledger_entries`

Purpose:

- append-only payout and reversal ledger

Recommended fields:

- `id`
- `entry_type`
- `plan_type`
- `source_event_id`
- `source_order_id`
- `recipient_member_id`
- `related_entry_id`
- `board_id`
- `board_round_id`
- `pool_cycle_id`
- `payout_level`
- `gross_amount`
- `paid_amount`
- `blocked_amount`
- `holdback_amount`
- `fallback_amount`
- `balance_effect_amount`
- `reason_code`
- `status`
- `created_at`

Expected `entry_type` examples:

- `PAYOUT`
- `PARTIAL_PAYOUT`
- `HOLDback`
- `FALLBACK`
- `REVERSAL`

Notes:

- `related_entry_id` links a reversal to the original payout entry
- `balance_effect_amount` may be negative

#### `member_commission_balances`

Purpose:

- fast current balance projection per member

Recommended fields:

- `member_id`
- `available_balance`
- `negative_balance`
- `last_recomputed_at`
- `updated_at`

Notes:

- this may be materialized from ledger entries
- negative balances must be allowed

### 3.5 Cap and Fallback Tables

#### `commission_cap_cycles`

Purpose:

- track earning windows and cap basis

Recommended fields:

- `id`
- `member_id`
- `source_order_id`
- `cap_scope`
- `cap_base_amount`
- `cap_limit_amount`
- `earned_amount`
- `blocked_amount`
- `cycle_status`
- `opened_at`
- `closed_at`

#### `commission_fallback_entries`

Purpose:

- explicit trace of blocked payout destination

Recommended fields:

- `id`
- `ledger_entry_id`
- `member_id`
- `plan_type`
- `fallback_type`
- `fallback_amount`
- `reason_code`
- `created_at`

### 3.6 Pool Tables

#### `pool_cycles`

Purpose:

- one row per pool close cycle

Recommended fields:

- `id`
- `cycle_code`
- `cycle_start_at`
- `cycle_end_at`
- `total_fund_amount`
- `eligible_member_count`
- `payout_per_member`
- `status`
- `closed_at`
- `created_at`

#### `pool_cycle_members`

Purpose:

- qualification and payout result per member per cycle

Recommended fields:

- `id`
- `pool_cycle_id`
- `member_id`
- `qualified_status`
- `qualification_reason`
- `gross_payout_amount`
- `paid_amount`
- `blocked_amount`
- `fallback_amount`
- `created_at`

#### `pool_funding_entries`

Purpose:

- audit trail of how orders contribute into the pool fund

Recommended fields:

- `id`
- `pool_cycle_id`
- `source_order_id`
- `order_item_id`
- `funding_amount`
- `funding_rate`
- `funding_mode`
- `created_at`

### 3.7 Matrix Tables

#### `matrix_boards`

Purpose:

- one row per member per board family

Recommended fields:

- `id`
- `member_id`
- `board_type`
- `current_round_no`
- `board_depth`
- `board_width`
- `open_status`
- `opened_at`
- `updated_at`

Examples:

- one member's `B1`
- one member's `B2`
- one member's `B3`

#### `matrix_board_rounds`

Purpose:

- each sequential round of a board

Recommended fields:

- `id`
- `matrix_board_id`
- `round_no`
- `status`
- `slot_capacity`
- `filled_slot_count`
- `opened_at`
- `completed_at`
- `pending_requirement_code`
- `created_at`

Examples of `status`:

- `OPEN`
- `FULL`
- `PENDING_NEXT_ROUND_REQUIREMENT`
- `CLOSED`

#### `matrix_source_points`

Purpose:

- normalized source points that may create displayed placements and payout effects

Recommended fields:

- `id`
- `source_member_id`
- `source_order_id`
- `source_board_round_id`
- `target_board_type`
- `event_type`
- `effective_at`
- `created_at`

Examples:

- point opened from approved personal PV
- point generated from `B1` completion into `B2`
- point generated from `B2` completion into `B3`

#### `matrix_placements`

Purpose:

- all visible and payable matrix placements

Recommended fields:

- `id`
- `source_point_id`
- `matrix_board_round_id`
- `placed_member_id`
- `ancestor_member_id`
- `placement_depth`
- `display_sequence`
- `placement_status`
- `is_display_only`
- `is_payable_path_participant`
- `created_at`

Notes:

- overlap can produce more than one placement row for the same `source_point_id`
- only selected rows participate in payable path mapping

#### `matrix_payout_paths`

Purpose:

- selected payable path for a matrix source event

Recommended fields:

- `id`
- `source_point_id`
- `matrix_board_round_id`
- `path_status`
- `selected_reason`
- `created_at`

#### `matrix_payout_path_nodes`

Purpose:

- ordered recipients in the payable path

Recommended fields:

- `id`
- `matrix_payout_path_id`
- `member_id`
- `payout_level`
- `payout_rate`
- `created_at`

Notes:

- this table supports the rule that one source point can pay multiple levels while still counting once

#### `matrix_holdback_accounts`

Purpose:

- accumulated `auto reorder` holdback per member and board family

Recommended fields:

- `id`
- `member_id`
- `board_type`
- `target_round_id`
- `accumulated_amount`
- `target_amount`
- `status`
- `updated_at`

Examples of `status`:

- `ACCUMULATING`
- `TARGET_REACHED`
- `CONSUMED`

#### `matrix_reorders`

Purpose:

- explicit link between holdback completion and real reorder order

Recommended fields:

- `id`
- `member_id`
- `trigger_board_round_id`
- `holdback_account_id`
- `generated_order_id`
- `required_pv`
- `status`
- `triggered_at`
- `completed_at`

### 3.8 Reversal and Negative Balance Tables

#### `commission_reversal_batches`

Purpose:

- group reversal work for one cancelled order

Recommended fields:

- `id`
- `cancelled_order_id`
- `status`
- `total_reversal_amount`
- `created_at`
- `completed_at`

#### `commission_negative_balance_references`

Purpose:

- explain exactly why a member balance went negative

Recommended fields:

- `id`
- `member_id`
- `ledger_entry_id`
- `cancelled_order_id`
- `plan_type`
- `negative_amount`
- `explanation`
- `created_at`

### 3.9 Suggested Relationships

- `orders 1:N order_items`
- `orders 1:N commission_source_events`
- `commission_source_events 1:N commission_ledger_entries`
- `commission_ledger_entries 1:N commission_fallback_entries`
- `pool_cycles 1:N pool_cycle_members`
- `pool_cycles 1:N pool_funding_entries`
- `matrix_boards 1:N matrix_board_rounds`
- `matrix_board_rounds 1:N matrix_placements`
- `matrix_source_points 1:N matrix_placements`
- `matrix_source_points 1:1 matrix_payout_paths`
- `matrix_payout_paths 1:N matrix_payout_path_nodes`
- `orders 1:N commission_reversal_batches`

### 3.10 Minimal Implementation Recommendation

If implementation needs to be phased, prioritize these tables first:

- `orders`
- `order_items`
- `commission_source_events`
- `commission_ledger_entries`
- `pool_cycles`
- `pool_funding_entries`
- `matrix_boards`
- `matrix_board_rounds`
- `matrix_source_points`
- `matrix_placements`
- `matrix_holdback_accounts`

Then add these next:

- `matrix_payout_paths`
- `matrix_payout_path_nodes`
- `commission_cap_cycles`
- `commission_fallback_entries`
- `member_commission_balances`
- `commission_reversal_batches`
- `commission_negative_balance_references`
