#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub"
BUILD_DIR="$APP_DIR/build"
BUILD_INDEX="$BUILD_DIR/index.html"
SERVE_SCRIPT="$ROOT_DIR/scripts/serve_stephub_build.mjs"
VERIFY_ONLY="${1:-}"
LOCAL_URL="http://127.0.0.1:3002"
LOCAL_ROUTE="$LOCAL_URL/TabNavigator"
LIVE_WWW_ROUTE="https://www.blifehealthy.com/TabNavigator"
LIVE_WAP_ROUTE="https://wap.blifehealthy.com/TabNavigator"
LIVE_ROOT_ROUTE="https://blifehealthy.com/TabNavigator"
LOG_FILE="${TMPDIR:-/tmp}/wap-refresh-verify.log"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

info() {
  echo "==> $*"
}

build_is_usable() {
  [[ -f "$BUILD_INDEX" && -d "$BUILD_DIR/static" ]]
}

extract_main_hash() {
  local url="$1"
  curl -s "$url" | perl -ne 'print "$1\n" if m{/static/js/(main\.[a-z0-9]+\.js)}'
}

extract_title() {
  local url="$1"
  curl -s "$url" | perl -ne 'print "$1\n" if m{<title>([^<]+)</title>}i'
}

wait_for_local() {
  local attempts=0
  until curl -s "$LOCAL_ROUTE" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [[ "$attempts" -ge 30 ]]; then
      if [[ "$VERIFY_ONLY" == "--verify-only" ]]; then
        if build_is_usable; then
          fail "Local WAP server did not become ready on $LOCAL_ROUTE. 'npm run wap:verify' does not start the local WAP server. Start it first with 'npm run wap:refresh', or manually serve the local Stephub app with 'bash scripts/run_local_stephub_app.sh' when a usable static build already exists, then rerun 'npm run wap:verify'."
        fi
        fail "Local WAP server did not become ready on $LOCAL_ROUTE. 'npm run wap:verify' does not start the local WAP server, and no local Stephub build was found at $BUILD_INDEX. Run 'npm run wap:refresh' to build and serve WAP locally first. If you want a manual path instead, create a usable static build and then run 'bash scripts/run_local_stephub_app.sh' before rerunning 'npm run wap:verify'."
      fi
      fail "Local WAP server did not become ready on $LOCAL_ROUTE"
    fi
    sleep 1
  done
}

if [[ "$VERIFY_ONLY" != "--verify-only" ]]; then
  info "Building WAP"
  npm --prefix "$APP_DIR" run build

  info "Stopping old WAP server on 3002"
  if lsof -tiTCP:3002 -sTCP:LISTEN >/dev/null 2>&1; then
    kill "$(lsof -tiTCP:3002 -sTCP:LISTEN)" || true
    sleep 1
  fi

  info "Starting WAP build server"
  nohup env HOST=127.0.0.1 PORT=3002 node "$SERVE_SCRIPT" "$BUILD_DIR" >"$LOG_FILE" 2>&1 &
  sleep 1
else
  info "Verify-only mode: expecting an existing local WAP server on $LOCAL_ROUTE"
fi

wait_for_local

LOCAL_HASH="$(extract_main_hash "$LOCAL_ROUTE")"
[[ -n "$LOCAL_HASH" ]] || fail "Could not extract local main bundle hash"

info "Checking built bundle for local-only hosts"
if rg -n "127\.0\.0\.1:8001|127\.0\.0\.1:3000|localhost:8001|localhost:3000" "$BUILD_DIR/static/js/$LOCAL_HASH" >/dev/null; then
  fail "Built bundle still contains localhost backend URLs"
fi

info "Checking public surface smoke"
node "$ROOT_DIR/scripts/check_wap_public_surface.js"

info "Checking local and live routes use the same bundle"
WWW_HASH="$(extract_main_hash "$LIVE_WWW_ROUTE")"
WAP_HASH="$(extract_main_hash "$LIVE_WAP_ROUTE")"
ROOT_HASH="$(extract_main_hash "$LIVE_ROOT_ROUTE")"

[[ -n "$WWW_HASH" ]] || fail "Could not extract bundle hash from $LIVE_WWW_ROUTE"
[[ -n "$WAP_HASH" ]] || fail "Could not extract bundle hash from $LIVE_WAP_ROUTE"

[[ "$WWW_HASH" == "$LOCAL_HASH" ]] || fail "www hash mismatch: local=$LOCAL_HASH live=$WWW_HASH"
[[ "$WAP_HASH" == "$LOCAL_HASH" ]] || fail "wap hash mismatch: local=$LOCAL_HASH live=$WAP_HASH"

if [[ -n "$ROOT_HASH" ]]; then
  [[ "$ROOT_HASH" == "$LOCAL_HASH" ]] || fail "root hash mismatch: local=$LOCAL_HASH live=$ROOT_HASH"
else
  ROOT_TITLE="$(extract_title "$LIVE_ROOT_ROUTE")"
  echo "Root domain note: ${ROOT_TITLE:-no app bundle on root route}"
fi

info "Checking live routes do not serve localhost references"
if curl -s "$LIVE_ROOT_ROUTE" | rg -n "127\.0\.0\.1:8001|127\.0\.0\.1:3000|localhost:8001|localhost:3000" >/dev/null; then
  fail "Live root route still references localhost"
fi

echo "WAP refresh/verify complete."
echo "Local hash: $LOCAL_HASH"
