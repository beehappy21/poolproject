# Commission Runtime Release 2026-05-12

This bundle prepares the latest commission-calculation rules for server deployment without carrying local test or baseline runtime artifacts.

## Scope

- Preserve the latest four-plan commission runtime:
  - `direct`
  - `2leg / 3leg`
  - `matching`
  - `pool`
- Keep `direct` eligibility aligned with receivable cycles at child-order approval time
- Keep cap-based eligibility aligned with the current runtime settings
- Keep BAO commission-settings reads and writes compatible with the latest `runtime/commission-settings.json` structure
- Ship only the live rules payload under `runtime/commission-settings.json`

## Runtime Values In This Release

- `directLevelRates`: `["0.5", "0.5"]`
- `matchingLevelRates`: `["0.05", "0.05"]`
- `teamTwoLegRate`: `"0.3"`
- `teamThreeLegRate`: `"0.5"`
- `dailyCommissionCapAmount`: `"3000"`
- `buybackThresholdAmount`: `"10000"`
- `buybackRepurchaseAmount`: `"1000"`
- `buybackGraceDays`: `3`
- `poolMinActivePackageBuyerDirects`: `3`
- `poolMaxEntitlementShareRate`: `"0.03"`
- `poolRate`: `"1"`
- `cashbackRate`: `"0"`

## Bundle Contents

- `runtime/commission-settings.json`
- `packages/shared/utils/src/commission-settings.util.ts`
- `packages/modules/commissions/src/services/commissions.service.ts`
- `packages/modules/pool/src/services/pool.service.ts`
- `apps/api/src/admin-settings.controller.ts`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/PoolprojectSettingsStore.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/CommissionSettingsController.php`

## Explicitly Excluded From Server Bundle

- `runtime/commission-test-*`
- `runtime/member003*`
- `runtime/auth-sessions.json`
- `runtime/*.backup`
- `runtime/saletest*`
- local smoke outputs, baseline reports, and workbook-derived fixtures

## Prepare Command

```bash
bash scripts/prepare_commission_runtime_release.sh
```

This writes:

- staged folder: `deploy/releases/commission-runtime-2026-05-12/`
- zip bundle: `deploy/releases/commission-runtime-2026-05-12.zip`

## Server Notes

1. Unzip from the project root so file paths land in the same locations.
2. Replace only the included files. Do not sync the whole local `runtime/` directory.
3. Rebuild or restart the API and BAO runtime after replacing files.
4. Verify:
   - `/health`
   - BAO commission settings page still opens
   - current `runtime/commission-settings.json` on server matches the release payload
   - approved-order `direct` and end-of-day `team / matching / pool` flows still run normally
