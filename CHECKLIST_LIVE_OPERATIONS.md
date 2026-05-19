# Live Operations Checklist

Updated: 2026-05-19

Use this checklist before starting real data entry and real day-to-day usage on the current local/runtime stack.

## Current UAT Go-Live State

- [x] Full backup created before the final clean reset:
  - [x] `/home/nc-user/poolproject/backups/uat-full-20260519-164006`
- [x] Final UAT transaction reset executed against `poolproject-uat-postgres-1`
- [x] Reset now clears `SpecialCommissionCycleGrant`
- [x] Remaining UAT-only test data removed after reset:
  - [x] members `UTPVLOCK-134839`, `UTPVLOCKC-134839`
  - [x] catalog `COMMTEST1000`, `COMMTEST650`, `COMMTESTPKG1000`, `COMMTESTPKG650`
- [x] Post-clean counts on UAT:
  - [x] `User = 269`
  - [x] `Product = 6`
  - [x] `ProductDetail = 7`
  - [x] `Package = 1`
  - [x] `Order = 0`
  - [x] `CommissionLedger = 0`
  - [x] `MemberPackageCycle = 0`
  - [x] `SpecialCommissionCycleGrant = 0`
- [x] Post-clean health checks still pass:
  - [x] `http://127.0.0.1:3000/health => {"status":"ok"}`
  - [x] `http://127.0.0.1:18001/admin/login => 200`
- [x] UAT ops scripts now prefer `poolproject-uat-postgres-*` automatically when both old and UAT Postgres containers exist

## Local Vs UAT Parity

Use this section first when BAO commission-report actions work locally but fail on UAT.

- [ ] Confirm local API source includes [apps/api/src/internal-bao.controller.ts](/Users/macbook/poolproject/apps/api/src/internal-bao.controller.ts:1)
- [ ] Confirm local API module registers `InternalBaoController` in [apps/api/src/app.module.ts](/Users/macbook/poolproject/apps/api/src/app.module.ts:1)
- [ ] Confirm local build output contains:
  - [ ] `dist/apps/api/apps/api/src/internal-bao.controller.js`
  - [ ] `dist/apps/api/apps/api/src/app.module.js` references `InternalBaoController`
- [ ] Confirm UAT API container contains the same built files:
  - [ ] `docker exec poolproject-uat-api-1 sh -lc "ls /app/dist/apps/api/apps/api/src/internal-bao.controller.js"`
  - [ ] `docker exec poolproject-uat-api-1 sh -lc "grep -n 'internal_bao_controller_1\\.InternalBaoController' /app/dist/apps/api/apps/api/src/app.module.js"`
- [ ] Confirm UAT API route responds directly when called with the shared token:
  - [ ] `TOKEN=$(grep '^INTERNAL_RECEIPT_TOKEN=' deploy/compose/api.env | tail -1 | cut -d= -f2-)`
  - [ ] `curl -sS -D - -o /tmp/uat_internal_bao.out -H "x-internal-bao-token: $TOKEN" -H 'Content-Type: application/json' -X POST http://127.0.0.1:3000/internal/bao/orders -d '{"userId":"1","productDetailId":"1","quantity":"1"}'`
- [ ] Confirm BAO runtime code on UAT includes `internalRequest()`:
  - [ ] `docker exec poolproject-uat-bao-1 sh -lc "grep -n 'function internalRequest' /var/www/html/backend/app/Support/BaoAdminApiClient.php || echo NOT_FOUND"`
- [ ] Confirm both UAT env files contain the shared token:
  - [ ] `grep '^INTERNAL_RECEIPT_TOKEN=' /home/nc-user/poolproject/deploy/compose/api.env`
  - [ ] `grep '^INTERNAL_RECEIPT_TOKEN=' /home/nc-user/poolproject/deploy/compose/bao.env`
- [ ] After recreating `bao`, confirm `nginx` is not pinned to the old upstream IP:
  - [ ] `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' poolproject-uat-bao-1`
  - [ ] `docker exec poolproject-uat-nginx-1 sh -lc 'getent hosts bao'`
  - [ ] if logs still show the old IP, restart `nginx`
- [ ] For this 2026-05-16 incident, keep these findings in mind:
  - [ ] local had `InternalBaoController` in source and `dist`
  - [ ] UAT API image `poolproject-uat-api:latest` was created on `2026-04-30T19:22:47+07:00`
  - [ ] UAT API `dist` did not contain `internal-bao.controller.js`
  - [ ] direct UAT API call returned `404 Cannot POST /internal/bao/orders`
  - [ ] BAO required a hotfix copy of [BaoAdminApiClient.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/BaoAdminApiClient.php:1)
  - [ ] `api.env` and `bao.env` were both missing `INTERNAL_RECEIPT_TOKEN`
  - [ ] `nginx` returned `502` after `bao` recreate because it still tried upstream `172.18.0.6` while the new `bao` container was `172.18.0.5`
