# Member003 Matrix Legacy Findings

## Scope

This note compares the current matrix implementation and the sandbox behavior against the legacy board expectations provided during test design.

Benchmark cases:

- `TH0000008` expected board 1: `9, 10, 11, 64, 79, 76`
- `TH0000011` expected board 1: `41, 42, 43, 44, 45, 47`
- `TH0000012` expected board 1: `13, 13, 16, 17, 16, 17`
- `TH0000013` expected board 1: `16, 17, 23, 20, 31, 32`
- `TH0000016` expected board 1: `23, 20, 39, 53, 37, 46`
- `TH0000020` expected board 1: `28, 36, 34, 75`
- `TH0000023` expected board 1: `29, 30, 53, 37, 74`
- `TH0000031` expected board 1: `33, 48, 58, 107, 130, 143`
- `TH0000032` expected board 1: `99, 105, 115, 128, 161, 161`
- `TH0000074` expected board 1: `86, 87, 85, 94, 113, 117`
- `TH0000086` expected board 1: `85, 92, 113, 127, 131, 133`
- `TH0000099` expected board 1: `115, 128, 153, 155, 172, 174`
- `TH0000128` expected board 1: `73, 108, 109, 127, 130, 132`

## Current System Rule

The current Nest module does not implement legacy-style spillover placement.

Relevant code:

- [packages/modules/matrix/src/services/matrix.service.ts](/Users/macbook/poolproject/packages/modules/matrix/src/services/matrix.service.ts)
- [packages/modules/members/src/repositories/members.repository.ts](/Users/macbook/poolproject/packages/modules/members/src/repositories/members.repository.ts)

Observed behavior:

1. `MatrixService.handleApprovedOrderMatrixSource()` asks `MembersService.getUplineCandidateIds()`
2. `findUplineCandidateIds()` walks only the `sponsorId` chain upward
3. each approved order is processed once per sponsor ancestor
4. each beneficiary board fills by `filledSlots + 1`
5. there is no legacy-style rule here for:
   - borrowing points from a lower workline board
   - routing points into a downline member like `TH0000020`
   - direct use of `uplineId` or `placementSide`
   - synthetic reentry events

In short: current system matrix is sponsor-chain accumulation, not legacy board routing.

## Why `TH0000020` Matters

`TH0000020` is the clearest proof that the legacy behavior is different from the current engine.

From the scenario derived from `member003.xlsx` and the legacy order list:

- `TH0000020` has no `sponsor` descendants with orders
- `TH0000020` has no `upline` descendants with orders

But the expected legacy board is:

- `28, 36, 34, 75`

That means the legacy algorithm must be able to route points into `TH0000020` from outside `TH0000020`'s own subtree.

Additional rule confirmed during test design:

- once a member has already opened an order and already has a point in the board, that member can continue to receive points below that node even if they did not directly sponsor anyone
- the upline can continue placing points under that member
- if those routed points complete the member board, the member can continue to the next board

This rule fits `TH0000020` directly:

- `TH0000020` has no local ordered descendants
- but legacy still expects `28, 36, 34, 75`
- so `20` must be acting as a routed spillover node that stays eligible after its own activation

This cannot be reproduced by either:

- sponsor BFS / DFS
- upline BFS / DFS
- direct sponsor first
- current sponsor-chain accumulation service

## Current Sandbox Baseline

The sandbox baseline is still different from both the current service and the legacy expectations.

Current sandbox report:

- `TH0000013`: `16, 17, 16(reentry), -, -, -`
- `TH0000016`: `20, 23, 28, 36, 88, 90`
- `TH0000020`: empty
- `TH0000023`: `29, 30, 53, 37, 74, -`

So:

- `23` is closest to a sponsor-tree pattern
- `13` and `16` diverge from simple sponsor-tree order
- `20` proves a non-local routing rule exists in the legacy system

## Practical Conclusion

To match the legacy matrix board outputs, the sandbox needs a separate legacy placement engine. Reusing the current sponsor-chain matrix service logic will not be enough.

The next reverse-engineering step should focus on this question:

"Under what rule does a point get routed into a member board even when that member has no ordered descendants in either sponsor or placement subtree?"

Current best answer:

- a board-active member can keep receiving routed points under that node from the upline workline
- therefore placement must be modeled as a queue of open board nodes, not only as subtree traversal from the beneficiary outward
- sponsor priority still comes first
- order date/time is only used after sponsor structure has decided the branch
- reuse across two matrix levels is allowed in `2x2`
- a source point can still contribute to the upper board feeder even when it is already visible in the lower board

Concrete implication:

- in the `TH0000016` case, `20` is sponsored before `23`
- later direct sponsored members `28` and `36` therefore route under `20`
- then `34` and `75` stay under `28`
