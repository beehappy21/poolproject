# Commission Plan Summary

Updated: 2026-03-23

## Purpose

This document summarizes the current state of commission-plan testing across sandbox and runtime flows.

It is intended to answer:

- which plans have already been tested
- which tests are sandbox-only versus runtime-backed
- what the latest verified results are
- how to rerun the checks
- what gaps still remain

## Current Status At A Glance

| Plan / Rule Area | Level Verified | Current Status |
| --- | --- | --- |
| Direct | Sandbox | Passed |
| Unilevel | Sandbox with `allmember.xlsx` and replayed orders | Passed |
| Pool funding and caps | Runtime local smoke | Passed |
| Cashback | Runtime local smoke | Passed |
| Matrix legacy member003 | Sandbox / research toolkit | Passed within sandbox scope |

## 1. Direct

### Scope

- Member003 direct-commission sandbox scenario

### Verification Level

- Sandbox only

### Latest Verified Result

- direct payouts: `609`
- fallback count: `21`
- per-level distribution:
  - level 1 = `209`
  - level 2 = `204`
  - level 3 = `196`

### Main Files

- [run_member003_direct_test.sh](/Users/macbook/poolproject/scripts/run_member003_direct_test.sh)
- [assert_member003_direct_test.py](/Users/macbook/poolproject/scripts/assert_member003_direct_test.py)
- [member003_direct_test.md](/Users/macbook/poolproject/docs/technical-design/member003_direct_test.md)

### Rerun

```bash
bash scripts/run_member003_direct_test.sh
```

## 2. Unilevel

### Scope

- allmember structure from `allmember.xlsx`
- replay of real approved orders matched from imported order data

### Verification Level

- Sandbox only
- Uses real member hierarchy and replayed order input, but does not call DB or API

### Latest Verified Result

#### Synthetic one-order-per-member scenario

- members used: `25`
- unilevel payouts: `22`
- fallback count: `103`
- per-level distribution:
  - level 1 = `15`
  - level 2 = `5`
  - level 3 = `2`

#### Replayed approved-order scenario

- members in `allmember.xlsx`: `25`
- matched approved orders: `21`
- unilevel payouts: `17`
- fallback count: `88`
- per-level distribution:
  - level 1 = `12`
  - level 2 = `3`
  - level 3 = `2`

### Exported Reports

- [allmember-unilevel-from-orders-report.json](/Users/macbook/poolproject/runtime/allmember-unilevel-from-orders-report.json)
- [allmember-unilevel-payouts.csv](/Users/macbook/poolproject/runtime/allmember-unilevel-payouts.csv)
- [allmember-unilevel-beneficiary-summary.csv](/Users/macbook/poolproject/runtime/allmember-unilevel-beneficiary-summary.csv)
- [allmember-unilevel-fallbacks.csv](/Users/macbook/poolproject/runtime/allmember-unilevel-fallbacks.csv)
- [allmember-unilevel-received-from-detail.csv](/Users/macbook/poolproject/runtime/allmember-unilevel-received-from-detail.csv)
- [allmember-unilevel-received-from-summary.csv](/Users/macbook/poolproject/runtime/allmember-unilevel-received-from-summary.csv)

### Main Files

- [build_allmember_unilevel_scenario.py](/Users/macbook/poolproject/scripts/build_allmember_unilevel_scenario.py)
- [build_allmember_unilevel_from_orders.py](/Users/macbook/poolproject/scripts/build_allmember_unilevel_from_orders.py)
- [run_allmember_unilevel_from_orders.sh](/Users/macbook/poolproject/scripts/run_allmember_unilevel_from_orders.sh)
- [summarize_unilevel_report.py](/Users/macbook/poolproject/scripts/summarize_unilevel_report.py)
- [export_unilevel_report_csv.py](/Users/macbook/poolproject/scripts/export_unilevel_report_csv.py)
- [export_unilevel_received_from_report.py](/Users/macbook/poolproject/scripts/export_unilevel_received_from_report.py)

### Rerun

```bash
bash scripts/run_allmember_unilevel_from_orders.sh
```

## 3. Pool

### Scope

- default pool funding
- custom pool funding
- disabled pool funding
- pool-only cap
- all-commissions cap
- partial payout up to remaining cap

### Verification Level

- Runtime local Docker-based smoke
- Calls real local API, Postgres, runtime services, wallet posting, and pool close flow

### Verified Rules

Detailed matrix:

- [pool_rule_test_matrix.md](/Users/macbook/poolproject/docs/technical-design/pool_rule_test_matrix.md)

### Latest Verified Results

#### Pool-only cap

- first day:
  - `400 PV`
  - `poolFund = 200`
  - `2` eligible members
  - actual payout = `100` each
- second day:
  - `400 PV`
  - requested payout = `100` each
  - actual payout = `50` each
  - company fallback = `100`

#### Custom rate

- `poolRateMode = CUSTOM_RATE`
- `poolRate = 0.25`
- `400 PV -> poolFund 100 -> 2 recipients get 50 each`

#### Disabled

- `poolRateMode = DISABLED`
- `400 PV -> poolFund 0`
- payout rows created: `0`

#### All-commissions preload check

- preloaded `earnedTotalInCycle = 250`
- `400 PV -> poolFund 200`
- requested `100` each
- actual `50` each
- company fallback = `100`

#### All-commissions full-flow check

- real `process-approved` created:
  - direct `250` to `BOB`
  - uni `250` to `ALICE`