- [ ] Treat the permanent fix as:
  - [ ] rebuild and redeploy `api` from current source so `/internal/bao/*` exists in UAT `dist`
  - [ ] rebuild and redeploy `bao` from current source so `BaoAdminApiClient::internalRequest()` survives recreate
  - [ ] keep `INTERNAL_RECEIPT_TOKEN` present and identical in both `api.env` and `bao.env`
  - [ ] restart or reload `nginx` after `bao` recreate when upstream IP drift is observed

## Commission Round Repurchase Shortcut

Use this section first when continuing the new commission-round repurchase rule.

- [ ] Open [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md:1)
- [ ] Open [docs/technical-design/referral_commission_plan_thb.md](/Users/macbook/poolproject/docs/technical-design/referral_commission_plan_thb.md:1)
- [ ] Open [docs/technical-design/commission_round_repurchase_spec.md](/Users/macbook/poolproject/docs/technical-design/commission_round_repurchase_spec.md:1)
- [ ] Open [docs/technical-design/pv_cycle_cap_accumulation_plan.md](/Users/macbook/poolproject/docs/technical-design/pv_cycle_cap_accumulation_plan.md:1)
- [ ] Treat the updated commission plan docs above as the only active source of truth for round repurchase behavior
- [ ] Keep matrix out of scope unless the user explicitly reopens it
- [ ] If using BAO special commission privilege, record the business reason in the form instead of leaving it blank
- [ ] When granting a special commission cycle, confirm whether the member should receive `100 PV / cap 5,000` or `200 PV / cap 10,000`
- [ ] After granting a special commission cycle, confirm the new cycle is `receivable` or `queued` as expected in `MemberPackageCycle`
- [ ] Confirm current runtime gap before coding:
  - [ ] threshold must become `>= 10000`
  - [ ] grace period remains `3` Bangkok calendar days
  - [ ] qualifying repurchase is approved self-purchase with `PV > 0`
  - [ ] direct `3 buyers` is a first-qualification-only gate
  - [ ] later rounds use self repurchase only
  - [ ] commission must still calculate during grace but release as held
  - [ ] commission must stop calculating after grace expiry until qualifying repurchase
  - [ ] active daily team cap is `10000`
- [ ] Confirm the latest referral-placement rule is preserved:
  - [x] before the sponsor has directs in all `LEFT / MIDDLE / RIGHT`, signup placement must force `AUTO`
  - [x] bootstrap placement must fill any missing top-side leg first
  - [x] explicit `LEFT / MIDDLE / RIGHT` links are allowed only after the sponsor has at least one direct in each top-side leg
  - [x] `AUTO` after unlock must choose the branch with no approved-PV score first, or else the branch with the lowest approved-PV score
- [ ] Confirm current runtime mismatch is still understood:
  - [ ] no first-class `CommissionRound` model exists yet
  - [ ] `CommissionLedger` and pool payout rows still do not carry an explicit round id
  - [ ] historically qualified members may still need a one-time backfill for locked initial qualification
  - [ ] the updated runtime now passes a reused baseline rerun after the latest pool force-reprocess fix
  - [ ] if reporting needs clean final numbers, do one fully clean baseline reset and rerun before freezing results
- [ ] Confirm the new PV cycle-cap gap is still understood:
  - [ ] current runtime still opens `MemberPackageCycle` directly from approved items
  - [ ] current runtime still snapshots `earningCap` from product/package master data
  - [ ] no accumulated PV state exists yet on cycle runtime
  - [ ] no queued next-cycle carry PV flow exists yet
  - [ ] current cycle cannot yet upgrade from `5000` to `10000` when later PV reaches `200`
- [ ] Preserve the existing local baseline of `210` non-admin members
- [ ] Do not seed extra members for this phase
- [ ] When touching pool logic, keep the first gate and renewal gate separate:
  - [ ] first gate = self purchase + `3` directs + `3` direct buyers
  - [ ] later rounds = self repurchase only
- [ ] When touching cycle-cap logic, keep local and UAT/server on the same rule set:
  - [ ] cycle cap uses PV only, not purchase amount
  - [ ] `< 200 PV => 5000`
  - [ ] `>= 200 PV => 10000`
  - [ ] old cycle still pays first
  - [ ] excess PV can seed the next queued cycle
