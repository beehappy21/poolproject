# Implementation Folder Structure and Domain Package Layout

**Depends on:** [service_module_breakdown.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/service_module_breakdown.md), [schema_spec.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/schema_spec.md), [state_machines.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/state_machines.md), [api_contracts.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/api_contracts.md)

---

## 1. Goal

Provide a concrete project structure for implementing the platform as a modular monolith first, while keeping future service extraction possible.

This layout is framework-agnostic and can be adapted to:
- NestJS / TypeScript
- Laravel / PHP
- Django / Python
- Spring Boot / Java
- Go service packages

---

## 2. Recommended Top-Level Layout

```text
apps/
  api/
  admin/
  worker/

packages/
  core/
  shared/
  infrastructure/
  modules/

docs/
  web3-ecommerce-design/

scripts/
  migrations/
  backfills/
  reconciliation/

tests/
  unit/
  integration/
  contract/
  e2e/
```

Intent:
- `apps/api` serves member and admin APIs
- `apps/worker` runs jobs, schedulers, and async handlers
- `packages/modules` contains domain modules
- `packages/core` contains domain primitives and policies
- `packages/infrastructure` contains DB, queue, blockchain, auth, and storage adapters

---

## 3. Domain-First Package Layout

```text
packages/modules/
  auth_identity/
  wallet_security/
  member_genealogy/
  packages_cycles/
  orders_approval/
  qualification/
  commissions/
  pools/
  wallet_ledger/
  reviews_risk/
  reversals/
  treasury_settlement/
  reporting_audit/
```

Each module should own:
- domain models
- application services / use cases
- repositories or data access interfaces
- module-local validation rules
- event handlers
- tests

---

## 4. Internal Layout Per Module

Recommended module layout:

```text
packages/modules/<module_name>/
  domain/
    entities/
    value_objects/
    services/
    events/
    policies/
  application/
    commands/
    queries/
    handlers/
    dto/
  infrastructure/
    repositories/
    mappers/
    persistence/
    integrations/
  interfaces/
    http/
    jobs/
    subscribers/
  tests/
    unit/
    integration/
```

Rules:
- `domain/` contains business rules, not transport logic
- `application/` orchestrates use cases
- `infrastructure/` talks to DB, queues, chain, or external services
- `interfaces/` exposes routes, jobs, and event consumers

---

## 5. Core Shared Packages

### 5.1 `packages/core`
Recommended contents:

```text
packages/core/
  money/
  pv/
  time/
  ids/
  errors/
  enums/
  auditing/
  authorization/
  eventing/
```

Use for:
- `Money`
- `PV`
- `CycleId`, `OrderId`, `UserId`
- shared enums for statuses
- audit metadata types
- domain event abstractions

### 5.2 `packages/shared`
Recommended contents:

```text
packages/shared/
  config/
  logging/
  serialization/
  pagination/
  validation/
  feature_flags/
```

### 5.3 `packages/infrastructure`
Recommended contents:

```text
packages/infrastructure/
  db/
  queue/
  cache/
  auth/
  blockchain/
  storage/
  observability/
```

---

## 6. Module-Specific Layout Recommendations

### 6.1 `auth_identity`
Suggested contents:

```text
auth_identity/
  domain/
    entities/
      user.*
    value_objects/
      member_code.*
      sponsor_code.*
    policies/
      sponsor_binding_policy.*
  application/
    commands/
      register_user.*
      login_user.*
  interfaces/http/
    auth_controller.*
```

### 6.2 `wallet_security`
Suggested contents:

```text
wallet_security/
  domain/
    entities/
      wallet_binding.*
      identity_signal.*
    services/
      wallet_binding_verifier.*
      duplicate_wallet_detector.*
    policies/
      wallet_rebind_policy.*
  application/
    commands/
      request_wallet_bind.*
      verify_wallet_signature.*
      approve_wallet_rebind.*
```

### 6.3 `member_genealogy`
Suggested contents:

```text
member_genealogy/
  domain/
    entities/
      sponsor_link.*
    services/
      upline_resolver.*
      direct_referral_counter.*
```

### 6.4 `packages_cycles`
Suggested contents:

```text
packages_cycles/
  domain/
    entities/
      package.*
      member_package_cycle.*
    services/
      cycle_activation_service.*
      earning_cap_calculator.*
      cycle_receivable_evaluator.*
```

### 6.5 `orders_approval`
Suggested contents:

```text
orders_approval/
  domain/
    entities/
      order.*
      order_item.*
      order_adjustment.*
    services/
      order_approval_service.*
  application/
    commands/
      create_order.*
      mark_order_paid.*
      approve_order.*
      void_order_pre_approval.*
```

### 6.6 `qualification`
Suggested contents:

```text
qualification/
  domain/
    services/
      member_active_evaluator.*
      receivable_cycle_selector.*
      cap_acceptance_evaluator.*
      active_direct_referral_evaluator.*
  application/
    queries/
      get_member_qualification.*
```

### 6.7 `commissions`
Suggested contents:

