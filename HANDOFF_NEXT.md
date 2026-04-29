Handoff Next

Updated: 2026-04-29 17:08 +07
Branch: `main`

Current Goal

Lock the new commission runtime direction before implementation:

- `Direct` pays immediately on approved orders
- `2leg / 3leg`, `Matching`, and `Pool` run after end of day
- daily cap applies only to `2leg / 3leg`
- buyback / recycle stays unchanged
- pool uses daily approved PV funding with a per-member `3% of real paid amount` payout ceiling

Use BAO/WAP for normal operations.
Use `/admin` local quick actions when you need commission runtime controls such as team scaffold, team-only process, end-of-day process, pool close, or runtime verification.
Do not go back to deprecated commission screens or `CommissionMainPlan`.

Current Locked Spec

- Primary working spec for this round:
  - [docs/technical-design/pool_daily_eod_spec.md](/Users/macbook/poolproject/docs/technical-design/pool_daily_eod_spec.md:1)
- Direct rule:
  - calculate immediately when an order becomes `approved`
- End-of-day rules:
  - calculate `2leg / 3leg`
  - apply daily cap only to `2leg / 3leg`
  - calculate `Matching` from team `finalPayableAmount` after cap
  - calculate `Pool` after the end-of-day team/matching flow
- Pool rule:
  - fund from same-day approved PV only
  - member who qualifies today starts receiving on the next day
  - member stays eligible daily until the related `memberPackageCycle` ends
  - member daily pool payout cannot exceed `3%` of real paid purchase amount from pool-enabled products on that day
- Buyback / recycle:
  - unchanged in this round

Session Close Rule

- At the end of every implementation session, update both:
  - [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md:1)
  - [CHECKLIST_LIVE_OPERATIONS.md](/Users/macbook/poolproject/CHECKLIST_LIVE_OPERATIONS.md:1)
- Do this even when the session changes only spec, runtime assumptions, or verification notes.

What Was Completed In This Round

- Started implementing the locked daily commission runtime:
  - `Direct` immediate-on-approval flow now skips same-day `cashback` and `uni`
  - shared daily-cap finalization now applies cap only to `team_2leg` and `team_3leg`
  - added end-of-day orchestration endpoint:
    - `POST /commissions/end-of-day/:settlementDate/process`
  - end-of-day orchestration currently runs:
    - team settlement process
    - pool close for the same Bangkok business date
  - pool order loading now also exposes per-line `lineTotalUsdt`
  - pool eligibility now moves closer to the locked rule:
    - prior-day qualification check for own/direct/direct-buyer history
    - active `memberPackageCycle` requirement
    - same-day real-paid amount snapshot for pool-enabled order lines
  - pool payout request is now capped per member by `3%` of same-day real paid pool-enabled purchase amount
- Validation for this implementation round:
  - `npx prisma validate --schema prisma/schema.prisma` passed
  - `npm run lint` passed
- Runtime verification for this implementation round:
  - restarted local stack with `npm run dev:restart`
  - verified `Direct` immediate flow on fixture order `150`
    - `cashbackCount: 0`
    - `directCount: 1`
    - `uniCount: 0`
    - only the direct beneficiary received a wallet posting
  - verified end-of-day orchestration on `2025-11-27`
    - `POST /commissions/end-of-day/2025-11-27/process` returned processed team settlement plus pool close result
  - verified direct pool close on `2025-11-27`
    - `POST /pool/2025-11-27/close` now returns:
      - `fundingTotalApprovedPv: 2000`
      - `poolFund: 2000`
      - `eligibleMemberCount: 0`
      - `companyFallbackAmount: 2000`
    - `GET /pool/2025-11-27/snapshot` matches the same values after rerun
  - verified recipient-positive pool cap fixture on `2030-01-16`
    - fixture created exactly `1` eligible recipient with same-day real paid pool-enabled amount `100`
    - same-day total pool funding PV = `1100`
    - `POST /pool/2030-01-16/close` returned:
      - `poolFund: 1100`
      - `eligibleMemberCount: 1`
      - `payoutPerMember: 1100`
      - `companyFallbackAmount: 1097`
    - `GET /pool/2030-01-16/snapshot` returned:
      - `payoutCount: 1`
    - approved payout row amount `3`
    - linked `commissionLedgerId` present
    - this confirms the new per-member daily pool ceiling is limiting payout to `3%` of real paid amount
