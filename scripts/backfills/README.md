# Backfill Scripts

`cleanup-zero-commission-artifacts.js`

- Dry-run zero-amount cleanup across `CommissionLedger`, linked `WalletTransaction`, and zero-amount `CompanyBonusLedger`.
- Example dry-run:
  `node scripts/backfills/cleanup-zero-commission-artifacts.js`
- Apply changes:
  `node scripts/backfills/cleanup-zero-commission-artifacts.js --apply`
- Limit to specific orders:
  `node scripts/backfills/cleanup-zero-commission-artifacts.js --order-id 261 --order-id 262`