- cycle totals before pool close:
  - `ALICE = 300`
  - `BOB = 300`
- next-day pool close:
  - `poolFund = 200`
  - requested `100` each
  - actual `50` each
  - company fallback = `100`

### Main Files

- [pool.service.ts](/Users/macbook/poolproject/packages/modules/pool/src/services/pool.service.ts)
- [pool.repository.ts](/Users/macbook/poolproject/packages/modules/pool/src/repositories/pool.repository.ts)
- [orders.repository.ts](/Users/macbook/poolproject/packages/modules/orders/src/repositories/orders.repository.ts)
- [commissions.repository.ts](/Users/macbook/poolproject/packages/modules/commissions/src/repositories/commissions.repository.ts)
- [pool-cap-local-smoke.sh](/Users/macbook/poolproject/scripts/pool-cap-local-smoke.sh)
- [pool-config-rules-local-smoke.sh](/Users/macbook/poolproject/scripts/pool-config-rules-local-smoke.sh)
- [pool-all-commissions-e2e-smoke.sh](/Users/macbook/poolproject/scripts/pool-all-commissions-e2e-smoke.sh)
- [pool-all-smoke.sh](/Users/macbook/poolproject/scripts/pool-all-smoke.sh)
- [configurable_pool_caps.md](/Users/macbook/poolproject/docs/technical-design/configurable_pool_caps.md)

### Rerun

```bash
npm run smoke:pool:cap
npm run smoke:pool:rules
npm run smoke:pool:all-comm-e2e
npm run smoke:pool:all
```

## 4. Cashback

### Scope

- runtime cashback commission creation
- wallet posting
- BAO admin settings/report/export visibility

### Verification Level

- Runtime local smoke
- BAO admin report/export smoke

### Latest Verified Scope

- direct/unilevel/pool can be zeroed
- cashback rate can be enabled
- approved order processing creates:
  - `1` cashback ledger row
  - `1` wallet row
- BAO admin cashback settings and report/export paths are smoke-covered

### Main Files

- [cashback-smoke.js](/Users/macbook/poolproject/scripts/cashback-smoke.js)
- [check_stephub_admin_cashback_report.sh](/Users/macbook/poolproject/scripts/check_stephub_admin_cashback_report.sh)
- [cleanup-cashback-smoke-artifacts.js](/Users/macbook/poolproject/scripts/backfills/cleanup-cashback-smoke-artifacts.js)

### Rerun

```bash
npm run smoke:cashback
npm run smoke:bao:cashback
```

## 5. Matrix Legacy Member003

### Scope

- legacy matrix reverse-engineering and sandbox validation

### Verification Level

- Sandbox / research

### Latest Verified Result

- placements: `209`
- board openings: `212`
- board summaries: `212`
- fallback count: `1`

### Main Files

- [run_member003_matrix_test.sh](/Users/macbook/poolproject/scripts/run_member003_matrix_test.sh)
- [assert_member003_matrix_test.py](/Users/macbook/poolproject/scripts/assert_member003_matrix_test.py)
- [member003_matrix_test.md](/Users/macbook/poolproject/docs/technical-design/member003_matrix_test.md)

### Rerun

```bash
bash scripts/run_member003_matrix_test.sh
```

## 6. Sandbox Versus Runtime

### Sandbox-verified

- Direct member003
- Unilevel allmember scenarios
- Matrix legacy member003

### Runtime-verified

- Pool funding and cap rules
- Cashback runtime flow
- BAO cashback report/export smoke

## 7. Key Outputs Already In Repo

### Unilevel reports

- [allmember-unilevel-payouts.csv](/Users/macbook/poolproject/runtime/allmember-unilevel-payouts.csv)
- [allmember-unilevel-fallbacks.csv](/Users/macbook/poolproject/runtime/allmember-unilevel-fallbacks.csv)
- [allmember-unilevel-received-from-detail.csv](/Users/macbook/poolproject/runtime/allmember-unilevel-received-from-detail.csv)
- [allmember-unilevel-received-from-summary.csv](/Users/macbook/poolproject/runtime/allmember-unilevel-received-from-summary.csv)

### Pool reports

- [allmember-pool-cycles.csv](/Users/macbook/poolproject/runtime/allmember-pool-cycles.csv)
- [allmember-pool-payouts.csv](/Users/macbook/poolproject/runtime/allmember-pool-payouts.csv)
- [allmember-pool-beneficiary-summary.csv](/Users/macbook/poolproject/runtime/allmember-pool-beneficiary-summary.csv)
- [allmember-pool-fallbacks.csv](/Users/macbook/poolproject/runtime/allmember-pool-fallbacks.csv)

## 8. Remaining Gaps

- Unilevel is still sandbox-driven; it has not been replayed through local API/runtime end-to-end the same way pool now is
- Matrix member003 remains a sandbox/research toolkit, not a production runtime path
- Mixed multi-item product-level pool funding in one order has not been explicitly smoke-tested yet
- Admin or reporting UX for partial pool payout plus fallback on the same pool day is not yet browser-verified

## 9. Recommended Close-Out Message

If we need a short project-status summary, the most accurate version right now is:

- direct, unilevel, matrix legacy are validated in sandbox scope
- cashback and pool configurable rules are validated in local runtime scope
- pool supports default rate, custom rate, disabled mode, pool-only cap, and all-commissions cap
- all-commissions cap is now verified both by preload math and by real prior direct/uni accumulation before next-day pool close
