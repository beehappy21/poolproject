#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_DIR="$ROOT_DIR/deploy/compose"

copy_if_missing() {
  local from="$1"
  local to="$2"

  if [[ -f "$to" ]]; then
    echo "[compose-init] keep existing $(basename "$to")"
    return
  fi

  cp "$from" "$to"
  echo "[compose-init] created $(basename "$to") from template"
}

copy_if_missing "$COMPOSE_DIR/.env.example" "$COMPOSE_DIR/.env"
copy_if_missing "$COMPOSE_DIR/api.env.example" "$COMPOSE_DIR/api.env"
copy_if_missing "$COMPOSE_DIR/bao.env.example" "$COMPOSE_DIR/bao.env"
copy_if_missing "$COMPOSE_DIR/wap.env.example" "$COMPOSE_DIR/wap.env"

echo
echo "[compose-init] next steps"
echo "1. Fill real secrets in deploy/compose/.env, api.env, bao.env, wap.env"
echo "2. Run npm run ops:check:api-env -- deploy/compose/api.env"
echo "3. Run npm run ops:check:bao-env -- deploy/compose/bao.env"
echo "4. Run npm run ops:check:wap-env -- deploy/compose/wap.env"
echo "5. Run docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml config"
