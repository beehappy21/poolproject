# poolproject

Production-oriented monorepo scaffold for a Web3-enabled eCommerce referral platform.

Top-level directories:
- `apps/`: runnable NestJS applications. This scaffold includes `api` and `worker`.
- `packages/`: shared packages, infrastructure stubs, and domain modules.
- `prisma/`: Prisma schema starter files and migration placeholders for PostgreSQL.
- `docs/`: planning packs, decision logs, technical design, schema notes, job flows, and security references.
- `scripts/`: future migration, backfill, and reconciliation scripts.
- `tests/`: unit, integration, contract, and end-to-end test placeholders.

Current status:
- Repository structure only
- No business logic implemented yet
- Design documents live under [`docs/web3-ecommerce-design/`](/Users/macbook/poolproject/docs/web3-ecommerce-design/README.md)

Local Stephub stack:
- `npm run dev:up`: start local Postgres, apply Prisma schema, seed dev data, and launch API, BAO, and Stephub app on the standard local ports
- `npm run dev:restart`: stop any listeners on the standard local ports and then rerun the standard local boot flow
- `npm run dev:check`: verify `5432`, `3000`, `8001`, and `3002` plus the key storefront endpoints used by the current Home screen