```text
commissions/
  domain/
    entities/
      commission_item.*
      commission_plan.*
      commission_plan_direct_rule.*
      commission_plan_uni_rule.*
      company_fallback.*
    services/
      commission_plan_resolver.*
      direct_rollup_service.*
      uni_rollup_service.*
      beneficiary_cycle_assignment_service.*
      commission_finalizer.*
```

### 6.8 `pools`
Suggested contents:

```text
pools/
  domain/
    entities/
      daily_pool_cycle.*
      pool_snapshot.*
      pool_payout.*
    services/
      pool_rate_resolver.*
      pool_funding_service.*
      pool_snapshot_service.*
      pool_close_service.*
```

### 6.9 `wallet_ledger`
Suggested contents:

```text
wallet_ledger/
  domain/
    entities/
      wallet.*
      wallet_transaction.*
    services/
      wallet_posting_service.*
      hold_release_service.*
      negative_offset_service.*
      payout_reservation_service.*
```

### 6.10 `reviews_risk`
Suggested contents:

```text
reviews_risk/
  domain/
    entities/
      review_case.*
      risk_flag.*
      payout_hold.*
    services/
      risk_evaluation_service.*
      hold_decision_service.*
      manual_review_service.*
```

### 6.11 `reversals`
Suggested contents:

```text
reversals/
  domain/
    entities/
      commission_reversal.*
    services/
      reversal_request_service.*
      reversal_apply_service.*
```

### 6.12 `treasury_settlement`
Suggested contents:

```text
treasury_settlement/
  domain/
    entities/
      payout_batch.*
      payout_batch_item.*
    services/
      payout_candidate_selector.*
      payout_batch_builder.*
      payout_submission_service.*
      payout_reconciliation_service.*
```

### 6.13 `reporting_audit`
Suggested contents:

```text
reporting_audit/
  application/
    queries/
      get_member_income_report.*
      get_company_fallback_report.*
      get_pool_report.*
      get_audit_log_report.*
```

---

## 7. App Layer Wiring

### 7.1 `apps/api`
Purpose:
- public/member HTTP APIs
- admin HTTP APIs
- auth middleware
- request validation

Suggested layout:

```text
apps/api/
  src/
    http/
      member/
      admin/
      finance/
    middleware/
    bootstrap/
```

### 7.2 `apps/worker`
Purpose:
- scheduled jobs
- async event handlers
- reconciliation jobs

Suggested layout:

```text
apps/worker/
  src/
    jobs/
      approvals/
      pools/
      wallets/
      payouts/
      risk/
      reconciliation/
    schedulers/
    subscribers/
```

### 7.3 `apps/admin`
Purpose:
- optional separate admin UI app

Status:
- optional if admin and member APIs share one backend app

---

## 8. Event and Job Structure

Suggested structure:

```text
packages/core/eventing/
  domain_event.*

packages/modules/*/domain/events/
  *.event.*

apps/worker/src/subscribers/
  order_approved_subscriber.*
  pool_close_subscriber.*
  payout_reconciliation_subscriber.*
```

Recommended rule:
- domain events are emitted from application services
- async jobs consume events and call module use cases

---

## 9. Testing Layout

Recommended structure:

```text
tests/
  unit/
    qualification/
    commissions/
    wallet_ledger/
  integration/
    orders_to_commissions/
    pool_close/
    payout_hold_release/
    exceptional_reversal/
  contract/
    api/
  e2e/
    member_lifecycle/
    admin_risk_review/
    payout_batch_flow/
```

Priority test areas:
- multi-cycle cycle-assignment determinism
- cap blocking across multiple receivable cycles
- daily pool snapshot vs approved-order funding
- negative carry-forward application
- payout hold / release correctness

---

## 10. Configuration Boundaries

Keep these in config, not hardcoded:
- pool close cut-off
- approval cut-off
- chain metadata
- payout minimums
- rebind cooldown
- risk thresholds

Status:
- some values remain `REQUIRES BUSINESS DECISION`

---

## 11. Future Extraction Paths

If the modular monolith later splits:
- first candidates:
  - `treasury_settlement`
  - `reviews_risk`
  - `reporting_audit`
- keep shared contract boundaries stable:
  - events
  - command DTOs
  - read-model schemas

---

## 12. Recommended First Scaffolding Pass

1. create top-level `apps/`, `packages/`, `tests/`, `scripts/`
2. scaffold module folders under `packages/modules/`
3. create shared status enums and ID/value objects in `packages/core/`
4. scaffold repository interfaces only, not DB implementation yet
5. scaffold command/query handlers for:
   - `approve_order`
   - `snapshot_pool_eligibility`
   - `close_pool`
   - `post_approved_earning`
   - `apply_exceptional_reversal`
6. add test skeletons for qualification and wallet posting

---

## 13. Assumption

This layout assumes:
- one main backend codebase
- modular monolith first
- async worker process available
- database-backed persistence

If the chosen stack later differs, this folder layout should be adapted rather than followed literally.
