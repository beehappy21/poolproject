# Member003 Matrix Legacy Routing Design

## Goal

Design a sandbox-only matrix routing engine that can reproduce the legacy board expectations without changing production code.

This design is intentionally separate from:

- the current Nest matrix service
- the current sponsor-first sandbox baseline

## Core Observation

Legacy placement is not just:

- sponsor traversal
- placement traversal
- direct subtree fill

Legacy placement behaves more like a routed queue of open board nodes inside a workline.

## Confirmed Rules

1. orders are processed by:
   - invoice date first
   - invoice number second
   - order events before reentry events

1a. sponsor relationship is evaluated before order-time ordering

- order time is used to rank members inside the same sponsor branch
- it is not allowed to ignore sponsor structure and sort the whole workline globally
- example from `TH0000016`:
  - `20` is sponsored before `23`
  - `28` and `36` are later direct sponsored members of `16`
  - therefore `28` and `36` fall under the earlier sponsored node `20`
  - then `34` and `75` fall under `28`

1b. points can be consumed across two matrix levels in a `2x2` board

- the same source member can appear in the feeder logic of both the immediate parent board and the upper board
- a point used in `TH0000023` does not automatically disappear from `TH0000016`
- this is expected because the system pays upward across `2` levels for matrix `2x2`
- so reuse across adjacent board-feeder levels is valid, not a bug

2. board opens when the member's personal purchase reaches threshold

3. when a point is placed in a board, payout happens immediately

4. a member who already opened an order and already has a point in a board can keep receiving points below that node

5. that member does not need direct referrals of their own to continue receiving routed points

6. when that member board becomes full from routed points, that member can continue to the next board

7. when Board 1 completes and accumulated commission is greater than `700`, Board 1 next round opens immediately and `700` is deducted

8. if Board 1 round 2 or later completes and the relevant upline Board 2 round 1 is still open, the point can spill into that board

## Design Direction

The next sandbox engine should model three separate concepts.

### 1. Qualification

Each approved `700 PV` order updates:

- `personalPv`
- board eligibility
- open rounds

Qualification answers:

- has this member opened Board 1 yet
- which boards are open
- which rounds are open

### 2. Routed Placement Queue

Each qualifying order creates a placement token.

That token is not immediately bound to:

- the source member's sponsor
- or the source member's placement parent

Instead it enters a routing step that chooses the best currently-open board node.

### 3. Open Node Queue

Each open board round exposes fillable nodes.

A node becomes eligible to receive more routed points when:

- the member already has a point in that board
- the round is still open
- the node still has empty descendants or later empty slots

This is the main missing concept in the current sandbox.

## Proposed Engine Model

### A. Entities

For sandbox routing, keep these runtime structures:

1. `MemberState`
- `personalPv`
- `commissionBalance`
- `openedBoards`
- `activationOrder`

2. `BoardRoundState`
- `memberId`
- `boardNo`
- `roundNo`
- `status`
- `filledSlots`
- `slotLevels`
- `placements`

3. `PlacementToken`
- `sourceMemberId`
- `sourceOrderId`
- `sourceOrderDate`
- `eventType`
- `boardNo`
- `roundNo`

4. `OpenNode`
- `beneficiaryId`
- `boardNo`
- `roundNo`
- `slotIndex`
- `path`
- `openedAtSequence`
- `lastFilledAtSequence`

## Routing Rule

Given one `PlacementToken`, route it by these stages.

### Stage 1. Build candidate beneficiaries

Build a ranked list of possible beneficiary boards:

1. direct sponsor chain beneficiaries with open relevant board
2. workline ancestors with open relevant board
3. already-activated routed nodes under those ancestors

Important:

- this stage must allow a token to route into a member like `TH0000020`
- therefore the candidate list cannot be limited to the source member subtree

### Stage 2. Filter to eligible open nodes

A candidate board node is eligible only if:

- the board round is open
- the node already exists in the route tree or is the board root
- the branch still has capacity

### Stage 3. Choose destination

Choose the first candidate by legacy priority:

1. unfinished earlier-opened node in the current workline
2. left-to-right slot order
3. earlier activated node before later activated node
4. real order tokens before synthetic reentry tokens

### Stage 4. Place and expand

When a token lands:

- record placement
- pay immediately
- update the beneficiary round
- if the placed member now becomes a routable node in that board, register that node in the queue

This is the key that allows:

- `20` to receive `28, 36, 34, 75`
- even though `20` has no ordered descendants of its own

## Why This Fits The Benchmarks

### `TH0000023`

`23` still looks close to sponsor-tree fill because its own routed subtree is already aligned with the open node queue.

Expected:

- `29, 30, 53, 37, 74`

### `TH0000020`

`20` is the strongest proof for the open-node model.

Expected:

- `28, 36, 34, 75`

Interpretation:

- `20` became active in the board
- later sponsor branches of `16` were routed under the earlier sponsored active node `20`
- within `20`'s board, sponsor structure still matters:
  - `28` and `36` are first-level points
  - `34` and `75` are routed under `28`
  - this is decided by sponsor relationship first, then order time inside that branch

### `TH0000016`

Expected:

- `23, 20, 39, 53, 37, 46`

Interpretation:

- after `23` and `20` become active child nodes,
- later routed points go deeper into the still-open active branches
- they may still reuse feeder points that also appear in the lower board because matrix pays upward across two levels

### `TH0000013`

Expected:

- `16, 17, 23, 20, 31, 32`

Interpretation:

- `13` fills from earlier active workline nodes before later reentry
- `16(reentry)` must be deferred behind real downstream orders

## Implementation Plan

### Phase 1. Keep current baseline intact

Do not replace `matrix-sandbox.js` immediately.

Create a separate experimental engine first, for example:

- `scripts/matrix-sandbox-legacy.js`

### Phase 2. Implement only Board 1 routing

First milestone:

- ignore Board 2 and Board 3 routing
- ignore spill to upper boards
- ignore reentry placement

Only solve:

- `13`
- `16`
- `20`
- `23`

for Board 1 Round 1

### Phase 3. Add deferred reentry

Once Board 1 Round 1 benchmarks match:

- introduce reentry queue
- process after real order tokens

### Phase 4. Add Board 2 and Board 3 transitions

Only after Board 1 routing is stable:

- open next boards
- apply spill and carry rules

## Acceptance Criteria

The legacy routing engine is good enough for next stage when:

1. `TH0000013` matches `16, 17, 23, 20, 31, 32`
2. `TH0000016` matches `23, 20, 39, 53, 37, 46`
3. `TH0000020` matches `28, 36, 34, 75, -, -`
4. `TH0000023` matches `29, 30, 53, 37, 74, -`
5. `13` completes Board 1 on `21/11/2568`
6. no synthetic reentry token appears before earlier real order tokens

## Recommendation

Do not keep stretching the current sponsor-first sandbox.

The safer path is:

1. preserve current sandbox as baseline
2. build `matrix-sandbox-legacy.js` as a separate experimental engine
3. use the benchmark assertions to compare both engines side by side
