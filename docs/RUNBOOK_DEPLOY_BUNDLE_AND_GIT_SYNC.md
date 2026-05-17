# Runbook: Deploy Bundle And Git Sync

Use this when the server is rebuilt from a local source bundle instead of a git checkout, and you still want local git and the live server tree to line up afterward.

## Goals

- deploy a clean local source tree to the server
- preserve live env files, nginx certs, and persistent Docker volumes
- make `/home/nc-user/poolproject` on the server match a known git commit after cutover

## Preconditions

- local preflight passes
  - `npm run ops:check:stephub-tree`
  - `npm run ops:preflight:deploy`
- build a clean bundle
  - `SKIP_ZIP=1 bash scripts/prepare_full_reset_deploy_bundle.sh 2026-05-17`
- verify the tar
  - `tar -tf deploy/releases/full-reset-deploy-2026-05-17-final.tar >/dev/null`

## Server Cutover

1. Take a backup.
   - `npm run uat:backup`
2. Snapshot live-only files before replacing the app tree.
   - `deploy/compose/.env`
   - `deploy/compose/api.env`
   - `deploy/compose/bao.env`
   - `deploy/compose/wap.env`
   - `deploy/compose/nginx/certs/`
3. Stop the stack without deleting volumes.
   - `docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml down`
   - `docker compose --profile worker --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml down`
4. Move the old tree aside.
   - example: `/home/nc-user/poolproject_prev_<timestamp>`
5. Extract the uploaded tar into a fresh directory.
6. Restore the saved env files and certs into the extracted tree.
7. Run preflight in the extracted tree.
   - `npm run ops:preflight:deploy`
8. Move the extracted repo into place as `/home/nc-user/poolproject`.
9. Build and boot.
   - `docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml build`
   - `docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up -d postgres redis`
   - `docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml --profile tools run --rm migrate`
   - `docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up -d api bao wap nginx`
   - `docker compose --profile worker --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up -d worker`
10. Smoke check public endpoints.
   - `https://api.blifehealthy.com/health`
   - `https://bao.blifehealthy.com/admin/login`
   - `https://wap.blifehealthy.com`
   - `https://wap.blifehealthy.com/api/health`
   - `https://wap.blifehealthy.com/bao-api/admin/login`

## Git Sync After Bundle Deploy

When the server tree came from a tar bundle, it may not contain `.git`. To realign it with local git:

1. Commit and push local changes first.
   - `git status --short`
   - `git add ...`
   - `git commit -m "<message>"`
   - `git push origin main`
2. Tag the deployed commit if needed.
   - example: `git tag -a uat-cutover-2026-05-17 <commit> -m "UAT cutover 2026-05-17"`
   - `git push origin uat-cutover-2026-05-17`
3. Copy local `.git` metadata to the server.
   - safest approach is to tar the `.git` directory locally, upload it, remove any broken server `.git`, and extract it into `/home/nc-user/poolproject`
4. If the bundle intentionally excluded tracked files, copy those tracked files back to the server so `git status` becomes clean.
5. Put live-only files into `.git/info/exclude` on the server.
   - `deploy/compose/nginx/certs/`
   - `deploy/compose/nginx/conf.d/*.bak-*`
6. Verify git state on the server.
   - `git rev-parse HEAD`
   - `git branch --show-current`
   - `git status --short`

## Notes

- Do not use `docker compose down -v`.
- Do not overwrite server env files with local secrets.
- Do not commit large release tar files unless that is a deliberate release-storage policy.
- If the server needs to stay byte-for-byte equal to git, avoid excluding tracked files from the deploy bundle.
