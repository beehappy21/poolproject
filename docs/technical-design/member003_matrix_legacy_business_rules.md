# Member003 Matrix Legacy Business Rules

## Historical Only

This file is historical research and sandbox material only.

It is not part of the active commission-calculation scope.
Active commission work in this repository is limited to:

- `direct`
- `2leg / 3leg`
- `matching`
- `pool`

Do not use this file for active implementation, runtime decisions, testing scope, or user answers unless an explicit later decision restores it.

## Purpose

This document converts the current reverse-engineered sandbox result into business rules that can be used as the working real-world reference for legacy matrix behavior.

It is intentionally separated into:

- authoritative input data
- confirmed business rules
- payable-only legacy behaviors
- still-experimental hypotheses

## Authoritative Inputs

Use these files as the source of truth for ongoing operational and validation work:

- Member structure:
  - [scripts/member003-members.json](/Users/macbook/poolproject/scripts/member003-members.json)
  - `allmember.xlsx`
- Order / auto-bill sequence:
  - [runtime/allsale-user-supplied-with-generated-auto.json](/Users/macbook/poolproject/runtime/allsale-user-supplied-with-generated-auto.json)
- Legacy commission rows:
  - [runtime/legacy-board-payouts.tsv](/Users/macbook/poolproject/runtime/legacy-board-payouts.tsv)
  - `allcom22032026.xlsx`
- Working runtime report:
  - [runtime/member003-matrix-with-generated-auto-report.json](/Users/macbook/poolproject/runtime/member003-matrix-with-generated-auto-report.json)
- Validation summary:
  - [runtime/legacy-board-payout-validation.json](/Users/macbook/poolproject/runtime/legacy-board-payout-validation.json)

## Data Priority

When sources disagree, use this priority:

1. `legacy-board-payouts.tsv` for locked validator rows
2. `allcom22032026.xlsx` for additional real legacy commission rows not present in the TSV
3. `allsale-user-supplied-with-generated-auto.json` for replayable order timing
4. `member003-members.json` plus `allmember.xlsx` for sponsor / member identity facts
5. screenshots only as supporting evidence

## Confirmed Business Rules

These rules are now treated as operationally usable.

### Matrix Shape

- The matrix is `2 x 2`
- A completed board means `6` filled points
- Board progression is:
  - `Board 1` complete -> eligible to open `Board 1 Round 2`
  - `Board 1` complete -> eligible to open `Board 2`
  - `Board 2` complete -> eligible to open `Board 3`

### Board 1 Placement

- `Board 1` uses sponsor structure as the primary routing tree
- within the same branch, ordering is resolved by earliest order date and then invoice number
- locked `Board 1` feeder benchmarks are authoritative and must not regress

Locked benchmark members:

- `TH0000008`
- `TH0000011`
- `TH0000012`
- `TH0000013`
- `TH0000016`
- `TH0000020`
- `TH0000023`
- `TH0000031`
- `TH0000032`
- `TH0000074`
- `TH0000086`
- `TH0000099`
- `TH0000128`

### Board 1 Round 2

- `Board 1 Round 2` eligibility uses the same rule for every member
- if `Board 1` reaches `6` filled points, that member becomes eligible for `Board 1 Round 2`
- the first qualifying reentry order opens `Board 1 Round 2`
- later reentry orders from the same member are duplicate reentry events unless a new round-opening rule is explicitly added

Current confirmed `Board 1 Round 2` openings:

- `TH0000008`
- `TH0000011`
- `TH0000012`
- `TH0000023`
- `TH0000013`
- `TH0000016`
- `TH0000017`
- `TH0000074`
- `TH0000086`
- `TH0000031`
- `TH0000032`
- `TH0000099`
- `TH0000128`
- `TH0000135`
- `TH0000179`
- `TH0000181`

### Board 2 Opening

- `Board 2` opens when `Board 1` is complete
- opening uses combined `Board 1` round data, not only the original primary placement list
- this means the completion check uses the effective `Board 1` state visible in the combined board view

Current confirmed `Board 2` openings:

- `TH0000008`
- `TH0000011`
- `TH0000012`
- `TH0000013`
- `TH0000016`
- `TH0000017`
- `TH0000023`
- `TH0000029`
- `TH0000031`
- `TH0000032`
- `TH0000074`
- `TH0000086`
- `TH0000099`
- `TH0000128`
- `TH0000135`
- `TH0000179`
- `TH0000181`

### Board 2 Feeder Routing

