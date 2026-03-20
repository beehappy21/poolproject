# Implementation Readiness Review

**Scope:** Review the current design set for implementation readiness with a findings-first mindset.

Reviewed docs:
- [web3_ecommerce_planning_pack_detailed.md](/Users/macbook/poolproject/web3_ecommerce_planning_pack_detailed.md)
- [design_update_locked_decisions.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/design_update_locked_decisions.md)
- [schema_spec.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/schema_spec.md)
- [state_machines.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/state_machines.md)
- [api_contracts.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/api_contracts.md)
- [wallet_posting_rules_matrix.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/wallet_posting_rules_matrix.md)
- [migration_draft.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/migration_draft.md)

---

## Findings

### 1. Wallet reversal debit priority is still unresolved and affects ledger correctness
Severity: high

Issue:
- The design intentionally leaves open whether exceptional reversal may debit `held_balance` before creating `negative_offset_balance`.
- This is not a cosmetic gap. It changes wallet math, member-visible balances, support outcomes, and the implementation of reversal posting order.

References:
- [state_machines.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/state_machines.md#L158)
- [wallet_posting_rules_matrix.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/wallet_posting_rules_matrix.md#L33)

Recommendation:
- Lock this before building wallet posting code or reconciliation reports.

### 2. Historical backfill policy for `beneficiary_cycle_id` is unresolved and could block migration rollout
Severity: high

Issue:
- New payable commission items require a cycle reference, but historical rows may not be assignable with confidence.
- If the team tries to enforce strict constraints too early, migration can stall or force low-confidence synthetic assignments.

References:
- [schema_spec.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/schema_spec.md#L745)
- [migration_draft.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/migration_draft.md#L155)

Recommendation:
- Formally choose a cutover rule: strict cycle assignment only for post-cutover rows unless business requires historical precision.

### 3. Daily cut-off timing is still open and directly affects pool funding and eligibility determinism
Severity: medium

Issue:
- Pool funding depends on `approved_at` date and eligibility depends on a daily snapshot, but the exact timezone and cut-off timestamps remain open.
- Without that, two environments can produce different pool results for the same data.

References:
- [design_update_locked_decisions.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/design_update_locked_decisions.md#L615)

Recommendation:
- Lock one canonical business timezone and one cut-off schedule before implementing jobs.

### 4. API area for member withdrawal initiation is intentionally unresolved and affects workflow scope
Severity: medium

Issue:
- The contracts mention that withdrawal may be member-request-driven or fully operator-batch-driven.
- This changes API surface, queueing, wallet UX, and support flow.

References:
- [api_contracts.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/api_contracts.md#L216)

Recommendation:
- Decide this before frontend/backoffice scoping begins.

### 5. The design is implementation-ready for backend domain modeling, but not yet for framework-specific migrations or service boundaries
Severity: low

Issue:
- Current artifacts are strong at system design level, but they still stop short of:
  - exact enum definitions per DB engine
  - exact partial indexes / check constraints by database
  - module ownership if services are split

References:
- [schema_spec.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/schema_spec.md)
- [migration_draft.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/migration_draft.md)

Recommendation:
- Next step should be framework-specific migration authoring plus service/module boundary mapping.

---

## Open Questions / Assumptions

- `refunds` vs `order_adjustments` naming is still open but does not block most core logic.
- Risk severity mapping is still open and will affect hold automation thresholds more than core ledger structure.
- The review assumes the locked business decisions remain unchanged.

---

## Readiness Summary

Ready now:
- data model direction
- cycle-aware earning model
- pool funding and eligibility logic
- company fallback handling
- payout hold architecture
- negative carry-forward concept

Should be locked before implementation starts:
- reversal debit order against held funds
- historical cycle-assignment migration policy
- pool cut-off timezone and schedule
- withdrawal operating model

---

## Recommended Next Step

Proceed with framework-specific migration authoring only after the four blocking decisions above are explicitly frozen.
