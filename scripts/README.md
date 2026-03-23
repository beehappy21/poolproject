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
- `npm run smoke:bao:all`
  Runs the cashback smoke plus the BAO cashback and shipment browser checks in one pass.
- `npm run cleanup:cashback-smoke -- --apply`
  Removes `CASHSMK*` smoke members, orders, cashback artifacts, and linked matrix rows.
