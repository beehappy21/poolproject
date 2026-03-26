#!/usr/bin/env bash
set -euo pipefail

check_port() {
  local label="$1"
  local port="$2"

  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[ok] $label is listening on $port"
  else
    echo "[fail] $label is not listening on $port"
    return 1
  fi
}

check_url() {
  local label="$1"
  local url="$2"
  local attempt

  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
      echo "[ok] $label"
      return 0
    fi
    sleep 1
  done

  echo "[fail] $label"
  return 1
}

check_port "Postgres" 5432
check_port "API" 3000
check_port "BAO" 8001
check_port "Stephub app" 3002

check_url "API health" "http://127.0.0.1:3000/health"
check_url "Storefront products endpoint" "http://127.0.0.1:3000/products/storefront"
check_url "Storefront categories endpoint" "http://127.0.0.1:3000/products/categories"
check_url "BAO slides endpoint" "http://127.0.0.1:8001/api/slides"
check_url "BAO banners endpoint" "http://127.0.0.1:8001/api/banners"
check_url "Stephub app root" "http://127.0.0.1:3002"

bash scripts/check-stephub-local-baseline.sh

echo "Local dev stack checks passed."