- [ ] If implementation changes the active rule again, update both:
  - [ ] [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md:1)
  - [ ] [CHECKLIST_LIVE_OPERATIONS.md](/Users/macbook/poolproject/CHECKLIST_LIVE_OPERATIONS.md:1)

## PV Cycle Cap Rollout Shortcut

Use this section first when the task is specifically the new `PV-only` cycle-cap rule.

- [ ] Open [docs/technical-design/pv_cycle_cap_accumulation_plan.md](/Users/macbook/poolproject/docs/technical-design/pv_cycle_cap_accumulation_plan.md:1)
- [ ] Confirm the locked rules:
  - [ ] no order amount gate for cycle cap
  - [ ] `< 200 PV => 5000`
  - [ ] `>= 200 PV => 10000`
  - [ ] current cycle can be upgraded mid-stream when later PV reaches `200`
  - [ ] excess PV can carry into the next queued cycle
  - [ ] payout still goes to the oldest receivable cycle first
- [ ] Confirm implementation scope:
  - [x] schema/data model
  - [x] approved-order PV allocation
  - [x] cycle-cap recompute logic
  - [ ] local test coverage
  - [x] UAT deploy and DB verification
- [ ] Before coding:
  - [x] inspect `packages/modules/orders/src/services/orders.service.ts`
  - [x] inspect `packages/modules/members/src/repositories/members.repository.ts`
  - [x] inspect `packages/modules/qualification/src/services/qualification.service.ts`
  - [x] inspect `packages/modules/cap/src/services/cap.service.ts`
- [ ] Local source status after the current round:
  - [x] Prisma schema updated
  - [x] migration file created
  - [x] approved-order PV allocation path updated
  - [x] cycle receivability normalization added
  - [x] `npx prisma validate --schema prisma/schema.prisma`
  - [x] `npx prisma generate --schema prisma/schema.prisma`
  - [x] `npm run lint`
- [ ] Before UAT rollout:
  - [ ] back up DB
  - [x] record current `ProductDetail` and `Package` PV/cap master rows
  - [x] prepare post-deploy verification queries for `MemberPackageCycle`
- [ ] After rollout:
  - [x] verify one `< 200 PV` scenario
  - [x] verify one `>= 200 PV` scenario
  - [x] verify one `100 + 100 PV` upgrade scenario
  - [x] verify one carry-forward-to-next-cycle scenario
  - [x] verify queued-cycle promotion after the older cycle is capped
  - [x] verify `carryOverPvOut` is populated for the `200 + 100` scenario
  - [x] confirm `api` and `worker` restart cleanly after deploy
  - [x] confirm new `MemberPackageCycle` PV fields exist on UAT
  - [x] backfill old UAT cycles if the new fields default to zero on pre-existing rows
  - [x] prepare matching test catalog on local and UAT:
    - [x] `COMMTEST1000 / COMMTESTPKG1000 = 1000 THB / 200 PV`
    - [x] `COMMTEST650 / COMMTESTPKG650 = 650 THB / 100 PV`
  - [x] verify queued-cycle promotion after the older cycle is truly capped
  - [x] decide whether `carryOverPvOut` needs a follow-up fix
  - [ ] run threshold-upgrade scenario `150 PV + 60 PV`
  - [ ] run grace-expiry scenario and confirm post-expiry state becomes `BLOCKED_EXPIRED`
  - [ ] run late-repurchase-after-expiry scenario with `100 PV`
  - [ ] run late-repurchase-after-expiry scenario with `200 PV`
  - [ ] run repurchase-order cancel/recompute scenario and confirm round state rollback rules
  - [ ] document expected large-quantity self-purchase fan-out behavior if business later wants a limit

## CAP/DCW/FIRM Phase Shortcut

Use this section first when continuing the CAP/DCW/FIRM phase. Older FIRM catalog and commission runtime checklist items below are historical unless they are explicitly revalidated for the new phase.

- [ ] If the user asks to hide or close `Firm` display, open [close_firm.md](/Users/macbook/poolproject/close_firm.md:1) first
- [ ] Treat the current recommended `Firm` approach as `hide UI only` first
- [ ] Do not remove backend `Firm` wallet/order/settings/product logic until dependency review is complete
- [ ] WAP first-pass target:
  - [ ] hide `Firm` route/page exposure
  - [ ] keep underlying wallet/API fields unless proven unused
- [ ] BAO first-pass target:
  - [ ] hide `Firm balance` from member detail
  - [ ] hide display-only `Firm` labels where possible
  - [ ] do not remove `firm_wallet` flow or auto-order/product settings blindly
