Handoff Next

Updated: 2026-05-19 16:53 +07
Branch: `main`

Latest Session Update (2026-05-19)

- Special commission privilege `SPECIAL_200_PV` was bulk granted on UAT to the original business-member base.
  - target selection:
    - oldest `210` non-admin members by `createdAt, id`
    - operationally this matched:
      - `TH0000001`
      - through
      - `TH0000210`
  - grant payload meaning:
    - `200 PV / cap 10,000 / purchase base 1,000`
  - execution result:
    - `210/210` success
    - `0` failures
    - `MemberPackageCycle` rows created for target users: `210`
    - `SpecialCommissionCycleGrant` rows created for target users: `210`
    - sample log file:
      - `/tmp/special_200pv_210_results.log`
  - backup after completion:
    - `/home/nc-user/poolproject/backups/200PV210uesr`
  - note:
    - this was applied through the live internal endpoint flow, not by direct SQL insert, so runtime cycle creation and audit rows stayed consistent

- UAT was cleaned again for real-data readiness and the final cleanup completed successfully.
  - backup created first:
    - `/home/nc-user/poolproject/backups/uat-full-20260519-164006`
  - reset script now clears:
    - `SpecialCommissionCycleGrant`
  - reset script now prefers `poolproject-uat-postgres-*` automatically when both old and UAT Postgres containers exist
  - final reset was executed against:
    - `poolproject-uat-postgres-1`
  - final post-reset counts on UAT:
    - `User = 269`
    - `Product = 6`
    - `ProductDetail = 7`
    - `Package = 1`
    - `Order = 0`
    - `CommissionLedger = 0`
    - `MemberPackageCycle = 0`
    - `SpecialCommissionCycleGrant = 0`
    - wallet rows with non-zero balance = `0`
  - remaining UAT-only test data was removed after reset:
    - members:
      - `UTPVLOCK-134839`
      - `UTPVLOCKC-134839`
    - catalog:
      - `COMMTEST1000`
      - `COMMTEST650`
      - `COMMTESTPKG1000`
      - `COMMTESTPKG650`
      - `COMMTESTPROD`
      - `COMMTESTPROD650`
      - `COMMTESTCAT`
      - `COMMTESTSUP`
  - health checks after cleanup:
    - `http://127.0.0.1:3000/health => {"status":"ok"}`
    - `http://127.0.0.1:18001/admin/login => 200`
  - implication:
    - if anyone wants to rerun old UAT commission scenarios again, they must recreate isolated test members/catalog intentionally first

Latest Session Update (2026-05-18)

- Daily team cap was raised again for the current runtime:
  - `dailyCommissionCapAmount = 10000`
  - intended scope for active communication:
    - `Team 2-leg`
    - `Team 3-leg`
  - source/default files updated:
    - [runtime/commission-settings.json](/Users/macbook/poolproject/runtime/commission-settings.json:1)
    - [packages/shared/utils/src/commission-settings.util.ts](/Users/macbook/poolproject/packages/shared/utils/src/commission-settings.util.ts:1)
    - [PoolprojectSettingsStore.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/PoolprojectSettingsStore.php:1)
    - [CommissionSettingsController.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/CommissionSettingsController.php:1)
  - docs updated to reflect `10,000` instead of `5,000`

- Commission dashboard now exposes the grace-held amount separately:
  - `commissionRoundProgress.lockedDuringGraceAmount` is returned from `GET /auth/dashboard`
  - WAP `Commission` shows `ยอดล็อกระหว่างรอ ... บาท` while the member is in the grace window and there is held commission pending repurchase
  - this display is informational only; the held amount is still released after qualifying repurchase and is not counted into the new round accumulator
  - UAT member-facing proof was captured on 2026-05-19:
    - parent `UTPVLOCK-134839`
    - dashboard returned `lockedDuringGraceAmount = 5000`
    - UI preview from the runtime payload is `ครบรอบแล้ว ซื้อซ้ำใน 2 วัน` + `ยอดล็อกระหว่างรอ 5,000 บาท`
    - report: [docs/archive/uat-history/2026-05-19-grace-locked-dashboard-demo.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-05-19-grace-locked-dashboard-demo.md:1)

- Special commission privilege menu was added for BAO admin:
  - menu: `Commission Report > สิทธิ์พิเศษ`
  - purpose: grant one receivable commission cycle without creating a real order
  - supported grant types:
    - `SPECIAL_100_PV` => `100 PV / cap 5,000 / purchase base 650`
    - `SPECIAL_200_PV` => `200 PV / cap 10,000 / purchase base 1,000`
  - runtime endpoint:
    - `POST /internal/bao/members/special-commission-cycle`
  - audit table:
    - `SpecialCommissionCycleGrant`
  - design note:
    - [docs/technical-design/special_commission_privilege_cycle.md](/Users/macbook/poolproject/docs/technical-design/special_commission_privilege_cycle.md:1)
  - UAT deploy + smoke verify completed on 2026-05-19:
    - migration `20260519_add_special_commission_cycle_grants` applied manually on UAT
    - `api`, `worker`, `bao` rebuilt and healthy
    - public BAO needed `nginx` restart again after `bao` recreate so the upstream IP matched
    - sample grant verified:
      - member `UTPVLOCK-134839`
      - `SPECIAL_100_PV`
      - result `cycleNo = 2`, `earningCap = 5000`, `isReceivable = true`

- UAT referral-placement validation was completed on 2026-05-19:
  - report:
    - [docs/archive/uat-history/2026-05-19-referral-placement-uat-scenarios.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-05-19-referral-placement-uat-scenarios.md:1)
  - raw UAT log:
    - `~/poolproject/runtime/referral-signup-uat-20260519-121232.log`
  - runtime behavior verified:
    - before the sponsor has direct referrals in all `LEFT / MIDDLE / RIGHT`, placement is forced to `AUTO`
    - bootstrap placement fills missing top-side legs first even if the invite tried to request a specific side
    - after unlock, explicit `LEFT / MIDDLE / RIGHT` referral links place new members into the chosen top branch
    - after unlock, `AUTO` prefers a branch with no approved-PV score first, otherwise the branch with the lowest approved-PV score
  - note:
    - public signup on UAT is in strict LINE verification mode, so the scenario runner exercised the same backend `createMember` runtime path inside the API container rather than the public endpoint

- Referral placement rule was tightened to match the latest business requirement:
  - if a sponsor still does not have at least one direct referral in each of `LEFT`, `MIDDLE`, and `RIGHT`, signup placement is forced to `AUTO`
  - during that bootstrap phase, the next signup fills the missing top-side leg first
  - only after all 3 top-side legs are present may the business use explicit `LEFT / MIDDLE / RIGHT` referral links
  - when `AUTO` is used after all 3 top-side legs already exist, runtime placement now targets the branch with no approved-PV score first, or else the branch with the lowest approved-PV score
  - backend change:
    - [packages/modules/members/src/repositories/members.repository.ts](/Users/macbook/poolproject/packages/modules/members/src/repositories/members.repository.ts:1)
  - WAP profile helper text was updated to explain the same rule:
    - [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/tabs/Profile.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/tabs/Profile.tsx:1)

