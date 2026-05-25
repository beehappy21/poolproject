# Deep Pre-deploy Cleanup Audit

## 1. Audit Scope

- Branch: `chore/deep-cleanup-audit`
- Audit timestamp: `2026-05-04 11:32:27 +07`
- Base commit: `7ea88fef`
- Tracked file count: `794`
- Working tree clean before audit: `yes`
- Audit base used: [docs/cleanup/pre-deploy-cleanup-audit.md](/Users/macbook/poolproject/docs/cleanup/pre-deploy-cleanup-audit.md)
- Constraint applied in this audit:
  - no file deletion
  - no business-logic edits
  - no package / Docker / schema / migration changes
  - report-only update

## 2. Production-critical files/folders

These are confirmed as deploy-critical or runtime-critical from `package.json`, [Dockerfile.api-worker](/Users/macbook/poolproject/Dockerfile.api-worker), [deploy/compose/docker-compose.yml](/Users/macbook/poolproject/deploy/compose/docker-compose.yml), and the checked shell scripts. Do not delete these before server deployment.

| Path | Why it is critical |
| --- | --- |
| [deploy/compose/docker-compose.yml](/Users/macbook/poolproject/deploy/compose/docker-compose.yml) | Main production-like compose stack for `postgres`, `redis`, `migrate`, `api`, `worker`, `bao`, `wap`, `nginx`. |
| [Dockerfile.api-worker](/Users/macbook/poolproject/Dockerfile.api-worker) | Builds the `api` and `worker` images; copies `apps/`, `packages/`, `prisma/`, `apps/api/public`, and built `dist/`. |
| [deploy/compose/nginx/nginx.conf](/Users/macbook/poolproject/deploy/compose/nginx/nginx.conf) | Nginx container entry config used by compose. |
| [deploy/compose/nginx/conf.d/default.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/default.conf) | Nginx default routing for public stack. |
| [deploy/compose/nginx/conf.d/api.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/api.conf) | API upstream/public route config. |
| [deploy/compose/nginx/conf.d/bao.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/bao.conf) | BAO upstream/public route config. |
| [deploy/compose/nginx/conf.d/wap.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/wap.conf) | WAP upstream/public route config. |
| [deploy/compose/api.env.example](/Users/macbook/poolproject/deploy/compose/api.env.example) | Used by `npm run ops:check:deploy-env` and deploy setup docs. |
| [deploy/compose/bao.env.example](/Users/macbook/poolproject/deploy/compose/bao.env.example) | Used by deploy env checks for BAO. |
| [deploy/compose/wap.env.example](/Users/macbook/poolproject/deploy/compose/wap.env.example) | Used by deploy env checks for WAP. |
| [apps/](/Users/macbook/poolproject/apps) | `api` and `worker` source apps; `apps/api/public` is copied into runtime image. |
| [packages/](/Users/macbook/poolproject/packages) | Shared modules imported by `apps/api/src/app.module.ts` and `apps/worker/src/app.module.ts`. |
| [prisma/schema.prisma](/Users/macbook/poolproject/prisma/schema.prisma) | Required by `prisma:*` scripts and `Dockerfile.api-worker` build. |
| [prisma/migrations](/Users/macbook/poolproject/prisma/migrations) | Migration history required for DB alignment; not safe to trim during cleanup. |
| [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend) | `deploy/compose/docker-compose.yml` still builds `bao` from this path. |
| [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub) | `deploy/compose/docker-compose.yml` still builds `wap` from this path. |
| [scripts/check_api_env.mjs](/Users/macbook/poolproject/scripts/check_api_env.mjs) | Called by `ops:check:api-env` and `ops:check:deploy-env`. |
| [scripts/check_bao_env.mjs](/Users/macbook/poolproject/scripts/check_bao_env.mjs) | Called by `ops:check:bao-env` and `ops:check:deploy-env`. |
| [scripts/check_wap_env.mjs](/Users/macbook/poolproject/scripts/check_wap_env.mjs) | Called by `ops:check:wap-env` and `ops:check:deploy-env`. |
| [scripts/preflight_deploy_check.sh](/Users/macbook/poolproject/scripts/preflight_deploy_check.sh) | Called by `npm run ops:preflight:deploy`. |
| [scripts/check_compose_stack.sh](/Users/macbook/poolproject/scripts/check_compose_stack.sh) | Compose verification helper. |
| [scripts/check_stephub_source_tree.sh](/Users/macbook/poolproject/scripts/check_stephub_source_tree.sh) | Verifies BAO/WAP source tree still exists at expected path. |
| [docs/technical-design/referral_commission_plan_thb.md](/Users/macbook/poolproject/docs/technical-design/referral_commission_plan_thb.md) | Current active technical-design source of truth. |
| [docs/technical-design/commission_round_repurchase_spec.md](/Users/macbook/poolproject/docs/technical-design/commission_round_repurchase_spec.md) | Listed as active feature spec in technical-design README. |
| [docs/technical-design/firm_wallet_spec.md](/Users/macbook/poolproject/docs/technical-design/firm_wallet_spec.md) | Listed as active feature spec in technical-design README. |
| [docs/technical-design/pool_daily_eod_spec.md](/Users/macbook/poolproject/docs/technical-design/pool_daily_eod_spec.md) | Current pool/EOD behavior reference used in current runtime discussion. |

