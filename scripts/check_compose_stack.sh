#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-$ROOT_DIR/deploy/compose/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/deploy/compose/docker-compose.yml}"
API_HOST="${API_HOST:-api.blifehealthy.com}"
BAO_HOST="${BAO_HOST:-bao.blifehealthy.com}"
WAP_HOST="${WAP_HOST:-wap.blifehealthy.com}"
BASE_URL="${BASE_URL:-http://127.0.0.1}"
TAIL_LINES="${TAIL_LINES:-60}"

if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "[compose-check] missing env file: $COMPOSE_ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "[compose-check] missing compose file: $COMPOSE_FILE" >&2
  exit 1
fi

echo "[compose-check] validating env files"
node "$ROOT_DIR/scripts/check_api_env.mjs" "$ROOT_DIR/deploy/compose/api.env"
node "$ROOT_DIR/scripts/check_bao_env.mjs" "$ROOT_DIR/deploy/compose/bao.env"
node "$ROOT_DIR/scripts/check_wap_env.mjs" "$ROOT_DIR/deploy/compose/wap.env"

echo "[compose-check] docker compose ps"
docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" ps

echo "[compose-check] nginx config test"
docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" exec nginx nginx -t

echo "[compose-check] api health"
curl --fail --silent --show-error -H "Host: $API_HOST" "$BASE_URL/health"
echo

echo "[compose-check] bao login"
curl --fail --silent --show-error --head -H "Host: $BAO_HOST" "$BASE_URL/admin/login"

echo "[compose-check] wap home"
curl --fail --silent --show-error --head -H "Host: $WAP_HOST" "$BASE_URL/"

echo "[compose-check] recent logs"
docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" logs --tail="$TAIL_LINES" nginx api bao wap

echo
echo "[compose-check] done"
