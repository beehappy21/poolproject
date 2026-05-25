#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DATE="${1:-2026-05-12}"
RELEASE_NAME="commission-runtime-${RELEASE_DATE}"
STAGE_DIR="$ROOT_DIR/deploy/releases/$RELEASE_NAME"
ZIP_PATH="$ROOT_DIR/deploy/releases/${RELEASE_NAME}.zip"

required_files=(
  "runtime/commission-settings.json"
  "packages/shared/utils/src/commission-settings.util.ts"
  "packages/modules/commissions/src/services/commissions.service.ts"
  "packages/modules/pool/src/services/pool.service.ts"
  "apps/api/src/admin-settings.controller.ts"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/PoolprojectSettingsStore.php"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/CommissionSettingsController.php"
  "deploy/commission-runtime-2026-05-12-release.md"
)

forbidden_runtime_patterns=(
  "runtime/commission-test-*"
  "runtime/member003*"
  "runtime/auth-sessions.json"
  "runtime/*.backup"
  "runtime/saletest*"
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

echo "[release] copied required files"

for pattern in "${forbidden_runtime_patterns[@]}"; do
  if compgen -G "$STAGE_DIR/$pattern" >/dev/null; then
    echo "[release] forbidden test/runtime artifact matched inside staged bundle: $pattern" >&2
    exit 1
  fi
done

rm -f "$ZIP_PATH"
(
  cd "$STAGE_DIR"
  zip -rq "$ZIP_PATH" .
)

echo "[release] stage dir: $STAGE_DIR"
echo "[release] zip file: $ZIP_PATH"
echo "[release] runtime payload includes only runtime/commission-settings.json"
