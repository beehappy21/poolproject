# Member003 PV Table

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