- `Board 2` feeder routing can propagate upward beyond only the nearest opened sponsor ancestor
- payable propagation can reach higher opened ancestors when that is required to match real legacy payout rows
- `TH0000012 -> TH0000001` is a confirmed normalization used to match locked `10%` legacy payout behavior

Confirmed `10%` payout matches:

- `TH0000001 <- TH0000013`
- `TH0000001 <- TH0000016`
- `TH0000013 <- TH0000016`
- `TH0000013 <- TH0000023`
- `TH0000016 <- TH0000023`
- `TH0000001 <- TH0000017`
- `TH0000013 <- TH0000017`

### Board 3 Opening

- `Board 3` opens when `Board 2` reaches `6` filled points
- no extra commission threshold is currently required in the sandbox model

Current confirmed `Board 3` openings in the working baseline:

- `TH0000013`
- `TH0000017`

## Auto-Bill Rules

- Normal orders must be replayed in date and invoice order
- queued auto bills are consumed on the first trigger event for that member
- generated missing auto bills are part of the current working baseline and should be retained for replay validation

Current generated auto-bill insertions:

- `TH0000008` after invoice `0000005`
- `TH0000011` after invoice `0000005`
- `TH0000023` after invoice `0000034`

## Payable Legacy Behaviors

These behaviors are treated as real commission behaviors, even when they do not correspond one-to-one with slot placement.

### Multi-Ancestor Board 1 Payability

- a source point may remain payable to more than one ancestor
- this payable view is separate from actual slot placement
- use payable-candidate fields for commission mapping, not for changing locked feeder boards

Confirmed payable behavior already encoded in the sandbox:

- `TH0000088` can pay both `TH0000016` and `TH0000013`
- `TH0000090` can pay both `TH0000016` and `TH0000013`

### Early Root / Company Mirror

- legacy has a special early root-side payable anomaly involving `TH0000003`
- this is a payable mirror behavior, not normal sponsor-slot placement

Current mirrored source set:

- `TH0000002`
- `TH0000003`
- `TH0000004`
- `TH0000008`

## Member Data Rules

Use member data this way:

- `member003-members.json` is the primary structured member source for scenario building
- `allmember.xlsx` is a real-world cross-check for:
  - sponsor id
  - signup date
  - member name
  - late member chains
- do not derive matrix `upline` placement from `allmember.xlsx` alone because the `อัพไลน์` column is blank in the imported file
- do not derive left/right matrix slot behavior from `allmember.xlsx` alone because `ด้าน` is `No Position` across these rows

Confirmed late sponsor chains from `allmember.xlsx`:

- `TH0000182 -> TH0000186 -> TH0000187 -> TH0000190 -> TH0000191, TH0000192`
- `TH0000184 -> TH0000196 -> TH0000197, TH0000198`
- `TH0000185 -> TH0000193 -> TH0000194, TH0000195`
- `TH0000185 -> TH0000207 -> TH0000208 -> TH0000209, TH0000210`
- `TH0000180 -> TH0000199 -> TH0000201, TH0000202`
- `TH0000180 -> TH0000200 -> TH0000203`
- `TH0000166 -> TH0000204, TH0000205`
- `TH0000168 -> TH0000188`

## Commission Data Rules

Use commission data this way:

- `legacy-board-payouts.tsv` is the locked validator set
- `allcom22032026.xlsx` is the broader real legacy commission ledger
- if a row exists in `allcom22032026.xlsx` but not in the TSV, it should be treated as a valid legacy-system clue, but not a locked validator obligation until promoted into the TSV or a formal expected dataset

Known example:

- `TH0000013` has real legacy rows on `03/12/2025`, `05/01/2026`, and `22/02/2026` visible in `allcom22032026.xlsx` that are not all present in the TSV
- these rows are currently represented by payable-hypothesis fields, not by changing the locked slot benchmark

## Validation Standard

The current working ruleset is considered stable only if all of the following stay true:

- `Board 1` feeder assertion passes
- payout validator remains `matched = 54`
- payout validator remains `unmatched = 0`
- `10%` payout rows stay fully matched
- generated-auto baseline remains the primary replay baseline

## Sandbox-Only Hypotheses

These are useful for investigation, but are not yet promoted to hard business rules:

- `legacyRoundTwoPayableCandidates`
- `legacyBoardTwoPayableCandidates`
- `TH0000013 -> B1R3`
- any rule inferred only from screenshots without support from structured data
