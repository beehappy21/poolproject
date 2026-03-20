# State Machines

**Depends on:** [design_update_locked_decisions.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/design_update_locked_decisions.md), [schema_spec.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/schema_spec.md)

---

## 1. Order State Machine

### 1.1 States
- `pending`
- `paid`
- `approved`
- `cancelled`
- `voided`

### 1.2 Transitions

| From | Event | To | Notes |
|---|---|---|---|
| `pending` | payment_confirmed | `paid` | order funded |
| `pending` | cancel_before_payment | `cancelled` | no commission impact |
| `paid` | approve_order | `approved` | creates direct/uni items |
| `paid` | pre_approval_void | `voided` | void pending commercial effect |
| `paid` | pre_approval_cancel | `cancelled` | may create order adjustment |

### 1.3 Guard rules
- Only `approved` orders contribute to direct/uni finalization and daily pool funding.
- Normal business flow ends at `approved`.
- No normal refund transition exists after `approved`.
- Exceptional post-approval action uses separate reversal workflow and does not move order back out of `approved`.

---

## 2. Member Package Cycle State Machine

### 2.1 States
- `active`
- `expired`
- `closed`

### 2.2 Earning status
- `active`
- `capped`

### 2.3 Transitions

| From | Event | To | Notes |
|---|---|---|---|
| none | activate_cycle | `active` | new purchase creates a cycle |
| `active` | reaches_active_until | `expired` | no longer receivable |
| `active` | cycle_closed_admin | `closed` | rare admin action |
| `active` earning_status `active` | full_item_hits_cap_exactly | earning_status `capped` | cycle remains active status but non-receivable |
| `active` earning_status `active` | full_item_would_exceed_cap | no state change | item blocked or re-routed to another cycle |

### 2.4 Derived receivable rule
- A cycle is receivable only when:
  - state `active`
  - `now <= active_until`
  - earning status `active`

---

## 3. Commission Item State Machine

### 3.1 States
- `pending`
- `approved`
- `held`
- `withdrawable`
- `reserved_for_payout`
- `paid_out`
- `reversed`
- `fallback`

### 3.2 Transition flow

| From | Event | To | Notes |
|---|---|---|---|
| none | create_candidate | `pending` | after order approval or pool close |
| `pending` | resolve_to_company_fallback | `fallback` | no valid beneficiary or no receivable cycle/cap acceptance |
| `pending` | approve_without_hold | `approved` | transient if immediate promote used |
| `pending` | approve_with_hold | `held` | risk or payout hold |
| `approved` | release_immediately | `withdrawable` | if no hold and no negative offset remains after application |
| `approved` | place_hold | `held` | hold added before release |
| `held` | release_hold | `withdrawable` | only if no payout lock and no blocking review case |
| `withdrawable` | reserve_for_batch | `reserved_for_payout` | payout batch inclusion |
| `reserved_for_payout` | payout_confirmed | `paid_out` | on-chain reconciled |
| `reserved_for_payout` | payout_failed | `withdrawable` | controlled revert |
| `approved` / `held` / `withdrawable` / `reserved_for_payout` / `paid_out` | exceptional_reversal_applied | `reversed` | explicit reversal row required |

### 3.3 Deterministic pre-state checks
1. Resolve beneficiary member
2. Resolve beneficiary cycle
3. Evaluate cap
4. If blocked, go `fallback`
5. If payable, create wallet postings
6. Evaluate payout hold
7. Promote to `held` or `withdrawable`

---

## 4. Daily Pool Cycle State Machine

### 4.1 States
- `open`
- `closed`
- `adjusted`

### 4.2 Transitions

| From | Event | To | Notes |
|---|---|---|---|
| none | open_pool_date | `open` | create pool cycle for date |
| `open` | snapshot_completed | `open` | no state change |
| `open` | close_pool | `closed` | funding and payouts finalized |
| `closed` | admin_adjust_metadata | `adjusted` | metadata/audit adjustments only |

### 4.3 Guard rules
- Funding source uses `approved_at` date only.
- Pool close must use the matching eligibility snapshot for that date.
- Exceptional post-approval reversals do not reopen the daily pool cycle.

---

## 5. Wallet Balance Bucket State Machine

### 5.1 Buckets
- `approved_balance`
- `held_balance`
- `withdrawable_balance`
- `paid_out_balance`
- `negative_offset_balance`

### 5.2 Flow rules

#### Normal credit flow
1. Bonus item approved
2. Apply amount against `negative_offset_balance` first if any
3. Residual amount goes to:
   - `held_balance` if hold applies
   - `withdrawable_balance` if no hold applies

#### Hold release flow
1. Item or member hold released
2. Move amount from `held_balance` to `withdrawable_balance`

#### Payout flow
1. Batch reserve selected items
2. Move amount from `withdrawable_balance` to payout-reserved logical state
3. On confirmation, increment `paid_out_balance`
4. On batch failure, move amount back to `withdrawable_balance`

#### Exceptional reversal flow
1. Debit `withdrawable_balance`
2. If insufficient, debit `held_balance` if policy allows
3. Remainder becomes `negative_offset_balance`

### 5.3 REQUIRES BUSINESS DECISION
- Whether held balances may be debited before creating negative offset, or only withdrawable balances may be consumed first

---

## 6. Payout Hold State Machine

### 6.1 States
- `active`
- `released`
- `expired`
- `cancelled`

### 6.2 Transitions

| From | Event | To | Notes |
|---|---|---|---|
| none | hold_placed | `active` | by system or admin |
| `active` | hold_released | `released` | reviewer/admin release |
| `active` | hold_timeout | `expired` | optional timed release |
| `active` | hold_cancelled | `cancelled` | invalid hold |

### 6.3 Effects
- `active` hold blocks release to withdrawable or batch inclusion depending on scope.
- `released` allows held items to move through release job.

---

## 7. Review Case State Machine

### 7.1 States
- `open`
- `assigned`
- `resolved`
- `rejected`

### 7.2 Transitions

| From | Event | To | Notes |
|---|---|---|---|
| none | open_case | `open` | system or operator |
| `open` | assign_case | `assigned` | reviewer takes case |
| `assigned` | resolve_case | `resolved` | includes resolution code |
| `open` / `assigned` | reject_case | `rejected` | invalid or duplicate case |

### 7.3 Effects
- Review case can be linked to wallet rebind, payout hold, or exceptional reversal.
- Certain payout holds remain active until linked case resolves.

---

## 8. Exceptional Reversal State Machine

### 8.1 States
- `requested`
- `approved`
- `applied`
- `rejected`

### 8.2 Transitions

| From | Event | To | Notes |
|---|---|---|---|
| none | request_exceptional_reversal | `requested` | create review case |
| `requested` | reviewer_approves | `approved` | approval actor must differ from requester |
| `approved` | apply_reversal | `applied` | creates reversal ledger and wallet debits |
| `requested` | reviewer_rejects | `rejected` | no financial posting |

### 8.3 Effects
- Original order remains `approved`
- Original commission item remains immutable
- New reversal rows and audit logs are created

---

## 9. Role Separation Rules

- `treasury_approver` must not be the same actor as `treasury_submitter` for the same payout batch
- exceptional reversal requester must not be the approver
- wallet rebind requester should not be the reviewer when operationally feasible
