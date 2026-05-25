# UAT Post-Deploy BAO Settings Check

Date: 2026-05-12
Environment: UAT server `nc-user@202.94.169.245`

## Scope

Checked after the narrow deploy of:

- `runtime/commission-settings.json`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/PoolprojectSettingsStore.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/CommissionSettingsController.php`

Server work already completed before this check:

- copied host `commission-settings.json` into API runtime at `/app/runtime/commission-settings.json`
- rebuilt and recreated only `bao`
- restarted `api` and `worker`
- did not rebuild `api/worker` images

## What Was Verified

1. `docker compose ps` in `deploy/compose` showed:
   - `poolproject-uat-bao-1` healthy
   - `poolproject-uat-api-1` healthy
   - `poolproject-uat-worker-1` up
2. BAO admin login worked with the seeded superadmin account.
3. `GET http://127.0.0.1:18001/admin/commission/report` returned the commission report page successfully after login.
4. API runtime still contained:
   - `dailyCommissionCapAmount = "3000"`
5. `PoolprojectSettingsStore::readCommissionSettings()` inside BAO resolved `dailyCommissionCapAmount` as `3000`.

## Critical Finding

BAO save flow is **not writing to the same runtime location as API**.

Observed runtime roots:

- BAO `PoolprojectSettingsStore::runtimeRoot()` resolved to `/var/www/runtime`
- API runtime file in use is `/app/runtime/commission-settings.json`

There is no shared runtime mount for BAO in `deploy/compose/docker-compose.yml`. The `bao` service mounts only:

- `bao-database:/var/www/html/backend/database`
- `bao-storage:/var/www/html/backend/storage`

It does **not** mount `/app/runtime` or the host `runtime/` directory.

## Save Flow Probe

To verify the live save path, a logged-in POST was sent to:

- `POST /admin/commission/save`

Payload used:

- `dailyCommissionCapAmount=3000`
- `redirectSection=settings`

Result:

- request succeeded with `302` redirect back to `/admin/commission/report`
- BAO immediately created `/var/www/runtime/commission-settings.json`
- API runtime file at `/app/runtime/commission-settings.json` remained unchanged

This proves BAO writes to an isolated container-local runtime path, not the API runtime currently used by production services.

## Cleanup Performed

Because the probe created a BAO-local runtime file that could mask future checks, the temporary file was removed right away:

- removed `/var/www/runtime/commission-settings.json`
- removed empty `/var/www/runtime`

Final state after cleanup:

- BAO local probe file no longer exists
- API runtime still has `dailyCommissionCapAmount = "3000"`

## Impact

Current deploy is stable for the already-copied API runtime value, but **future edits from BAO settings cannot be trusted to update the live API runtime** until runtime paths are unified.

In practice:

- current live value remains correct at `3000`
- BAO save can appear successful
- API may continue using old values if operators rely on BAO to change commission settings later

## Recommended Next Step

Pick one runtime strategy and make both services use the same file set:

1. preferred: mount the same runtime volume/path into BAO and point `POOLPROJECT_RUNTIME_ROOT` or `RUNTIME_ROOT` to it
2. alternatively: bind BAO to the host `runtime/` directory already used during deploy

After that, re-run the same BAO save check and confirm:

- BAO save updates the shared runtime file
- API reads the updated value without path drift

## Notes For Handoff

- backup present before deploy: `/home/nc-user/backups/server-predeploy-20260512-151357`
- no lasting test artifact was left behind from this verification
- the main risk is not the current `3000` value, but the mismatch between BAO write path and API read path
