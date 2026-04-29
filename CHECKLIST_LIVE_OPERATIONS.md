# Live Operations Checklist

Updated: 2026-04-29

Use this checklist before starting real data entry and real day-to-day usage on the current local/runtime stack.

## Next Session Shortcut

Use this section first if the current task is the Stephub commission refactor and you want to continue without re-reading older handoff notes.

- [ ] Open [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md:1)
- [ ] Open [docs/technical-design/pool_daily_eod_spec.md](/Users/macbook/poolproject/docs/technical-design/pool_daily_eod_spec.md:1)
- [ ] Open [docs/technical-design/referral_commission_plan_thb.md](/Users/macbook/poolproject/docs/technical-design/referral_commission_plan_thb.md:1)
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
  - [ ] `POST /pool/:poolDate/close` yields non-zero eligible recipients
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
- [ ] No auto-deducted recycle purchase
- [ ] Excess above threshold is held pending member-initiated repurchase for `3` calendar days in `Asia/Bangkok`
- [ ] If not completed in time, status becomes `BLOCKED_AFTER_EXPIRY`
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
  - [ ] identifier `TH0000013`
  - [ ] password `a1a1a1`
- [ ] Current UAT operator login is verified
  - [ ] identifier `TH0000013`
  - [ ] password `005613`
- [ ] `/admin` shows:
  - [ ] `Close Pool Only`
  - [ ] `Team Only`
  - [ ] `End Of Day`
  - [ ] runtime note for direct-vs-end-of-day commission flow
  - [ ] current local login hint `TH0000013 / a1a1a1`
- [ ] Remember `/admin` login hint is local-dev guidance only; UAT production-style auth does not accept the dev impersonation password
- [ ] Member app sign-in placeholders are neutral:
  - [ ] identifier `Member code, email, or phone`
  - [ ] password `Enter password`
- [ ] `POST /commissions/end-of-day/2025-11-27/process` succeeds with the verified local operator token
- [ ] `POST /commissions/end-of-day/2025-11-27/process` succeeds on UAT after schema sync

## Members

- [ ] Member codes are correct
- [ ] Sponsor / upline relationships are correct
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
- `npm run smoke:bao:withdraw-kyc` covers `Delivered Orders`, `KYC approve/reject`, and `Withdraw approve + paid` on local BAO/API.
- If member-side withdraw submission fails with `Insufficient withdrawable balance.`, seed or create enough withdrawable balance first; BAO approve/paid flow still validates correctly once a request exists.
