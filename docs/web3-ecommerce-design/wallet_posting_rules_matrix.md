# Wallet Posting Rules Matrix

**Depends on:** [design_update_locked_decisions.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/design_update_locked_decisions.md), [schema_spec.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/schema_spec.md), [state_machines.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/state_machines.md)

---

## 1. Purpose

Define deterministic wallet posting rules for:
- direct bonus
- uni bonus
- pool bonus
- payout holds
- payout batch reservation
- payout completion
- payout failure
- exceptional reversals
- negative carry-forward

All postings below are design/spec rules, not application code.

---

## 2. Wallet Buckets

- `approved_balance`
- `held_balance`
- `withdrawable_balance`
- `paid_out_balance`
- `negative_offset_balance`

Design note:
- `approved_balance` can be treated as a transient bucket if release/hold decision is synchronous.
- If the implementation promotes immediately to `held` or `withdrawable`, the ledger must still preserve the transition reason.

---

## 3. Posting Priorities

### 3.1 Credit priority
For any newly approved earning item:
1. apply amount to `negative_offset_balance` first
2. if residual remains and payout hold applies, credit `held_balance`
3. if residual remains and no payout hold applies, credit `withdrawable_balance`

### 3.2 Debit priority for exceptional reversal
1. debit `withdrawable_balance`
2. `REQUIRES BUSINESS DECISION`: whether `held_balance` may also be debited before negative offset is created
3. any remaining unrecovered amount becomes `negative_offset_balance`

### 3.3 Batch selection priority
- Only `withdrawable_balance` is eligible for batch reservation.
- Amounts represented by held, approved, or negative offset buckets are never payout candidates.

---

## 4. Posting Matrix

| Event | Preconditions | Ledger Item Status | Wallet Posting | Notes |
|---|---|---|---|---|
| direct item approved, no hold, no negative offset | payable direct item exists | `approved` -> `withdrawable` | credit `withdrawable_balance` | cycle already assigned |
| direct item approved, hold active, no negative offset | payable direct item exists | `approved` -> `held` | credit `held_balance` | item hold or member hold |
| direct item approved, negative offset exists, no hold | payable direct item exists | `approved` | debit `negative_offset_balance` up to item amount; residual credit `withdrawable_balance` | no release until offset fully consumed |
| direct item approved, negative offset exists, hold active | payable direct item exists | `approved` -> `held` | debit `negative_offset_balance` up to item amount; residual credit `held_balance` |  |
| uni item approved | same logic as direct | same as above | same as above | each level item posts independently |
| pool item approved | same logic as direct | same as above | same as above | per-recipient item |
| item blocked to company fallback | no receivable cycle or cap blocked | `fallback` | no member wallet posting | create company fallback ledger |
| hold released | item or member hold cleared | `held` -> `withdrawable` | debit `held_balance`, credit `withdrawable_balance` | net wallet unchanged except bucket move |
| payout batch reserve | item selected for batch | `withdrawable` -> `reserved_for_payout` | debit `withdrawable_balance` | logical reserve tracked by payout batch item |
| payout confirmed | batch tx reconciled success | `reserved_for_payout` -> `paid_out` | credit `paid_out_balance` | no return to withdrawable |
| payout failed | batch tx failed | `reserved_for_payout` -> `withdrawable` | credit `withdrawable_balance` | item becomes payable again |
| exceptional reversal covered by withdrawable | reversal approved and applied | original item -> `reversed` | debit `withdrawable_balance` | explicit reversal ledger row required |
| exceptional reversal exceeds withdrawable | reversal approved and applied | original item -> `reversed` | debit `withdrawable_balance`; residual debit `held_balance` only if allowed; remaining amount to `negative_offset_balance` | exact held-balance rule is unresolved |
| future earning offsets negative balance fully | `negative_offset_balance > 0` | new item remains payable | debit `negative_offset_balance` only | no residual credit |
| future earning offsets negative balance partially | `negative_offset_balance > 0` and item amount greater | new item remains payable | debit `negative_offset_balance`; residual credit held/withdrawable by hold rule |  |

---

## 5. Canonical Posting Templates

### 5.1 Approved earning with no hold and no negative offset
Wallet transactions:
1. `commission_credit_withdrawable`
   - direction: `credit`
   - balance_bucket: `withdrawable`
   - ref_type: `commission`
   - ref_id: `commission_ledger.id`

### 5.2 Approved earning with active hold
Wallet transactions:
1. `commission_credit_held`
   - direction: `credit`
   - balance_bucket: `held`
   - ref_type: `commission`
   - ref_id: `commission_ledger.id`

### 5.3 Approved earning consumed by negative offset
Wallet transactions:
1. `negative_offset_apply`
   - direction: `debit`
   - balance_bucket: `negative_offset`
   - ref_type: `commission`
   - ref_id: `commission_ledger.id`
2. If residual remains:
   - `commission_credit_withdrawable` or `commission_credit_held`

### 5.4 Hold release
Wallet transactions:
1. `hold_release_debit`
   - direction: `debit`
   - balance_bucket: `held`
2. `hold_release_credit`
   - direction: `credit`
   - balance_bucket: `withdrawable`

### 5.5 Payout reservation
Wallet transactions:
1. `payout_reservation`
   - direction: `debit`
   - balance_bucket: `withdrawable`
   - ref_type: `payout_batch`
   - ref_id: `payout_batch_items.id`

### 5.6 Payout confirmation
Wallet transactions:
1. `payout_sent`
   - direction: `credit`
   - balance_bucket: `paid_out`
   - ref_type: `payout_batch`
   - ref_id: `payout_batch_items.id`

### 5.7 Exceptional reversal
Wallet transactions:
1. `reversal_debit_withdrawable`
2. optional `reversal_debit_held`
3. optional `reversal_create_negative_offset`

---

## 6. Examples

### 6.1 Example A: direct earning, no hold
- direct item amount = `12`
- `negative_offset_balance = 0`
- hold = no

Posting result:
- `withdrawable_balance +12`

### 6.2 Example B: pool earning clears negative offset
- pool item amount = `20`
- `negative_offset_balance = 8`
- hold = no

Posting result:
- `negative_offset_balance -8`
- `withdrawable_balance +12`

### 6.3 Example C: held earning after wallet rebind
- uni item amount = `6`
- `negative_offset_balance = 0`
- member-wide payout hold active

Posting result:
- `held_balance +6`

### 6.4 Example D: exceptional reversal creates negative offset
- reversal amount = `15`
- `withdrawable_balance = 4`
- `held_balance = 0`

Posting result:
- `withdrawable_balance -4`
- `negative_offset_balance +11`

---

## 7. Invariants

- Member wallet postings must never be created for `fallback` items.
- Every payable commission item must map to wallet postings whose net amount equals the item amount minus any negative offset applied.
- `negative_offset_balance` can only increase from exceptional post-approval reversal application.
- `paid_out_balance` is cumulative and never decremented; corrections occur through reversal entries, not balance rewrites.

---

## 8. REQUIRES BUSINESS DECISION

- Whether `held_balance` may be debited during exceptional reversal before creating negative offset
- Whether `approved_balance` remains a durable bucket or only an internal transition state