- [x] Treat FIRM as disabled in phase 1.
- [x] Treat auto buyback as disabled in phase 1.
- [x] Preserve historical FIRM wallet balances and FIRM wallet transactions.
- [x] Do not zero, migrate, or convert old FIRM/DCW wallet balances into CAP.
- [x] Treat CAP as a separate non-wallet entitlement bucket.
- [x] Treat DCW as a discount mechanism derived from CAP plus product/package rules, not as a new wallet.
- [x] Settings foundation exists for `firmEnabled=false` and `autoBuybackEnabled=false`.
- [x] Order creation rejects `firmWalletAmount > 0` when FIRM is disabled.
- [x] Approved-order FIRM credit path no-ops when FIRM is disabled.
- [x] Matrix auto/reentry FIRM credit paths no-op when auto buyback is disabled.
- [x] Matrix auto order / `FIR001` creation is prevented when auto buyback is disabled.
- [x] Admin FIRM product-detail controls are disabled/read-only with legacy wording.
- [x] Prisma `CapBucket` and `CapLedger` models exist.
- [x] Migration exists at `prisma/migrations/20260429_add_cap_bucket_ledger`.
- [x] `CapModule` and `CapService` foundation exist.
- [x] `GET /cap/:userId` exists for admin/backend CAP summary checks.
- [x] Approved eligible orders call the idempotent CAP grant hook.
- [x] `npm run lint` passed after the CAP/DCW/FIRM foundation changes.
- [x] `npx prisma validate --schema prisma/schema.prisma` passed after the CAP/DCW/FIRM foundation changes.
- [ ] Apply the CAP migration to the target DB before runtime testing.
- [ ] Run `npm run smoke:cap:foundation` only after the migration is applied.
- [ ] Verify first approved eligible order creates one CAP bucket.
- [ ] Verify approval retry does not duplicate the CAP grant.
- [ ] Verify second approved eligible order creates a second CAP bucket, not a mutation of the first.
- [ ] Verify FIFO allocation plans from oldest open bucket first.
- [ ] Verify `activeUntil` does not expire CAP remaining.
- [ ] Add admin CAP audit UI showing source order, granted, used commission, reserved DCW, used DCW, remaining, and status.
- [ ] Add member UI display for aggregated `cap_remaining`.
- [ ] Phase 2: replace checkout DCW usage from `Wallet.discountBalance` with CAP FIFO reservation.
- [ ] Phase 2: release exact CAP bucket reservations when pending DCW orders cancel/reject/fail.
- [ ] Phase 2: commit exact CAP bucket reservations when DCW orders approve/pay.
- [ ] Phase 2: wire commission finalization into CAP FIFO consumption.
- [ ] Do not use legacy `smoke:firm` or `smoke:wallet:dcw` as pass criteria until their expectations are adapted for FIRM-disabled phase 1.

## Next Session Shortcut

Use this section first if the current task is the Stephub commission refactor and you want to continue without re-reading older handoff notes.

- [ ] Open [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md:1)
- [ ] Open [docs/technical-design/pool_daily_eod_spec.md](/Users/macbook/poolproject/docs/technical-design/pool_daily_eod_spec.md:1)
- [ ] Open [docs/technical-design/referral_commission_plan_thb.md](/Users/macbook/poolproject/docs/technical-design/referral_commission_plan_thb.md:1)
- [ ] Open [docs/technical-design/commission_round_repurchase_spec.md](/Users/macbook/poolproject/docs/technical-design/commission_round_repurchase_spec.md:1)
- [ ] Ignore old receipt/PDF work unless the user explicitly asks for it
- [ ] Confirm these still pass before touching more code:
  - [ ] `npx prisma validate --schema prisma/schema.prisma`
  - [ ] `npm run lint`
