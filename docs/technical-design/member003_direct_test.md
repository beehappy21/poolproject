# Member003 Direct Test

This direct commission test uses:

- [member003-members.json](/Users/macbook/poolproject/scripts/member003-members.json)
- [member003-pv-table.json](/Users/macbook/poolproject/scripts/member003-pv-table.json)
- [build_member003_direct_scenario.py](/Users/macbook/poolproject/scripts/build_member003_direct_scenario.py)
- [run_member003_direct_test.sh](/Users/macbook/poolproject/scripts/run_member003_direct_test.sh)
- [commission-sandbox.js](/Users/macbook/poolproject/scripts/commission-sandbox.js)

Current direct-only scenario rules:

- every member in `member003.xlsx` is included
- every member is marked `active: true`
- every member places one order
- every order uses `700` PV
- direct pays `3` levels
- each direct level uses rate `0.05`
- unilevel is disabled
- pool is disabled
- `TH0000001` is the root starter code and remains without a sponsor
- `TH0000120` and `TH0000121` are forced to use `TH0000001` as sponsor for this test

Expected high-level result:

- each payable direct level should pay `35`
- only `TH0000001` should fall back with `reasonCode: no_active_sponsor`

Known workbook rows without sponsor before test overrides:

- `TH0000001`
- `TH0000120`
- `TH0000121`

Current fixture note:

- normal test runs use `member003-members.json`
- `member003.xlsx` is only needed if you want to regenerate the member fixture

One-shot run:

```bash
bash scripts/run_member003_direct_test.sh
```
