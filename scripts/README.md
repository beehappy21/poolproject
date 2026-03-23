# Scripts

Placeholder scripts directory for:
- migrations
- backfills
- reconciliation

Smoke helpers:
- `npm run smoke:cashback`
  Runs a focused cashback end-to-end smoke against the local API and Postgres.
- `npm run smoke:bao:cashback`
  Verifies Stephub BAO cashback settings, report page, and CSV/XLSX/PDF export against live local data.
- `npm run smoke:bao:shipment`
  Boots local API + BAO, creates a live order, and verifies BAO order list/detail shipment states through transfer review, awaiting shipment, shipped, and delivered buckets.
  This helper resets the local Postgres schema with `prisma db push --accept-data-loss`, seeds dev data, applies Stephub compat views, and normalizes the local BAO sqlite admin password to `Admin123`.
- `npm run smoke:bao:all`
  Runs the cashback smoke plus the BAO cashback and shipment browser checks in one pass.
  This helper is intentionally destructive for local state: it kills listeners on `:3000` and `:8001`, resets the local Postgres schema, reseeds dev data, reapplies compat views, and normalizes the local BAO sqlite admin password to `Admin123`.
- `npm run cleanup:cashback-smoke -- --apply`
  Removes `CASHSMK*` smoke members, orders, cashback artifacts, and linked matrix rows.