## 3. Build/runtime dependencies

### `Dockerfile.api-worker`

Build stage copies:
- [package.json](/Users/macbook/poolproject/package.json)
- [package-lock.json](/Users/macbook/poolproject/package-lock.json)
- [pnpm-workspace.yaml](/Users/macbook/poolproject/pnpm-workspace.yaml)
- [nest-cli.json](/Users/macbook/poolproject/nest-cli.json)
- [tsconfig.json](/Users/macbook/poolproject/tsconfig.json)
- [tsconfig.base.json](/Users/macbook/poolproject/tsconfig.base.json)
- [apps/](/Users/macbook/poolproject/apps)
- [packages/](/Users/macbook/poolproject/packages)
- [prisma/](/Users/macbook/poolproject/prisma)

Runner stage copies:
- [package.json](/Users/macbook/poolproject/package.json)
- built `node_modules`
- [prisma/](/Users/macbook/poolproject/prisma)
- built `dist/`
- [apps/api/public](/Users/macbook/poolproject/apps/api/public)

### Compose/runtime dependencies

- [deploy/compose/docker-compose.yml](/Users/macbook/poolproject/deploy/compose/docker-compose.yml) references:
  - repo-root build context for `api` and `worker`
  - `../../stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend` for `bao`
  - `../../stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub` for `wap`
- [deploy/compose/nginx/](/Users/macbook/poolproject/deploy/compose/nginx) is required by the `nginx` service build.
- Local runtime secrets under `deploy/compose/.env`, `deploy/compose/api.env`, `deploy/compose/bao.env`, `deploy/compose/wap.env` are not tracked and must remain local only.

### `.dockerignore` findings

Tracked or important files excluded from the api/worker Docker build on purpose:
- [Book1.xlsx](/Users/macbook/poolproject/Book1.xlsx)
- [saletest05042026.xlsx](/Users/macbook/poolproject/saletest05042026.xlsx)
- local workbooks such as `member003.xlsx`, `allsale.xlsx`, `allsaletest02042026.xlsx`
- [commission/COMMISSION_RUNTIME_MAIN.md](/Users/macbook/poolproject/commission/COMMISSION_RUNTIME_MAIN.md)
- entire `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/` tree

This is acceptable because:
- workbooks are not runtime assets for the `api` / `worker` image
- `commission/` is not copied by the Dockerfile
- Stephub BAO/WAP are built as separate compose contexts

### `apps/` and `packages/` dependency check

- [apps/api/src/app.module.ts](/Users/macbook/poolproject/apps/api/src/app.module.ts) imports `auth`, `cap`, `members`, `orders`, `packages`, `pool`, `wallets`.
- [apps/worker/src/app.module.ts](/Users/macbook/poolproject/apps/worker/src/app.module.ts) imports `qualification`, `commissions`, `pool`.
- No `packages/modules/*` package was classified as unused in this audit because current app shells still consume the active module set.
- Placeholder files under `apps/api/src/modules/api-modules.placeholder.ts` and `apps/worker/src/modules/worker-modules.placeholder.ts` have no repo-wide references, but because they document intended module surface they remain `human confirmation needed`, not `safe delete`.

### `tests/` and `testsystem/`

- `tests/` currently contains only README placeholders.
- `testsystem/` does not exist on this branch and is not referenced by current `package.json`.
- Record only: `testsystem` was removed before this audit; do not recreate it in cleanup PRs.

## 4. Script reference map

`package.json` script scan. Recommendation is about the referenced file/path, not a proposal to edit the script in this audit.

