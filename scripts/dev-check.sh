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
    if node -e '
const url = process.argv[1];
const transport = url.startsWith("https:") ? require("node:https") : require("node:http");
const request = transport.get(url, (response) => {
  if (response.statusCode && response.statusCode >= 200 && response.statusCode < 400) {
    process.exit(0);
    return;
  }
  process.exit(1);
});
request.on("error", () => process.exit(1));
request.setTimeout(2000, () => {
  request.destroy();
  process.exit(1);
});
' "$url"; then
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

check_url "API health" "http://localhost:3000/health"
check_url "Storefront products endpoint" "http://localhost:3000/products/storefront"
check_url "Storefront categories endpoint" "http://localhost:3000/products/categories"
check_url "BAO slides endpoint" "http://127.0.0.1:8001/api/slides"
check_url "BAO banners endpoint" "http://127.0.0.1:8001/api/banners"
check_url "Stephub app root" "http://127.0.0.1:3002"

bash scripts/check-stephub-local-baseline.sh

echo "Local dev stack checks passed."