- Runtime rule summary is now stable enough for go-live review:
  - referral identity:
    - `referralCode` is the only active invite identity
    - `memberCode` remains login/support/back-office identity only
    - placement modes in plan are `AUTO`, `LEFT`, `MIDDLE`, `RIGHT`
    - only `AUTO` is active in runtime invite flow right now
  - round reset / grace meaning:
    - when a member reaches `>= 10000` payable commission in the current round, `UserBuybackProgress` moves to `HELD_PENDING_REPURCHASE`
    - commission rows created during the `3`-day Bangkok grace window are still calculated, but release status stays held
    - qualifying self-purchase with `PV > 0` opens the new round, resets the new round accumulator to `0`, and the new cycle cap follows repurchase PV:
      - `< 200 PV => 5000`
      - `>= 200 PV => 10000`
    - held rows created during grace belong to the old round/grace period; the new round starts counting from zero after reopen
  - next recommended UAT coverage before final production sign-off:
    - `150 + 60 PV` threshold-upgrade scenario
    - grace expiry to `BLOCKED_EXPIRED`
    - late reopen after expiry with `100 PV`
    - late reopen after expiry with `200 PV`
    - repurchase cancel/recompute rollback behavior

- UAT round-reopen validation was completed with the latest PV-based rule:
  - report:
    - [docs/archive/uat-history/2026-05-18-pv-cycle-cap-uat-scenarios.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-05-18-pv-cycle-cap-uat-scenarios.md:1)
  - verified on UAT:
    - after threshold, `100 PV` self repurchase opens the next round with new cycle cap `5000`
    - after threshold, `200 PV` self repurchase opens the next round with new cycle cap `10000`
    - `UserBuybackProgress` clears after the qualifying repurchase and stores the repurchase order as `lastQualifyingOrderId`
  - raw UAT log:
    - `~/poolproject/runtime/pv-cycle-cap-uat-20260518-reopen-r3.log`

- Round-renewal rule was changed on both local source and UAT/server target:
  - old rule: qualifying self repurchase by `1000 THB`
  - interim rule: qualifying self repurchase by `200 PV`
  - latest rule: any approved self repurchase with `PV > 0` opens the next round
  - the new round cycle cap now follows repurchase PV:
    - `< 200 PV => 5000`
    - `>= 200 PV => 10000`
  - runtime config now uses `buybackRepurchasePv = 0`
  - commission repurchase reset path now checks approved order `totalPv` instead of `totalUsdt`
  - backward-compatible admin/settings parsing still accepts older `buybackRepurchaseAmount` input keys during transition
  - related docs and marketing summaries were updated to use the PV-based round reopen rule

- Marketing-ready summary docs were added for the current runtime plan:
  - [docs/marketing/runtime_marketing_plan_th_2026-05-18.md](/Users/macbook/poolproject/docs/marketing/runtime_marketing_plan_th_2026-05-18.md:1)
  - [docs/marketing/runtime_marketing_plan_table_th_2026-05-18.md](/Users/macbook/poolproject/docs/marketing/runtime_marketing_plan_table_th_2026-05-18.md:1)
  - both documents summarize only the active runtime rules and explicitly exclude inactive plans such as `cashback`, `unilevel`, and `matrix`

- Test catalog was prepared on both local and UAT for the next commission scenarios:
  - existing test set confirmed and normalized:
    - `COMMTEST1000`
    - `COMMTESTPKG1000`
    - `1000 THB / 200 PV / earningCap 10000`
  - new additional test set created:
    - `COMMTEST650`
    - `COMMTESTPKG650`
    - `650 THB / 100 PV / earningCap 5000`
- Source and helper files updated for this catalog prep:
  - [scripts/seed_member003_test_baseline.js](/Users/macbook/poolproject/scripts/seed_member003_test_baseline.js:1)
  - [scripts/sql/upsert_commtest_catalog.sql](/Users/macbook/poolproject/scripts/sql/upsert_commtest_catalog.sql:1)
- Verified after update:
  - local `ProductDetail` and `Package` rows show:
    - `COMMTEST1000 = 1000 / 200 / 10000`
    - `COMMTEST650 = 650 / 100 / 5000`
  - UAT `ProductDetail` and `Package` rows show the same values
- UAT controlled order scenarios were executed against fresh isolated test members.
  - result note:
    - [docs/archive/uat-history/2026-05-18-pv-cycle-cap-uat-scenarios.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-05-18-pv-cycle-cap-uat-scenarios.md:1)
  - passes confirmed on UAT:
    - `100 PV => 5000`
    - `200 PV => 10000`
    - `100 + 100` upgrades the same cycle to `200 / 10000`
    - `200 + 100` creates queued cycle `100 / 5000 / isReceivable=false`
    - `carryOverPvOut` is now populated on the older cycle in the `200 + 100` scenario
    - queued cycle promotion after the older cycle is truly capped was verified with real downline orders
  - remaining follow-up on UAT:
    - decide whether large-quantity self-purchase orders should intentionally fan out into many `200 PV` cycles
    - add a smaller/scoped promotion regression check so the runtime report stays compact

- Local source implementation for the new PV-only cycle-cap rule is now in place:
  - Prisma schema adds `CycleCapTier` and PV accumulation fields on `MemberPackageCycle`
  - migration added:
    - [prisma/migrations/20260518_add_member_cycle_pv_accumulation/migration.sql](/Users/macbook/poolproject/prisma/migrations/20260518_add_member_cycle_pv_accumulation/migration.sql:1)
  - approved-order path now allocates `Order.totalPv` into cycles instead of opening cycles only per item count
  - overflow above `200 PV` opens or fills the next queued cycle
  - receivable-cycle normalization now promotes the next oldest active cycle after the older cycle is effectively capped
- Files touched for the local runtime implementation:
  - [prisma/schema.prisma](/Users/macbook/poolproject/prisma/schema.prisma:1)
  - [packages/modules/members/src/repositories/members.repository.ts](/Users/macbook/poolproject/packages/modules/members/src/repositories/members.repository.ts:1)
  - [packages/modules/members/src/services/members.service.ts](/Users/macbook/poolproject/packages/modules/members/src/services/members.service.ts:1)
  - [packages/modules/orders/src/services/orders.service.ts](/Users/macbook/poolproject/packages/modules/orders/src/services/orders.service.ts:1)
  - [packages/modules/commissions/src/repositories/commissions.repository.ts](/Users/macbook/poolproject/packages/modules/commissions/src/repositories/commissions.repository.ts:1)
- Local validation completed after this implementation:
  - `npx prisma validate --schema prisma/schema.prisma`
  - `npx prisma generate --schema prisma/schema.prisma`
  - `npm run lint`
- Still pending after this local source round:
  - scenario tests for `150 + 60 PV`, queued-cycle carry-forward, and recalc edge cases
  - BAO/WAP browser verification of cycle-cap presentation if UI later exposes these new fields
  - controlled UAT order scenarios for `150 + 60` PV and large-quantity fan-out expectations
- UAT/server rollout status for this rule:
  - changed source files were copied to `~/poolproject`
  - `api` and `worker` were rebuilt and recreated successfully
  - `poolproject-uat-api-1` is healthy after deploy
  - migration was applied manually with `psql` because Prisma `migrate deploy` hit `P3005` on the non-baselined UAT database
  - heuristic backfill applied to existing `210` `MemberPackageCycle` rows:
    - if `earningCap >= 10000` and new PV fields were still zero, set:
      - `accumulatedPv = 200`
      - `cycleCapTier = AT_LEAST_200_PV`
      - `sourceOrderCount = 1` when previously `0`
      - timestamps defaulted from `activatedAt`
  - this backfill was chosen because all existing `210` cycles on UAT had `earningCap >= 10000`

- Planned next commission runtime change is now documented for both local and UAT/server:
  - [docs/technical-design/pv_cycle_cap_accumulation_plan.md](/Users/macbook/poolproject/docs/technical-design/pv_cycle_cap_accumulation_plan.md:1)