| Script / command | Referenced file/path | Purpose | Recommendation |
| --- | --- | --- | --- |
| `build` | `nest build api && nest build worker` | Build both Nest apps | keep |
| `dev:api:retest` | `scripts/run_local_api_retest.sh` | Retest-local API launcher | keep |
| `dev:up` | `scripts/dev-up.sh` | Start local stack | keep |
| `dev:restart` | `scripts/dev-restart.sh` | Restart local stack | keep |
| `wap:refresh` | `scripts/wap-refresh-verify.sh` | Refresh WAP and verify | keep |
| `dev:check` | `scripts/dev-check.sh` | Local stack health checks | keep |
| `ops:check:api-env` | `scripts/check_api_env.mjs` | Validate API env | keep |
| `ops:check:bao-env` | `scripts/check_bao_env.mjs` | Validate BAO env | keep |
| `ops:check:wap-env` | `scripts/check_wap_env.mjs` | Validate WAP env | keep |
| `ops:check:stephub-tree` | `scripts/check_stephub_source_tree.sh` | Verify BAO/WAP source tree path | keep |
| `ops:check:deploy-env` | `scripts/check_api_env.mjs`, `deploy/compose/api.env.example`, `scripts/check_bao_env.mjs`, `deploy/compose/bao.env.example`, `scripts/check_wap_env.mjs`, `deploy/compose/wap.env.example` | Deploy env example validation | keep |
| `ops:check:compose-stack` | `scripts/check_compose_stack.sh` | Compose file validation | keep |
| `ops:check:public-urls` | `scripts/check_public_urls.sh` | Surface URL checks | keep |
| `ops:init:compose-env` | `scripts/init_compose_env.sh` | Seed local deploy env files | keep |
| `ops:check:secrets` | `scripts/check_secret_placeholders.mjs` | Secret placeholder scan | keep |
| `ops:preflight:deploy` | `scripts/preflight_deploy_check.sh` | Deploy preflight | keep |
| `dev:check:public-auth` | `scripts/check_public_auth_bridge.sh` | Local auth bridge check | keep |
| `dev:backup` | `scripts/create_local_backup.sh` | Local backup | keep |
| `uat:backup` | `scripts/create_uat_backup.sh` | UAT backup | keep |
| `uat:restore` | `scripts/restore_uat_backup.sh` | UAT restore | keep |
| `reset:runtime:retest` | `scripts/reset_retest_runtime.mjs` | Reset retest runtime data | keep |
| `dev:launchd:install` | `scripts/install_local_stack_launch_agents.sh` | Install launch agents | keep |
| `dev:launchd:status` | `scripts/local_stack_launch_agents_status.sh` | Launch agent status | keep |
| `dev:launchd:uninstall` | `scripts/uninstall_local_stack_launch_agents.sh` | Remove launch agents | keep |
| `dev:baseline:stephub` | `scripts/ensure-stephub-local-state.sh` | Seed local Stephub baseline | keep |
| `dev:check:stephub` | `scripts/check-stephub-local-baseline.sh` | Verify Stephub baseline | keep |
| `lint` | `apps/api/tsconfig.app.json`, `apps/worker/tsconfig.app.json` | Type-check both apps | keep |
| `prisma:generate` | `prisma/schema.prisma` | Prisma client generation | keep |
| `prisma:format` | `prisma/schema.prisma` | Prisma formatting | keep |
| `prisma:push` | `prisma/schema.prisma` | Local schema push | keep |
| `db:bootstrap:retest` | `scripts/bootstrap_retest_db.mjs` | Local retest DB bootstrap | keep |
| `line:bindings:migrate-runtime` | `scripts/migrate_line_bindings_runtime_to_db.mjs` | LINE binding runtime migration | keep |
| `db:seed` | `scripts/seed-dev.js` | Local dev seed | keep |
| `smoke:local` | `scripts/local-smoke.sh` | Local smoke suite | keep |
| `smoke:cashback` | `scripts/cashback-smoke.js` | Cashback smoke | keep |
| `smoke:firm` | `scripts/firm-wallet-smoke.js` | Firm wallet smoke | keep |
| `smoke:orders:create` | `scripts/order-creation-smoke.js` | Order creation smoke | keep |
| `smoke:orders:approve-commission` | `scripts/approve-order-commission-smoke.js` | Approval + commission smoke | keep |
| `smoke:matrix:by-code` | `scripts/matrix-by-code-smoke.js` | Matrix by-code smoke | keep |
| `smoke:matrix:spill` | `scripts/matrix-spill-smoke.js` | Matrix spill smoke | keep |
| `smoke:commissions:team-carry-forward` | `scripts/team-carry-forward-smoke.js` | Team carry-forward smoke | keep |
| `smoke:commissions:team-matching-final-payable` | `scripts/team-matching-final-payable-smoke.js` | Team matching payable smoke | keep |
| `smoke:commissions:team-concurrent-rerun` | `scripts/team-concurrent-rerun-smoke.js` | Team rerun safety smoke | keep |
| `smoke:pool:cap` | `scripts/pool-cap-local-smoke.sh` | Pool cap smoke | keep |
| `smoke:pool:rules` | `scripts/pool-config-rules-local-smoke.sh` | Pool rules smoke | keep |
| `smoke:pool:all-comm-e2e` | `scripts/pool-all-commissions-e2e-smoke.sh` | Pool all-commissions E2E smoke | keep |
| `smoke:pool:weekly` | `scripts/pool-weekly-local-smoke.sh` | Weekly pool smoke | keep |
| `smoke:pool:all` | `scripts/pool-all-smoke.sh` | Aggregate pool smoke | keep |
| `smoke:wallet:mixed` | `scripts/wallet-mixed-payment-smoke.sh` | Mixed wallet payment smoke | keep |
| `smoke:wallet:dcw` | `scripts/discount-wallet-smoke.sh` | Discount wallet smoke | keep |
| `smoke:cap:foundation` | `scripts/cap-phase-foundation-smoke.js` | Cap foundation smoke | keep |
| `smoke:bao:cashback` | `scripts/check_stephub_admin_cashback_report.sh` | BAO cashback check | keep |
| `smoke:bao:withdraw-kyc` | `scripts/check_stephub_admin_withdraw_kyc.sh` | BAO withdraw/KYC check | keep |
| `smoke:bao:shipment` | `scripts/check_stephub_order_shipment_flow.sh` | BAO shipment flow check | keep |
| `smoke:bao:all` | `scripts/run_bao_browser_checks.sh` | BAO browser smoke bundle | keep |
| `smoke:wap:surface` | `scripts/check_wap_public_surface.js` | WAP surface smoke | keep |
| `wap:verify` | `scripts/wap-refresh-verify.sh` | WAP verification only | keep |
| `seed:members:random-referrals` | `scripts/seed_random_referral_members.js` | Seed random members | keep |
| `seed:members:random-referrals:rebalance` | `scripts/rebalance_random_referral_members.js` | Rebalance random placements | keep |
| `test:commissions:summary` | `scripts/query_commission_runtime_summary.js` | Query commission summary | keep |
| `test:commissions:member003-baseline` | `scripts/seed_member003_test_baseline.js` | Member003 baseline seeding | keep |
| `test:matrix:legacy-benchmarks` | `scripts/run_member003_matrix_legacy_benchmarks.sh` | Legacy benchmark harness | keep but archive candidate only if legacy matrix work is formally retired |
| `test:matrix:runtime-benchmarks` | `scripts/run_member003_matrix_runtime_benchmarks.sh` | Runtime benchmark harness | keep |
| `cleanup:cashback-smoke` | `scripts/backfills/cleanup-cashback-smoke-artifacts.js` | Cleanup smoke artifacts | keep |
| `calc:scenarios` | `scripts/calc-scenarios.sh` | Scenario calculator wrapper | keep |
| `reset:local:members-sales` | `scripts/reset_local_members_and_sales.mjs` | Local member/order reset | keep |
| `reset:local:members-sales:apply` | `scripts/reset_local_members_and_sales.mjs` | Local destructive reset | keep |
| `reconcile:member-code:id` | `scripts/reconcile_member_code_to_id.mjs` | Member code reconciliation | keep |
| `reconcile:member-code:id:apply` | `scripts/reconcile_member_code_to_id.mjs` | Member code reconciliation apply | keep |
| `seed:members:member003` | `scripts/seed_members_from_xlsx.mjs`, `member003.xlsx` | Seed members from workbook | keep; local workbook required |
| `seed:members:member003:apply` | `scripts/seed_members_from_xlsx.mjs`, `member003.xlsx` | Apply member seed from workbook | keep; local workbook required |
| `validate:members:lmr` | `scripts/validate_member_tree_lmr.mjs` | Validate member tree | keep |
| `fill:members:profiles:member003` | `scripts/fill_member_profiles_from_member003.mjs`, `member003.xlsx` | Fill profile fields from workbook | keep; local workbook required |
| `fill:members:profiles:member003:apply` | `scripts/fill_member_profiles_from_member003.mjs`, `member003.xlsx` | Apply profile fill from workbook | keep; local workbook required |
| `rebalance:members:placement` | `scripts/rebalance_member_placement_from_sponsor.mjs` | Rebuild placement from sponsor links | keep |
| `rebalance:members:placement:apply` | `scripts/rebalance_member_placement_from_sponsor.mjs` | Apply placement rebalance | keep |

