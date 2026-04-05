# Scripts

Placeholder scripts directory for:
- migrations
- backfills
- reconciliation

Smoke helpers:
- `npm run dev:backup`
  Creates a restore-compatible local snapshot under `backups/stephub-full-<timestamp>` including the current Postgres dump, BAO sqlite database, runtime directory, base commit, and git status.
- `npm run dev:check:public-auth`
  Verifies the public `wap.blifehealthy.com -> api.blifehealthy.com/auth/login` bridge end to end, including CORS preflight headers and a real member login request.
- `npm run uat:backup`
  Creates a UAT-oriented snapshot under `backups/uat-full-<timestamp>` including the Postgres dump, BAO sqlite database, runtime directory, and `manual-payments/` when present. The script supports either `DATABASE_URL` or Docker-based Postgres access.
- `npm run uat:restore -- <backup-dir> --yes`
  Destructively restores a UAT backup created by `uat:backup`. Requires `ALLOW_DESTRUCTIVE_UAT_RESTORE=1` and supports either `DATABASE_URL` or Docker-based Postgres access.
- `npm run smoke:cashback`
  Runs a focused cashback end-to-end smoke against the local API and Postgres, including `reprocess` idempotency checks for cashback-only ledger and wallet-credit rows.
- `npm run smoke:firm`
  Runs a focused Firm wallet redemption smoke against the local API and Postgres by creating a firm-category product, a matching package bridge, and one member order paid fully by Firm wallet, then verifies the firm debit plus DCW credit wallet rows.
- `npm run smoke:matrix:spill`
  Runs a focused matrix legacy-parity smoke against the local API and Postgres by forcing a `Board 1 round 2` completion and verifying that the nearest upline with an open `Board 2 round 1` receives one synthetic spill point and payout.
- `npm run smoke:commissions:direct-uni`
  Runs a focused direct + unilevel runtime smoke against the local API and Postgres by creating a three-member sponsor chain, processing one approved order, and verifying commission ledger plus wallet-credit rows end to end.
- `npm run smoke:pool:rules`
  Resets local state and verifies custom-rate, disabled, and all-commissions pool-cap behavior, including rerun idempotency for repeated pool close calls on the same date.
- `npm run smoke:pool:weekly`
  Resets local state and verifies the weekly pool rule set: only Sunday close is allowed, the funding window covers the full Bangkok week, pool fund uses 30% of weekly PV, and an eligible member with 2 directs plus recent B1 completion receives the payout.
- `npm run smoke:bao:cashback`
  Verifies Stephub BAO cashback settings, report page, and CSV/XLSX/PDF export against live local data.
- `npm run smoke:bao:shipment`
  Boots local API + BAO, creates a live order, and verifies BAO order list/detail shipment states through transfer review, awaiting shipment, shipped, and delivered buckets.
  This helper resets the local Postgres schema with `prisma db push --accept-data-loss`, seeds dev data, applies Stephub compat views, and normalizes the local BAO sqlite admin password to `Admin123`.
- `npm run smoke:bao:all`
  Runs the cashback smoke plus the BAO cashback and shipment browser checks in one pass.
  This helper is intentionally destructive for local state: it kills listeners on `:3000` and `:8001`, resets the local Postgres schema, reseeds dev data, reapplies compat views, and normalizes the local BAO sqlite admin password to `Admin123`.
- `npm run seed:members:random-referrals -- --apply`
  Plans or creates enough members to reach `RANDOM_MEMBER_TARGET_TOTAL` (default `1000`) while keeping a mixed direct-referral shape across `0 / 1 / 2 / >2`.
  Dry-run is the default; pass `--apply` to insert rows. Supports `RANDOM_MEMBER_PASSWORD`, `RANDOM_MEMBER_CODE_PREFIX`, and bucket weights such as `RANDOM_MEMBER_WEIGHT_ZERO`.
- `npm run seed:members:random-referrals:rebalance -- --apply`
  Repairs or rebalances sponsor links for a generated member range, useful when a previous bulk insert left too many new members without sponsors.
  The default range is `TH0000211` to `TH0001000`.
- `npm run test:commissions:summary`
  Reads live commission runtime data directly through Prisma and prints one summary for `CommissionLedger`, `MatrixPayout`, `DailyPoolPayout`, and `CompanyBonusLedger`.
  Supports `MEMBER_CODE`, `DATE_FROM`, `DATE_TO`, `POOL_DATE`, `LIMIT_ROWS`, and `OUTPUT=json`.
- `npm run test:commissions:real`
  Runs a reusable real-data commission test flow for the new main plan: optional binary-tree member seeding, runtime order seeding through the live API, weekly pool close, then beneficiary and all-member summaries.
  Useful env vars include `REAL_TEST_SEED_TREE=1`, `MAIN_PLAN_BENEFICIARY=TH0000023`, `MAIN_PLAN_POOL_DATE=2026-04-05`, `DATE_FROM`, `DATE_TO`, and `LIMIT_ROWS`.
- `npm run smoke:wallet:mixed`
  Resets the local Postgres schema, reseeds dev data, and verifies the new CW/SW commerce flow end to end: direct commission credit, CW-to-SW conversion with fee, downline transfer with fee, admin SW top-up, member SW top-up request plus admin approval, and mixed wallet + cash order creation with configured payment methods.
- `npm run cleanup:cashback-smoke -- --apply`
  Removes `CASHSMK*` smoke members, orders, cashback artifacts, and linked matrix rows.
