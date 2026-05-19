# Commission Round Repurchase Spec

Updated: 2026-05-01

Depends on: [referral_commission_plan_thb.md](/Users/macbook/poolproject/docs/technical-design/referral_commission_plan_thb.md)

## Goal

Define the runtime behavior required to support:

- first-time pool qualification
- round-based commission accumulation
- `10000 THB` round completion
- `3`-day repurchase grace period
- commission hold during grace
- full commission stop after grace expiry
- round reset after qualifying self-purchase

This file is a technical implementation spec. If it conflicts with the main commission plan, the main plan wins.

## Locked Business Meaning

### 1. Initial Qualification

A member enters the first commission round only after:

- the member has at least `1` approved self-purchase order
- the member has at least `3` direct referrals
- each of those `3` direct referrals has at least `1` approved purchase order

This qualification gate is required only once for the member's first pool-enabled round.

### 2. Round Definition

One round ends when the member's accumulated commission is `>= 10000 THB`.

Count only member commission `finalPayableAmount` from:

- `DIRECT`
- `TEAM_2LEG`
- `TEAM_3LEG`
- `MATCHING_L1`
- `MATCHING_L2`
- `POOL`

Do not count:

- `Company fallback`
- discarded amount
- blocked amount that never becomes member-payable

### 3. Grace Window

After the round threshold is reached:

- new commission is still calculated for `3` Bangkok calendar days
- new commission created during the grace window must be held
- new commission must not be released as withdrawable during that window unless the member completes a qualifying repurchase flow

### 4. Qualifying Repurchase

A qualifying repurchase means:

- member self-purchase
- approved order
- `PV > 0`
- the new round cycle cap follows the repurchase PV:
  - `< 200 PV => 5000`
  - `>= 200 PV => 10000`

Direct-buyer qualification is not re-checked after the first qualified round.

### 5. Expiry

If no qualifying repurchase is completed before the grace window expires:

- stop calculating new commission after expiry
- member remains blocked from new commission accrual
- a later qualifying repurchase opens a new round

## Runtime State Model

Recommended member round states:

- `NOT_QUALIFIED`
- `ACTIVE`
- `GRACE_HELD`
- `BLOCKED_EXPIRED`

### State meaning

- `NOT_QUALIFIED`
  - member has not passed the first qualification gate
  - no pool entitlement
  - no round is active

- `ACTIVE`
  - member has an open commission round
  - new eligible commission is calculated and released normally

- `GRACE_HELD`
  - round threshold reached
  - new commission is still calculated
  - new commission release status is held pending repurchase

- `BLOCKED_EXPIRED`
  - grace window expired without qualifying repurchase
  - new commission must not be calculated

## Required State Transitions

### 1. First qualification

- `NOT_QUALIFIED -> ACTIVE`
- trigger: first qualifying self-purchase and direct-buyer gate satisfied

### 2. Round completion

- `ACTIVE -> GRACE_HELD`
- trigger: accumulated round commission becomes `>= 10000`

### 3. Repurchase in grace

- `GRACE_HELD -> ACTIVE`
- trigger: qualifying repurchase approved before `graceExpiresAt`
- effects:
  - close old round
  - create new round
  - reset accumulated amount to `0`
  - link qualifying order to new round
  - release held commission according to approved repurchase release flow

### 4. Grace expiry

- `GRACE_HELD -> BLOCKED_EXPIRED`
- trigger: current Bangkok date/time passes `graceExpiresAt` without qualifying repurchase

### 5. Late repurchase after block

- `BLOCKED_EXPIRED -> ACTIVE`
- trigger: qualifying repurchase approved
- effects:
  - open a new round
  - reset accumulated amount to `0`
  - future commission accrues again from the new round start

## Commission Engine Rules

### 1. When to calculate commission

- `ACTIVE`: calculate normally
- `GRACE_HELD`: calculate normally, but hold release
- `BLOCKED_EXPIRED`: do not calculate new commission

### 2. Hold behavior during grace

For commission created while state is `GRACE_HELD`:

- persist the ledger row
- keep `commissionStatus = HELD`
- keep `releaseStatus = HELD_PENDING_REPURCHASE`
- post to held balance only if the wallet posting flow supports held postings for this channel

### 3. Hard stop after expiry

For commission events evaluated while state is `BLOCKED_EXPIRED`:

- skip member-payable commission creation
- optionally record an audit event that the commission was blocked by expired repurchase gate
- do not convert these rows into `Company fallback` unless the business explicitly wants fallback on expiry

## Pool Rules Under This Spec

### 1. First pool gate

Use the original gate once:

- self-purchase
- `3` direct referrals
- each direct has at least `1` approved purchase

### 2. Later pool rounds

After the first qualified round:

- do not require the member to rebuild the `3 direct buyers` gate
- require only qualifying self-repurchase to open the next round

### 3. Pool entitlement timing

Pool payout logic must use the member's current round state:

- `ACTIVE`: pool payout allowed
- `GRACE_HELD`: pool payout may be calculated but must be held
- `BLOCKED_EXPIRED`: pool payout must not be calculated

## Data Model Changes

The current `UserBuybackProgress` table is close, but it is not sufficient by itself.

Recommended additions:

### 1. New `CommissionRound` table

Suggested fields:

- `id`
- `userId`
- `roundNo`
- `status` (`ACTIVE`, `GRACE_HELD`, `BLOCKED_EXPIRED`, `CLOSED`)
- `qualifiedAt`
- `thresholdReachedAt`
- `graceExpiresAt`
- `closedAt`
- `accumulatedCommissionAmount`
- `qualifyingOrderId`
- `renewalOrderId`
- `initialQualificationLocked` boolean

### 2. Link commission rows to rounds

Add `commissionRoundId` on:

- `CommissionLedger`
- optional `DailyPoolPayout`

This allows BAO and WAP to filter by round and explain why a row was held or blocked.

### 3. Keep `UserBuybackProgress` only if still useful

If retained, redefine it as a cached current-state mirror, not the primary source of truth.

## API / Service Requirements

### 1. Qualification service

Add a service that answers:

- has member ever passed first qualification?
- what is the current commission round state?
- does this member have a valid renewal purchase?

### 2. Order approval hook

On approved self-purchase:

- if member is `NOT_QUALIFIED`, evaluate first qualification gate
- if member is `GRACE_HELD` or `BLOCKED_EXPIRED`, evaluate repurchase reopening rules

### 3. Commission finalization hook

Before finalizing any member-payable commission:

- resolve current round state
- branch behavior by `ACTIVE`, `GRACE_HELD`, `BLOCKED_EXPIRED`

### 4. BAO report additions

Recommended filters:

- round number
- round state
- held-by-repurchase flag
- blocked-after-expiry flag

### 5. WAP additions

Recommended member-visible fields:

- current round amount
- threshold target `10000`
- grace expiry date/time
- repurchase needed yes/no
- last qualifying repurchase order

## Runtime Config

Recommended config contract:

- `roundCommissionThreshold = 10000`
- `roundRepurchaseAmount = 1000`
- `roundRepurchaseGraceDays = 3`
- `poolInitialDirectBuyerCount = 3`
- `recheckInitialPoolGateEveryRound = false`

## Migration Notes

### 1. Current runtime differences

Current runtime behavior differs from this target spec in at least these ways:

- current threshold check uses `> 10000` instead of `>= 10000`
- current buyback gate is controlled by `autoBuybackEnabled`
- current logic does not fully model round lifecycle as a first-class entity
- current pool logic is still tied to same-day pool cap behavior

### 2. Safe rollout plan

1. add round data model
2. backfill current active members into round state
3. switch commission finalization to round-aware gating
4. switch pool entitlement to round-aware gating
5. expose BAO and WAP round visibility
6. run scenario tests for threshold, grace, expiry, and repurchase reopen

## Acceptance Tests

### Scenario A: first qualification

- member buys once
- 3 directs buy once each
- member becomes `ACTIVE`

### Scenario B: threshold reached

- member reaches `10000`
- next commission puts member into `GRACE_HELD`

### Scenario C: grace accrual

- member receives new commission within 3 days
- row is calculated
- row is held, not withdrawable

### Scenario D: repurchase in time

- member buys `100 PV` within grace
- member returns to `ACTIVE`
- new round cycle cap is `5000`
- held rows are releasable by the approved repurchase flow

### Scenario E: grace expiry

- member does not repurchase within 3 days
- state becomes `BLOCKED_EXPIRED`
- new commission is not calculated after expiry

### Scenario F: late reopen

- blocked member buys `200 PV` later
- new round opens
- new round cycle cap is `10000`
- future commission accrues again