- Locked intent for the next phase:
  - cycle cap must use `PV` only, not order amount
  - `< 200 PV => 5000 THB`
  - `>= 200 PV => 10000 THB`
  - the current cycle must be upgradable from `5000` to `10000` when later self-purchase PV pushes it to `>= 200`
  - excess PV must be allowed to seed the next queued cycle
  - payout order must remain `oldest receivable cycle first`
- Current gap before implementation:
  - runtime still opens `MemberPackageCycle` directly from approved order items
  - runtime still snapshots `earningCap` from product/package master data
  - no accumulated-PV or queued-next-cycle state exists yet on cycle runtime
  - local and UAT/server must be changed from the same tested source revision

- UAT server was prepared for go-live reset and the reset was executed successfully.
- This older 2026-05-18 reset note was later superseded by the final 2026-05-19 cleanup above.
- Backup created before reset:
  - `/home/nc-user/poolproject/backups/uat-full-20260518-003253`
- BAO reset path was deployed to server and rebuilt on:
  - `poolproject-uat-bao-1`
- Production reset result on server:
  - preserved:
    - `User = 212`
    - `MemberProfile = 210`
  - deleted/reset:
    - `Order = 210 -> 0`
    - `CommissionLedger = 1649 -> 0`
    - `WalletTransaction = 1034 -> 0`
    - `TeamSettlementBatch = 47 -> 0`
    - `DailyPoolCycle = 47 -> 0`
    - `UserBuybackProgress = 0`
    - `MemberPackageCycle = 0`
    - wallet rows with non-zero balance or payout lock = `0`
    - users with non-zero `matrixPersonalPv` = `0`
- Post-reset health checks:
  - `http://127.0.0.1:3000/health => {"status":"ok"}`
  - `http://127.0.0.1:18001/admin/login => 200`
  - `CommissionBaselineRuntimeResetter::status()` returned:
    - `transactionStateCount = 0`
    - `canReset = false`
- Important business state after this reset:
  - old orders/commissions/runtime history were cleared from the live UAT database
  - new commission/cap/team/pool/PV accumulation will now start only from new orders created after this reset
  - if the `210` business-member profiles add new members and new approved orders happen after this point, the system should calculate with the normal live flow

Latest Session Update (2026-05-18)

- Commission dashboard work was extended on both local and server:
  - realtime team PV by leg is shown on WAP `Commission`
  - round progress now shows:
    - before threshold: `xx,xxx/10,000`
    - after threshold: `ครบรอบแล้ว ซื้อซ้ำใน x วัน`
  - the countdown uses `graceExpiresAt` from buyback progress and updates on the page every minute
- API/WAP files involved:
  - [packages/modules/auth/src/controllers/auth.controller.ts](/Users/macbook/poolproject/packages/modules/auth/src/controllers/auth.controller.ts:1)
  - [packages/modules/commissions/src/repositories/commissions.repository.ts](/Users/macbook/poolproject/packages/modules/commissions/src/repositories/commissions.repository.ts:1)
  - [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts:1)
  - [packages/modules/commissions/src/domain/commissions.types.ts](/Users/macbook/poolproject/packages/modules/commissions/src/domain/commissions.types.ts:1)
  - [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Commission.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Commission.tsx:1)
- Server state after deploy:
  - `api` and `wap` were rebuilt and restarted on UAT
  - `http://127.0.0.1:3000/health` returned `{"status":"ok"}`
  - running bundle/builds were verified to contain `commissionRoundProgress`, `graceExpiresAt`, and the new Thai countdown text
- Commits created in this round:
  - `b2417b95`
    - `Add commission round countdown to dashboard`
  - `b3b1d2ae`
    - `Expand commission baseline runtime resetter`
- Current uncommitted repo state after those commits:
  - `HANDOFF_NEXT.md` itself
  - `docs/CHECKLIST_WORK_1_SYNC_SERVER_CALC_WITH_LOCAL.md`

Latest Session Update (2026-05-17)

- Fixed the BAO `รีเซ็ตข้อมูลทดสอบ` baseline reset gap for commission testing.
- Root cause:
  - the old `CommissionBaselineRuntimeResetter` only cleaned rows it could still trace back from baseline-tagged orders
  - once baseline orders were already deleted, orphan runtime rows such as `CommissionLedger` fallback rows and `CompanyBonusLedger` rows could remain
  - when that happened, `status()` returned `canReset = false`, so BAO could no longer clear the leftovers
- The reset logic was changed in:
  - [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionBaselineRuntimeResetter.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionBaselineRuntimeResetter.php:1)
- New behavior:
  - BAO reset now clears transaction/runtime state globally while keeping members and catalog/package masters intact
  - it deletes:
    - orders / order items / member package cycles
    - commission / company bonus / CAP / pool / team settlement / buyback / matrix runtime
    - wallet transactions / topup / withdraw / payout runtime
  - it preserves:
    - `User`
    - `MemberProfile`
    - member tree / bindings
    - `ProductCategory`, `Product`, `ProductDetail`, `Package`, `PackageItem`
    - `Wallet` rows themselves, but zeroes all balances and unlocks payout lock state
  - `status()` now allows reset when orphan transaction state still exists even if baseline-tagged orders are already gone
- Server verification after the fix and rerun:
  - `Order = 0`
  - `CommissionLedger = 0`
  - `CompanyBonusLedger = 0`
  - `WalletTransaction = 0`
  - `DailyPoolCycle = 0`
  - wallet rows with non-zero balance or payout lock = `0`
  - BAO resetter status now returns `canReset = false` after cleanup, which is the expected clean state
- Operational notes:
  - a fresh backup was created before the destructive cleanup:
    - `/home/nc-user/poolproject/backups/uat-full-20260517-190513`
  - the server source tree was updated with the fix
  - because the BAO container image path did not pick up the changed PHP file from a cached rebuild, the fix was also copied directly into the running BAO container as a hot patch for immediate validation
  - if BAO is rebuilt/recreated again later, re-verify that the built image includes the updated resetter file from source

Latest Session Update (2026-05-17)

- Deployment direction changed for the next operator:
  - do not run a transaction reset on the server
  - the intended cutover is now:
    - back up the server first
    - stop the compose stack
    - remove or move aside the old server app tree
    - upload a clean local source bundle
    - restore the needed env/runtime files
    - rebuild the stack from that uploaded local source
- The local/source-prep work is already in place:
  - local DB was prepared as the new baseline earlier with:
    - members kept
    - catalog/package masters kept
    - orders/commission/wallet runtime cleared
  - reported local post-reset counts at handoff time were:
    - `users_total = 212`
    - `products_total = 7`
    - `product_details_total = 8`
    - `packages_total = 2`
    - `orders_total = 0`
    - `commission_ledger_total = 0`
    - `wallet_tx_total = 0`
    - `wallet_nonzero_total = 0`
- The helper bundle script was refined for fresh rebuild use:
  - [scripts/prepare_full_reset_deploy_bundle.sh](/Users/macbook/poolproject/scripts/prepare_full_reset_deploy_bundle.sh:1)
  - new exclusions were added for:
    - `deploy/releases`
    - `.DS_Store`, `.vscode`, `.idea`
    - `runtime/server-product-export`
    - `runtime/pycache`
    - several local test/import artifacts such as `member003.xlsx`, `allsaletest*`, `allsaletes.xlsx`, `allsale.xlsx`, `Book1.xlsx`
  - the script now also supports:
    - `SKIP_ZIP=1`
    - use this when a tarball/stage dir is enough and zip packaging is too slow