- Restored the local `/admin` surface for commission operations:
  - `GET /admin` now serves the local admin HTML again instead of redirecting immediately to BAO
  - `GET /admin/app.js` and `GET /admin/styles.css` now serve the archived working admin assets
  - quick actions now expose:
    - `Team Only` for `POST /commissions/team-settlement-batches/:settlementDate/process`
    - `End Of Day` for `POST /commissions/end-of-day/:settlementDate/process`
    - `Close Pool Only` for manual pool-only reruns
  - the action panel now documents the locked runtime rule:
    - `Direct` runs on approval
    - `2leg / 3leg`, `Matching`, and `Pool` run after end of day
    - pool eligibility starts the next day
    - pool payout is capped at `3%` of real paid pool-enabled amount
- Operator smoke for the restored `/admin` flow is now verified through the same API route the UI uses:
  - runtime health was `ok` at `GET /health`
  - current working local operator login is:
    - identifier: `TH0000013`
    - password: `a1a1a1`
  - `GET /auth/me` with that token succeeded for user `TH0000013`
  - `POST /commissions/end-of-day/2025-11-27/process` succeeded with that token and returned:
    - team batch `status: processed`
    - `processedUsers: 1`
    - `carriedForwardUsers: 5`
    - `totalPayablePv: 750`
    - `totalBonusAmount: 225`
    - pool summary `fundingTotalApprovedPv: 2000`
    - pool summary `poolFund: 2000`
    - pool summary `eligibleMemberCount: 0`
    - pool summary `companyFallbackAmount: 2000`
    - pool summary `reprocessed: true`
  - `GET /commissions/team-settlement-batches/2025-11-27/snapshot` still matched the same processed totals after the rerun
  - `/admin` login hint is now updated to the working local credential placeholder:
    - identifier placeholder `TH0000013 or member email`
    - password placeholder `a1a1a1`
    - hint text `Current local login: TH0000013 / a1a1a1`
  - member app sign-in placeholders are now neutralized as well:
    - identifier placeholder `Member code, email, or phone`
    - password placeholder `Enter password`
    - this removes the old dev-password example from the public member sign-in surface
