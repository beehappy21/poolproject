# Matrix Runtime Reentry Spec

Updated: 2026-03-25

## Purpose

Promote the currently accepted sandbox matrix rules into the production runtime design.

This document defines:

- how matrix boards open in runtime
- how Board 1 reentry works
- how CW reentry amount is configured
- what runtime state must be persisted
- where `Firm wallet` will later hook in

## Source Rule Set

This runtime spec intentionally follows the tested sandbox direction from:

- [member003_matrix_test.md](/Users/macbook/poolproject/docs/technical-design/member003_matrix_test.md)
- [member003_matrix_legacy_routing_design.md](/Users/macbook/poolproject/docs/technical-design/member003_matrix_legacy_routing_design.md)

## Runtime Rule Summary

1. A member opens `Board 1 Round 1` only after reaching the configured personal PV threshold.
2. The personal PV threshold comes from matrix settings in BAO.
3. Board structure remains fixed at `2 x 3`, so each board has `14` fillable slots.
4. When a member board receives a placed point, matrix payout happens immediately.
5. When `Board 1 Round 1` becomes full, the member may open `Board 2 Round 1` if the member still satisfies the configured open threshold for Board 2.
6. When `Board 1 Round 1` becomes full, the system must also check whether the member has enough `CW` for reentry.
7. If `CW >= cwReentryAmount`, the system debits that member `CW` and opens `Board 1 Round 2`.
8. The same rule repeats for `Board 1 Round 2`, `Round 3`, and later rounds.
9. Board 2 and Board 3 remain `Round 1` only in the first implementation slice unless a future business rule explicitly adds higher-round behavior for those boards.
10. `Firm wallet` should be credited from the successful CW reentry debit in the later wallet integration slice.

## Configured Values

The runtime must read these values from matrix settings:

- `organizationPvRate`
  - current business meaning in BAO:
    - personal PV threshold to open Board 1
- `boardOpenPvThresholds`
  - per-board open threshold list
- `cwReentryAmount`
  - CW amount required to open the next Board 1 round

Important:

- `cwReentryAmount` is now separate from board-open PV thresholds
- the runtime must not assume these two values are equal

## Runtime Persistence Requirements

To make sandbox rules production-capable, runtime persistence must support explicit rounds.

Required concepts:

### MatrixCycle

- one member cycle groups the family of boards for that matrix activation track
- the cycle must snapshot:
  - personal PV threshold base
  - CW reentry amount used when the cycle was created

### MatrixBoard

- a board must be able to exist in more than one round
- required persisted identity:
  - `cycleId`
  - `boardNo`
  - `roundNo`

Board meaning examples:

- `Board 1 Round 1`
- `Board 1 Round 2`
- `Board 1 Round 3`
- `Board 2 Round 1`

### MatrixAccumulationEvent

Placement input must distinguish:

- real order events
- synthetic reentry events

Required metadata:

- `sourceType`
  - `ORDER`
  - `REENTRY`
- `sourceRoundNo`
  - useful when a reentry-generated point is traced back to the round that opened it

## Board Opening Rules

### Board 1 Round 1

- opens when member personal PV reaches the base threshold

### Board 2 Round 1

- opens when:
  - `Board 1 Round 1` is completed
  - member personal PV still satisfies Board 2 threshold

### Board 3 Round 1

- opens when:
  - `Board 2 Round 1` is completed
  - member personal PV still satisfies Board 3 threshold

### Board 1 Round N + 1

- opens when:
  - `Board 1 Round N` is completed
  - member `CW` is at least `cwReentryAmount`
- opening action:
  - debit `CW`
  - create `Board 1 Round N + 1`
  - enqueue a runtime reentry accumulation event

## CW Reentry Debit Rule

CW source:

- use the member withdrawable CW balance already represented by wallet withdrawable balance

Validation:

- if `withdrawableBalance < cwReentryAmount`, reentry does not open

Posting expectation:

- reentry CW debit must be auditable with its own matrix reference
- later `Firm wallet` credit will use the same successful reentry event as its source

## Firm Wallet Hook

When the runtime reentry action becomes active:

- successful CW reentry debit becomes the trigger for `Firm wallet` credit
- initial target formula:
  - `firmCreditAmount = cwReentryAmount`

This hook is deferred until the runtime reentry debit itself is live.

## First Production Slice

The first production slice should implement:

- board rounds persisted in runtime
- Board 1 reentry based on `CW`
- Board 2 and Board 3 normal open progression
- order versus reentry event distinction in matrix accumulation

The first production slice should defer:

- full legacy open-node queue parity
- spill-to-upline Board 2 behavior if it requires a larger routing rewrite
- `Firm wallet` crediting

## Why This Slice Order

This gives production a real matrix reentry backbone first:

- settings become meaningful
- CW reentry becomes enforceable
- later wallet and firm-product work can attach to a stable source event
