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
- `./Start_Local_Stack.command`: one-click macOS launcher that checks Docker, installs launch agents if needed, restarts the stack, and verifies readiness
- `npm run dev:up`: start local Postgres, apply Prisma schema, seed dev data, and launch API, BAO, and Stephub app on the standard local ports
- `npm run dev:restart`: stop any listeners on the standard local ports and then rerun the standard local boot flow
- `npm run dev:check`: verify `5432`, `3000`, `8001`, and `3002` plus the key storefront endpoints used by the current Home screen
- `npm run wap:refresh`: build WAP, start the local WAP build server on `127.0.0.1:3002`, and then run verification checks
- `npm run wap:verify`: verify against an already-running local WAP server on `http://127.0.0.1:3002/TabNavigator`; this command does not start the server by itself and works best after `npm run wap:refresh`
- `npm run dev:launchd:install`: install macOS launch agents for API, BAO, and Stephub app so the stack can auto-start at login
- `npm run dev:launchd:status`: show plist/load/listening status for the launchd-managed local stack
- `npm run dev:launchd:uninstall`: remove the macOS launch agents for the local stack

Operations docs:
- [CI/CD security checks](docs/operations/ci-cd-security.md)
- [Monitoring and alerting](docs/operations/monitoring-and-alerting.md)
- [Backup and restore](docs/operations/backup-and-restore.md)
- [Production readiness checklist](docs/operations/production-readiness-checklist.md)
- [Production deploy runbook](docs/operations/production-deploy-runbook.md)
- [Rollback runbook](docs/operations/rollback-runbook.md)
- [Incident response](docs/operations/incident-response.md)
- [Production handoff summary](docs/operations/production-handoff-summary.md)

Security docs:
- [Access control](docs/security/access-control.md)
- [Environment and secrets](docs/security/env-and-secrets.md)
- [Session store](docs/security/session-store.md)
- [Rate limiting and brute-force protection](docs/security/rate-limit-and-bruteforce.md)
- [API hardening](docs/security/api-hardening.md)
- [Audit logging](docs/security/audit-logging.md)