## 5. Root file classification

Root files only. Directory-level review is covered elsewhere in this report.

| File | Referenced by | Risk | Recommendation |
| --- | --- | --- | --- |
| [Dockerfile.api-worker](/Users/macbook/poolproject/Dockerfile.api-worker) | `deploy/compose/docker-compose.yml` | breaking deploy builds | keep |
| [docker-compose.yml](/Users/macbook/poolproject/docker-compose.yml) | [SERVER_READINESS_GAP_ASSESSMENT.md](/Users/macbook/poolproject/SERVER_READINESS_GAP_ASSESSMENT.md) | local-only infra note; not main deploy stack | human confirmation |
| [package.json](/Users/macbook/poolproject/package.json) | root script entrypoint | breaks all tooling | keep |
| [package-lock.json](/Users/macbook/poolproject/package-lock.json) | `npm ci` / Docker build | breaks reproducible install | keep |
| [tsconfig.json](/Users/macbook/poolproject/tsconfig.json) | build + lint | breaks TypeScript build | keep |
| [tsconfig.base.json](/Users/macbook/poolproject/tsconfig.base.json) | build + lint | breaks TypeScript build | keep |
| [nest-cli.json](/Users/macbook/poolproject/nest-cli.json) | Nest build | breaks build | keep |
| [pnpm-workspace.yaml](/Users/macbook/poolproject/pnpm-workspace.yaml) | workspace tooling | medium | keep |
| [README.md](/Users/macbook/poolproject/README.md) | root onboarding doc | low | keep |
| [DEV_HANDOFF.md](/Users/macbook/poolproject/DEV_HANDOFF.md) | local stack instructions | medium | keep |
| [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md) | operational handoff | medium | keep |
| [NEXT_SESSION.md](/Users/macbook/poolproject/NEXT_SESSION.md) | session continuity | low | keep |
| [DEPLOY_CHECKLIST.md](/Users/macbook/poolproject/DEPLOY_CHECKLIST.md) | deploy/UAT docs | medium | keep |
| [VPS_READY_NEXT_STEPS.md](/Users/macbook/poolproject/VPS_READY_NEXT_STEPS.md) | deploy/UAT docs | medium | keep |
| [UAT_DEPLOYMENT_CHECKLIST.md](/Users/macbook/poolproject/UAT_DEPLOYMENT_CHECKLIST.md) | deploy/UAT docs | medium | keep |
| [UAT_DEPLOYMENT_RUNSHEET.md](/Users/macbook/poolproject/UAT_DEPLOYMENT_RUNSHEET.md) | deploy/UAT docs | medium | keep |
| [SERVER_GO_LIVE_CHECKLIST_TH.md](/Users/macbook/poolproject/SERVER_GO_LIVE_CHECKLIST_TH.md) | go-live checklist | medium | keep |
| [CHECKLIST_LIVE_OPERATIONS.md](/Users/macbook/poolproject/CHECKLIST_LIVE_OPERATIONS.md) | runtime/release handoff | medium | keep |
| [SERVER_READINESS_GAP_ASSESSMENT.md](/Users/macbook/poolproject/SERVER_READINESS_GAP_ASSESSMENT.md) | deploy planning | low | keep |
| [PRODUCTION_SIZING_SUMMARY.md](/Users/macbook/poolproject/PRODUCTION_SIZING_SUMMARY.md) | sizing note | low | human confirmation |
| [RUNBOOK.md](/Users/macbook/poolproject/RUNBOOK.md) | ops note | low | keep |
| [Start_Local_Stack.command](/Users/macbook/poolproject/Start_Local_Stack.command) | `README.md`, `DEV_HANDOFF.md` | local boot flow | keep |
| [Start_BlLifeHealthy_UAT.command](/Users/macbook/poolproject/Start_BlLifeHealthy_UAT.command) | `DEV_HANDOFF.md` | local/UAT launcher | keep |
| [Start_WAP_BAO_Latest.command](/Users/macbook/poolproject/Start_WAP_BAO_Latest.command) | no live repo references outside prior cleanup audit | manual-use uncertainty | human confirmation |
| [Book1.xlsx](/Users/macbook/poolproject/Book1.xlsx) | `NEXT_SESSION.md` only | unclear workbook purpose | human confirmation |
| [saletest05042026.xlsx](/Users/macbook/poolproject/saletest05042026.xlsx) | `scripts/build_saletest05042026_runtime_sequence.py`, `scripts/import_saletest05042026_orders.js` | local test data only | archive first |
| [matrix2x2oldsetup.md](/Users/macbook/poolproject/docs/archive/legacy-root-notes/matrix2x2oldsetup.md) | links to `testmatrix.md` | legacy matrix note | archive first |
| [testmatrix.md](/Users/macbook/poolproject/docs/archive/legacy-root-notes/testmatrix.md) | linked from `matrix2x2oldsetup.md` | legacy matrix note | archive first |
| [web3_ecommerce_planning_pack_detailed.md](/Users/macbook/poolproject/web3_ecommerce_planning_pack_detailed.md) | `docs/web3-ecommerce-design/*` | current design source for that doc set | keep |
| `.env.staging.example` | env example only | low | human confirmation |
| `.dockerignore` | Docker build context | medium | keep |
| `.gitignore` | ignore hygiene | medium | keep |
| `.gitattributes` | git metadata | low | keep |
| `Thai-named tax workbook` | no repo references found in this audit | unclear | human confirmation |