- Important bundle status at this handoff:
  - do not use the older bundle artifacts:
    - `deploy/releases/full-reset-deploy-2026-05-17/`
    - `deploy/releases/full-reset-deploy-2026-05-17.tar`
    - `deploy/releases/full-reset-deploy-2026-05-17.zip`
  - reason:
    - that older bundle still captured `deploy/releases` content and even its own nested stage/release content
  - a cleaner fresh stage was generated:
    - `deploy/releases/full-reset-deploy-2026-05-17-fresh/`
  - the fresh stage runtime contents were verified down to only active settings files:
    - `commission-settings.json`
    - `manual-payment-settings.json`
    - `matrix-settings.json`
    - `signup-share-settings.json`
    - `wallet-settings.json`
    - `withdraw-settings.json`
  - a matching tar path was started:
    - `deploy/releases/full-reset-deploy-2026-05-17-fresh.tar`
  - but that tar file was not yet verified complete at handoff time
    - a `tar -tf` check reported truncated input while the packaging process still appeared to be in progress
  - there is also a temporary packaging artifact to clean up before final release handling:
    - `deploy/releases/ziGOEnaP`
- Recommended next operator steps:
  - clean up incomplete/temp bundle artifacts before trusting any archive for upload
  - regenerate one final clean release bundle from local
    - likely with `SKIP_ZIP=1 bash scripts/prepare_full_reset_deploy_bundle.sh <date-tag>`
    - then verify with `tar -tf`
  - commit the new helper scripts/docs separately once the operator is ready
  - do not add the large archives/stage dirs to git
  - after that, use the verified clean bundle for the server fresh rebuild flow
- Important repo-state note:
  - there are still unrelated/uncommitted local changes in the worktree
  - especially:
    - `package.json`
    - `scripts/README.md`
    - new helper scripts under `scripts/`
    - release artifacts under `deploy/releases/`
  - this handoff commit should be treated as a checkpoint note only, not as the full deploy-helper commit

Latest Session Update (2026-05-17)

- Completed the full `close firm` pass across WAP, BAO, and runtime settings with a disable-first approach:
  - WAP `/Firm` route now redirects to `Commission`
  - WAP screen registry no longer exposes `Firm`
  - WAP live catalog collection builder now filters out only `FIRM` category products
  - non-`FIRM` products that still carry `firmRedemptionEligible` remain visible
  - storefront product reads now exclude `FIRM` category rows server-side as well
- BAO member/admin display was reduced further:
  - `Firm balance` is hidden from BAO member detail
  - BAO wallet transaction list no longer displays `Firm` as a visible bucket label
- BAO order/admin entry points for Firm were disabled:
  - member-sale create screen no longer offers `firm_wallet`
  - BAO-only product picker for that flow now excludes `FIRM` category SKUs
  - order create validation no longer accepts `firm_wallet`
- BAO catalog/admin surfaces were closed off:
  - category list hides the permanent `FIRM` category
  - direct access to `FIRM` category edit aborts with `404`
  - product family list excludes families in the `FIRM` category
  - direct access to a family in the `FIRM` category aborts with `404`
  - product list excludes `FIRM` category items
  - product edit excludes `FIRM` categories/options and forces Firm controls off
  - Firm-specific product edit fields are hidden in the BAO form
- Runtime/config gates now enforce Firm off even if older payloads/settings still carry values:
  - `packages/shared/utils/src/wallet-settings.util.ts`
    - `firmEnabled` is normalized to `false`
  - `apps/api/src/admin-settings.controller.ts`
    - wallet settings updates can no longer re-enable Firm
  - `packages/shared/utils/src/matrix-settings.util.ts`
    - `autoOrderFirmAmount` and `reentryFirmAmount` normalize to `0`
  - `apps/api/src/admin-matrix-settings.controller.ts`
    - matrix settings writes force Firm amounts to `0`
  - `backend/app/Http/Controllers/Platform/CommissionSettingsController.php`
    - BAO matrix save path also forces Firm amounts to `0`
  - `runtime/matrix-settings.json`
    - `autoOrderFirmAmount = "0"`
    - `reentryFirmAmount = "0"`
  - `runtime/wallet-settings.json`
    - `firmEnabled = false`
- Backend/package-level Firm storefront flagging was also closed:
  - `packages/modules/packages/src/repositories/packages.repository.ts`
    - `firmRedemptionEligible` now returns `false` when wallet settings have Firm disabled
- Validation completed for this round:
  - `php -l` passed on all touched BAO PHP files
  - root `npm run lint` passed

- Important remaining state after full close-firm pass:
  - internal historical data, schema fields, and transaction types for Firm still exist
  - WAP `Firm` screen source was removed from disk after the close-out pass
  - matrix/order/backend internal compatibility code still contains Firm-related fields and types where needed for historical/runtime compatibility
  - runtime export/reference files under `runtime/server-product-export/` still contain historical `FIRM` rows and were not rewritten in this round
  - if the next operator wants a true deletion pass, that should be treated as a separate migration/cleanup project
- Local commit created for the close-out pass:
  - `3b5dccfe`
    - `feat(close-firm): hide firm surfaces across WAP and BAO`
- Added a destructive server-reset helper for the next deploy phase:
  - this helper is also the intended local-prep reset when the local DB must become the new production baseline
  - [scripts/reset_server_transactions_keep_members_catalog.mjs](/Users/macbook/poolproject/scripts/reset_server_transactions_keep_members_catalog.mjs:1)
  - use this when the goal is:
    - keep members and catalog masters
    - wipe orders, commissions, wallet runtime, CAP/pool/team/matrix artifacts
    - zero wallet balances without deleting wallet rows
  - always run `npm run uat:backup` before applying it on a server
- Added local/server cutover helpers:
  - [scripts/cleanup_runtime_test_artifacts.sh](/Users/macbook/poolproject/scripts/cleanup_runtime_test_artifacts.sh:1)
    - removes local runtime test artifacts and old release zips
  - [scripts/prepare_full_reset_deploy_bundle.sh](/Users/macbook/poolproject/scripts/prepare_full_reset_deploy_bundle.sh:1)
    - builds a clean source zip for full server rebuilds instead of patching live files

Latest Session Update (2026-05-17)

- WAP `Commission` UI was refined further after the earlier CW/SW alignment work:
  - `CW ที่ใช้ได้` in the CW -> SW flow was renamed to `CW ปัจจุบัน`
  - `CW ปัจจุบัน` and `CW รวม` tile meanings and detail popups were re-aligned
  - the CW detail popup no longer shows recent movement rows
  - the CW detail popup now reuses the lower commission-summary cards instead
  - the lower `Direct / Team / Matching / Pool` summary block on the main page is hidden
  - the visible `Firm` tile on WAP `Commission` was removed from the dashboard tile list
- WAP `WithdrawSW` was aligned to the same derived `CW ปัจจุบัน` logic used on `Commission`:
  - withdrawable CW on the page now derives from:
    - cumulative qualified commission
    - minus CW -> SW conversion
    - minus CW withdrawn
  - do not assume the withdraw page should read raw `wallet.withdrawableBalance`
- BAO wallet review tooling was expanded:
  - added Wallet submenu entries for:
    - `CW > SW Transactions`
    - `SW Transfer Transactions`
  - added dedicated Orchid screens and routes for those two transaction views
  - initial route-default attempt caused Orchid to look for a `cw-to-sw()` method on the screen
  - this was fixed by splitting the views into concrete screen subclasses
- Local commits pushed during this round:
  - `37c24c74`
    - `Add wallet transaction admin screens and refine commission CW/SW UI`
  - `24ee2414`
    - `Align CW display and withdraw balance with current CW logic`
  - `d099085a`
    - `Refine commission summary panels and hide extra dashboard tiles`