- Deployment bundle for this session is prepared as a zip:
  - zip file: [commission-runtime-2026-04-29.zip](/Users/macbook/poolproject/deploy/releases/commission-runtime-2026-04-29.zip)
  - release notes: [commission-runtime-2026-04-29-release.md](/Users/macbook/poolproject/deploy/commission-runtime-2026-04-29-release.md:1)
  - bundle contains the commission runtime source changes, admin surface changes, spec, and handoff/checklist files for this round
  - intended usage:
    - copy the zip to the server
    - unzip from the project root
    - rebuild/restart the API runtime
  - uploaded to target server:
    - host: `202.94.169.245`
    - remote path: `/home/nc-user/commission-runtime-2026-04-29.zip`
    - remote project root observed at: `/home/nc-user/poolproject`
    - remote archive listing verified successfully after upload
  - deployed on target server:
    - archive was unzipped into `/home/nc-user/poolproject`
    - rebuilt images: `api`, `wap`
    - recreated runtime services: `api`, `wap`, `nginx`
    - container health verified after restart:
      - `poolproject-uat-api-1`
      - `poolproject-uat-wap-1`
      - `poolproject-uat-nginx-1`
  - UAT post-deploy verification:
    - `curl http://127.0.0.1:3000/health` returned `{"status":"ok"}`
    - `curl -I http://127.0.0.1:3000/admin` returned `200 OK`
    - production-style member login on UAT does not allow dev impersonation password
    - verified working UAT admin member session:
      - identifier: `TH0000013`
      - password: `005613`
    - first `POST /commissions/end-of-day/2025-11-27/process` failed because the UAT database schema was behind the deployed code:
      - missing table `public.TeamSettlementBatch`
    - fixed by syncing the UAT database schema from the deployed container:
      - `docker exec poolproject-uat-api-1 npx prisma db push --schema prisma/schema.prisma`
    - after schema sync, `POST /commissions/end-of-day/2025-11-27/process` succeeded on UAT and returned:
      - team settlement `status: processed`
      - `totalUsers: 0`
      - `processedUsers: 0`
      - `carriedForwardUsers: 0`
      - `totalPayablePv: 0`
      - `totalBonusAmount: 0`
      - pool summary `fundingTotalApprovedPv: 2000`
      - pool summary `poolFund: 2000`
      - pool summary `eligibleMemberCount: 0`
      - pool summary `companyFallbackAmount: 2000`
    - `GET /pool/2025-11-27/snapshot` with the same UAT session returned:
      - cycle `status: closed`
      - `fundingTotalApprovedPv: 2000`
      - `poolFund: 2000`
      - `eligibleMemberCount: 0`
      - `payoutCount: 0`
  - important operator note:
    - the deployed `/admin` page currently shows the local-dev login hint `TH0000013 / a1a1a1`
    - that hint is correct for local non-production runtime only
    - UAT / production-style runtime currently requires the real member password instead
  - uploaded to Google Drive:
    - `nutrientlife.co.ltd@gmail.com`:
      - `/Users/macbook/Library/CloudStorage/GoogleDrive-nutrientlife.co.ltd@gmail.com/My Drive/commission-runtime-2026-04-29.zip`
      - `/Users/macbook/Library/CloudStorage/GoogleDrive-nutrientlife.co.ltd@gmail.com/My Drive/commission-runtime-2026-04-29-release.md`
    - `chaiyanut.og@gmail.com`:
      - `/Users/macbook/Library/CloudStorage/GoogleDrive-chaiyanut.og@gmail.com/My Drive/commission-runtime-2026-04-29.zip`
      - `/Users/macbook/Library/CloudStorage/GoogleDrive-chaiyanut.og@gmail.com/My Drive/commission-runtime-2026-04-29-release.md`
- Locked the new commission / pool direction in a dedicated spec:
  - [docs/technical-design/pool_daily_eod_spec.md](/Users/macbook/poolproject/docs/technical-design/pool_daily_eod_spec.md:1)
- Locked these business rules for the next implementation step:
  - `Direct` runs immediately on approved orders
  - `2leg / 3leg`, `Matching`, and `Pool` run after end of day
  - daily cap applies only to `2leg / 3leg`
  - `Matching` stays based on team `finalPayableAmount` after cap
  - `Pool` uses daily approved PV funding
  - pool qualification becomes `qualified today -> receive tomorrow`
  - pool eligibility continues daily until the relevant `memberPackageCycle` ends
  - per-member pool payout is capped at `3%` of real paid pool-enabled purchase amount per day
- Updated the live operations checklist so the next session reuses the same locked rules and always refreshes handoff + checklist on close-out.
- `COMM-04` is now complete.
- The shared commission finalize path now computes and persists:
  - `grossAmount`
  - `finalPayableAmount`
  - `discardedAmount`
  - `releaseStatus`
- The real daily-cap runtime path is wired in:
  - `DailyCommissionCapUsage` lookup by `user + Bangkok business date`
  - remaining-cap calculation before cycle allocation
  - cap usage increment only when a beneficiary commission actually survives fallback
- Minimal buyback-gating skeleton is wired in:
  - user progress lookup/upsert
  - `HELD_PENDING_REPURCHASE`
  - `BLOCKED_AFTER_EXPIRY`
  - buyback audit-event creation
- `direct`, `uni`, and `cashback` now use the shared cap/gating finalize path.
- Held commissions now flow into wallet posting correctly through the held bucket path.
- Commission/fallback filters now accept the new commission types:
  - `TEAM_2LEG`
  - `TEAM_3LEG`
  - `MATCHING_L1`
  - `MATCHING_L2`
