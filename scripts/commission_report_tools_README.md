# Commission Report Server Tools

These scripts mirror the three baseline-test actions shown on the BAO `commission report` page:

- `commission_report_process_next_member.sh`
- `commission_report_finalize_current_day.sh`
- `commission_report_reset_baseline_runtime.sh`
- `commission_report_tools_uninstall.sh`

They run as standalone host-side tools and follow the same baseline flow used by the page:

- source tag: `commission-test-baseline`
- internal API path: `/internal/bao/orders/*` and `/internal/bao/commissions/end-of-day/*`
- queue order: signup date, then member code, with sponsor-before-downline resequencing

Default runtime settings:

- `POSTGRES_DOCKER_CONTAINER=poolproject-uat-postgres-1`
- `POSTGRES_DB=poolproject`
- `POSTGRES_USER=postgres`
- `API_BASE_URL=http://127.0.0.1:3000`
- `API_ENV_PATH=deploy/compose/api.env`

Example usage on the server:

```bash
node scripts/commission_report_runtime_tools.mjs status
bash scripts/commission_report_process_next_member.sh
bash scripts/commission_report_finalize_current_day.sh
bash scripts/commission_report_reset_baseline_runtime.sh
```

Important notes:

- These scripts follow the existing `commission report` baseline flow.
- `process next member` works on the next pending baseline member in queue order, not an arbitrary member code.
- `reset baseline runtime` only clears baseline-test data guarded by the existing source tag and safety checks.
- This is intended as a temporary server-side test toolset. When testing is complete, remove it with:

```bash
bash scripts/commission_report_tools_uninstall.sh
```
