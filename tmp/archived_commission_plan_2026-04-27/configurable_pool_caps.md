# Configurable Pool Caps

Updated: 2026-03-23

## Goal

Support product-level and package-level pool rules that can be configured per item instead of relying on one global pool percentage only.

## Base Rule

- if an item does not set a custom pool rule, use default pool funding at `50%` of PV
- if an item sets a custom pool percentage, use that item percentage
- pool payout must stop when the configured cap for that purchased item / cycle is reached

## Config Fields

The config is stored on both:

- `ProductDetail`
- `Package`

Fields:

- `poolRateMode`
  - `DEFAULT_50_PERCENT`
  - `CUSTOM_RATE`
  - `DISABLED`
- `poolRate`
  - used only when `poolRateMode = CUSTOM_RATE`
- `poolCapMultiple`
  - max pool-only payout multiple of the purchase base
- `commissionCapScope`
  - `POOL_ONLY`
  - `ALL_COMMISSIONS`
- `commissionCapMultiple`
  - max combined commission multiple when `commissionCapScope = ALL_COMMISSIONS`

## Recommended Interpretation

The cap base should use the purchased item monetary base, not the daily pool fund.

Suggested operational formula:

- `pool-only cap amount = purchase base x poolCapMultiple`
- `all-commission cap amount = purchase base x commissionCapMultiple`

The "purchase base" should be the final member purchase amount of the package or product line used to open that earning cycle.

## Example Mappings

### Mode 1

- receives pool up to `1.5x` of purchase
- config:
  - `poolRateMode = DEFAULT_50_PERCENT` or `CUSTOM_RATE`
  - `poolCapMultiple = 1.5`
  - `commissionCapScope = POOL_ONLY`
  - `commissionCapMultiple = 0`

### Mode 2

- pool can continue until total pool payout reaches `2.0x` of purchase
- config:
  - `poolRateMode = DEFAULT_50_PERCENT` or `CUSTOM_RATE`
  - `poolCapMultiple = 2.0`
  - `commissionCapScope = POOL_ONLY`
  - `commissionCapMultiple = 0`

### Mode 3

- stop both pool and other commissions once combined payout reaches `3.0x`
- config:
  - `poolRateMode = DEFAULT_50_PERCENT` or `CUSTOM_RATE`
  - `poolCapMultiple = 3.0`
  - `commissionCapScope = ALL_COMMISSIONS`
  - `commissionCapMultiple = 3.0`

## Important Note

This change adds the configuration layer first.

Current runtime pool flow still uses the existing global pool logic until the next implementation step wires:

- per-order / per-cycle cap tracking
- pool-only accumulation tracking
- combined commission accumulation tracking
- recipient blocking when the relevant cap is reached
