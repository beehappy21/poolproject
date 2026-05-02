# Member003 PV Table

## Historical Only

This file is historical fixture material only.

It is not part of the active commission-calculation scope.
Active commission work in this repository is limited to:

- `direct`
- `2leg / 3leg`
- `matching`
- `pool`

Do not use this file for active implementation, runtime decisions, testing scope, or user answers unless an explicit later decision restores it.

This fixture is paired with [`member003-members.json`](/Users/macbook/poolproject/scripts/member003-members.json) for commission sandbox testing.

Current test rule:

- every `memberId` in the workbook gets `700` PV

Fixture file:

- [member003-pv-table.json](/Users/macbook/poolproject/scripts/member003-pv-table.json)

Current totals:

- member count: `210`
- default PV per member: `700`
- total PV if all members are included: `147000`

Use this fixture for:

- direct commission test scenarios
- matrix commission test scenarios
- deterministic sandbox runs without touching production logic