## 6. Docs classification

| Doc path | Referenced by | Current role | Recommendation |
| --- | --- | --- | --- |
| [docs/technical-design/README.md](/Users/macbook/poolproject/docs/technical-design/README.md) | technical design entrypoint | current binding for active design docs | keep |
| [docs/technical-design/referral_commission_plan_thb.md](/Users/macbook/poolproject/docs/technical-design/referral_commission_plan_thb.md) | technical-design README and multiple runtime discussions | active source of truth | keep |
| [docs/technical-design/commission_round_repurchase_spec.md](/Users/macbook/poolproject/docs/technical-design/commission_round_repurchase_spec.md) | technical-design README | active feature spec | keep |
| [docs/technical-design/firm_wallet_spec.md](/Users/macbook/poolproject/docs/technical-design/firm_wallet_spec.md) | technical-design README | active feature spec | keep |
| [docs/technical-design/pool_daily_eod_spec.md](/Users/macbook/poolproject/docs/technical-design/pool_daily_eod_spec.md) | current pool behavior work | active technical spec | keep |
| [docs/archive/technical-design-legacy/matrix_runtime_reentry_spec.md](/Users/macbook/poolproject/docs/archive/technical-design-legacy/matrix_runtime_reentry_spec.md) | technical-design README | explicitly marked legacy runtime reference | archive first |
| [docs/technical-design/member003_direct_test.md](/Users/macbook/poolproject/docs/technical-design/member003_direct_test.md) | member003 workbook/test flow | test reference | keep |
| [docs/technical-design/member003_matrix_test.md](/Users/macbook/poolproject/docs/technical-design/member003_matrix_test.md) | matrix test flow | active or recent test reference | keep |
| [docs/archive/technical-design-legacy/member003_matrix_legacy_business_rules.md](/Users/macbook/poolproject/docs/archive/technical-design-legacy/member003_matrix_legacy_business_rules.md) | legacy member003 research | historical cross-check | archive first |
| [docs/archive/technical-design-legacy/member003_matrix_legacy_findings.md](/Users/macbook/poolproject/docs/archive/technical-design-legacy/member003_matrix_legacy_findings.md) | legacy member003 research | historical cross-check | archive first |
| [docs/technical-design/member003_matrix_legacy_routing_design.md](/Users/macbook/poolproject/docs/technical-design/member003_matrix_legacy_routing_design.md) | legacy routing research | historical cross-check | archive first |
| [docs/technical-design/member003_matrix_no_reentry_order_map.md](/Users/macbook/poolproject/docs/technical-design/member003_matrix_no_reentry_order_map.md) | matrix historical mapping | test/reference | human confirmation |
| [docs/technical-design/member003_pv_table.md](/Users/macbook/poolproject/docs/technical-design/member003_pv_table.md) | member003 data mapping | test/reference | keep |
| [docs/technical-design/member_table_from_member003.md](/Users/macbook/poolproject/docs/technical-design/member_table_from_member003.md) | member003 import design | active import mapping | keep |
| [docs/web3-ecommerce-design/README.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/README.md) | design pack index | current design index | keep |
| [docs/web3-ecommerce-design/design_update_locked_decisions.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/design_update_locked_decisions.md) | references root planning pack | active design dependency | keep |
| [docs/web3-ecommerce-design/schema_spec.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/schema_spec.md) | references root planning pack | active design dependency | keep |
| [docs/web3-ecommerce-design/implementation_readiness_review.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/implementation_readiness_review.md) | references root planning pack | active design dependency | keep |
| [docs/archive/uat-history/2026-03-27-stephub-bao-uat-checklist.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-03-27-stephub-bao-uat-checklist.md) | dated UAT note | historical UAT snapshot | archive first |
| [docs/archive/uat-history/2026-04-02-bao-wap-signup-share-uat-checklist.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-04-02-bao-wap-signup-share-uat-checklist.md) | dated UAT note | historical UAT snapshot | archive first |
| [docs/archive/uat-history/2026-04-03-bao-wap-runtime-audit.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-04-03-bao-wap-runtime-audit.md) | dated UAT note | historical UAT snapshot | archive first |
| [docs/archive/uat-history/2026-04-03-wap-matrix-mobile-layout-regression.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-04-03-wap-matrix-mobile-layout-regression.md) | dated regression note | historical UAT snapshot | archive first |
| [docs/archive/uat-history/2026-04-06-phase1-service-review.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-04-06-phase1-service-review.md) | dated review note | historical review | archive first |
| [docs/archive/uat-history/2026-04-11-bao-wap-baseline.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-04-11-bao-wap-baseline.md) | dated baseline note | historical baseline | archive first |
| [docs/RUNBOOK_LOCAL_MEMBER_RESET.md](/Users/macbook/poolproject/docs/RUNBOOK_LOCAL_MEMBER_RESET.md) | member reset flow | active operator runbook | keep |
| [docs/cleanup/pre-deploy-cleanup-audit.md](/Users/macbook/poolproject/docs/cleanup/pre-deploy-cleanup-audit.md) | previous audit base | superseded baseline | keep as audit history |

