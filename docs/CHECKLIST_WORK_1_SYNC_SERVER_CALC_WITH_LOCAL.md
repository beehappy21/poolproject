# Work 1 Checklist: Sync Server Calculation With Local

Update: 2026-05-18 00:45 +07

Follow-up after Work 1 restore:
- The restore/calc sync objective is complete.
- After the data sync, additional commission logic/UI work was deployed on top of the synced server:
  - team settlement PV now rolls up from all descendants by `LEFT / MIDDLE / RIGHT`
  - WAP `Commission` now shows realtime leg PV
  - WAP `Commission` now shows round progress as `xx,xxx/10,000`
  - once complete, it shows `ครบรอบแล้ว ซื้อซ้ำใน x วัน`
- Related commits after the original sync:
  - `b2417b95` `Add commission round countdown to dashboard`
  - `b3b1d2ae` `Expand commission baseline runtime resetter`
- Latest server-side operational follow-up on `2026-05-18`:
  - a fresh UAT backup was created at `/home/nc-user/poolproject/backups/uat-full-20260518-003253`
  - BAO reset flow was deployed and executed on server
  - live runtime state was reset while preserving member/master structure
  - post-reset server counts became:
    - `User=212`
    - `MemberProfile=210`
    - `Order=0`
    - `CommissionLedger=0`
    - `WalletTransaction=0`
    - `TeamSettlementBatch=0`
    - `DailyPoolCycle=0`
    - `UserBuybackProgress=0`
    - `MemberPackageCycle=0`
    - `wallet_nonzero_total=0`
    - `matrix_pv_nonzero_total=0`
- Operational note:
  - if this checklist is reused again, treat the restore section below as historical evidence for Work 1 on `2026-05-17`, not as the latest deploy summary for the commission dashboard.

Goal: make `server` produce the same commission/pool results as `local` without modifying local business data.

Rule:
- Do not write to local database.
- Do not run local reset, migration, seed, or recompute against local data.
- Local is the source of truth for this workstream.

## Phase 1: Read-only local snapshot

- [x] Record current local git commit and runtime settings checksums.
- [x] Capture local database counts for commission-critical tables.
- [x] Capture local latest pool cycle, payouts, and qualification lock counts.
- [x] Create a local backup artifact without mutating local data.

## Phase 2: Read-only server snapshot

- [x] Record current server git commit and runtime settings checksums.
- [x] Capture server database counts for the same commission-critical tables.
- [x] Capture server latest pool cycle, payouts, and qualification lock counts.
- [x] Create a fresh server backup before any restore/cutover work.

## Phase 3: Diff and promotion set

- [x] Confirm code parity between local and server.
- [x] Confirm runtime JSON differences that affect calculation.
- [x] Confirm table/state differences that affect commission/pool results.
- [x] Decide promotion scope:
  - Preferred: promote full local business database state to server.
  - Minimum: promote only commission/member/runtime tables if full restore is blocked.

## Phase 4: Server cutover preparation

- [x] Freeze writes on server during restore window.
- [x] Prepare restore inputs from local backup artifacts.
- [x] Preserve server-only operational files and secrets.
- [x] Prepare rollback path using fresh server backup.

## Phase 5: Restore and verification

- [x] Restore chosen local data snapshot to server.
- [x] Restore runtime JSON so server matches local.
- [x] Restart services.
- [x] Re-run database count snapshot on server.
- [x] Re-run pool/commission verification on server.
- [x] Confirm latest cycle, payouts, and qualification locks match local.

## Commission-critical data to compare

- `User`
- `MemberProfile`
- `Package`
- `Product`
- `ProductDetail`
- `Order`
- `OrderItem`
- `CommissionLedger`
- `Wallet`
- `WalletTransaction`
- `UserBuybackProgress`
- `DailyPoolCycle`
- `DailyPoolEligibilitySnapshot`
- `DailyPoolPayout`
- `TeamSettlementBatch`
- `TeamSettlementBatchItem`
- `MemberPackageCycle`

## Runtime files to compare

- `runtime/commission-settings.json`
- `runtime/wallet-settings.json`
- `runtime/matrix-settings.json`

## Guardrails

- Server restore must happen only after a new server backup completes.
- Do not assume source deploy equals data sync.
- Do not use local admin-only rows as evidence of business member drift.

## Current snapshot