- New follow-up planning note added:
  - [close_firm.md](/Users/macbook/poolproject/close_firm.md:1)
  - use this when resuming the request to hide/disable all `Firm` display safely across BAO and WAP
- Important current `Firm` status:
  - the user does not want to use `Firm` for now
  - WAP `Commission` should not show the `Firm` tile
  - BAO and WAP still contain deeper `Firm` routes, labels, admin fields, and order/settings logic
  - do not remove backend `Firm` logic blindly
  - safest next step is UI-hide only, as documented in `close_firm.md`

Latest Session Update (2026-05-16)

- Added a local commit for the latest member-facing CW/SW commission-page changes:
  - commit `2b711f14`
  - message: `Align CW/SW wallet logic and commission display`
- Confirmed and then changed the active member-wallet definitions in WAP/API flow:
  - `CW รวม` on WAP `Commission` now means:
    - total cumulative `direct + team + matching + pool` commissions received
  - `CW ปัจจุบัน` on WAP `Commission` now means:
    - cumulative `direct + team + matching + pool`
    - minus CW converted to SW
    - minus CW already withdrawn
  - `SW` remains the shopping-wallet bucket
- WAP `Commission` page was updated to match the new CW meaning:
  - tile label `CW วันนี้` was renamed to `CW ปัจจุบัน`
  - `CW ปัจจุบัน` logic no longer uses only same-day commission rows
  - `CW ปัจจุบัน` now uses:
    - `/auth/commissions`
    - `/auth/transactions`
    - `/auth/withdraw-requests`
  - `CW ปัจจุบัน` detail panel now shows:
    - cumulative qualified commission
    - CW converted to SW
    - CW withdrawn
    - recent CW conversion / withdraw activity
- CW/SW fee behavior was aligned with the latest requirement:
  - CW -> SW conversion now uses `5%` fee
  - CW withdraw now uses `5%` fee
  - WAP now shows fee breakdown and net amount for:
    - CW -> SW conversion
    - CW withdraw request
- Withdraw behavior was moved from SW semantics to CW semantics:
  - withdraw request now debits `withdrawableBalance`
  - cancelled withdraw requests now restore `withdrawableBalance`
  - member-facing WAP text was changed from `ถอน SW` to `ถอน CW`
- Runtime local settings were updated:
  - `runtime/wallet-settings.json`
    - `commissionToShoppingFeeRate = "0.05"`
  - `runtime/withdraw-settings.json`
    - `feeRate = "0.05"`
- Validation completed after the changes:
  - root `npm run lint` passed
  - WAP `npm run build` passed
  - only pre-existing WAP warnings remain in:
    - `src/screens/Product.tsx`
    - `src/screens/tabs/Home.tsx`
- Important repo-state note:
  - the WAP source lives under an ignored path in this repo
  - staging WAP changes required `git add -f` for:
    - `stephub/.../src/screens/Commission.tsx`
    - `stephub/.../src/screens/WithdrawSW.tsx`
- Important logic note for the next operator:
  - `CW รวม` and `CW ปัจจุบัน` on WAP are now custom derived UI metrics
  - they no longer map 1:1 to raw `wallet.withdrawableBalance`
  - `CW ที่ใช้แปลงได้` in the CW->SW modal currently follows `CW ปัจจุบัน`

Latest Session Update (2026-05-05)

- Merged PR `#129` into `main`:
  - `fix: stabilize worker module bootstrap`
  - merge commit on `main`: `9cab767b`
- Root cause that was verified during VPS dry-run:
  - worker restart was not caused by DB schema drift
  - worker restart was not caused by stale VPS source after host-copy sync
  - worker restart was not caused by Docker cache after a `--no-cache` worker rebuild check
  - remaining issue was current Nest module bootstrap wiring in the auth/members/wallets/commissions/worker chain
- Fix shape that landed:
  - replace barrel-based Nest module imports with direct module-file imports in the circular chain
  - add `AuthCoreModule` so `WalletsModule` depends on the narrower auth service/repository wiring instead of the full `AuthModule` graph
  - remove temporary debug logging before merge
- Local validation completed:
  - `npm run lint` passed
  - `npm run build` passed
- VPS dry-run checkpoint:
  - Stage 1 local pre-copy verification passed
  - Stage 2 VPS pre-boot verification passed after installing user-level `nvm` and `Node 20`
  - Stage 3 passed for:
    - `postgres`
    - `redis`
    - `api`
    - `bao`
    - `wap`
    - `nginx`
  - compatibility views were applied successfully
  - host-header checks passed for API / BAO / WAP
- Worker is now stable on VPS:
  - `docker compose ps worker` shows stable `Up`
  - logs show `[worker] started`
  - no remaining Nest bootstrap import error
- Stage 4 started:
  - `npm run smoke:wap:surface` passed
  - `npm run smoke:bao:all` is blocked on VPS host because `./node_modules/.bin/prisma` is missing there
  - `npm run smoke:pool:all` is blocked by the destructive reset guard:
    - `Refusing to run destructive pool-cap smoke reset. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 to continue.`
- Safest next operator step:
  - inspect BAO/pool smoke scripts before forcing anything
  - decide whether those smokes are intended for:
    - VPS host execution
    - local-only execution
    - or a dockerized/disposable test runner
  - do not set `ALLOW_DESTRUCTIVE_LOCAL_RESET=1` on the VPS unless using a disposable/test DB

Latest Session Update (2026-05-02)

- Closed the missing pool-payout gap in the local commission baseline by making pool reruns explicitly force reprocessing:
  - [packages/modules/pool/src/services/pool.service.ts](/Users/macbook/poolproject/packages/modules/pool/src/services/pool.service.ts:209)
    - `closePool()` now accepts `forceReprocess`
  - [packages/modules/commissions/src/services/commissions.service.ts](/Users/macbook/poolproject/packages/modules/commissions/src/services/commissions.service.ts:813)
    - end-of-day pool close now runs with force reprocess enabled
  - [packages/modules/pool/src/controllers/pool.controller.ts](/Users/macbook/poolproject/packages/modules/pool/src/controllers/pool.controller.ts:57)
    - added `POST /pool/:poolDate/close?force=1`
- Re-ran the local baseline after restarting the API and confirmed the main payout families are present again:
  - `Direct` present
  - `2leg / 3leg` present
  - `Matching` present
  - `Pool` present
- Confirmed from [runtime/commission-test-baseline-result.json](/Users/macbook/poolproject/runtime/commission-test-baseline-result.json:1):
  - `2025-11-17`
    - `poolLedgerAmount = 60`
    - `poolPayoutCount = 2`
  - `2025-11-18`
    - `poolLedgerAmount = 60`
    - `poolPayoutCount = 2`
  - `2025-12-02`
    - `poolLedgerAmount = 360`
    - `poolPayoutCount = 12`
- Direct pool rerun validation after the fix also succeeded:
  - `POST /pool/2025-11-22/close?force=1`
  - returned `eligibleMemberCount = 6`
  - this confirms the pool reprocess path is working against a recipient-positive date
- Remaining limitation:
  - the local baseline dataset is still not a perfectly clean reset because earlier reruns left some inflated order/PV totals on certain dates
  - the current result is good enough to confirm logic correctness
  - if a final report with fully clean numbers is needed, first clear the baseline test orders and rerun the baseline once from scratch
- Immediate next step for the next operator:
  - do a clean baseline reset
  - rerun the baseline once
  - freeze the final report from that clean run before making more commission-runtime changes

Latest Session Update (2026-05-01)

