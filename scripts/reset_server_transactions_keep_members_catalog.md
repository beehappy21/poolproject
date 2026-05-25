# Transaction Reset While Keeping Members And Catalog

Use this when preparing either:

- local data to become the new production source
- or a server refresh/cutover

- member records must stay
- product/catalog/package masters must stay
- order / commission / wallet runtime data must be wiped

Dry-run first:

```bash
node scripts/reset_server_transactions_keep_members_catalog.mjs
```

Inspect SQL only:

```bash
node scripts/reset_server_transactions_keep_members_catalog.mjs --sql-only
```

Apply against the active database:

```bash
ALLOW_DESTRUCTIVE_UAT_RESET=1 node scripts/reset_server_transactions_keep_members_catalog.mjs --apply
```

Force the exact UAT Postgres container when needed:

```bash
POSTGRES_CONTAINER=poolproject-uat-postgres-1 node scripts/reset_server_transactions_keep_members_catalog.mjs
```

What the script clears:

- `Order`, `OrderItem`, `MemberPackageCycle`
- `SpecialCommissionCycleGrant`
- `CommissionLedger`, `CompanyBonusLedger`
- `WalletTransaction`, `WalletTopupRequest`, `WithdrawRequest`
- `CapBucket`, `CapLedger`
- `BuybackEvent`, `UserBuybackProgress`
- `DailyPool*`, `TeamSettlementBatch*`, `PoolSettlementBatch*`
- `Matrix*` runtime rows
- `PayoutBatch*`, `PayoutHold`

What the script preserves:

- `User`, `MemberProfile`, `LineBinding`
- sponsor tree / placement side data
- `ProductCategory`, `Product`, `ProductDetail`, `Package`, `PackageItem`
- member shipping addresses

Extra behavior:

- keeps `Wallet` rows but zeroes all balance buckets
- resets `User.matrixPersonalPv` to `0`
- restarts the main transactional sequences back to `1`
- when multiple Postgres containers exist, the script prefers `poolproject-uat-postgres-*` automatically

Recommended server order:

1. Take a full backup first: `npm run uat:backup`
2. Run the reset script in dry-run and confirm the preflight counts
3. Apply the reset
4. Deploy the validated local source/runtime to the server
5. Run health checks and one smoke order after deploy

Recommended local-prep order:

1. Run the reset script in dry-run
2. Apply the reset locally
3. Clean runtime test artifacts
4. Verify local app again
5. Build the deploy bundle for the server cutover