- `COMM-05` has started with a minimal team-settlement scaffold:
- `COMM-05` backend scope is now effectively complete
  - scaffold formula now computes real:
    - `plannedPaidPvByLeg`
    - `carryForwardPvByLeg`
    - `payablePv`
    - `bonusAmount`
  - if 3 payable legs exist, scaffold uses 3-leg logic
  - if only 2 payable legs exist, scaffold falls back to 2-leg logic
  - added team settlement scaffold types in [packages/modules/commissions/src/domain/commissions.types.ts](/Users/macbook/poolproject/packages/modules/commissions/src/domain/commissions.types.ts:1)
  - added repository helpers to:
    - list active positioned members by `upline + L/M/R`
    - replace a scaffolded `TeamSettlementBatch` snapshot
    - list scaffolded batch items by `settlementDate`
    - mark processed batch/item statuses and totals
  - added service method `scaffoldTeamSettlementBatch(settlementDate)` in [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts:1)
  - added service method `processTeamSettlementBatch(settlementDate)` in [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts:1)
  - added API endpoint:
    - `POST /commissions/team-settlement-batches/:settlementDate/scaffold`
    - `POST /commissions/team-settlement-batches/:settlementDate/process`
  - current scaffold stores per-upline per-leg:
    - active member counts
    - aggregated `totalPv` from active-cycle `purchaseBase`
  - process now creates `TEAM_2LEG` / `TEAM_3LEG` ledger rows through the shared finalize path
  - process now creates `MATCHING_L1` / `MATCHING_L2` from actual team `finalPayableAmount` after cap
  - matching rows keep `sourceCommissionLedgerId` linkage back to the originating team commission row
  - repeat `process` calls now skip non-`planned` team batch items to reduce duplicate creation risk
  - duplicate protection now also checks existing team rows by batch-item linkage and existing matching rows by source team ledger + level before creating new rows
  - processed team batches no longer get re-scaffolded over the top by the scaffold endpoint
  - team commission source refs now avoid incorrectly forcing non-order refs into `commissionLedger.orderId`
- pool runtime has started moving to the new signed-off rule set:
  - approved pool source orders are now read by Bangkok single-day range, not the old weekly range
  - pool funding now uses runtime `poolRate` from commission settings
  - pool eligibility now targets:
    - own approved purchase order
    - `3` directs
    - `3` direct buyers with approved orders
  - old Sunday-only close restriction was removed from the current pool close path
  - pool close now creates per-recipient `pool` commission rows through the shared finalize path
  - daily pool payout snapshots now link back to `commissionLedgerId`
  - pool wallet posting now uses commission ref ids and respects held-vs-approved payout status
  - pool rerun lookup now keys existing pool commissions by `poolCycleId + beneficiaryUserId`
  - `closePool(poolDate)` is now rerunnable and returns `reprocessed: true` when a previous cycle existed
  - runtime verification endpoints now exist for fast inspection:
    - `GET /commissions/team-settlement-batches/:settlementDate/snapshot`
    - `GET /pool/:poolDate/snapshot`
  - pool snapshot now returns summary counts for approved / held / fallback / linked commission rows
  - admin UI quick actions now expose:
    - team settlement `Scaffold / Process / Snapshot`
    - pool `Snapshot / Payouts`
  - runtime verification can now be executed from BAO admin without manual endpoint calls

Validation Completed

- `npx prisma validate --schema prisma/schema.prisma` passed
- `npm run lint` passed

Runtime Verification Completed This Round

- matrix is now soft-disabled for runtime and visible surfaces:
  - `runtime/commission-settings.json` now sets `appVisibility.matrix = false`
  - default commission settings fallback also default matrix visibility to `false`
  - member matrix actions now reject when matrix is disabled
  - matrix summary endpoint now returns an empty summary when disabled
  - BAO admin matrix sections and the matrix order-source filter option are hidden when matrix visibility is off