- Continued the commission-round repurchase runtime implementation in code:
  - shared commission finalization no longer short-circuits on `autoBuybackEnabled`
  - round threshold comparison is now `>= 10000`
  - pre-threshold accumulation is now persisted even before the first threshold hit
  - approved self-purchase now locks first qualification when the member has:
    - self approved purchase
    - `3` active directs
    - `3` direct buyers
  - qualifying repurchase now releases held commission rows and moves held wallet credit to withdrawable
  - pool eligibility now respects persisted first qualification and does not require rebuilding the original `3 direct buyers` gate after qualification has been locked
- Validation completed for the current code round:
  - `npm run lint` passed
- Locked the new commission-round repurchase business rule in the active plan:
  - first pool qualification requires:
    - self purchase
    - `3` directs
    - each direct has at least `1` approved purchase
  - later rounds do not require rebuilding the original `3 direct buyers` gate
  - one commission round completes when member commission accumulation is `>= 10000 THB`
  - counted channels are:
    - `Direct`
    - `Team 2-leg`
    - `Team 3-leg`
    - `Matching`
    - `Pool`
  - `Company fallback` does not count toward the member round threshold
  - after round completion, new commission is still calculated for `3` Bangkok calendar days but must be held pending repurchase
  - a qualifying self repurchase of `1000 THB` opens the next round
  - if no qualifying self repurchase happens within `3` days, new commission calculation must stop after grace expiry
- Updated the active source-of-truth plan:
  - [docs/technical-design/referral_commission_plan_thb.md](/Users/macbook/poolproject/docs/technical-design/referral_commission_plan_thb.md:1)
- Added implementation spec for the new round model:
  - [docs/technical-design/commission_round_repurchase_spec.md](/Users/macbook/poolproject/docs/technical-design/commission_round_repurchase_spec.md:1)
- Updated design index:
  - [docs/technical-design/README.md](/Users/macbook/poolproject/docs/technical-design/README.md:1)
- Remaining runtime gaps before claiming the new rule is fully implemented:
  - current runtime still uses `UserBuybackProgress` as the primary round-state store instead of a first-class `CommissionRound` entity
  - `CommissionLedger` and pool payout rows are not yet linked to an explicit round id
  - previously qualified members may still need a backfill path to lock `lastQualifyingOrderId` without waiting for a new qualifying self-purchase
  - the updated round runtime has now been re-verified against the existing local `210`-member baseline after the force-reprocess fix, but not yet from a perfectly clean reset
- Local commission scenario verification from the existing `210`-member baseline was completed using product `test 1000 / 200 PV`:
  - approved orders: `210`
  - settlement dates processed: `52`
  - direct/team/matching/fallback rows were created
  - pool cycles and pool payouts were created
  - after the force-reprocess fix, recipient-positive dates now create `POOL` commission ledger rows again

Current Goal

Implement the new commission-round repurchase model without reintroducing matrix rules:

- preserve the existing local baseline
- treat the updated plan docs as the only active source of truth
- convert current buyback gating into explicit commission-round lifecycle behavior
- make pool use:
  - first-time `3 direct buyers` qualification only once
  - later round renewal by qualifying self repurchase only

Immediate Next Steps

- Add a first-class commission-round data model instead of relying only on `UserBuybackProgress`.
- Add explicit round linkage on `CommissionLedger` and pool payout rows for BAO/WAP traceability.
- Decide and implement a safe backfill strategy for members who already passed first qualification historically.
- Re-run the local `210`-member commission baseline and inspect:
  - if the goal is final clean reporting, first clear old baseline test orders before rerunning
  - threshold transition to held
  - held wallet postings
  - repurchase release
  - post-expiry commission blocking
  - pool eligibility after a locked first qualification

Latest Session Update (2026-04-30)

- Local member baseline was reset and re-imported from `member003.xlsx`:
  - non-admin members = `210`
  - `memberCode` restored to `TH0000000` format mapped from `User.id`
- Local tree placement (`upline + L/M/R`) was rebalanced from sponsor rules and validated:
  - no duplicate `upline + placementSide` slots
  - no self-loop / cycle in sponsor and upline chains
- Added local safety tooling and runbook:
  - `docs/RUNBOOK_LOCAL_MEMBER_RESET.md`
  - reset/reconcile/validate/fill/rebalance scripts under `scripts/`
- Team Member runtime behavior updated:
  - `L/M/R` now show subtree totals per leg (not only direct first level)
  - member tree search is now restricted to current member and downline only (cannot search upward/outside subtree)
  - `GET /members/by-code/:memberCode/direct-referrals` is member-session scoped

Current Goal

Continue the CAP/DCW/FIRM phase rollout from the implemented Phase 0 plus safe Phase 1 foundation:

- FIRM is disabled for phase 1
- auto buyback is disabled for phase 1
- historical FIRM/DCW wallet data is preserved as legacy data
- CAP is not a wallet and must not be converted into FIRM or DCW balance
- DCW is a discount mechanism derived from CAP plus product/package rules
- full DCW checkout replacement is still Phase 2

Older commission runtime notes below remain useful historical context, but CAP/DCW/FIRM notes in this section take precedence where they conflict.

Current Locked CAP/DCW/FIRM Decisions

- Every approved eligible package/product purchase with pool/CAP condition grants a new CAP bucket.
- CAP buckets are stored separately per source order/package cycle; do not merge by mutating older buckets.
- User UI may display aggregated CAP remaining across open buckets.
- Admin/backend audit must show bucket-level CAP detail by source order.
- CAP consumption uses FIFO:
  - oldest approved bucket first
  - fully exhaust older bucket before newer bucket
  - order by source approved/created time, then id as tie-breaker
- CAP is consumed by both commission earning/payout and DCW discount usage.
- Pending DCW orders must reserve exact FIFO bucket amounts before final payment approval.
- Cancelled/rejected/failed DCW orders must release the exact bucket reservations.
- Approved/paid DCW orders must commit the exact reserved bucket amounts.
- CAP has no time expiry.
- `activeUntil` must not erase or invalidate CAP remaining.
- `activeUntil` may still control package qualification/receivable rules if existing commission logic requires it.

What Was Completed In Latest CAP/DCW/FIRM Round

- Phase 0 settings foundation:
  - added/normalized `firmEnabled` / `firm_enabled`
  - added/normalized `autoBuybackEnabled` / `auto_buyback_enabled`
  - both default to `false`
- FIRM disabled safely:
  - order creation rejects `firmWalletAmount > 0` when FIRM is disabled
  - approved-order FIRM credits no-op when FIRM is disabled
  - matrix auto/reentry FIRM credits no-op when auto buyback is disabled
  - package product-detail creation rejects new FIRM-enabled setup while FIRM is disabled
  - admin FIRM fields are disabled/read-only with legacy messaging
- Auto buyback disabled safely:
  - matrix auto order / `FIR001` creation is prevented when `autoBuybackEnabled=false`
  - buyback-release evaluation returns a safe no-progress result when disabled
- Phase 1 CAP foundation:
  - added Prisma `CapBucket` and `CapLedger` models
  - added migration `20260429_add_cap_bucket_ledger`
  - added `CapModule`
  - added `CapService.getCapSummary(userId)`
  - added `CapService.grantCapForApprovedOrder(orderId)`
  - added `CapService.allocateFifo(userId, amount, purpose)`
  - added scaffold methods for `reserveDcw`, `releaseDcw`, and `commitDcw`
  - added placeholder `commitCommission(commissionLedgerId)` for Phase 2 integration
  - added `GET /cap/:userId`
  - approved order flow now grants CAP idempotently after approval/paid handling
  - CAP grant creates separate buckets per eligible order item quantity unit
  - grant amount uses configured `earningCapAmount` when available, otherwise `10000`
