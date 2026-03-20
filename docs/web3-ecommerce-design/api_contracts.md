# API Contracts Draft

**Depends on:** [design_update_locked_decisions.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/design_update_locked_decisions.md), [schema_spec.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/schema_spec.md), [state_machines.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/state_machines.md)

---

## 1. API Principles

- REST-style JSON APIs
- All money and PV values returned as strings
- All status fields are explicit
- Cycle-aware responses are required for earnings and qualification endpoints
- Admin actions with financial impact require audit reason fields
- Rate configuration must be versioned and exposed via plan/rule identifiers in admin-facing financial views

---

## 2. Member-Facing APIs

### 2.1 Auth and wallet

#### `POST /auth/register`
Purpose:
- Register member with sponsor code

Request:
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "phone": "123456789",
  "password": "secret",
  "sponsor_code": "MBR00123"
}
```

Response:
```json
{
  "user_id": 1001,
  "member_code": "MBR01001",
  "status": "active"
}
```

#### `POST /auth/login`

#### `POST /auth/connect-wallet`
Purpose:
- Start wallet bind / rebind flow

Request:
```json
{
  "wallet_address": "0xabc...",
  "action_type": "bind"
}
```

Response:
```json
{
  "binding_request_id": 501,
  "nonce": "bind_nonce_value",
  "message": "Sign this message to verify wallet ownership"
}
```

#### `POST /auth/verify-wallet-signature`
Request:
```json
{
  "binding_request_id": 501,
  "wallet_address": "0xabc...",
  "signature": "0xsig..."
}
```

Response:
```json
{
  "binding_status": "verified",
  "effective_immediately": false,
  "review_case_id": 901,
  "payout_hold_placed": true
}
```

#### `GET /me/wallet-bindings`
Purpose:
- Show wallet binding history

Response fields:
- `id`
- `wallet_address`
- `action_type`
- `action_status`
- `requested_at`
- `effective_at`
- `ended_at`

### 2.2 Member qualification and cycles

#### `GET /me/qualification`
Response:
```json
{
  "member_active": true,
  "receivable_cycle_count": 2,
  "active_direct_referral_count": 3,
  "pool_eligible_today": true,
  "risk_level": "normal",
  "payout_status": "active"
}
```

#### `GET /me/package-cycles`
Response item fields:
- `cycle_id`
- `cycle_no`
- `package_id`
- `package_name`
- `activated_at`
- `active_until`
- `earning_cap`
- `earned_total_in_cycle`
- `earning_status`
- `status`
- `is_receivable`

#### `GET /me/package-cycles/:cycleId`

### 2.3 Orders

#### `POST /orders`
Request:
```json
{
  "items": [
    {
      "package_id": 10,
      "qty": 1
    }
  ]
}
```

#### `POST /orders/:id/pay`

#### `GET /orders/:id`
Response fields:
- `order_id`
- `order_no`
- `status`
- `approval_status`
- `paid_at`
- `approved_at`
- `refund_window_ends_at`
- `items`

### 2.4 Earnings and wallet

#### `GET /wallet`
Response:
```json
{
  "approved_balance": "0.00000000",
  "held_balance": "50.00000000",
  "withdrawable_balance": "120.00000000",
  "paid_out_balance": "300.00000000",
  "negative_offset_balance": "20.00000000",
  "payout_lock_status": "hold",
  "payout_lock_reason": "wallet_rebind_review"
}
```

#### `GET /wallet/transactions`
Query params:
- `page`
- `tx_type`
- `balance_bucket`
- `ref_type`

#### `GET /me/income-history`
Query params:
- `commission_type`
- `status`
- `cycle_id`

Response item fields:
- `commission_id`
- `commission_type`
- `commission_plan_id`
- `commission_rule_id`
- `tier_no`
- `status`
- `beneficiary_cycle_id`
- `base_pv`
- `commission_amount`
- `hold_status`
- `hold_reason`
- `fallback_to_company`
- `company_fallback_reason`
- `created_at`

#### `GET /me/pool-history`
Response item fields:
- `pool_date`
- `is_eligible`
- `payout_amount`
- `beneficiary_cycle_id`
- `status`
- `block_reason`

#### `POST /wallet/withdraw-request`
Purpose:
- Optional pre-batch request if withdrawal requests are member-driven

Status:
- `REQUIRES BUSINESS DECISION`: whether payout is request-based or operator batch-based only

---

## 3. Admin and Operations APIs

### 3.1 Package and member admin

#### `GET /admin/members`
Filters:
- `member_code`
- `status`
- `risk_level`
- `manual_review_required`

#### `GET /admin/members/:id`
Response sections:
- identity summary
- sponsor summary
- direct referrals
- active cycles
- wallet summary
- risk flags
- payout holds
- recent audit events

#### `GET /admin/packages`
#### `POST /admin/packages`
#### `PATCH /admin/packages/:id`

### 3.1.1 Commission plan admin

#### `GET /admin/commission-plans`
Filters:
- `status`
- `effective_from`

#### `POST /admin/commission-plans`
Purpose:
- Create a versioned commission plan with direct tiers, uni tiers, and pool rate

Request:
```json
{
  "code": "PLAN-2026-04",
  "name": "April 2026 Default Plan",
  "effective_from": "2026-04-01T00:00:00Z",
  "pool_rate": "0.50000000",
  "direct_rules": [
    { "tier_no": 1, "rate": "0.20000000" }
  ],
  "uni_rules": [
    { "level_from": 1, "level_to": 5, "rate": "0.01000000" },
    { "level_from": 6, "level_to": 15, "rate": "0.00500000" }
  ]
}
```

#### `PATCH /admin/commission-plans/:id`
Purpose:
- Update a draft or inactive plan

#### `POST /admin/commission-plans/:id/activate`
Purpose:
- Activate a plan for future approvals and pool closes

### 3.2 Order approval and order adjustments

#### `GET /admin/orders`
Filters:
- `status`
- `approval_status`
- `date_from`
- `date_to`

#### `POST /admin/orders/:id/approve`
Purpose:
- Transition paid order to approved

Request:
```json
{
  "reason_code": "refund_window_passed",
  "notes": "Approved by automated or manual review policy"
}
```

Response:
```json
{
  "order_id": 2001,
  "status": "approved",
  "approved_at": "2026-03-20T10:00:00Z",
  "commission_items_created": 12
}
```

#### `POST /admin/orders/:id/void`
Purpose:
- Pre-approval void only

### 3.3 Pool operations

#### `POST /admin/pool-cycles/:date/snapshot`

#### `POST /admin/pool-cycles/:date/close`
Response fields:
- `cycle_id`
- `funding_total_approved_pv`
- `eligible_member_count`
- `payout_per_member`
- `company_fallback_amount`

#### `GET /admin/pool-cycles/:date`
Includes:
- funding summary
- eligibility summary
- payout summary
- fallback summary

### 3.4 Review cases and risk

#### `GET /admin/review-cases`
Filters:
- `case_type`
- `status`
- `priority`

#### `POST /admin/review-cases`
Purpose:
- Open manual review case

Request:
```json
{
  "case_type": "risk_review",
  "user_id": 1001,
  "priority": "high",
  "resolution_notes": null
}
```

#### `POST /admin/review-cases/:id/assign`
Request:
```json
{
  "assigned_to_user_id": 9002
}
```

#### `POST /admin/review-cases/:id/resolve`
Request:
```json
{
  "resolution_code": "clear_and_release",
  "resolution_notes": "No material duplication detected"
}
```

#### `GET /admin/risk-flags`
Filters:
- `flag_type`
- `severity`
- `status`

#### `POST /admin/users/:id/payout-holds`
Request:
```json
{
  "scope_type": "member",
  "scope_ref_id": null,
  "reason_code": "wallet_rebind_review"
}
```

#### `POST /admin/payout-holds/:id/release`
Request:
```json
{
  "reason_code": "review_cleared"
}
```

### 3.5 Wallet rebind review

#### `GET /admin/users/:id/wallet-bindings`

#### `POST /admin/wallet-bindings/:id/approve`
Request:
```json
{
  "reason_code": "signature_verified_manual_review_passed"
}
```

#### `POST /admin/wallet-bindings/:id/reject`
Request:
```json
{
  "reason_code": "duplicate_wallet_detected"
}
```

### 3.6 Exceptional reversals

#### `POST /admin/commission-items/:id/exceptional-reversal`
Purpose:
- Request exceptional post-approval reversal

Request:
```json
{
  "reason_code": "fraud_confirmed",
  "amount": "12.00000000",
  "notes": "Confirmed duplicate-wallet abuse"
}
```

Response:
```json
{
  "review_case_id": 991,
  "reversal_status": "requested"
}
```

#### `POST /admin/commission-reversals/:id/approve`
Request:
```json
{
  "reason_code": "fraud_confirmed"
}
```

#### `POST /admin/commission-reversals/:id/apply`
Request:
```json
{
  "reason_code": "approved_reversal_execute"
}
```

Response fields:
- `reversal_id`
- `wallet_debit_applied`
- `negative_offset_balance_after`

### 3.7 Commission and fallback views

#### `GET /admin/commission-ledger`
Filters:
- `commission_type`
- `status`
- `beneficiary_user_id`
- `beneficiary_cycle_id`
- `commission_plan_id`
- `order_id`

#### `GET /admin/company-fallback-ledger`
Filters:
- `bonus_type`
- `reason`
- `date_from`
- `date_to`

---

## 4. Treasury APIs

### 4.1 Payout batches

#### `POST /finance/payout-batches`
Purpose:
- Create draft payout batch from eligible withdrawable items

Request:
```json
{
  "chain_id": "tron-mainnet",
  "token_address": "TXYZ...",
  "selection_policy": "all_eligible"
}
```

Response:
```json
{
  "batch_id": 701,
  "batch_no": "PB-20260320-001",
  "item_count": 140,
  "total_amount": "1820.00000000",
  "status": "draft"
}
```

#### `POST /finance/payout-batches/:id/approve`
Role:
- `treasury_approver`

#### `POST /finance/payout-batches/:id/submit`
Role:
- `treasury_submitter`

Request:
```json
{
  "submitted_tx_hash": "0xhash..."
}
```

#### `POST /finance/payout-batches/:id/reconcile`
Role:
- `finance_operator` or `treasury_reconciler`

#### `GET /finance/payout-batches/:id`
Includes:
- header
- items
- approval actor
- submit actor
- reconciliation actor

---

## 5. Response and Error Rules

### 5.1 Common error codes
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `INVALID_STATE_TRANSITION`
- `REVIEW_REQUIRED`
- `PAYOUT_HOLD_ACTIVE`
- `ROLE_CONFLICT`
- `DUPLICATE_WALLET_DETECTED`
- `NO_RECEIVABLE_CYCLE`
- `CAP_BLOCKED_ALL_RECEIVABLE_CYCLES`

### 5.2 Idempotency recommendations
- Require idempotency keys for:
  - order approval
  - pool close
  - payout batch create
  - payout batch submit
  - exceptional reversal apply

---

## 6. API Areas Still REQUIRES BUSINESS DECISION

- Whether member withdrawal is request-driven or fully operator batch-driven
- Whether commission plans remain globally applied only or need future scoped APIs by package / segment / market
- Final naming of pre-approval adjustment endpoints if `refunds` terminology is retained
- Whether some high-risk conditions should block approval entirely instead of placing held credits