- local stack was restarted successfully and API health recovered on `http://127.0.0.1:3000/health`
- local Prisma schema had been behind runtime initially; `npx prisma db push --schema prisma/schema.prisma` was required once before team batch endpoints could run
- verified login and live API calls against the local stack
- added a focused smoke script for the one-leg carry-forward regression:
  - `npm run smoke:commissions:team-carry-forward`
- added a fixture-based smoke script for `team finalPayable -> matching` regression:
  - `npm run smoke:commissions:team-matching-final-payable`
- added a concurrent rerun smoke script for team settlement race safety:
  - `npm run smoke:commissions:team-concurrent-rerun`
- verified `POST /commissions/team-settlement-batches/2025-11-27/process`
  - result stayed stable at:
    - `processedUsers: 1`
    - `carriedForwardUsers: 5`
    - `totalPayablePv: 750`
    - `totalBonusAmount: 225`
- verified `GET /commissions/team-settlement-batches/2025-11-27/snapshot`
  - batch remains `processed`
  - rerunning `process` does not change counts
- fixed a real rerun/concurrency bug in team settlement scaffold/process:
  - `scaffold` on an already processed date now returns `status: processed` with real processed item states
  - repository scaffold/process transactions now run at `Serializable` isolation with retry on `P2034`
  - rerunning `scaffold + process + snapshot` on `2025-11-27` no longer flips the batch back to `scaffolded/planned`
- verified `POST /pool/2025-11-27/close`
  - returns `reprocessed: true` on rerun
  - current sample runtime result is:
    - `fundingTotalApprovedPv: 2000`
    - `poolFund: 600`
    - `eligibleMemberCount: 0`
    - `companyFallbackAmount: 600`
- verified `GET /pool/2025-11-27/snapshot`
  - current sample has `payoutCount: 0`
  - `approvedCount: 0`
  - `heldCount: 0`
  - `fallbackCount: 0`
  - `linkedCommissionCount: 0`
- verified `2025-11-29` team scaffold/process path is safe on a zero-candidate day
  - `scaffold` returns `totalUsers: 0`
  - `process` returns `processedUsers: 0`
- verified the one-leg carry-forward regression on `2025-11-27`
  - smoke script found `userId: 26` with exactly `1` positive leg
  - `payablePv` stayed `0`
  - `bonusAmount` stayed `0`
  - item status stayed `carried_forward` after `process` and `snapshot`
- verified `team finalPayable -> matching` with an isolated fixture on `2030-01-15`
  - script created a temporary 5-user sponsor/team fixture and cleaned it up afterward
  - fixture produced a `TEAM_2LEG` commission with:
    - `grossAmount: 150`
    - `finalPayableAmount: 150`
  - fixture produced:
    - `MATCHING_L1 basePv: 150 amount: 7.5`
    - `MATCHING_L2 basePv: 150 amount: 7.5`
  - this confirms matching is based on the team commission `finalPayableAmount`, not a pre-cap base
- verified concurrent rerun safety on `2025-11-27`
  - smoke ran `scaffold + process + snapshot` concurrently for `3` rounds
  - final snapshot remained:
    - `batchStatus: processed`
    - `processedUsers: 1`
    - `carriedForwardUsers: 5`
    - `totalPayablePv: 750`
    - `totalBonusAmount: 225`
  - no item reverted back to `planned`
- BAO commission UI was cleaned up to match the active plan only
  - removed `Commission Setting` from the Orchid menu
  - `Commission Report` now exposes only:
    - `overview`
    - `direct`
    - `team`
    - `matching`
    - `pool`
  - report query/export/view logic now uses only active commission channels
  - fixed a real Postgres query bug in team/matching report filtering caused by quoted `commissionType` `whereIn(...)`
- deprecated admin/member commission surfaces were removed from active use and archived
  - archived old custom Nest admin UI from `apps/api/public/admin`
  - archived deprecated Orchid `CommissionMainPlanReportScreen`
  - archived WAP `CommissionMainPlan.tsx`
  - archived old `commission-main-plan` docs, view files, and helper scripts to:
    - `tmp/archived_admin_ui_2026-04-28/`