- [ ] At the end of the session, update both `HANDOFF_NEXT.md` and `CHECKLIST_LIVE_OPERATIONS.md`
- [ ] If the session is for server handoff, prepare a zip bundle under `deploy/releases/`
- [ ] Treat `COMM-04` as complete
- [ ] Treat `COMM-05` backend scope as complete
- [ ] Treat `COMM-05` close-out as complete unless a real bug is found
- [ ] Keep the shared cap/gating path as the single source of truth for commission finalization
- [ ] Keep `referral_commission_plan_thb.md` as the only active plan reference
- [ ] Do not restart team/matching implementation unless a bug is found
- [ ] Team scaffold exists already via `POST /commissions/team-settlement-batches/:settlementDate/scaffold`
- [ ] Team process endpoint exists via `POST /commissions/team-settlement-batches/:settlementDate/process`
- [ ] End-of-day process endpoint exists via `POST /commissions/end-of-day/:settlementDate/process`
- [ ] Current scaffold already captures per-leg `memberCount + totalPv` and computes payout/carry-forward math
- [ ] Matching is now created from actual team final payable after cap during team process
- [ ] Rerun guard exists for repeated team process calls on the same settlement date
- [ ] Processed team batches are protected from being overwritten by scaffold reruns
- [ ] Team scaffold/process now use serializable transaction retry to reduce concurrent overwrite risk
- [ ] Pool source orders now read by Bangkok single-day range, not the old weekly range
- [ ] Pool qualification now targets own purchase + `3` directs + `3` direct buyers
- [ ] Keep pool ordering locked behind `team -> buyback side effect -> pool`
- [ ] Pool payout creation now runs through the shared commission finalize path
- [ ] Pool payout snapshots now link back to `commissionLedgerId`
- [ ] `closePool(poolDate)` now reruns and reports `reprocessed` when the cycle already existed
- [ ] Team snapshot endpoint exists: `GET /commissions/team-settlement-batches/:settlementDate/snapshot`
- [ ] Pool snapshot endpoint exists: `GET /pool/:poolDate/snapshot`
- [ ] Admin quick actions expose team `Scaffold / Team Only / End Of Day / Snapshot`
- [ ] Admin quick actions expose pool `Snapshot / Payouts`
- [ ] `/admin` local surface is available again for commission runtime controls
- [ ] Matrix is soft-disabled in runtime unless business explicitly asks to turn it back on
- [ ] BAO matrix panels and matrix source filter are hidden when matrix visibility is off
- [ ] One-leg carry-forward smoke exists: `npm run smoke:commissions:team-carry-forward`
- [ ] Team final-payable-to-matching smoke exists: `npm run smoke:commissions:team-matching-final-payable`
- [ ] Team concurrent rerun smoke exists: `npm run smoke:commissions:team-concurrent-rerun`
- [ ] `COMM-05` close-out runtime checks are effectively complete on the local stack
- [ ] Runtime-verified sample already exists for `2025-11-27`:
  - [ ] team snapshot stays `processed` after rerun
  - [ ] concurrent rerun smoke keeps batch `processed` with stable counts
  - [ ] pool close returns `reprocessed: true`
  - [ ] sample pool date currently has `0` eligible recipients, so payout-path verification is intentionally deferred for now
  - [ ] one-leg carry-forward stays `payable=0`, `bonus=0`, `status=carried_forward`
  - [ ] isolated fixture proves matching `basePv` comes from team `finalPayableAmount`
- [ ] Finish adjustment-plan cleanup before reopening recipient-positive pool testing
- [ ] Treat recipient-positive pool verification as the next phase, not as unfinished `COMM-05`
- [ ] New commission UI work can start from this point without reopening `COMM-05`
- [ ] When resuming pool phase, use a date or fixture with at least `1` eligible recipient before judging payout-path behavior
- [ ] When resuming pool phase, verify in order:
  - [ ] `team -> buyback side effect -> pool`
  - [ ] `POST /pool/:poolDate/close?force=1` yields non-zero eligible recipients on a known positive date
  - [ ] `GET /pool/:poolDate/snapshot` shows payout rows and correct summary counts
  - [ ] `commissionLedgerId` linkage is present on pool payouts
  - [ ] held pool payouts land in the held wallet bucket when applicable
  - [ ] rerun returns `reprocessed: true` without duplicate payout/wallet effects
  - [ ] reuse the verified recipient-positive cap fixture pattern from `2030-01-16` when validating future pool changes

Locked rules for next session:

- [ ] Referral identity uses `referralCode`, not `memberCode`
- [ ] New sign-up links use `/SignUp?ref=...`
- [ ] Team structure is `L / M / R`
- [ ] Daily cap is `5000 THB`
- [ ] Daily cap applies only to `2leg / 3leg`
- [ ] Buyback threshold uses `final payable after cap`
- [ ] Commission round completes at `>= 10000 THB`
- [ ] Qualifying repurchase is approved self-purchase with `PV > 0`
- [ ] No auto-deducted recycle purchase
- [ ] Excess above threshold is held pending member-initiated repurchase for `3` calendar days in `Asia/Bangkok`
- [ ] If not completed in time, status becomes `BLOCKED_AFTER_EXPIRY`
- [ ] Commission still calculates during the `3`-day grace window, but new rows are held
- [ ] New commission stops calculating after grace expiry until qualifying self repurchase
- [ ] `Direct` pays immediately when an order becomes `approved`
- [ ] `2leg / 3leg`, `Matching`, and `Pool` run after end of day
- [ ] Matching is based on actual team payable after the team-only daily cap
- [ ] Pool basis is same-day approved PV from pool-enabled products
- [ ] Pool qualification timing is `qualify today -> receive tomorrow`
- [ ] Pool can continue daily until the related `memberPackageCycle` ends
- [ ] Pool payout per member is capped at `3%` of real paid pool-enabled purchase amount for that day
- [ ] Immediate approved-order flow should create `Direct` only, not same-day `cashback` or `uni`
- [ ] Commission basis uses approved order PV from real catalog items: `sum(quantity x unitPv)`
- [ ] Commission payout interprets `1 PV = 1 THB`
- [ ] Pool qualification needs member own purchase + `3` directs + each direct has `1` purchase order
- [ ] Pool needs the `3 direct buyers` gate only for first qualification, not for every later round
- [ ] Locked daily order is `team -> buyback side effect -> pool`
- [ ] If 3-team has only 2 payable legs, fall back to the 2-leg rule

## Safety First

- [ ] Run `npm run dev:restart`
- [ ] Run `npm run dev:check`
- [ ] If using macOS auto-start, run `npm run dev:launchd:status`
- [ ] Confirm you are not using `DEV_RESET_BASELINE=1`
- [ ] Confirm you are not running smoke/reset scripts
- [ ] Create a fresh DB backup before starting
- [ ] If deploying this 2026-04-29 commission runtime round, use:
  - [ ] [commission-runtime-2026-04-29.zip](/Users/macbook/poolproject/deploy/releases/commission-runtime-2026-04-29.zip)
  - [ ] [commission-runtime-2026-04-29-release.md](/Users/macbook/poolproject/deploy/commission-runtime-2026-04-29-release.md:1)
  - [ ] uploaded server copy exists at `/home/nc-user/commission-runtime-2026-04-29.zip`
  - [ ] Google Drive copy exists at `nutrientlife.co.ltd@gmail.com/My Drive/commission-runtime-2026-04-29.zip`
  - [ ] Google Drive release note exists at `nutrientlife.co.ltd@gmail.com/My Drive/commission-runtime-2026-04-29-release.md`
  - [ ] Google Drive copy exists at `chaiyanut.og@gmail.com/My Drive/commission-runtime-2026-04-29.zip`
  - [ ] Google Drive release note exists at `chaiyanut.og@gmail.com/My Drive/commission-runtime-2026-04-29-release.md`
  - [ ] target project root is `/home/nc-user/poolproject`
  - [ ] unzip into `/home/nc-user/poolproject`
  - [ ] rebuild `api` and `wap`
  - [ ] recreate `api`, `wap`, and `nginx`
  - [ ] if UAT `end-of-day` fails with missing `TeamSettlementBatch`, sync schema with:
    - [ ] `docker exec poolproject-uat-api-1 npx prisma db push --schema prisma/schema.prisma`

Dangerous commands to avoid unless intentionally resetting:

- `DEV_RESET_BASELINE=1 npm run dev:up`
- `DEV_RESET_BASELINE=1 npm run dev:restart`
- `ALLOW_DESTRUCTIVE_LOCAL_RESET=1 ...`
- `npm run smoke:local`
- `npm run smoke:wallet:mixed`
- `npm run smoke:wallet:dcw`
- `npm run smoke:pool:cap`
- `npm run smoke:pool:rules`
- `npm run smoke:pool:all-comm-e2e`
- `node scripts/reset_member003_member_baseline.mjs ... --apply`

## Admin Access

- [ ] BAO login works at `http://127.0.0.1:8001/admin/login`
- [ ] Local commission console works at `http://127.0.0.1:3000/admin`
- [ ] App works at `http://127.0.0.1:3002`
- [ ] API health works at `http://127.0.0.1:3000/health`
- [ ] Superadmin account is available
- [ ] Team roles/permissions are correct
- [ ] `Delivered Orders` appears in the BAO menu
- [ ] Current local operator login is verified
  - [ ] identifier `dev-admin@example.com`
  - [ ] password `472121`
- [ ] Current UAT operator login is verified
  - [ ] identifier `admin@stephub.local`
  - [ ] password `005613`
- [ ] `/admin` shows:
  - [ ] `Close Pool Only`
  - [ ] `Team Only`
  - [ ] `End Of Day`
  - [ ] runtime note for direct-vs-end-of-day commission flow
  - [ ] current local login hint `dev-admin@example.com / 472121`
