# Safe Cleanup PR 3 Report

## Removed files/folders

| Path | Reason | Reference check result |
| --- | --- | --- |
| `tmp/experimental/bulk_test_product_orders.js` | Tracked experimental script outside active production/deploy/source paths | No references found outside cleanup audit docs |
| `tmp/experimental/replay_test_product_timeline.js` | Tracked experimental script outside active production/deploy/source paths | No references found outside cleanup audit docs |

## Skipped candidates

| Path | Reason skipped | Reference found or human confirmation needed |
| --- | --- | --- |
| `runtime/commission-settings.json` | Active runtime settings artifact; not safe to remove | Referenced by `packages/shared/utils/src/commission-settings.util.ts`, multiple `scripts/*`, `HANDOFF_NEXT.md`, and Stephub bridge code |
| `tmp/legacy-unilevel/` | Historical legacy sandbox assets still referenced by archived docs | Referenced by `docs/archive/tmp-archived/archived_commission_plan_2026-04-27/*` and the folder's own runner script |
| `tmp-fonts/` | Not tracked in Git on this branch | Nothing to remove from Git |
| `runtime/` except `runtime/commission-settings.json` | Not tracked in Git on this branch | Nothing to remove from Git |
| `logs/` | Not tracked in Git on this branch | Nothing to remove from Git |
| `dist/` | Not tracked in Git on this branch | Nothing to remove from Git |
| `backups/` | Not tracked in Git on this branch | Nothing to remove from Git |
| `preflight-backups/` | Not tracked in Git on this branch | Nothing to remove from Git |
| `node_modules/` | Not tracked in Git on this branch | Nothing to remove from Git |
| `vendor/` | Only tracked match is inside forbidden Stephub backend source path | Protected by PR scope; not touched |
| `build/` | Only tracked match is inside forbidden Stephub frontend source path | Protected by PR scope; not touched |
| `.DS_Store` | No tracked `.DS_Store` files found on this branch | Nothing to remove from Git |

## Safety checks

- No source code touched under `apps/`, `packages/`, or `scripts/`
- No deploy config touched under `deploy/`
- No business logic changed
- No Prisma schema or migrations touched
- No `docs/archive/**` files removed