- `/admin` on the Nest side now redirects to Orchid BAO instead of serving the old custom admin shell
- active-tree reference cleanup was completed
  - removed active references to:
    - `CommissionMainPlan`
    - `commission-main-plan`
    - old commission setting/report routes for `unilevel`, `matrix`, `cashback`, and the old root settings screen
- WAP member-team follow-up was corrected to the proper surface
  - earlier `Team volume` work had briefly been attempted on `Commission`, but that was the wrong screen for the requested mock
  - latest work moved the `Team volume` block to `TeamMember` to match the real target screen and left `Commission` focused on commission data only
  - `TeamMember` now shows:
    - a `Team volume` summary strip
    - `DIRECT / L / M / R` counts
    - filtered member-tree results below the strip on the same page
  - member direct-referral payloads now include `placementSide`, which the WAP team view uses to count `L / M / R`
  - latest commits:
    - `b506494c` `Move team volume UI to TeamMember`
    - `e4153eeb` `Add team volume section to TeamMember`
- latest UAT deploy to `nc-user@202.94.169.245` is complete
  - deploy target path is `/home/nc-user/poolproject`
  - runtime path is `docker compose -f deploy/compose/docker-compose.yml --env-file deploy/compose/.env`
  - because server source is not a normal git checkout, deploy was done by uploading and extracting:
    - `.tmp/poolproject-deploy-2026-04-28.tgz`
  - source package was extracted over the live tree
  - deprecated files removed on server during deploy:
    - old custom Nest admin files under `apps/api/public/admin/`
    - old `CommissionMainPlanReportScreen.php`
    - old `main-plan-report.blade.php`
    - archived helper scripts tied to `commission-main-plan`
  - images rebuilt successfully for:
    - `poolproject-uat-api`
    - `poolproject-uat-bao`
    - `poolproject-uat-wap`
  - runtime migration completed successfully with:
    - `docker compose ... --profile tools run --rm migrate`
    - `prisma generate`
    - `prisma db push`
  - post-deploy health checks passed:
    - `GET http://127.0.0.1:3000/health` -> `{"status":"ok"}`
    - `GET http://127.0.0.1:8001/admin/login` -> `200 OK`
    - `GET http://127.0.0.1:3002/` -> `200 OK`
  - post-deploy container state was healthy for:
    - `api`
    - `bao`
    - `wap`
    - `nginx`

Current Working Files

- [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md:1)
- [CHECKLIST_LIVE_OPERATIONS.md](/Users/macbook/poolproject/CHECKLIST_LIVE_OPERATIONS.md:1)
- [docs/technical-design/pool_daily_eod_spec.md](/Users/macbook/poolproject/docs/technical-design/pool_daily_eod_spec.md:1)
- [docs/technical-design/referral_commission_plan_thb.md](/Users/macbook/poolproject/docs/technical-design/referral_commission_plan_thb.md:1)
- [packages/modules/commissions/src/commissions.module.ts](/Users/macbook/poolproject/packages/modules/commissions/src/commissions.module.ts:1)
- [apps/api/src/admin-ui.controller.ts](/Users/macbook/poolproject/apps/api/src/admin-ui.controller.ts:1)
- [packages/modules/commissions/src/controllers/commissions.controller.ts](/Users/macbook/poolproject/packages/modules/commissions/src/controllers/commissions.controller.ts:1)
- [packages/modules/commissions/src/domain/commissions.types.ts](/Users/macbook/poolproject/packages/modules/commissions/src/domain/commissions.types.ts:1)
- [packages/modules/commissions/src/repositories/commissions.repository.ts](/Users/macbook/poolproject/packages/modules/commissions/src/repositories/commissions.repository.ts:1)
- [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts:1)
- [packages/modules/orders/src/services/orders.service.ts](/Users/macbook/poolproject/packages/modules/orders/src/services/orders.service.ts:1)
- [packages/modules/orders/src/repositories/orders.repository.ts](/Users/macbook/poolproject/packages/modules/orders/src/repositories/orders.repository.ts:2390)
- [packages/modules/pool/src/domain/pool.types.ts](/Users/macbook/poolproject/packages/modules/pool/src/domain/pool.types.ts:1)
- [packages/modules/pool/src/repositories/pool.repository.ts](/Users/macbook/poolproject/packages/modules/pool/src/repositories/pool.repository.ts:1)
- [packages/modules/pool/src/services/pool.service.ts](/Users/macbook/poolproject/packages/modules/pool/src/services/pool.service.ts:1)
- [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/PlatformProvider.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/PlatformProvider.php:1)
- [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionReportScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionReportScreen.php:1)
- [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionSettingsScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionSettingsScreen.php:1)
- [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionReportBuilder.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionReportBuilder.php:1)
- [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/report.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/report.blade.php:1)
- [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/routes/platform.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/routes/platform.php:1)
- [packages/modules/members/src/repositories/members.repository.ts](/Users/macbook/poolproject/packages/modules/members/src/repositories/members.repository.ts:956)
- [packages/modules/members/src/services/members.service.ts](/Users/macbook/poolproject/packages/modules/members/src/services/members.service.ts:129)
- [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/TeamMember.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/TeamMember.tsx:1)
- [deploy/compose/docker-compose.yml](/Users/macbook/poolproject/deploy/compose/docker-compose.yml:1)

