# Final Pre-server Cleanup Verification

## 1. Scope

- Branch: `chore/final-pre-server-cleanup-verification`
- Base commit: `21ddcb01`
- Cleanup PRs verified:
  - `#121` pre-deploy cleanup audit
  - `#122` deep pre-deploy cleanup audit
  - `#123` `.gitignore` / `.dockerignore` cleanup for local/generated files
  - `#124` archive legacy docs into `docs/archive`
  - `#125` safe cleanup candidate removal for `tmp/experimental/*`
- Working tree state before verification: `clean`

## 2. Production-critical path check

| Path | Exists | Risk if missing | Status |
| --- | --- | --- | --- |
| `package.json` | yes | scripts and build entrypoints break | OK |
| `package-lock.json` | yes | reproducible install / Docker build break | OK |
| `Dockerfile.api-worker` | yes | API/worker image build breaks | OK |
| `deploy/compose/docker-compose.yml` | yes | compose deploy path breaks | OK |
| `deploy/compose/nginx/` | yes | nginx build/routing breaks | OK |
| `deploy/compose/api.env.example` | yes | deploy env validation loses API baseline | OK |
| `deploy/compose/bao.env.example` | yes | deploy env validation loses BAO baseline | OK |
| `deploy/compose/wap.env.example` | yes | deploy env validation loses WAP baseline | OK |
| `apps/` | yes | app source/build breaks | OK |
| `packages/` | yes | shared module imports/build break | OK |
| `prisma/` | yes | schema and migration workflows break | OK |
| `scripts/` | yes | ops/smoke/deploy helper workflows break | OK |
| `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend` | yes | BAO compose build path breaks | OK |
| `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub` | yes | WAP compose build path breaks | OK |

## 3. Removed/moved reference check

| Old path | References remaining | New path if archived | Status |
| --- | --- | --- | --- |
| `matrix2x2oldsetup.md` | `0` outside cleanup docs | `docs/archive/legacy-root-notes/matrix2x2oldsetup.md` | OK |
| `testmatrix.md` | `2`, both from archived `matrix2x2oldsetup.md` using archived path | `docs/archive/legacy-root-notes/testmatrix.md` | OK |
| `docs/technical-design/matrix_runtime_reentry_spec.md` | `0` outside cleanup docs | `docs/archive/technical-design-legacy/matrix_runtime_reentry_spec.md` | OK |
| `docs/technical-design/member003_matrix_legacy_business_rules.md` | `0` outside cleanup docs | `docs/archive/technical-design-legacy/member003_matrix_legacy_business_rules.md` | OK |
| `docs/technical-design/member003_matrix_legacy_findings.md` | `0` outside cleanup docs | `docs/archive/technical-design-legacy/member003_matrix_legacy_findings.md` | OK |
| `docs/uat/2026-03-27-stephub-bao-uat-checklist.md` | `0` outside cleanup docs | `docs/archive/uat-history/2026-03-27-stephub-bao-uat-checklist.md` | OK |
| `docs/uat/2026-04-02-bao-wap-signup-share-uat-checklist.md` | `0` outside cleanup docs | `docs/archive/uat-history/2026-04-02-bao-wap-signup-share-uat-checklist.md` | OK |
| `docs/uat/2026-04-03-bao-wap-runtime-audit.md` | `0` outside cleanup docs | `docs/archive/uat-history/2026-04-03-bao-wap-runtime-audit.md` | OK |
| `docs/uat/2026-04-03-wap-matrix-mobile-layout-regression.md` | `0` outside cleanup docs | `docs/archive/uat-history/2026-04-03-wap-matrix-mobile-layout-regression.md` | OK |
| `docs/uat/2026-04-06-phase1-service-review.md` | `0` outside cleanup docs | `docs/archive/uat-history/2026-04-06-phase1-service-review.md` | OK |
| `docs/uat/2026-04-11-bao-wap-baseline.md` | `0` outside cleanup docs | `docs/archive/uat-history/2026-04-11-bao-wap-baseline.md` | OK |
| `tmp/archived_commission_plan_2026-04-27` | `0` outside cleanup docs | `docs/archive/tmp-archived/archived_commission_plan_2026-04-27` | OK |
| `tmp/experimental/bulk_test_product_orders.js` | `0` outside cleanup docs | `-` | OK |
| `tmp/experimental/replay_test_product_timeline.js` | `0` outside cleanup docs | `-` | OK |

## 4. Package script check

`package.json` scripts were checked against:
- removed experimental files
- old root legacy note paths
- old technical-design legacy paths
- old UAT paths
- old `tmp/archived_commission_plan_2026-04-27` path

Result:
- no `package.json` script still points to the removed `tmp/experimental/*` files
- no `package.json` script points to the moved legacy docs or old UAT paths
- package script surface remains aligned with the current cleanup state

## 5. Ignore safety check

### Production-critical files not ignored

These files are not explicitly ignored by `.gitignore` or `.dockerignore`, and `git check-ignore` did not report them as ignored:
- `package.json`
- `Dockerfile.api-worker`
- `deploy/compose/docker-compose.yml`
- `apps/api/src/main.ts`
- `packages/README.md`
- `prisma/schema.prisma`

### Local/generated files ignored

Confirmed from `.gitignore`, `.dockerignore`, or nested ignore files:
- `.env`
- `.DS_Store`
- `runtime/*`
- `logs/*`
- `dist/*`
- `node_modules/*`
- `stephub.../backend/vendor`
- `stephub.../stephub/build`

Notes:
- `.gitignore` covers `.env`, `.DS_Store`, `runtime`, `logs`, `dist`, `node_modules`, and Stephub generated paths.
- `.dockerignore` also excludes `.env`, `.DS_Store`, `node_modules`, `dist`, `logs`, `runtime`, `vendor`, and `build`.

## 6. Command validation results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | passed | TypeScript no-emit checks completed without reported errors |
| `npm run ops:check:deploy-env` | passed | API/BAO/WAP env example files contain required keys |
| `npm run ops:preflight:deploy` | passed | Env validation, Stephub tree check, secret placeholder check, and compose validation completed |
| `npm run wap:verify` | failed | Local WAP server did not become ready on `http://127.0.0.1:3002/TabNavigator` |

## 7. Remaining risks before server

- Real server secrets and server-specific env values still need final validation outside local repo checks.
- `wap:verify` currently fails because the local WAP endpoint did not become ready; this is a runtime-readiness issue, not a cleanup-structure issue.
- BAO/WAP source tree still remains a hard dependency for deploy and must stay intact.
- Docker availability and actual server compose execution still need live environment confirmation.
- Smoke coverage beyond these checks, especially full BAO/WAP/browser flows, should still be run before final server cutover.

## 8. Recommended next PRs

- Server env hardening and secret verification follow-up, if server values need stricter checks.
- Deploy dry-run verification PR or runbook pass for real compose/server execution.
- WAP verification follow-up PR or ops fix if the local `TabNavigator` readiness issue reproduces consistently.
- Additional cleanup or archive PRs only after human confirmation for items still flagged as historical but referenced.
