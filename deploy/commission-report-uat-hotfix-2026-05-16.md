# Commission Report UAT Hotfix 2026-05-16

This hotfix restores a consistent BAO commission-report runtime on UAT after a partial deploy left `CommissionReportController` and `CommissionBaselineDayRunner` newer than `BaoAdminApiClient`.

## Problem

UAT BAO currently throws:

- `Call to undefined method App\Support\BaoAdminApiClient::internalRequest()`

Verified on `nc-user@202.94.169.245` inside `poolproject-uat-bao-1`:

- `backend/app/Support/BaoAdminApiClient.php` is still an older file without `internalRequest()`
- `backend/app/Http/Controllers/Platform/CommissionReportController.php` is newer and already calls `internalRequest()`
- `backend/app/Support/CommissionBaselineDayRunner.php` is newer and already calls `internalRequest()`

## Bundle Contents

- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/BaoAdminApiClient.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionBaselineDayRunner.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionBaselineRuntimeResetter.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionReportBuilder.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/CommissionReportController.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionReportScreen.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/report.blade.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/routes/platform.php`

## Prepare Command

```bash
bash scripts/prepare_commission_report_uat_hotfix.sh
```

This writes:

- staged folder: `deploy/releases/commission-report-uat-hotfix-2026-05-16/`
- zip bundle: `deploy/releases/commission-report-uat-hotfix-2026-05-16.zip`

## UAT Deploy Commands

Run from your local machine:

```bash
scp deploy/releases/commission-report-uat-hotfix-2026-05-16.zip nc-user@202.94.169.245:/home/nc-user/
ssh nc-user@202.94.169.245
```

Run on the server:

```bash
cd /home/nc-user/poolproject
mkdir -p /home/nc-user/tmp/commission-report-uat-hotfix-2026-05-16
unzip -o /home/nc-user/commission-report-uat-hotfix-2026-05-16.zip -d /home/nc-user/tmp/commission-report-uat-hotfix-2026-05-16
cp -R /home/nc-user/tmp/commission-report-uat-hotfix-2026-05-16/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/. /home/nc-user/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/
cp /home/nc-user/tmp/commission-report-uat-hotfix-2026-05-16/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/CommissionReportController.php /home/nc-user/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/CommissionReportController.php
cp /home/nc-user/tmp/commission-report-uat-hotfix-2026-05-16/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionReportScreen.php /home/nc-user/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionReportScreen.php
cp /home/nc-user/tmp/commission-report-uat-hotfix-2026-05-16/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/report.blade.php /home/nc-user/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/report.blade.php
cp /home/nc-user/tmp/commission-report-uat-hotfix-2026-05-16/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/routes/platform.php /home/nc-user/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/routes/platform.php
docker compose -f deploy/compose/docker-compose.yml restart bao
docker exec poolproject-uat-bao-1 php /var/www/html/backend/artisan optimize:clear
docker compose -f deploy/compose/docker-compose.yml restart bao
```

## Verification

Run on the server:

```bash
docker exec poolproject-uat-bao-1 sh -lc "grep -n 'function internalRequest' /var/www/html/backend/app/Support/BaoAdminApiClient.php"
docker exec poolproject-uat-bao-1 php /var/www/html/backend/artisan route:list | grep commission/report
curl -I http://127.0.0.1:18001/admin/commission/report
```

Then verify in browser:

1. Open `/admin/commission/report`
2. Switch tabs to `Direct Bonus`, `Team Bonus`, `Matching Bonus`, and `Pool Bonus`
3. Trigger the same UAT flow that previously raised the `undefined method` error
