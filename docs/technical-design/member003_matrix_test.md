# Member003 Matrix Test

This sandbox uses:

- [member003-members.json](/Users/macbook/poolproject/scripts/member003-members.json)
- [member003-pv-table.json](/Users/macbook/poolproject/scripts/member003-pv-table.json)
- [build_member003_matrix_scenario.py](/Users/macbook/poolproject/scripts/build_member003_matrix_scenario.py)
- [run_member003_matrix_test.sh](/Users/macbook/poolproject/scripts/run_member003_matrix_test.sh)
- [run_member003_matrix_legacy_benchmarks.sh](/Users/macbook/poolproject/scripts/run_member003_matrix_legacy_benchmarks.sh)
- [assert_member003_matrix_test.py](/Users/macbook/poolproject/scripts/assert_member003_matrix_test.py)
- [assert_member003_matrix_legacy_feeders.py](/Users/macbook/poolproject/scripts/assert_member003_matrix_legacy_feeders.py)
- [assert_member003_matrix_legacy_benchmarks.py](/Users/macbook/poolproject/scripts/assert_member003_matrix_legacy_benchmarks.py)
- [member003-matrix-legacy-benchmarks.json](/Users/macbook/poolproject/scripts/member003-matrix-legacy-benchmarks.json)
- [matrix-sandbox.js](/Users/macbook/poolproject/scripts/matrix-sandbox.js)

Current scope:

- Boards `1 -> 3`
- board size `2 x 2`
- personal PV threshold `700`
- base payout amount `700`
- placement pays immediately
- orders come from `allsale.xlsx` filtered to approved `700 PV` rows and ordered by invoice number
- Board 2 and Board 3 open only when the member passes threshold and the previous board is completed
- when Board 1 completes and accumulated commission is greater than `700`, Board 1 next round opens immediately and `700` is deducted from accumulated commission
- when Board 1 round 2 or later completes while the upline's Board 2 round 1 is still open, the point spills into the upline Board 2 round 1

Current sandbox interpretation of your rule:

- `sponsorId` is the primary placement source
- `upline + side` is the fallback source when sponsor placement is unavailable
- repeated Board 1 rounds from downline can create new points for the upline's current round
- a Board 1 reentry point climbs the `upline` workline first: nearest open `Board 1 Round 2`, otherwise nearest open `Board 1`
- spill from a completed Board 1 reentry round can push a point into the upline's open Board 2 round 1
- a member who already opened an order and already has a point in a board does not need direct referrals to keep receiving points below that node
- the upline can continue placing new points under that member
- if that member's board becomes full from those routed points, the member can continue to the next board

Legacy routing implication:

- board growth is not limited to a member's own sponsor subtree
- once a member is already active in the board, later points may be routed under that member by the upline workline

One-shot run:

```bash
bash scripts/run_member003_matrix_test.sh
```

Legacy benchmark run:

```bash
bash scripts/run_member003_matrix_legacy_benchmarks.sh
```

Permanent benchmark policy:

- `scripts/member003-matrix-legacy-benchmarks.json` is the locked source of truth for legacy feeder expectations.
- Any change that touches matrix routing should be checked against `pnpm run test:matrix:legacy-benchmarks`.
- The primary acceptance members are `TH0000013`, `TH0000016`, `TH0000020`, and `TH0000023`.
