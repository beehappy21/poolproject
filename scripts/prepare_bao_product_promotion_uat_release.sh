#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DATE="${1:-2026-05-22}"
RELEASE_NAME="bao-product-promotion-uat-${RELEASE_DATE}"
STAGE_DIR="$ROOT_DIR/deploy/releases/$RELEASE_NAME"
ZIP_PATH="$ROOT_DIR/deploy/releases/${RELEASE_NAME}.zip"

required_files=(
  "packages/modules/orders/src/repositories/orders.repository.ts"
  "prisma/schema.prisma"
  "prisma/migrations/20260521_add_product_detail_promotion_snapshot/migration.sql"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Models/ProductDetailRecord.php"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Order/OrderCreateScreen.php"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Product/ProductEditScreen.php"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/order/create-member-sale.blade.php"
  "stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/product/edit-form.blade.php"
  "docs/bao-local-product-promotion-checklist.md"
  "deploy/bao-product-promotion-uat-2026-05-22.md"
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