Current Working Tree

- modified:
  - `HANDOFF_NEXT.md`
  - `CHECKLIST_LIVE_OPERATIONS.md`
  - `packages/modules/commissions/src/commissions.module.ts`
  - `packages/modules/commissions/src/controllers/commissions.controller.ts`
  - `packages/modules/commissions/src/domain/commissions.types.ts`
  - `packages/modules/commissions/src/services/commissions.service.ts`
  - `packages/modules/orders/src/repositories/orders.repository.ts`
  - `packages/modules/pool/src/domain/pool.types.ts`
  - `packages/modules/pool/src/repositories/pool.repository.ts`
  - `packages/modules/pool/src/services/pool.service.ts`
- untracked:
  - `docs/technical-design/pool_daily_eod_spec.md`
  - `tmp/archived_admin_ui_2026-04-28/`
- unrelated existing file to ignore unless user asks:
  - Thai-named `.xlsx` file in repo root
- note:
  - `TeamMember.tsx` was force-added and committed because the `stephub/` tree is ignored by repo rules
  - if later WAP file changes are meant to be committed, expect to use `git add -f` again for those specific paths
  - current server deploy does not rely on `git pull` on the VPS
  - the known working emergency path is:
    - upload archive
    - extract into `/home/nc-user/poolproject`
    - rebuild `api/bao/wap`
    - run `migrate`
    - `docker compose up -d api bao wap nginx`

Exactly What To Do Next

Treat `COMM-05` as complete. Do not redo cap/gating or team/matching core runtime.

1. Treat `COMM-05` as closed
- do not reopen team/matching implementation or `COMM-05` hardening unless a real bug is found

2. Finish adjustment planning and keep scope locked
- treat current backend adjustment work as the active focus, not recipient-positive pool testing
- do not spend more time trying to force a pool-eligible sample from the current dataset
- if more plan cleanup is needed, capture it in handoff/checklist first before reopening runtime verification
- BAO commission report cleanup is now the active admin surface
- any further commission UI work must continue from the active Orchid report pages only
- treat matrix as soft-disabled unless the business explicitly asks to revive it

3. Do not restore deprecated commission surfaces
- do not bring back:
  - `apps/api/public/admin/*`
  - `CommissionMainPlan.tsx`
  - `CommissionMainPlanReportScreen.php`
  - old `commission-main-plan` docs or helper scripts
- if historical reference is needed, use:
  - `tmp/archived_admin_ui_2026-04-28/`

4. Keep the locked runtime order intact in every later smoke flow
- `team -> buyback side effect -> pool`
- do not reorder these batches during further verification or test wiring

5. Defer pool recipient-positive testing until after adjustment planning is fully settled
- current `2025-11-27` sample already proves rerun behavior
- recipient-positive pool verification remains a later phase
- when returning to it, use a date or fixture that naturally produces eligible recipients instead of stretching the current sample data

