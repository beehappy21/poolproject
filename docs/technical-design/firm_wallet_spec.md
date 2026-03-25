# Firm Wallet Spec

Updated: 2026-03-25

## Purpose

Define the runtime business rules and implementation boundaries for a new `Firm wallet`.

This document is intended to answer:

- how `Firm wallet` is earned
- where `Firm wallet` can be spent
- what BAO product configuration is required
- how `Firm wallet` interacts with `SW`, `DCW`, and matrix reentry
- what validation rules must block invalid usage

## Summary

`Firm wallet` is a non-cash, non-withdrawable member wallet bucket created from matrix reentry spend.

Core rule:

- every time the runtime matrix flow charges `SW` for a reentry event, the same member receives `Firm wallet` credit `1:1`

Main constraints:

- `Firm wallet` can only be used on BAO-enabled products in the `firm` category
- the product must pass the cost guard:
  - `costPriceUsdt <= memberPriceUsdt * 0.30`
- `Firm wallet` cannot be converted to `SW`
- `Firm wallet` cannot be withdrawn as cash
- `Firm wallet` to `DCW` behavior is configured per product, not as one global wallet-rate setting

## Business Rules

## 1. Earning Firm Wallet

Source of funds:

- matrix reentry only

Trigger:

- when a matrix reentry event debits `SW` from a member, the same completed runtime action must credit `Firm wallet` to that member

Credit formula:

- `firmCreditAmount = reentrySwDebitAmount`

Posting expectation:

- the reentry debit and `Firm wallet` credit should be created in the same transactional flow when possible
- if the reentry debit does not complete, `Firm wallet` credit must not be created

Non-goals:

- no manual cash withdrawal path
- no `CW -> Firm`
- no `SW -> Firm` free conversion outside reentry
- no admin top-up flow in the first implementation slice unless explicitly requested later

## 2. Spending Firm Wallet

`Firm wallet` can only be used to redeem products that satisfy all of the following:

- product belongs to category `firm`
- product has firm redemption enabled in BAO
- product cost guard passes:
  - `costPriceUsdt <= memberPriceUsdt * 0.30`

Spend formula:

- member spends `Firm wallet` equal to the product `memberPriceUsdt`
- example:
  - if `memberPriceUsdt = 100`
  - member must spend `Firm wallet = 100`

Balance rule:

- redemption must fail if the member `firmBalance` is less than the required spend amount

Order-scope rule:

- first implementation should only allow `Firm wallet` redemption on firm-eligible items
- mixed cart behavior should be treated as out of scope unless specifically designed later
- safest first slice:
  - one firm redemption order contains only firm-eligible items

## 3. Cost Guard

The product cost guard is mandatory.

Validation formula:

- a product is firm-eligible only when:
  - `costPriceUsdt <= memberPriceUsdt * 0.30`

Blocking behavior:

- if the product cost exceeds `30%` of member price, BAO may still keep the product in the catalog, but the system must block `Firm wallet` redemption
- BAO should see a clear enabled/disabled state or validation message for this rule

Recommended runtime treatment:

- validate both on save and on spend
- save-time validation prevents obvious misconfiguration
- spend-time validation protects old records and stale product data

## 4. Firm Category

BAO should have a dedicated product category:

- `firm`

Purpose:

- groups products that are intended for `Firm wallet` redemption
- gives the app a clear catalog entry point for firm-only browsing

Category note:

- category membership alone is not enough to allow redemption
- product-level firm enablement and cost-guard validation still apply

## 5. Product-Level Firm Settings

Each product should support firm-specific configuration in BAO.

Required product fields:

- `firmEnabled`
  - boolean
  - controls whether the product can be redeemed with `Firm wallet`
- `firmDcwRewardAmount`
  - decimal string, default `0`
  - how much `DCW` the member receives after redeeming this firm product

Recommended derived field or runtime preview:

- `firmCostGuardPassed`
  - derived from `costPriceUsdt` and `memberPriceUsdt`

Optional future field if business later needs partial redemption:

- `firmSpendAmount`
  - for now, do not store this separately because current rule is:
    - `firm spend = memberPriceUsdt`

Current design decision:

- `Firm -> DCW` is configured per product by `firmDcwRewardAmount`
- do not introduce a global `firmToDcwRate` setting in the first slice

## 6. Firm To DCW Behavior

When a member redeems a valid firm product:

- debit `Firm wallet` by the product `memberPriceUsdt`
- credit `DCW` by the product `firmDcwRewardAmount`