Local:
- Git commit: `45b2aa469773145e680183b3b720c021a35d2116`
- Runtime checksums:
  - `commission-settings.json`: `aefbae23b4ec105d377bca30584efb187d8bbece`
  - `wallet-settings.json`: `d8a22ff726fbbbe0fc2c33dcab605aed237305af`
  - `matrix-settings.json`: `8519dda6ed73145a74bde01f69b7c751646d1f6b`
- Backup artifact: `backups/stephub-full-20260517-184724`
- DB counts:
  - `User=212`
  - `Package=2`
  - `Product=7`
  - `ProductDetail=8`
  - `Order=32`
  - `ApprovedOrder=32`
  - `CommissionLedger=92`
  - `WalletTransaction=68`
  - `UserBuybackProgress=15`
  - `UserBuybackProgress.lastQualifyingOrderId!=null = 5`
  - `DailyPoolCycle=5`
  - `DailyPoolPayout=9`
  - `TeamSettlementBatch=5`
- Latest pool cycle:
  - `cycleDate=2025-11-20`
  - `eligibleMemberCount=5`
  - `poolFund=3500`
  - `payoutPerMember=700`
- Latest eligibility snapshot:
  - `daily_pool_qualified=true => 5`
  - `initial_qualification_missing_own_purchase=false => 10`
  - `initial_qualification_missing_three_direct_buyers=false => 17`
  - `no_receivable_cycle=false => 180`

Server:
- Git commit: `45b2aa469773145e680183b3b720c021a35d2116`
- Runtime checksums:
  - `commission-settings.json`: `aefbae23b4ec105d377bca30584efb187d8bbece`
  - `wallet-settings.json`: `d8a22ff726fbbbe0fc2c33dcab605aed237305af`
  - `matrix-settings.json`: `8519dda6ed73145a74bde01f69b7c751646d1f6b`
- Backup artifact: `/home/nc-user/poolproject/backups/uat-full-20260517-184751`
- DB counts:
  - `User=210`
  - `Package=1`
  - `Product=7`
  - `ProductDetail=8`
  - `Order=23`
  - `ApprovedOrder=23`
  - `CommissionLedger=52`
  - `WalletTransaction=34`
  - `UserBuybackProgress=9`
  - `UserBuybackProgress.lastQualifyingOrderId!=null = 0`
  - `DailyPoolCycle=5`
  - `DailyPoolPayout=0`
  - `TeamSettlementBatch=5`
- Latest pool cycle:
  - `cycleDate=2025-11-20`
  - `eligibleMemberCount=0`
  - `poolFund=2100`
  - `payoutPerMember=0`
- Latest eligibility snapshot:
  - `initial_qualification_missing_own_purchase=false => 6`
  - `initial_qualification_missing_three_direct_buyers=false => 17`
  - `no_receivable_cycle=false => 187`

Promotion scope chosen:
- Use full local backup snapshot as source of truth for Work 1.
- Restore inputs staged on server under `/home/nc-user/poolproject/tmp/work1-sync-20260517/stephub-full-20260517-184724`.
- Server backup kept at `/home/nc-user/poolproject/backups/uat-full-20260517-184751`.

Execution result:
- Server services were stopped for restore, then restarted.
- Redis was flushed after restore to remove stale cached state.
- Server database counts now match local exactly for:
  - `User=212`
  - `Package=2`
  - `Product=7`
  - `ProductDetail=8`
  - `Order=32`
  - `ApprovedOrder=32`
  - `CommissionLedger=92`
  - `WalletTransaction=68`
  - `UserBuybackProgress=15`
  - `UserBuybackProgress.lastQualifyingOrderId!=null = 5`
  - `DailyPoolCycle=5`
  - `DailyPoolPayout=9`
  - `TeamSettlementBatch=5`
- Server latest pool cycle now matches local:
  - `cycleDate=2025-11-20`
  - `eligibleMemberCount=5`
  - `poolFund=3500`
  - `payoutPerMember=700`
- Server latest eligibility snapshot now matches local:
  - `daily_pool_qualified=true => 5`
  - `initial_qualification_missing_own_purchase=false => 10`
  - `initial_qualification_missing_three_direct_buyers=false => 17`
  - `no_receivable_cycle=false => 180`
- Public smoke checks after nginx restart:
  - `https://api.blifehealthy.com/health => 200`
  - `https://bao.blifehealthy.com/admin/login => 200`
  - `https://wap.blifehealthy.com => 200`
