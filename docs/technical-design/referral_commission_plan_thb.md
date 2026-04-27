# Referral And Commission Plan (THB/PV)

Updated: 2026-04-27

This document is the only active business and implementation source of truth for referral and commission behavior in this repository.

Any older commission-plan document is archived in `tmp/archived_commission_plan_2026-04-27/` and must not override this file.

## 1. Scope

- This plan applies to member referral, sign-up referral links, approved-order commission triggers, runtime commission settings, and member-facing commission display.
- This plan replaces older package-based or USDT-based wording.
- This plan also replaces any earlier plan that treated `member_code` as the primary referral identity.

## 2. Referral Identity

- `memberCode` is the member identity for support, login, and back-office lookup.
- `referralCode` is the only active referral identity for member invites.
- `memberCode` and `referralCode` are different identifiers and must not be used interchangeably in new referral flows.
- New public sign-up links must use `referralCode`.

## 3. Referral Link Contract

### 3.1 Primary sign-up link

- Primary sign-up path: `/SignUp?ref=<REFERRAL_CODE>`
- The owner of the referral link becomes the sponsor.
- The sponsor linkage is locked after successful sign-up in normal flow.

### 3.2 Placement modes

The system supports 4 referral placement modes per member:

- `AUTO`
- `LEFT`
- `MIDDLE`
- `RIGHT`

Current implementation status:

- `AUTO` is active now.
- `LEFT / MIDDLE / RIGHT` are active in UI planning and profile display.
- If the business enables leg-specific sign-up payloads later, the sign-up contract must preserve the chosen placement mode from the referral link payload.

### 3.3 Backward compatibility

- Runtime may continue accepting legacy `sponsorCode` invite inputs during migration.
- New links, new UI, new docs, and new tests must use `ref`.

## 4. Commission Trigger

- Commission calculation starts only after `order approved`.
- The following are not enough to trigger commission:
  - `pending`
  - `unpaid`
  - `payment confirmed` but not yet approved

The approved order is the single runtime trigger for:

- direct commission
- team settlement
- matching commission
- pool qualification
- buyback accumulation

## 5. PV And Money Basis

This repository no longer uses the old package conversion wording:

- `35 USDT = 10 PV`
- `1 PV = 1 USDT`

This repository now uses:

- actual product price from our catalog and order data
- actual product PV from our catalog and order data

### 5.1 Order PV basis

- `orderTotalPv = sum(quantity x unitPv)` across approved order items
- Commission base uses approved order PV, not raw product price

### 5.2 Payout currency

- Payout currency is `THB`
- Commission calculation interprets `1 PV = 1 THB`

### 5.3 Sales amount vs commission base

- Product selling price remains the real THB sales amount
- Commission formulas use approved PV
- Price and PV are related business fields but are not interchangeable

## 6. Commission Rules

### 6.1 Direct

- `L1 = 50%`
- `L2 = 50%`
- Base = approved order PV

Formula:

- `directL1 = approvedOrderPv x 0.50`
- `directL2 = approvedOrderPv x 0.50`

### 6.2 Team 2-leg

- Team structure is `L / M / R`
- If exactly 2 payable legs are available, use the 2-leg rule
- Rate = `30%`
- Base = weaker payable leg PV

Formula:

- `team2Leg = min(payableLegPv) x 0.30`

### 6.3 Team 3-leg

- If 3 payable legs are available, use the 3-leg rule
- Rate = `50%`
- Base = sum of the 2 weaker payable legs

Formula:

- sort 3 payable legs from lowest to highest
- `team3LegBasePv = weakest + middle`
- `team3Leg = team3LegBasePv x 0.50`

### 6.4 Matching

- 2 matching levels
- `5%` each
- Matching must use actual team `finalPayableAmount` after cap

Formula:

- `matchingL1 = teamFinalPayableAmount x 0.05`
- `matchingL2 = teamFinalPayableAmount x 0.05`

### 6.5 Pool

- Pool basis is `100%` of approved sales PV for the pool date
- Runtime pool funding uses `poolRate = 1`
- Pool qualification requires:
  - member has own approved purchase
  - member has `3` directs
  - each direct has `1` approved purchase order

## 7. Daily Cap

- Daily cap is `5000 THB`
- The cap applies across all commission channels combined
- Cap is enforced before final payable posting

## 8. Buyback Gating

- Buyback threshold is `10000 THB`
- Threshold uses commission `finalPayableAmount` after cap
- No auto-deducted recycle purchase
- Eligible overflow is held for member-initiated repurchase
- Grace period is `3` calendar days in `Asia/Bangkok`
- If repurchase is not completed in time, release status becomes `BLOCKED_AFTER_EXPIRY`

## 9. Locked Runtime Order

All runtime verification and later automation must preserve:

- `team -> buyback side effect -> pool`

## 10. App Visibility

- `direct`: visible
- `matching`: visible
- `team`: visible
- `pool`: visible
- `unilevel`: hidden
- `matrix`: hidden
- `cashback`: hidden

## 11. Migration Policy

- New docs must cite this file.
- New referral links must use `referralCode`.
- New sign-up flow must send `ref` referral input.
- Older commission-plan docs are historical only after archiving.
- If any older file conflicts with this one, this file wins.