## 7. Data/test workbook classification

| File | Referenced by scripts/docs | Production relevance | Recommendation |
| --- | --- | --- | --- |
| `member003.xlsx` | `package.json`, `scripts/seed_members_from_xlsx.mjs`, `scripts/fill_member_profiles_from_member003.mjs`, multiple technical docs | local fixture only; not Docker/runtime | keep local; do not commit secrets inside workbook |
| [saletest05042026.xlsx](/Users/macbook/poolproject/saletest05042026.xlsx) | `scripts/build_saletest05042026_runtime_sequence.py`, `scripts/import_saletest05042026_orders.js` | local test data only | archive first |
| `allsale.xlsx` | `scripts/build_allsale_pv700_orders.py`, matrix docs | local test data only | keep local if matrix replay still used; otherwise archive first |
| `allmember.xlsx` | `scripts/build_allmember_pool_from_orders.py`, `tmp/legacy-unilevel/*`, legacy matrix docs | local/legacy test data | human confirmation |
| `allsaletest02042026.xlsx` | `scripts/import_allsaletest02042026_orders.js`, `scripts/build_allsaletest02042026_daily_report.py` | local test data only | archive first |
| `allsaletes.xlsx` | no strong current script reference found in this audit | unclear local workbook | human confirmation |
| [Book1.xlsx](/Users/macbook/poolproject/Book1.xlsx) | only `NEXT_SESSION.md` and prior audit note | unclear | human confirmation |
| `ใบกำกับภาษี.ใบเสร็จรับเงินบบริษัท บีไลฟ์ แฮลตี้ จำกัด.xlsx` | no repo references found in this audit | no production relevance found | human confirmation |

## 8. Ignored/local/generated files

These should remain uncommitted. This section is intentionally separate from tracked-source cleanup.

- local env files:
  - `.env`
  - `deploy/compose/.env`
  - `deploy/compose/api.env`
  - `deploy/compose/bao.env`
  - `deploy/compose/wap.env`
  - `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/.env`
  - `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/.env`
- generated caches/build outputs:
  - `node_modules/`
  - `dist/`
  - `runtime/`
  - `logs/`
  - `.tmp/`
  - `tmp-fonts/`
  - `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/build`
  - `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/node_modules`
- Stephub generated/runtime artifacts:
  - `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/vendor`
  - `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/public/vendor`
  - `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/public/storage`
  - `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/storage`
  - `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/database/database.sqlite`
