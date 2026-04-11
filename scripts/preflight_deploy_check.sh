#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[preflight] validating env files"
node "$ROOT_DIR/scripts/check_api_env.mjs" "$ROOT_DIR/deploy/compose/api.env"
node "$ROOT_DIR/scripts/check_bao_env.mjs" "$ROOT_DIR/deploy/compose/bao.env"
node "$ROOT_DIR/scripts/check_wap_env.mjs" "$ROOT_DIR/deploy/compose/wap.env"

echo "[preflight] checking for placeholder secrets"
node "$ROOT_DIR/scripts/check_secret_placeholders.mjs"

echo "[preflight] validating docker compose config"
docker compose --env-file "$ROOT_DIR/deploy/compose/.env" -f "$ROOT_DIR/deploy/compose/docker-compose.yml" config >/dev/null

echo "[preflight] done"