- Validation completed:
  - `npx prisma format --schema prisma/schema.prisma` passed
  - `npx prisma generate --schema prisma/schema.prisma` passed
  - `npx prisma validate --schema prisma/schema.prisma` passed
  - `npm run lint` passed
- Added smoke script:
  - `npm run smoke:cap:foundation`
  - not run yet because it requires applying the new DB migration and writes smoke data

Next Safe Steps

- Apply the new CAP migration on the target database before runtime verification.
- Run `npm run smoke:cap:foundation` after migration is applied.
- Verify a first approved eligible order creates one CAP bucket.
- Verify approval retry does not create duplicate CAP buckets.
- Verify a second approved eligible order creates a second bucket instead of mutating the first.
- Verify `GET /cap/:userId` returns aggregated totals plus bucket detail.
- Build admin CAP audit UI around bucket-level source order detail.
- Build member UI display for aggregated `cap_remaining`.
- Phase 2: replace checkout DCW source from `Wallet.discountBalance` to CAP FIFO reservation.
- Phase 2: wire commission finalization into CAP FIFO consumption while keeping current commission behavior safe.
- Review/adapt legacy `smoke:firm` and `smoke:wallet:dcw` expectations because FIRM is intentionally disabled now.

Known Caveats

- Existing checkout still uses legacy `Wallet.discountBalance` for DCW until Phase 2.
- Existing `firmBalance` and FIRM wallet transactions remain historical/read-only and are not zeroed.
- Current commission cap accounting still uses `MemberPackageCycle.earnedTotalInCycle`; CAP ledger commission consumption is a Phase 2 integration point.
- CAP buckets must not be expired by `activeUntil`; only qualification logic may continue to reference `activeUntil`.

Previous Commission Runtime Goal

Lock the new commission runtime direction before implementation:

- `Direct` pays immediately on approved orders
- `2leg / 3leg`, `Matching`, and `Pool` run after end of day
- daily cap applies only to `2leg / 3leg`
- buyback / recycle stays unchanged
- pool uses daily approved PV funding with a per-member `3% of real paid amount` payout ceiling
- only these four commission plans are active for current implementation and verification:
  - `Direct`
  - `2leg / 3leg`
  - `Matching`
  - `Pool`
- do not use unrelated plans for active commission work:
  - `unilevel`
  - legacy/member003 sandbox analysis
  - deprecated `CommissionMainPlan`

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
    - identifier: `dev-admin@example.com`
    - password: `472121`
  - `GET /auth/me` with that token succeeded for local admin `dev-admin@example.com`
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
    - identifier placeholder `dev-admin@example.com`
    - password placeholder `472121`
    - hint text `Current local admin login: dev-admin@example.com / 472121`
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
      - identifier: `admin@stephub.local`
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
    - the deployed `/admin` page currently shows the local-dev admin login hint `dev-admin@example.com / 472121`
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

Update 2026-05-10

What changed today

- `member003` placement import was intentionally changed for test-fixture use:
  - keep `sponsorId` from the spreadsheet
  - derive placement tree by sponsor lineage and member-code order
  - first `3` directs under the same sponsor now place as `L / M / R`
  - directs beyond `3` now flow into the next open slot inside that sponsor subtree
- the placement derivation now matches across:
  - `scripts/import_member_profiles_from_xlsx.py`
  - `scripts/fill_member_profiles_from_member003.mjs`
  - `scripts/export_member003_members_fixture.py`
  - `scripts/member003-members.json`
- baseline timezone handling was fixed so Bangkok business-day grouping matches the way local baseline orders are stamped:
  - touched `CommissionBaselineDayRunner`
  - touched `CommissionBaselineRuntimeResetter`
  - touched `CommissionReportBuilder`
  - touched `seed_member003_test_baseline.js`
  - touched `cleanup-commission-test-baseline-runtime.js`
- a helper runner was added:
  - `scripts/run_member003_baseline_until_pool.js`
  - purpose: create/process baseline orders one by one, close each day, and stop or continue through pool events

What was verified today

- local DB was reset without touching catalog/product data
- `member003` members were re-seeded and the rebuilt placement tree was applied
- `TH0000013` placement now resolves as:
  - `TH0000014 -> TH0000013 / LEFT`
  - `TH0000016 -> TH0000013 / MIDDLE`
  - `TH0000017 -> TH0000013 / RIGHT`
- local runtime state after reset:
  - `User = 210`
  - `Order = 0`
  - `CommissionLedger = 0`
  - `TeamSettlementBatchItem = 0`
  - `DailyPoolPayout = 0`
- API health was confirmed on `http://127.0.0.1:3000/health`
- local WAP was confirmed listening on `http://127.0.0.1:3002`

Commits pushed today

- `3c5ff55e` `Fix member003 placement import and baseline timezone flow`
- `7eb99681` `Auto-open local WAP and BAO after launcher`

Exactly what to do next after this handoff

1. Start from the current clean local member/runtime state
- do not assume any old baseline order or commission rows still exist
- if someone sees leftover report rows, they are looking at a different DB/session and should verify the active local stack first

2. Re-run baseline from scratch against the rebuilt member tree
- preferred flow:
  - use the BAO commission test controls
  - or use `scripts/run_member003_baseline_until_pool.js`
- verify again that team, matching, and pool now reflect the rebuilt `L / M / R` placement for `member003`

3. Keep the scope locked
- do not reopen product/catalog cleanup
- do not revert the new `member003` test placement rule unless the business explicitly wants the spreadsheet literal tree back
- treat this placement logic as a test-fixture import policy, not a generic production genealogy rule
## 2026-05-17 Team Carry Forward Fix

- Fixed `team 2-leg / 3-leg` scaffold so previous `carryForwardPvByLeg` is loaded into the next settlement day before adding new approved-order PV.
- Files changed:
  - `packages/modules/commissions/src/domain/commissions.types.ts`
  - `packages/modules/commissions/src/repositories/commissions.repository.ts`
  - `packages/modules/commissions/src/services/commissions.service.ts`
- Local verification:
  - `npm run lint` passed
  - `npm run build` passed
- Server deployment:
  - hot-patched compiled API files inside `poolproject-uat-api-1`
  - restarted container and verified `http://127.0.0.1:3000/health` -> `{"status":"ok"}`
- Important behavior note:
  - this fix affects future team settlement runs and reruns
  - existing historical `CommissionLedger` rows do not change automatically until the relevant settlement dates are reprocessed
  - for `TH0000013`, current history still shows one `TEAM_2LEG` row because old processed batches were not rerun after the fix

## 2026-05-22 BAO Promotion 100 PV and WAP Hide-Test Follow-Up

What changed today

- promotion rule from yesterday was turned into a reusable BAO/UAT-ready setup for real `100 PV` products:
  - promotion code: `PROMO-100PV-2PLUS-500-100PV`
  - rule: `min qty = 2`, `promo price = 500`, `promo pv = 100`
- active WAP storefront now hides test SKUs by code prefix:
  - `COMMTEST1000`
  - `COMMTEST650`
- added reusable local scripts:
  - [scripts/configure_bao_promotion_100pv.js](/Users/macbook/poolproject/scripts/configure_bao_promotion_100pv.js:1)
  - [scripts/wap-promotion-commission-check.js](/Users/macbook/poolproject/scripts/wap-promotion-commission-check.js:1)
- wired npm commands:
  - `npm run ops:configure:bao:promotion-100pv`
  - `npm run test:wap:promotion-100pv`
- current storefront filter lives in:
  - [packages/modules/packages/src/repositories/packages.repository.ts](/Users/macbook/poolproject/packages/modules/packages/src/repositories/packages.repository.ts:944)

What was verified locally