- [ ] Remember `/admin` login hint is local-dev guidance only; UAT production-style auth does not accept the dev impersonation password
- [ ] Member app sign-in placeholders are neutral:
  - [ ] identifier `Member code, email, or phone`
  - [ ] password `Enter password`
- [ ] `POST /commissions/end-of-day/2025-11-27/process` succeeds with the verified local operator token
- [ ] `POST /commissions/end-of-day/2025-11-27/process` succeeds on UAT after schema sync

## Members

- [x] Member codes are correct (`TH0000000` format mapped from `User.id` on current local baseline)
- [x] Sponsor / upline relationships are correct on current local baseline
- [x] `MemberProfile` exists for all imported members in local baseline
- [x] L/M/R placement validation passed on local baseline:
  - [x] no duplicate `upline + side` slots
  - [x] no sponsor/upline cycles
- [x] Team Member `L/M/R` cards show subtree totals per leg (not direct-only)
- [x] Team Member search scope is restricted to self + downline only
- [ ] Name, phone, and email are filled
- [ ] Default shipping address exists for members who need delivery
- [ ] Test member can log in to app successfully

## Catalog Setup

- [ ] Supplier list is correct
- [ ] Category list is correct
- [ ] Product family list is correct
- [ ] Product names and SKU codes are correct
- [ ] Product status is correct
- [ ] Product detail image is uploaded
- [ ] Home card image is uploaded
- [ ] All visible prices show as THB / บาท
- [ ] PV values are correct
- [ ] Stock quantity is set for each SKU that should be limited
- [ ] Leave stock empty only for items that should be unlimited

## Firm Catalog

- [ ] Only one `Firm Catalog` appears in app
- [ ] `Firm-to-DCW` products have only:
  - [ ] Firm amount paid
  - [ ] DCW amount received
- [ ] Regular products that should appear in firm catalog are enabled
- [ ] If cost is over 30%, admin override is intentionally enabled
- [ ] Firm redeem quantity limit is set where needed
- [ ] Products without firm limit rely on stock only

## Commission Setting

- [ ] Overview values are reviewed
- [ ] Direct Bonus settings are correct
- [ ] Matching Bonus settings are correct
- [ ] Team Bonus settings are correct
- [ ] Pool Bonus settings are correct
- [ ] Buyback threshold and grace days are correct
- [ ] Signup Share message is correct
- [ ] App Commission Menu Visibility is correct
- [ ] Hidden commission types are intentionally inactive in the current plan

## Manual Payment

- [ ] Bank name is correct
- [ ] Account name is correct
- [ ] Account number is correct
- [ ] PromptPay name is correct
- [ ] PromptPay number is correct
- [ ] QR image is correct
- [ ] Payment note is correct

## Wallet

- [ ] Wallet top-up methods are correct
- [ ] Wallet top-up can be submitted
- [ ] Wallet top-up can be approved in BAO
- [ ] Approved top-up updates member wallet correctly
- [ ] Wallet history appears correctly in app and BAO
- [ ] Held commission entries appear in the held bucket when buyback gating or risk hold applies

## Withdrawals

- [ ] Withdraw enabled/disabled state is correct
- [ ] Withholding tax rate is correct
- [ ] Fee amount is correct
- [ ] Minimum withdraw amount is correct
- [ ] Withdraw request can be submitted
- [ ] Withdraw request can be approved
- [ ] Mark paid flow works
- [ ] Net bank amount is correct
- [ ] BAO withdraw detail page opens without 500

## Orders

- [ ] `Create Member Sale` works with real member data
- [ ] Payment methods appear correctly:
  - [ ] เงินสด
  - [ ] เงินโอน
  - [ ] SW
  - [ ] FIRM
  - [ ] อื่นๆ
