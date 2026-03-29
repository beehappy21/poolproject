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

- PR #65 `Add BAO admin dashboard home`
- PR #66 `Harden BAO member edit screen loading`
- PR #67 `Add local backup tooling and refresh handoff`

## Latest Functional State

- BAO now redirects to dashboard after login by default
- BAO dashboard is live on:
  - local: `http://127.0.0.1:8001/admin/main`
  - UAT: `https://bao.blifehealthy.com/admin/main`
- Member edit screen was hardened against Orchid lifecycle edge cases
- Next generated 7-digit order number is confirmed as `0000001`
- BAO order list/report includes:
  - `Member Code`
  - `Created Date`
  - `Created Time`

## Important Credentials

BAO:

- `superadmin@blifehealthy.com / 472121`
- `admin@stephub.local / 472121`

App test login:

- `TH0000001 / a1a1a1`

## Start Guide

Preferred startup flow:

```bash
npm run dev:restart
npm run dev:check
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

- [backups/stephub-full-20260329-180406](/Users/macbook/poolproject/backups/stephub-full-20260329-180406)

This backup contains:

- `poolproject.sql`
- `bao-database.sqlite`
- `runtime/`
- `README.md`
- `base-commit.txt`
- `git-status.txt`

Restore flow:

```bash
ALLOW_DESTRUCTIVE_LOCAL_RESET=1 bash scripts/restore_local_backup.sh backups/stephub-full-20260329-180406 --yes
npm run dev:restart
npm run dev:check
```

## Recommended Next Test Plan

1. Start local stack.

```bash
npm run dev:restart
npm run dev:check
```

2. BAO dashboard smoke:
   - login at `http://127.0.0.1:8001/admin/login`
   - confirm redirect to `/admin/main`
   - confirm dashboard widgets render normally

3. Member edit smoke:
   - open one member from member list
   - test `Update Member`
   - test `ล็อคบัญชี`
   - test `ใช้งาน`
   - test `รีเซ็ตรหัสผ่าน`

4. Order-flow smoke:
   - create one new BAO order
   - confirm order number is `0000001`
   - confirm order list shows `Member Code`
   - confirm report shows `Created Date` and `Created Time`
   - approve/process the order
   - verify commission flow still behaves normally

5. UAT smoke:
   - open `https://bao.blifehealthy.com/admin/login`
   - confirm login lands on dashboard
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
- [members.controller.ts](/Users/macbook/poolproject/packages/modules/members/src/controllers/members.controller.ts)
- [members.service.ts](/Users/macbook/poolproject/packages/modules/members/src/services/members.service.ts)
- [members.repository.ts](/Users/macbook/poolproject/packages/modules/members/src/repositories/members.repository.ts)

BAO admin:

- [PlatformProvider.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/PlatformProvider.php)
- [PlatformScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/PlatformScreen.php)
- [dashboard.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/platform/dashboard.blade.php)
- [MemberEditScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Member/MemberEditScreen.php)
- [platform.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/config/platform.php)

Backup tooling:

- [create_local_backup.sh](/Users/macbook/poolproject/scripts/create_local_backup.sh)
- [restore_local_backup.sh](/Users/macbook/poolproject/scripts/restore_local_backup.sh)

## Short Version

The project is currently stable on `main`, local and UAT are available, BAO now opens on dashboard by default, member edit screen lifecycle safety was hardened, and local backup tooling is in place. Start with `npm run dev:restart` and `npm run dev:check`, then validate BAO dashboard, member edit actions, one full BAO order flow, and UAT admin/app reachability. Always create a backup before risky testing with `npm run dev:backup`.
