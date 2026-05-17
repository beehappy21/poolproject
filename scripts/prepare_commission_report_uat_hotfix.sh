#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DATE="${1:-2026-05-16}"
RELEASE_NAME="commission-report-uat-hotfix-${RELEASE_DATE}"
STAGE_DIR="$ROOT_DIR/deploy/releases/$RELEASE_NAME"
ZIP_PATH="$ROOT_DIR/deploy/releases/${RELEASE_NAME}.zip"

required_files=(
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/BaoAdminApiClient.php"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionBaselineDayRunner.php"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionBaselineRuntimeResetter.php"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/CommissionReportBuilder.php"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/CommissionReportController.php"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionReportScreen.php"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/report.blade.php"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/routes/platform.php"
  "deploy/commission-report-uat-hotfix-2026-05-16.md"
)

echo "[release] preparing $RELEASE_NAME"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"

for file in "${required_files[@]}"; do
  if [[ ! -f "$ROOT_DIR/$file" ]]; then
    echo "[release] missing required file: $file" >&2
    exit 1
  fi

  mkdir -p "$STAGE_DIR/$(dirname "$file")"
  cp "$ROOT_DIR/$file" "$STAGE_DIR/$file"
done

rm -f "$ZIP_PATH"
(
  cd "$STAGE_DIR"
  zip -rq "$ZIP_PATH" .
)

echo "[release] stage dir: $STAGE_DIR"
echo "[release] zip file: $ZIP_PATH"
