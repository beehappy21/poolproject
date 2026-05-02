# Pool Rule Test Matrix

Updated: 2026-05-02

## Goal

Track the currently expected runtime behavior for the latest daily pool rules.

## Verified Rules

| Rule | Config | Scenario | Expected |
| --- | --- | --- | --- |
| Full-PV pool funding | pool-enabled item | Approved order `400 PV` on a pool day | Pool fund = `400` |
| Disabled item funding | `poolRateMode = DISABLED` | Approved order `400 PV` on a pool day | Pool fund = `0`, no payout rows |
| Receiving-cycle payout cap | `poolMaxEntitlementShareRate = 0.03` | Recipient cycle `purchaseBase = 1000`, raw share `200` | Actual payout capped at `30` |
| All-commissions cycle cap | `commissionCapScope = ALL_COMMISSIONS`, `commissionCapMultiple = 3.0` | Existing earned total leaves only `50` room | Pool pays only remaining `50`, excess falls back |

## Smoke Commands

- Pool funding and disabled-item smoke:
  - `npm run smoke:pool:rules`
- Pool partial-cap smoke:
  - `npm run smoke:pool:cap`
- Run both pool smoke suites:
  - `npm run smoke:pool:all`

## What Each Smoke Covers

### `smoke:pool:rules`

Verifies:

- pool-enabled funding uses full approved PV
- disabled item funding contributes `0`
- rerun idempotency for repeated pool close on the same date

### `smoke:pool:cap`

Verifies:

- payout is limited by cycle-level room and cap
- excess amount falls back only for the blocked portion

## Removed Legacy Rules

The following legacy funding rules are no longer active runtime behavior:

- `DEFAULT_50_PERCENT`
- `CUSTOM_RATE`
- same-day real-paid pool payout cap

If an older script, report, or BAO form still refers to those rules, treat it as stale until updated.