- [ ] Branch pickup flow works
- [ ] Delivery flow works with default member address
- [ ] Delivery flow works with changed/new address
- [ ] Order detail shows THB / บาท
- [ ] Approve order flow works
- [ ] Process approved order flow works
- [ ] `Delivered Orders` list opens and shows processed/delivered records
- [ ] Stock is reduced correctly after order creation
- [ ] Cancel order restores stock correctly
- [ ] Cancel order restores wallet balances correctly where applicable
- [ ] If testing `COMM-05`, confirm scaffold endpoint can create a team batch for a sample settlement date without breaking order approval flow
- [ ] If testing `COMM-05`, confirm scaffold on an already processed settlement date returns preserved `processed` state instead of reverting to `planned`
- [ ] If testing `COMM-05`, confirm process endpoint can create `TEAM_2LEG` / `TEAM_3LEG` entries without forcing a fake `orderId`
- [ ] If testing `COMM-05`, confirm process endpoint also creates `MATCHING_L1` / `MATCHING_L2` from source team `finalPayableAmount`
- [ ] If testing `COMM-05`, confirm rerunning scaffold/process on the same settlement date does not duplicate `TEAM_*` or `MATCHING_*`
- [ ] If testing `COMM-05`, run `npm run smoke:commissions:team-carry-forward` to confirm a 1-leg case stays carried forward and does not become payable
- [ ] If testing `COMM-05`, run `npm run smoke:commissions:team-matching-final-payable` to confirm matching uses team `finalPayableAmount` as `basePv`
- [ ] If testing `COMM-05`, run `npm run smoke:commissions:team-concurrent-rerun` to confirm concurrent scaffold/process reruns keep batch state stable
- [ ] If a formal automated test harness is added later, port the 3 `COMM-05` smoke checks into stable automated coverage instead of inventing new scenarios first
- [ ] If testing next pool step, confirm daily pool source uses only same-day approved orders and not the previous weekly window
- [ ] If testing next pool step, confirm rerunning the same pool date does not duplicate pool commissions or wallet postings
- [ ] If testing next pool step, confirm rerunning the same pool date returns `reprocessed: true`
- [ ] If testing next pool step, confirm held pool commissions post into held bucket instead of withdrawable
- [ ] If testing next pool step, use `/pool/:poolDate/snapshot` summary counts to confirm approved/held/fallback/linkage state after rerun
- [ ] If not enough real data exists for pool recipients, skip pool payout-path testing and record the deferment in `HANDOFF_NEXT.md` first
- [ ] If testing next team step, use `/commissions/team-settlement-batches/:settlementDate/snapshot` to confirm processed vs carried-forward counts after rerun
- [ ] If local team endpoints start failing after schema changes, run `npx prisma db push --schema prisma/schema.prisma` before assuming the feature is broken

## KYC

- [ ] KYC request can be submitted from app/API
- [ ] KYC request can be approved in BAO
- [ ] KYC request can be rejected in BAO with a reason
- [ ] BAO KYC detail page opens without 500
- [ ] Approved/rejected status matches API/DB state

## App Checks

- [ ] Home loads correctly
- [ ] Product detail loads correctly
- [ ] Cart totals show THB / บาท
- [ ] Checkout shows THB / บาท
- [ ] Order Successful shows THB / บาท
- [ ] Order History shows THB / บาท
- [ ] Commission dashboard loads correctly
- [ ] Transfer SW works
- [ ] Withdraw SW works
- [ ] Firm page works
- [ ] TopupWallet works

## Final Go-Live Dry Run

- [ ] Create one real-like member
- [ ] Create one real-like order
- [ ] Approve and process it
- [ ] Confirm stock movement
- [ ] Confirm wallet movement
- [ ] Confirm commission movement
- [ ] Confirm held-vs-withdrawable commission movement
- [ ] Confirm app order history display
- [ ] Confirm BAO reports display
- [ ] Run `npm run smoke:bao:withdraw-kyc`
- [ ] Confirm no unexpected reset happened after restart

## Notes

- Current runtime is configured to preserve DB state by default.
- Demo Stephub `10x5` catalog restore is disabled.
- Do not use destructive flags/scripts unless you intentionally want to reset data.
- `COMM-04` cap/gating work is complete; next backend milestone is team settlement plus matching.
- `COMM-05` backend runtime is complete enough for continuation work; current continuation milestone is runtime verification of the new daily pool path plus rerun safety.
- Current scaffold source for per-leg PV is active-cycle `purchaseBase` overlapping the settlement date.
- Current CAP/DCW/FIRM phase source of truth is the top `CAP/DCW/FIRM Phase Shortcut` section plus [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md:1).
- Existing checkout still uses legacy `Wallet.discountBalance` for DCW until Phase 2 replaces it with CAP FIFO reservation.
- Existing commission cap accounting still uses `MemberPackageCycle.earnedTotalInCycle` until Phase 2 wires commission into the CAP ledger.
- Existing FIRM balances and transactions are legacy/read-only while `firmEnabled=false`.
- `npm run smoke:bao:withdraw-kyc` covers `Delivered Orders`, `KYC approve/reject`, and `Withdraw approve + paid` on local BAO/API.
- If member-side withdraw submission fails with `Insufficient withdrawable balance.`, seed or create enough withdrawable balance first; BAO approve/paid flow still validates correctly once a request exists.