- local promotion record was created in BAO sqlite and snapshot-applied to these current real `100 PV` WAP products:
  - `LON001`
  - `PRO001`
  - `DRI001`
- local BAO dropdown now has the promotion and `ProductDetail` rows carry:
  - `promotionStatus = ACTIVE`
  - `promotionMinQuantity = 2`
  - `promotionPriceUsdt = 500`
  - `promotionPv = 100`
- local storefront no longer exposes `COMMTEST1000` or `COMMTEST650`
- local order verification for `TH0000013`, `TH0000016`, `TH0000023`, `TH0000074` on `DRI001`:
  - `qty = 1` -> `700 / 100 PV`
  - `qty = 2` -> `1000 / 200 PV`
- local WAP-visible order snapshots and order-linked commission rows were captured by script
- important local runtime note:
  - local DB had schema drift and was missing `MemberPackageCycle.readyToReceiveAt`
  - the local test only succeeded after applying the known SQL from:
    - [prisma/migrations/20260518_add_member_cycle_pv_accumulation/migration.sql](/Users/macbook/poolproject/prisma/migrations/20260518_add_member_cycle_pv_accumulation/migration.sql:1)

What was verified on UAT

- backup created before changes:
  - `/home/nc-user/backups/uat-promo100pv-20260522-130247`
- local commit was pushed:
  - `360fe362` `Configure real 100 PV promotion and hide test WAP products`
- UAT repo cherry-pick commit:
  - `de40c482` `Configure real 100 PV promotion and hide test WAP products`
- UAT API was rebuilt/recreated from:
  - `deploy/compose/docker-compose.yml`
- UAT BAO sqlite was updated in-container to add the expanded `promotions` columns when missing, then upsert the real promotion row
- UAT `ProductDetail` snapshot was applied to:
  - `LON001`
  - `PRO001`
  - `DRI001`
- UAT storefront API check confirmed:
  - `COMMTEST1000` hidden
  - `COMMTEST650` hidden
- UAT internal order-flow verification on `DRI001` for user ids `13 / 16 / 23 / 74`:
  - `qty = 1` -> `700 / 100 PV`
  - `qty = 2` -> `1000 / 200 PV`
- UAT direct commission rows from internal runtime verification:
  - `TH0000013`
    - `qty = 1` -> `TH0000012 = 50`, `TH0000007 = 50`
    - `qty = 2` -> `TH0000012 = 100`, `TH0000007 = 100`
  - `TH0000016`
    - `qty = 1` -> `TH0000013 = 50`, `TH0000012 = 50`
    - `qty = 2` -> `TH0000013 = 100`, `TH0000012 = 100`
  - `TH0000023`
    - `qty = 1` -> `TH0000016 = 50`, `TH0000013 = 50`
    - `qty = 2` -> `TH0000016 = 100`, `TH0000013 = 100`
  - `TH0000074`
    - `qty = 1` -> `TH0000023 = 50`, `TH0000016 = 50`
    - `qty = 2` -> `TH0000023 = 100`, `TH0000016 = 100`

Important current business behavior

- promotion counting is currently `per ProductDetail only`
- examples with the current logic:
  - `E NER G 2` gets promotion
  - `Colla mineral 2` gets promotion
  - `E NER G 1 + Colla mineral 1` does **not** get promotion
  - `E NER G 3` gets promotion on all `3` pieces of that same SKU
  - `E NER G 2 + Colla mineral 1` only promotes the `E NER G` line
- the current calculation is in:
  - [packages/modules/orders/src/repositories/orders.repository.ts](/Users/macbook/poolproject/packages/modules/orders/src/repositories/orders.repository.ts:1413)

Open question left intentionally unresolved

- user asked whether the system should support both:
  - `per SKU` counting
  - `grouped across multiple SKUs that share one promotion`
- no code change was made for grouped counting yet
- recommended implementation path:
  - add a promotion scope field such as `SKU_ONLY` vs `PROMOTION_GROUP`
  - update BAO promotion admin UI to choose the scope
  - update order runtime to count either:
    - quantity per `productDetailId`
    - or quantity across all order lines that share the same promotion id/code

What to do next

1. Decide the final promotion counting rule
- if business wants mixed basket promotion such as `E NER G 1 + Colla mineral 1` to qualify, runtime must be changed
- do not patch this ad hoc per product; make it a promotion-level rule

2. If grouped promotion is approved, change these areas together
- BAO promotion schema/model
- BAO promotion dropdown/admin surface
- order pricing logic in `orders.repository.ts`
- local and UAT regression tests

3. If UAT member-facing WAP browser verification is still needed
- get the real test passwords for:
  - `TH0000013`
  - `TH0000016`
  - `TH0000023`
  - `TH0000074`
- `a1a1a1` and `123456` did not work on UAT member login during this session
- internal runtime verification succeeded, but browser login verification could not be completed without those credentials

## 2026-05-23 Admin Credential Management and Next Sync Focus

What changed today

- added a working checklist for the long-running `AdminUser / Member` split:
  - [docs/technical-design/admin-user-member-separation-checklist.md](/Users/macbook/poolproject/docs/technical-design/admin-user-member-separation-checklist.md:1)
- added BAO admin-management support for `username` plus direct password-setting by `superadmin` on the Orchid `Admins` screen
- local BAO migration was applied to add the new `username` column to Laravel/Orchid `users`
- added a retry helper for flaky GitHub PR-description updates:
  - [scripts/update_pr_description_with_retry.sh](/Users/macbook/poolproject/scripts/update_pr_description_with_retry.sh:1)

Key commits pushed today

- `bfad7cb5` `Add admin credential management checklist and BAO username support`
- `4173fd91` `Add retry helper for PR description updates`

Important current behavior

- BAO `Admins` can now store:
  - `name`
  - `username`
  - `email`
  - `password`
- only `superadmin` can change admin `username/password` from the admin-edit screen
- current BAO login is still `email + password`
- `username` is now managed data for admins, but it is **not** yet a login credential

Files involved for the admin credential work

- [UserEditScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/User/UserEditScreen.php:37)
- [UserEditLayout.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Layouts/User/UserEditLayout.php:18)
- [UserListLayout.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Layouts/User/UserListLayout.php:28)
- [App\Models\User.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Models/User.php:10)
- [2026_05_23_143525_add_username_to_users_table.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/database/migrations/2026_05_23_143525_add_username_to_users_table.php:13)

Known inventory mismatch left for the next session

- runtime transaction data was already cleaned and aligned between local and UAT
- master data still differs intentionally and remains unresolved:
  - local:
    - `users = 212`
    - `products = 8`
    - `productDetails = 9`
    - `packages = 3`
  - UAT:
    - `users = 269`
    - `products = 6`
    - `productDetails = 7`
    - `packages = 1`
- this mismatch is the next main task if the goal is to make local and UAT comparable for member/catalog troubleshooting

What to do next

1. Decide the sync direction for master data
- either treat `UAT` as source of truth and pull members/catalog/package masters down to local
- or treat `local` as curated baseline and promote specific missing masters up to UAT

2. Compare these domains separately before changing data
- members/admin-related users
- products
- product details / SKU rows
- packages
- supporting masters referenced by product details such as category, supplier, and family

3. Prepare a safe diff pass before any data sync
- export counts and keys by:
  - `memberCode`
  - `product code`
  - `productDetail code / SKU`
  - `package code`
- identify:
  - rows only in local
  - rows only in UAT
  - rows present in both but with different business fields

4. Do not mix this sync work with the `AdminUser / Member` schema split yet
- the admin/member split is still architecture work
- the local/UAT mismatch is operational master-data reconciliation
- treat them as separate workstreams to keep rollback and verification manageable