Examples:

- product A
  - member price `100`
  - cost `20`
  - `firmEnabled = true`
  - `firmDcwRewardAmount = 0`
  - result:
    - spend `Firm = 100`
    - receive product only
- product B
  - member price `100`
  - cost `20`
  - `firmEnabled = true`
  - `firmDcwRewardAmount = 60`
  - result:
    - spend `Firm = 100`
    - receive product
    - receive `DCW = 60`

Important:

- this is not a wallet conversion screen in the first slice
- the conversion happens through firm-product redemption

## 7. Prohibited Flows

The following actions must be blocked:

- `Firm -> SW`
- `Firm -> cash withdrawal`
- using `Firm wallet` on non-firm products
- using `Firm wallet` on products that fail the `30%` cost guard
- using `Firm wallet` when member balance is insufficient

Not decided yet:

- `Firm -> transfer to downline`
- admin manual `Firm` adjustment UI
- refund behavior for cancelled firm redemption orders

These should remain unsupported until explicitly designed.

## Runtime Design Impact

## 1. Wallet Model

The wallet aggregate should add:

- `firmBalance`

Expected transaction bucket:

- `FIRM`

Expected transaction types:

- `FIRM_REENTRY_CREDIT`
- `FIRM_PRODUCT_DEBIT`
- `FIRM_DCW_CREDIT`

Names can be adjusted to fit current enum conventions, but the ledger must distinguish:

- firm earned from reentry
- firm spent on product redemption
- dcw credited because of firm redemption

## 2. Matrix Integration

The runtime matrix flow should expose or reuse the exact reentry debit amount.

Implementation target:

- hook the point where matrix reentry currently charges `SW`
- after successful `SW` debit, post matching `Firm wallet` credit to the same member

Important:

- if matrix reentry currently exists only in sandbox or partial runtime behavior, the production hook point must be confirmed before coding

## 3. Product / Catalog Integration

Product data already includes:

- `costPriceUsdt`
- `memberPriceUsdt`
- existing `DCW` reward-related fields

The new firm logic should extend product configuration rather than replacing current `DCW` fields.

Preferred additions:

- `firmEnabled`
- `firmDcwRewardAmount`
- category support for `firm`

## 4. Order Flow

Firm redemption should be treated as its own validated order path.

Minimum first-slice behavior:

- select a firm-enabled product
- validate category and cost guard
- validate member `firmBalance`
- debit `firmBalance`
- create order / redemption record
- credit `DCW` if configured

Recommended guard:

- do not reuse current `SW` or `DCW` spend path blindly
- create explicit firm-redemption validation so reports and audit trails stay clear

## 5. App / BAO UI

Member-facing app should eventually show:

- `Firm wallet` balance
- firm redemption catalog entry point
- transaction history for firm credits and spends

BAO should support:

- category `firm`
- product toggle for `firmEnabled`
- display of current cost guard result
- editable `firmDcwRewardAmount`

## Validation Checklist

The system should reject:

- firm redemption when `firmEnabled = false`
- firm redemption when category is not `firm`
- firm redemption when `costPriceUsdt > memberPriceUsdt * 0.30`
- firm redemption when member `firmBalance` is insufficient
- any attempt to convert `Firm` into `SW`
- any attempt to withdraw `Firm` as cash

The system should allow:

- matrix reentry `SW` debit followed by `Firm` credit `1:1`
- firm redemption on valid products
- `DCW` credit on firm redemption when configured on the product

## Open Questions

The following still need explicit confirmation before full implementation:

- should one firm order allow quantity > `1`, or should the first slice force quantity `1`
- if a firm redemption order is cancelled, should `Firm wallet` and `DCW` both reverse automatically
- should admin users be able to manually add or deduct `Firm wallet`
- should firm products be hidden from normal storefront browsing and appear only in a dedicated firm screen

## Recommended Implementation Slices

## Slice 1

- add spec and naming
- add wallet schema support for `firmBalance`
- add ledger types for firm credit/debit

## Slice 2

- hook runtime matrix reentry so `SW` reentry spend creates `Firm` credit `1:1`

## Slice 3

- add BAO product fields:
  - `firmEnabled`
  - `firmDcwRewardAmount`
  - category `firm`
  - cost-guard preview

## Slice 4

- add firm redemption order flow
- debit `Firm`
- credit product-linked `DCW`

## Slice 5

- add member-facing app UI and BAO reporting polish