- macOS noise:
  - `.DS_Store` files under `stephub-*`, `apps/`, `docs/`, `packages/`, `prisma/`, `scripts/`
- other local-only roots:
  - `backups/`
  - `preflight-backups/`
  - `picture/`
  - `Minible_Codeigniter_v3.2.0/`

Ignore-hygiene note for a future PR:
- `.gitignore` already covers `node_modules`, `dist`, `runtime`, `logs`, `.env`, `.DS_Store`, `picture/`.
- Future ignore-hygiene PR should consider explicit coverage for `backups/`, `preflight-backups/`, and generated Stephub runtime folders if they are not already protected by nested ignore files.

## 9. Safe cleanup candidates

Only items with direct evidence of being generated, ignored, or unreferenced in the current repo state are listed here.

| Candidate | Evidence | Recommendation |
| --- | --- | --- |
| [commission/COMMISSION_RUNTIME_MAIN.md](/Users/macbook/poolproject/commission/COMMISSION_RUNTIME_MAIN.md) | tracked; no repo references found; excluded by `.dockerignore` | safe delete candidate |
| `stephub.../backend/vendor` | generated dependency directory | safe local cleanup candidate |
| `stephub.../backend/public/vendor` | generated published vendor assets | safe local cleanup candidate |
| `stephub.../backend/public/storage` | generated runtime storage | safe local cleanup candidate |
| `stephub.../backend/storage` | generated runtime storage/cache | safe local cleanup candidate |
| `stephub.../backend/database/database.sqlite` | generated local DB artifact | safe local cleanup candidate |
| `stephub.../backend/.env` | local secret/env file | safe local cleanup candidate, never commit |
| `stephub.../stephub/build` | generated frontend build output | safe local cleanup candidate |
| `stephub.../stephub/node_modules` | generated dependency directory | safe local cleanup candidate |
| `runtime/` | ignored local runtime output | safe local cleanup candidate |

## 10. Archive-first candidates

These may still carry historical value, but they do not look production-critical for the next deploy and should be archived before deletion.

| Candidate | Why archive-first |
| --- | --- |
| [deploy/releases/commission-runtime-2026-04-29.zip](/Users/macbook/poolproject/deploy/releases/commission-runtime-2026-04-29.zip) | referenced by handoff/checklist as release artifact; historical trace matters |
| [deploy/commission-runtime-2026-04-29-release.md](/Users/macbook/poolproject/deploy/commission-runtime-2026-04-29-release.md) | referenced by handoff/checklist; historical release note |
| [tmp/archived_admin_ui_2026-04-28](/Users/macbook/poolproject/tmp/archived_admin_ui_2026-04-28) | explicitly archived admin UI snapshot |
| [docs/archive/tmp-archived/archived_commission_plan_2026-04-27](/Users/macbook/poolproject/docs/archive/tmp-archived/archived_commission_plan_2026-04-27) | explicitly archived commission-plan snapshot |
| [tmp/legacy-unilevel](/Users/macbook/poolproject/tmp/legacy-unilevel) | legacy flow not listed in current active technical-design scope |
| [tmp/experimental](/Users/macbook/poolproject/tmp/experimental) | experimental scripts, not part of main script surface |
| [docs/archive/uat-history/2026-03-27-stephub-bao-uat-checklist.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-03-27-stephub-bao-uat-checklist.md) | dated UAT history |
| [docs/archive/uat-history/2026-04-02-bao-wap-signup-share-uat-checklist.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-04-02-bao-wap-signup-share-uat-checklist.md) | dated UAT history |
| [docs/archive/uat-history/2026-04-03-bao-wap-runtime-audit.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-04-03-bao-wap-runtime-audit.md) | dated runtime audit history |
| [docs/archive/uat-history/2026-04-03-wap-matrix-mobile-layout-regression.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-04-03-wap-matrix-mobile-layout-regression.md) | dated regression history |

## 11. Human confirmation needed

These items were not proven safe to remove in this audit.

| Path | Why confirmation is needed |
| --- | --- |
| [Start_WAP_BAO_Latest.command](/Users/macbook/poolproject/Start_WAP_BAO_Latest.command) | no live references found, but could still be a manual operator shortcut |
| [Book1.xlsx](/Users/macbook/poolproject/Book1.xlsx) | tracked workbook with unclear role |
| `allmember.xlsx` | still used in legacy scripts/docs |
| `allsaletes.xlsx` | no clear active reference; local workbook only |
| `Thai-named tax workbook` | no references found; business/legal context unknown |
| [docs/archive/legacy-root-notes/matrix2x2oldsetup.md](/Users/macbook/poolproject/docs/archive/legacy-root-notes/matrix2x2oldsetup.md) | archived in PR 2; legacy matrix note only |
| [docs/archive/legacy-root-notes/testmatrix.md](/Users/macbook/poolproject/docs/archive/legacy-root-notes/testmatrix.md) | archived in PR 2; linked from archived matrix note |
| [docker-compose.yml](/Users/macbook/poolproject/docker-compose.yml) | not main production stack, but still referenced by readiness doc |
| [PRODUCTION_SIZING_SUMMARY.md](/Users/macbook/poolproject/PRODUCTION_SIZING_SUMMARY.md) | low-signal doc, but not proven obsolete |
| [apps/api/src/modules/api-modules.placeholder.ts](/Users/macbook/poolproject/apps/api/src/modules/api-modules.placeholder.ts) | no import references, but documents intended module surface |
| [apps/worker/src/modules/worker-modules.placeholder.ts](/Users/macbook/poolproject/apps/worker/src/modules/worker-modules.placeholder.ts) | no import references, but documents intended module surface |
| `tests/README.md` and placeholder sub-READMEs | placeholders only, but future test structure still implied by root README |

