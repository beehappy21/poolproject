# Developer Handoff

Updated: 2026-03-29

## Project Overview

This project has 3 main surfaces:

- `Stephub app` for member-facing flows
- `API` for backend/business logic
- `BAO admin` for admin operations

Current local URLs:

- App: `http://127.0.0.1:3002`
- API: `http://127.0.0.1:3000/health`
- BAO: `http://127.0.0.1:8001/admin/login`

Current UAT URLs:

- App: `https://wap.blifehealthy.com`
- API: `https://api.blifehealthy.com/health`
- BAO: `https://bao.blifehealthy.com/admin/login`

## Current Repo State

- Branch: `main`
- Local `main` is synced with `origin/main`
- Worktree is clean
- `backups/` is hidden from `git status` locally via `.git/info/exclude`

Latest merged PRs relevant to the current handoff:

- PR #69 `Fix BAO commission settings save flow`
- PR #70 `Add UAT backup and restore scripts`
- PR #71 `Prevent public auth drift on restart`
- PR #72 `Reorder BAO order list columns`

## Latest Functional State

- BAO commission settings save flow is working again
- Orchid commission pages no longer fall into raw JSON responses or nested-form save failures
- Direct/Unilevel save no longer silently turn visibility flags off when the form omits them
- Matrix level controls are editable per board from BAO
- UAT/public member login from `https://wap.blifehealthy.com` is working again
- Local restart now rebuilds API `dist` before boot so public CORS/runtime config does not drift behind source changes
- Local startup now includes a public auth smoke check for:
  - `https://api.blifehealthy.com/health`
  - CORS preflight from `https://wap.blifehealthy.com`
  - real login to `/auth/login`
- BAO order list column order now starts as:
  - `ID`
  - `Order No`
  - `Status`
  - `Total`

## Important Credentials

BAO:

- `superadmin@blifehealthy.com / 472121`
- `admin@stephub.local / 472121`

App test login:

- `TH0000001 / a1a1a1`

## Start Guide

Preferred startup flow:

```bash
./Start_Local_Stack.command
```

Equivalent manual flow:

```bash
npm run dev:restart
npm run dev:check
npm run dev:check:public-auth
```

macOS helpers:

- [Start_Local_Stack.command](/Users/macbook/poolproject/Start_Local_Stack.command)
- [Start_BlLifeHealthy_UAT.command](/Users/macbook/poolproject/Start_BlLifeHealthy_UAT.command)

## Backup And Restore

Create a fresh backup before risky work:

```bash
npm run dev:backup
```

Latest fresh backup:

- [backups/stephub-full-20260329-212850](/Users/macbook/poolproject/backups/stephub-full-20260329-212850)

This backup contains:

- `poolproject.sql`
- `bao-database.sqlite`
- `runtime/`
- `README.md`
- `base-commit.txt`
- `git-status.txt`

Restore flow:

```bash
ALLOW_DESTRUCTIVE_LOCAL_RESET=1 bash scripts/restore_local_backup.sh backups/stephub-full-20260329-212850 --yes
npm run dev:restart
npm run dev:check
```

UAT backup/restore helpers are now available:

```bash
bash scripts/create_uat_backup.sh
ALLOW_DESTRUCTIVE_UAT_RESTORE=1 bash scripts/restore_uat_backup.sh <backup-dir> --yes
```

## Recommended Next Test Plan

1. Start local stack.

```bash
./Start_Local_Stack.command
```

2. BAO commission smoke:
   - login at `http://127.0.0.1:8001/admin/login`
   - open `Commission Setting > Direct Bonus`
   - change one rate and save
   - confirm value persists after refresh

3. Matrix settings smoke:
   - open `Commission Setting > Matrix Bonus`
   - confirm each board has its own `+ Add level / - Remove level`
   - save and verify values persist

4. Public auth smoke:
   - open `https://wap.blifehealthy.com`
   - login with `TH0000001 / a1a1a1`
   - confirm sign-in succeeds without CORS/API reachability error

5. Order-flow smoke:
   - create one new BAO order
   - confirm order list starts with `ID / Order No / Status / Total`
   - approve/process the order
   - verify commission flow still behaves normally

6. UAT smoke:
   - open `https://bao.blifehealthy.com/admin/login`
   - open commission settings pages and save one direct setting
   - open `https://wap.blifehealthy.com`
   - confirm public app/API/BAO routes respond normally

## Operational Warnings

Avoid destructive flows unless explicitly intended:

- `DEV_RESET_BASELINE=1 npm run dev:up`
- `DEV_RESET_BASELINE=1 npm run dev:restart`
- `npm run smoke:local`
- `npm run smoke:wallet:mixed`
- `npm run smoke:wallet:dcw`
- `npm run smoke:pool:cap`
- `npm run smoke:pool:rules`
- `npm run smoke:pool:all-comm-e2e`

## Important Files

Core docs:

- [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md)
- [NEXT_SESSION.md](/Users/macbook/poolproject/NEXT_SESSION.md)
- [REAL_DOMAIN_TEST_CHECKLIST.md](/Users/macbook/poolproject/docs/uat/REAL_DOMAIN_TEST_CHECKLIST.md)

API/backend:

- [main.ts](/Users/macbook/poolproject/apps/api/src/main.ts)
- [api.config.ts](/Users/macbook/poolproject/apps/api/src/config/api.config.ts)
- [admin-settings.controller.ts](/Users/macbook/poolproject/apps/api/src/admin-settings.controller.ts)
- [dev-restart.sh](/Users/macbook/poolproject/scripts/dev-restart.sh)
- [check_public_auth_bridge.sh](/Users/macbook/poolproject/scripts/check_public_auth_bridge.sh)
- [members.controller.ts](/Users/macbook/poolproject/packages/modules/members/src/controllers/members.controller.ts)
- [members.service.ts](/Users/macbook/poolproject/packages/modules/members/src/services/members.service.ts)
- [members.repository.ts](/Users/macbook/poolproject/packages/modules/members/src/repositories/members.repository.ts)

BAO admin:

- [PlatformProvider.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/PlatformProvider.php)
- [CommissionSettingsController.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/CommissionSettingsController.php)
- [CommissionSettingsScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionSettingsScreen.php)
- [settings.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/settings.blade.php)
- [no-form-screen.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/orchid/no-form-screen.blade.php)
- [OrderListScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Order/OrderListScreen.php)
- [platform.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/config/platform.php)

Backup tooling:

- [create_local_backup.sh](/Users/macbook/poolproject/scripts/create_local_backup.sh)
- [restore_local_backup.sh](/Users/macbook/poolproject/scripts/restore_local_backup.sh)
- [create_uat_backup.sh](/Users/macbook/poolproject/scripts/create_uat_backup.sh)
- [restore_uat_backup.sh](/Users/macbook/poolproject/scripts/restore_uat_backup.sh)

## Short Version

The project is stable on `main` and the latest critical fixes are already merged: BAO commission settings save flow is repaired, matrix level controls are editable per board, UAT backup/restore helpers exist, public `wap -> api` login drift is guarded by rebuild + smoke checks, and BAO order list columns were reordered. Start with [Start_Local_Stack.command](/Users/macbook/poolproject/Start_Local_Stack.command), keep [backups/stephub-full-20260329-212850](/Users/macbook/poolproject/backups/stephub-full-20260329-212850) as the current restore point, and validate commission save, public login, and one end-to-end order approval flow before any next risky change.
