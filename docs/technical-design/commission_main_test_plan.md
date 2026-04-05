# Commission Main Test Plan

Updated: 2026-04-05

## Purpose

This document defines the test plan for the new main commission plan described in [commission_main_plan_spec.md](/Users/macbook/poolproject/docs/technical-design/commission_main_plan_spec.md).

This plan is the primary validation checklist for:

- `Direct`
- `Pool`
- `Matrix`
- approved-order trigger behavior
- cancellation reversal and negative balance traceability
- BAO report visibility
- WAP display readiness

## Delivery Boundary

The new commission display work must be isolated from the older WAP commission screen.

Locked boundary:

- old screen remains at [Commission.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Commission.tsx)
- new screen work must continue from [CommissionMainPlan.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/CommissionMainPlan.tsx)
- after this copy split, future work for the new commission rollout should not change the older screen unless explicitly approved

## Environments

### Local runtime

Used for:

- API flow
- worker flow
- pool close flow
- BAO report pages
- WAP route preview

### UAT / WAP

Used for:

- final mobile display verification
- business signoff on WAP layout
- real login and member-facing data checks

## Test Stages

### Stage 1. Data and trigger validation

Goal:

- confirm commission calculation starts only after `approved`

Checks:

- create order in non-approved status
- verify `PV`, `Direct`, `Pool`, and `Matrix` do not move yet
- approve order
- verify all downstream calculation begins from `approved_at`

Suggested script reuse:

- [approve-order-commission-smoke.js](/Users/macbook/poolproject/scripts/approve-order-commission-smoke.js)
- [order-creation-smoke.js](/Users/macbook/poolproject/scripts/order-creation-smoke.js)

### Stage 2. Direct payout validation

Goal:

- confirm direct sponsor receives payout only through real sponsor relationship

Checks:

- approved order pays direct sponsor
- inactive or blocked sponsor follows fallback policy
- no reroute to unrelated branch

Suggested script reuse:

- [direct-unilevel-smoke.js](/Users/macbook/poolproject/scripts/direct-unilevel-smoke.js)
- [run_member003_direct_test.sh](/Users/macbook/poolproject/scripts/run_member003_direct_test.sh)

### Stage 3. Pool funding and cap validation

Goal:

- confirm pool funding, qualification, cap behavior, and fallback remain correct

Checks:

- default pool funding
- custom rate
- disabled pool
- pool-only cap
- all-commissions cap
- partial payout to remaining cap

Suggested script reuse:

- [pool-cap-local-smoke.sh](/Users/macbook/poolproject/scripts/pool-cap-local-smoke.sh)
- [pool-config-rules-local-smoke.sh](/Users/macbook/poolproject/scripts/pool-config-rules-local-smoke.sh)
- [pool-all-commissions-e2e-smoke.sh](/Users/macbook/poolproject/scripts/pool-all-commissions-e2e-smoke.sh)
- [pool-weekly-local-smoke.sh](/Users/macbook/poolproject/scripts/pool-weekly-local-smoke.sh)

### Stage 4. Matrix board progression validation

Goal:

- confirm sponsor-line placement and board progression match the locked matrix plan

Checks:

- `B1` opens at personal PV threshold
- later approved purchases under the same member code continue adding PV into unfinished `B1`
- `B1` full checks holdback before opening the next round
- delayed next-round open works after a later approved purchase
- `B2` opens from `B1` completion
- `B3` continues using the same overlap principle

Suggested script reuse:

- [matrix-by-code-smoke.js](/Users/macbook/poolproject/scripts/matrix-by-code-smoke.js)
- [matrix-spill-smoke.js](/Users/macbook/poolproject/scripts/matrix-spill-smoke.js)
- [run_member003_matrix_test.sh](/Users/macbook/poolproject/scripts/run_member003_matrix_test.sh)

### Stage 5. Matrix overlap and single-count payout validation

Goal:

- confirm overlap display can duplicate nodes without duplicating payout count

Checks:

- one source point can appear in multiple displayed positions
- payout remains `count 1 time`
- `B2` locked example still pays the eligible `L1` and `L2` recipients within one counted event
- `B3` follows the same rule

Suggested references:

- [matrix_rules_v2.md](/Users/macbook/poolproject/docs/technical-design/matrix_rules_v2.md)
- [commission_main_plan_spec.md](/Users/macbook/poolproject/docs/technical-design/commission_main_plan_spec.md)

### Stage 6. Cancellation reversal and negative balance validation

Goal:

- confirm cancelling an approved order reverses all payout impact and exposes negative balance detail

Checks:

- cancel an already approved order
- create reversal entries for all affected plans
- deduct from recipient balances
- allow negative balances when prior balance is insufficient
- show traceability to the cancelled order

Required validation output:

- original payout entry exists
- reversal entry exists
- negative balance reference exists when needed
- UI/report can identify the cancelled order source

### Stage 7. BAO report and export validation

Goal:

- confirm admin-side report pages still read the correct commission state for the new main plan

Checks:

- settings page loads
- overview report loads
- direct report loads
- matrix report loads
- pool report loads
- export works for `csv`, `xlsx`, and `pdf`

Suggested script reuse:

- [check_stephub_admin_commission.sh](/Users/macbook/poolproject/scripts/check_stephub_admin_commission.sh)

### Stage 8. WAP display validation

Goal:

- confirm the new copied WAP screen is ready for this workstream without modifying the old screen

Checks:

- new route loads
- old route still loads
- matrix board rows render correctly on mobile
- locked boards remain hidden
- round grouping remains correct
- commission cards and history still load
- no regression in wallet, matrix, or pool sections

Primary checklist:

- [2026-04-05-wap-commission-main-plan-regression.md](/Users/macbook/poolproject/docs/uat/2026-04-05-wap-commission-main-plan-regression.md)

## Exit Criteria

The new main commission rollout is ready for implementation signoff only when:

- approved-order trigger behavior is verified
- direct validation passes
- pool validation passes
- matrix progression and overlap validation passes
- cancellation rollback and negative balance validation passes
- BAO report visibility passes
- WAP mobile checklist passes on the copied screen

## Recommended Execution Order

1. Run local order and approved-trigger checks.
2. Run direct and pool smokes.
3. Run matrix progression and overlap checks.
4. Verify cancellation rollback behavior.
5. Run BAO admin report smoke.
6. Run WAP mobile checklist on the copied screen.
