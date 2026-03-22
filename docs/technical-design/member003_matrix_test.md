# Member003 Matrix Test

This sandbox uses:

- [member003-members.json](/Users/macbook/poolproject/scripts/member003-members.json)
- [member003-pv-table.json](/Users/macbook/poolproject/scripts/member003-pv-table.json)
- [build_member003_matrix_scenario.py](/Users/macbook/poolproject/scripts/build_member003_matrix_scenario.py)
- [run_member003_matrix_test.sh](/Users/macbook/poolproject/scripts/run_member003_matrix_test.sh)
- [assert_member003_matrix_test.py](/Users/macbook/poolproject/scripts/assert_member003_matrix_test.py)
- [matrix-sandbox.js](/Users/macbook/poolproject/scripts/matrix-sandbox.js)

Current scope:

- Board 1 only
- board size `2 x 2`
- personal PV threshold `700`
- base payout amount `700`
- placement pays immediately
- every member gets one deterministic `700 PV` order from the fixture table
- when a round is filled, the next round opens immediately and creates a new placement event upward

Current sandbox interpretation of your rule:

- `sponsorId` is the primary placement source
- `upline + side` is the fallback source when sponsor placement is unavailable
- repeated board rounds from downline can create new points for the upline's current round

One-shot run:

```bash
bash scripts/run_member003_matrix_test.sh
```
