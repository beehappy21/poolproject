# Pool Rule Test Matrix

Updated: 2026-03-23

## Goal

Track the currently verified runtime behavior for configurable pool funding and cap rules.

## Verified Rules

| Rule | Config | Scenario | Expected | Verified Result |
| --- | --- | --- | --- | --- |
| Default pool funding | `poolRateMode = DEFAULT_50_PERCENT` | Approved order `400 PV` on a pool day | Pool fund = `200` | Passed |
| Custom pool funding | `poolRateMode = CUSTOM_RATE`, `poolRate = 0.25` | Approved order `400 PV` on a pool day | Pool fund = `100` | Passed |
| Disabled pool funding | `poolRateMode = DISABLED` | Approved order `400 PV` on a pool day | Pool fund = `0`, no payout rows | Passed |
| Pool-only cap | `poolCapMultiple = 1.5`, `commissionCapScope = POOL_ONLY` | Day 1 payout `100`, day 2 requested payout `100` on purchase base `100` | Day 2 pays only remaining `50`, excess `50` per recipient falls back | Passed |
| All-commissions cap | `poolCapMultiple = 3.0`, `commissionCapScope = ALL_COMMISSIONS`, `commissionCapMultiple = 3.0` | Preload `earnedTotalInCycle = 250`, then request pool payout `100` on purchase base `100` | Pays only remaining `50`, excess `50` per recipient falls back | Passed |
| All-commissions cap full flow | `poolCapMultiple = 3.0`, `commissionCapScope = ALL_COMMISSIONS`, `commissionCapMultiple = 3.0` | First run `process-approved` to create real direct/uni accumulation, then close next-day pool | Cycle totals reach `300`, next-day pool pays `50` each and falls back `100` | Passed |

## Smoke Commands

- Pool-only partial-cap smoke:
  - `npm run smoke:pool:cap`
- Configurable pool rules smoke:
  - `npm run smoke:pool:rules`
- Run both pool smoke suites:
  - `npm run smoke:pool:all`
- Run all-commissions full-flow smoke:
  - `npm run smoke:pool:all-comm-e2e`

## What Each Smoke Covers

### `smoke:pool:cap`

Verifies:

- default `50%` pool funding
- `POOL_ONLY` cap behavior
- partial payout up to the remaining cap
- fallback only for the excess amount

Latest verified behavior:

- day 1: `400 PV -> pool fund 200 -> 2 recipients get 100 each`
- day 2: `400 PV -> pool fund 200 -> 2 recipients get 50 each`
- day 2 excess fallback: `100`

### `smoke:pool:rules`

Verifies:

- `CUSTOM_RATE`
- `DISABLED`
- `ALL_COMMISSIONS`

Latest verified behavior:

- custom rate `25%`: `400 PV -> pool fund 100 -> 2 recipients get 50 each`
- disabled: `400 PV -> pool fund 0 -> no payout rows`
- all commissions: with preloaded `earnedTotalInCycle = 250`, `400 PV -> pool fund 200 -> requested 100 each -> actual 50 each -> fallback 100`

## Important Note

There are now two all-commissions checks:

- a preload-based smoke that isolates cap math quickly
- a full-flow smoke that builds the accumulated total from real `process-approved` direct/uni commissions before the next-day pool close

## Recommended Next Checks

- add a full end-to-end scenario where earlier direct or uni commissions populate the same cycle before the pool close
- verify mixed package or mixed item orders when more than one package/product rule contributes to the same pool day
- verify how reporting or admin UI should display partial payout plus fallback on the same pool day

## Full-Flow All-Commissions Check

There is now also a dedicated full-flow smoke:

- `npm run smoke:pool:all-comm-e2e`

This check verifies a stronger path:

- direct and uni commissions are created through `POST /orders/:orderId/process-approved`
- `earnedTotalInCycle` is updated from the approved commission flow
- next-day pool close uses the accumulated cycle total for `ALL_COMMISSIONS` cap enforcement