6. Use the new THB/PV referral and commission plan as the only source of truth
- use [docs/technical-design/referral_commission_plan_thb.md](/Users/macbook/poolproject/docs/technical-design/referral_commission_plan_thb.md:1)

7. Keep WAP screen targeting explicit before changing member UI
- if the requested mock or screenshot shows `127.0.0.1:3002/TeamMember`, implement it on `TeamMember`, not `Commission`
- keep `Commission` for commission-value surfaces
- keep `TeamMember` for team-tree / team-volume surfaces
- treat older commission-plan docs as archived material only
- new referral flow must use `referralCode` and `/SignUp?ref=...`
- commission basis is approved order PV from real catalog data:
  - `orderTotalPv = sum(quantity x unitPv)`
  - payout calculation interprets `1 PV = 1 THB`
- do not reintroduce package-based or USDT-based wording

Pool Verification Phase Checklist

When the team is ready to resume pool work, do it in this order:

1. prepare a date or fixture that produces at least `1` eligible pool recipient
2. run the locked order:
   - `team -> buyback side effect -> pool`
3. verify `POST /pool/:poolDate/close` returns a non-zero eligible recipient count
4. verify `GET /pool/:poolDate/snapshot` shows:
   - payout rows present
   - correct `approved / held / fallback / linkedCommissionCount`
5. verify pool commission rows link back through `commissionLedgerId`
6. verify held pool payouts land in the held wallet bucket when applicable
7. verify rerunning the same pool date returns `reprocessed: true` and does not duplicate payouts or wallet credits

6. If a formal automated test harness is introduced later
- port the three existing smoke checks into durable automated coverage:
  - one-leg carry-forward
  - matching from team `finalPayableAmount`
  - concurrent rerun stability

Important Locked Rules To Use

- team structure is real `L / M / R`
- daily cap is `5000 THB`
- cap applies across all commission channels combined
- buyback threshold uses `final payable after cap`
- no auto-deducted recycle purchase
- excess above threshold is held pending member-initiated repurchase for `3` calendar days in `Asia/Bangkok`
- if not completed in time: `BLOCKED_AFTER_EXPIRY`
- pool basis is `100% of approved PV`
- pool qualification:
  - member has own purchase order
  - member has `3` directs
  - each direct has `1` purchase order
- matching is calculated from actual team payable after cap
- batch order is locked:
  - `team -> buyback side effect -> pool`
- if 3-team does not have 3 legs but has 2 payable legs, fall back to 2-leg logic

What Not To Do Next Time

- do not return to receipt/PDF work
- do not re-open daily-cap or buyback skeleton work unless a bug is found
- do not generate large UI/report changes before backend team/matching runtime is stable
- do not remove backward compatibility from commission settings JSON

Recommended First Commands Next Session

```bash
git status --short
npx prisma validate --schema prisma/schema.prisma
npm run lint
```

Recommended First Files Next Session

1. [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md:1)
2. [docs/technical-design/referral_commission_plan_thb.md](/Users/macbook/poolproject/docs/technical-design/referral_commission_plan_thb.md:1)
3. [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/PlatformProvider.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/PlatformProvider.php:1)
4. [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionReportBuilder.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionReportBuilder.php:1)
5. [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/report.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/report.blade.php:1)

Bottom Line

The repo has moved past the `COMM-04` cap/gating milestone.
`COMM-05` backend runtime and close-out hardening are effectively complete, with runtime verification on the local stack for processed-date reruns, concurrent reruns, one-leg carry-forward, and matching-from-final-payable.
Pool payout creation also runs through the shared finalize path. BAO now uses the cleaned Orchid commission report surface only, while old custom admin and `CommissionMainPlan` surfaces have been archived out of active use. The next person should treat `COMM-05` as done, continue only from the active BAO/WAP surfaces, and return to recipient-positive pool verification as a separate later phase. Matrix is currently soft-disabled across runtime and primary admin/member surfaces.