## 12. Proposed cleanup PR sequence

### PR 1: ignore/local hygiene

- tighten ignore coverage for local/generated folders only
- ensure no local env or generated Stephub artifacts are commit candidates
- no source deletion

### PR 2: archive docs

- move dated UAT notes and explicitly historical docs into an archive location
- move release artifact docs if the team wants a slimmer root/deploy surface
- update links after archive move
- status:
  - completed in `chore/archive-legacy-docs` for root legacy notes, selected technical-design legacy docs, UAT history docs, and `archived_commission_plan_2026-04-27`
  - excluded from this PR:
    - `tmp/archived_admin_ui_2026-04-28` because `apps/api/src/admin-ui.controller.ts` still references it
    - `docs/technical-design/member003_matrix_legacy_routing_design.md` because `scripts/member003-matrix-legacy-benchmarks.json` still references it

### PR 3: remove safe unused files

- remove only high-confidence unused tracked files such as [commission/COMMISSION_RUNTIME_MAIN.md](/Users/macbook/poolproject/commission/COMMISSION_RUNTIME_MAIN.md) if team confirms it is superseded
- remove no production-critical paths

### PR 4: deploy package hardening

- verify ignore boundaries and packaging boundaries
- confirm `Dockerfile.api-worker`, `.dockerignore`, and `deploy/compose/*` still match intended deploy package
- no business logic changes

## 13. Required checks before each PR

Run these before any cleanup PR merge:

```bash
npm run lint
npm run ops:check:deploy-env
npm run ops:preflight:deploy
npm run wap:verify
npm run smoke:wap:surface
npm run smoke:bao:all
npm run smoke:pool:all
```

## Top 10 safe cleanup candidates

1. [commission/COMMISSION_RUNTIME_MAIN.md](/Users/macbook/poolproject/commission/COMMISSION_RUNTIME_MAIN.md)
2. `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/vendor`
3. `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/public/vendor`
4. `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/public/storage`
5. `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/storage`
6. `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/database/database.sqlite`
7. `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/.env`
8. `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/build`
9. `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/node_modules`
10. `runtime/`

## Top 10 archive-first candidates

1. [deploy/releases/commission-runtime-2026-04-29.zip](/Users/macbook/poolproject/deploy/releases/commission-runtime-2026-04-29.zip)
2. [deploy/commission-runtime-2026-04-29-release.md](/Users/macbook/poolproject/deploy/commission-runtime-2026-04-29-release.md)
3. [tmp/archived_admin_ui_2026-04-28](/Users/macbook/poolproject/tmp/archived_admin_ui_2026-04-28)
4. [docs/archive/tmp-archived/archived_commission_plan_2026-04-27](/Users/macbook/poolproject/docs/archive/tmp-archived/archived_commission_plan_2026-04-27)
5. [tmp/legacy-unilevel](/Users/macbook/poolproject/tmp/legacy-unilevel)
6. [tmp/experimental](/Users/macbook/poolproject/tmp/experimental)
7. [docs/archive/uat-history/2026-03-27-stephub-bao-uat-checklist.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-03-27-stephub-bao-uat-checklist.md)
8. [docs/archive/uat-history/2026-04-02-bao-wap-signup-share-uat-checklist.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-04-02-bao-wap-signup-share-uat-checklist.md)
9. [docs/archive/uat-history/2026-04-03-bao-wap-runtime-audit.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-04-03-bao-wap-runtime-audit.md)
10. [docs/archive/uat-history/2026-04-03-wap-matrix-mobile-layout-regression.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-04-03-wap-matrix-mobile-layout-regression.md)

## Top 10 do-not-delete-before-server candidates

1. [deploy/compose/docker-compose.yml](/Users/macbook/poolproject/deploy/compose/docker-compose.yml)
2. [Dockerfile.api-worker](/Users/macbook/poolproject/Dockerfile.api-worker)
3. [deploy/compose/nginx/nginx.conf](/Users/macbook/poolproject/deploy/compose/nginx/nginx.conf)
4. [deploy/compose/nginx/conf.d/default.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/default.conf)
5. [deploy/compose/nginx/conf.d/api.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/api.conf)
6. [deploy/compose/nginx/conf.d/bao.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/bao.conf)
7. [deploy/compose/nginx/conf.d/wap.conf](/Users/macbook/poolproject/deploy/compose/nginx/conf.d/wap.conf)
8. [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend)
9. [stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub)
10. [docs/technical-design/referral_commission_plan_thb.md](/Users/macbook/poolproject/docs/technical-design/referral_commission_plan_thb.md)
