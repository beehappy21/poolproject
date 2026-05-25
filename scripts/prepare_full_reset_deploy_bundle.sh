#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DATE="${1:-$(date +%Y-%m-%d)}"
RELEASE_NAME="full-reset-deploy-${RELEASE_DATE}"
STAGE_DIR="$ROOT_DIR/deploy/releases/$RELEASE_NAME"
ZIP_PATH="$ROOT_DIR/deploy/releases/${RELEASE_NAME}.zip"
TAR_PATH="$ROOT_DIR/deploy/releases/${RELEASE_NAME}.tar"
SKIP_ZIP="${SKIP_ZIP:-0}"

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required but was not found in PATH." >&2
  exit 1
fi

echo "[bundle] preparing $RELEASE_NAME"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/repo"

rsync -a \
  --delete \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.DS_Store' \
  --exclude '.vscode' \
  --exclude '.idea' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'logs' \
  --exclude '.tmp' \
  --exclude 'tmp' \
  --exclude 'backups' \
  --exclude 'preflight-backups' \
  --exclude 'BlifeHealthy' \
  --exclude 'Minible_Codeigniter_v3.2.0' \
  --exclude 'picture' \
  --exclude 'stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/app_documentaion' \
  --exclude 'stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend_documentaion' \
  --exclude 'stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/links' \
  --exclude 'deploy/releases' \
  --exclude 'deploy/releases/*.zip' \
  --exclude 'deploy/releases/*.tar' \
  --exclude 'deploy/compose/.env' \
  --exclude 'deploy/compose/api.env' \
  --exclude 'deploy/compose/bao.env' \
  --exclude 'deploy/compose/wap.env' \
  --exclude 'runtime/auth-sessions.json' \
  --exclude 'runtime/commission-test-*' \
  --exclude 'runtime/member003*' \
  --exclude 'runtime/saletest*' \
  --exclude 'runtime/*.backup' \
  --exclude 'runtime/commission-plan-summary.md' \
  --exclude 'runtime/commission-plan-summary.xlsx' \
  --exclude 'runtime/server-product-export' \
  --exclude 'runtime/pycache' \
  --exclude 'member003.xlsx' \
  --exclude 'saletest*' \
  --exclude 'allsaletest*' \
  --exclude 'allsaletes.xlsx' \
  --exclude 'allsale.xlsx' \
  --exclude 'Book1.xlsx' \
  --exclude '*.xlsx' \
  --exclude 'testcommission001.md' \
  "$ROOT_DIR/" "$STAGE_DIR/repo/"

cat > "$STAGE_DIR/DEPLOY_RESET_RUNBOOK.md" <<'EOF'
Fresh rebuild deployment bundle

Target outcome:
- replace the current server app tree with this prepared local source bundle
- rebuild the server from clean local source instead of patching live files
- preserve only the server data and env files you intentionally back up and restore

Suggested order on the server:
1. take backup
2. upload and extract this bundle
3. stop the running compose stack
4. move aside or remove the old app tree on the server
5. restore the required env files into the extracted source tree
6. validate compose env files
7. rebuild compose images from the extracted source tree
8. boot stack and run smoke checks

Key commands:
- npm run uat:backup
- docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml down
- docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml build
- docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up -d
EOF

rm -f "$ZIP_PATH"
rm -f "$TAR_PATH"
(
  cd "$STAGE_DIR"
  tar -cf "$TAR_PATH" .
  if [[ "$SKIP_ZIP" != "1" ]]; then
    zip -rq "$ZIP_PATH" .
  fi
)

echo "[bundle] stage dir: $STAGE_DIR"
echo "[bundle] tar file: $TAR_PATH"
if [[ "$SKIP_ZIP" != "1" ]]; then
  echo "[bundle] zip file: $ZIP_PATH"
else
  echo "[bundle] zip file: skipped"
fi
