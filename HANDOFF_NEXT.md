# Handoff Next

Updated: 2026-03-29

## Purpose

Use this file for the next working session only.

- `DEV_HANDOFF.md` = current system state, merged work, startup/backup/ops reference
- `HANDOFF_NEXT.md` = what to do next, what to verify first, and which backup to restore only if needed

## Start Here

Preferred startup:

```bash
./Start_Local_Stack.command
```

Equivalent manual flow:

```bash
npm run dev:restart
npm run dev:check
npm run dev:check:public-auth
```

Expected result:

- local app responds on `http://127.0.0.1:3002`
- local BAO responds on `http://127.0.0.1:8001/admin/login`
- public auth bridge check passes for:
  - `https://api.blifehealthy.com/health`
  - CORS preflight from `https://wap.blifehealthy.com`
  - login `TH0000001 / a1a1a1`

## Restore Guidance

Do not restore by default.

Current local state is usable and recent work is already merged into `main`.

Restore only if:

- local data becomes corrupted
- you need to replay a bug from an older snapshot
- a destructive smoke/reset is about to happen

Current primary restore point:

- [backups/stephub-full-20260329-212850](/Users/macbook/poolproject/backups/stephub-full-20260329-212850)

Restore command:

```bash
ALLOW_DESTRUCTIVE_LOCAL_RESET=1 bash scripts/restore_local_backup.sh backups/stephub-full-20260329-212850 --yes
./Start_Local_Stack.command
```

## First Checks Next Session

1. Confirm startup completes without failure.
2. Confirm `wap.blifehealthy.com` login works with `TH0000001 / a1a1a1`.
3. Confirm BAO login works with `superadmin@blifehealthy.com / 472121`.
4. Confirm BAO `Commission Setting > Direct Bonus` save still persists.
5. Confirm BAO `Commission Setting > Matrix Bonus` still allows add/remove levels per board.
6. Confirm BAO order list still starts with:
   - `ID`
   - `Order No`
   - `Status`
   - `Total`

## Next Work Candidates

Pick from these depending on priority:

1. Regression pass on real-domain UAT flows
   - BAO login
   - BAO commission save
   - public WAP login
   - BAO order list/detail

2. Commission verification pass
   - approve one fresh order
   - confirm direct/unilevel still calculate from approved order PV
   - confirm matrix and pool flows still react to approved orders as expected

3. BAO UX cleanup
   - tighten order list readability
   - improve commission settings affordances/validation
   - reduce chances of Orchid form regressions in other screens

4. Backup/ops hardening
   - optionally add CI or a repeatable check that runs `npm run dev:check:public-auth`
   - optionally add restore docs/examples for UAT server operators

## Things To Avoid Accidentally

Avoid these unless intentionally resetting state:

- `DEV_RESET_BASELINE=1 npm run dev:up`
- `DEV_RESET_BASELINE=1 npm run dev:restart`
- destructive smoke scripts
- manual overwrites of `runtime/` without a fresh backup first

Before risky work:

```bash
npm run dev:backup
```

## Current References

Use these two files together:

- [DEV_HANDOFF.md](/Users/macbook/poolproject/DEV_HANDOFF.md)
- [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md)
