# Testsystem

Utilities in this folder are intended for repeatable local test preparation.

## Reset Sales / Commission Runtime Only

Use this helper when you want to remove sales-order and commission runtime data
for the next test round without touching member rows or catalog rows.

Clickable command:

```bash
testsystem/Reset_Sales_Commissions_Runtime.command
```

## Run One Commission Day At A Time

Use this when you want to step through the `member003` commission scenario one
day at a time with product `test` (`1000 THB / 350 PV`).

Clickable command:

```bash
testsystem/Run_Member003_Commission_One_Day.command
```

Behavior:

- first run creates approved orders for the first pending signup-day batch
- runs end-of-day for that same date
- saves progress under `runtime/testsystem/`
- next run advances exactly one more day

State files:

- `runtime/testsystem/member003-commission-step-state.json`
- `runtime/testsystem/member003-commission-step-history.json`

Dry run:

```bash
npm run testsystem:reset:sales-commissions
```

Show SQL only:

```bash
npm run testsystem:reset:sales-commissions -- --sql-only
```

Apply:

```bash
npm run testsystem:reset:sales-commissions:apply
```

What it clears:

- `Order`
- `OrderItem`
- `CommissionLedger`
- `CompanyBonusLedger`
- `DailyPoolCycle`
- `DailyPoolEligibilitySnapshot`
- `DailyPoolPayout`
- `TeamSettlementBatch`
- `TeamSettlementBatchItem`
- `PoolSettlementBatch`
- `PoolSettlementBatchItem`
- `DailyCommissionCapUsage`
- `UserBuybackProgress`
- `BuybackEvent`
- `CapBucket`
- `CapLedger`
- `WalletTransaction`
- related wallet balances and payout lock state

What it keeps:

- `User`
- `MemberProfile`
- `Product`
- `ProductDetail`
- `Package`
- other catalog data

This helper is intentionally destructive for runtime transaction data only.
It requires `ALLOW_DESTRUCTIVE_LOCAL_RESET=1` when applying.
