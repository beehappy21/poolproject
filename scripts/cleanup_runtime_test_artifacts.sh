#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-}"

if [[ "$MODE" == "--help" || "$MODE" == "-h" ]]; then
  cat <<'EOF'
Usage:
  bash scripts/cleanup_runtime_test_artifacts.sh
  bash scripts/cleanup_runtime_test_artifacts.sh --apply

This removes local test/runtime artifacts while keeping the active runtime settings files.

Dry-run is the default.
EOF
  exit 0
fi

PATTERNS=(
  "runtime/auth-sessions.json"
  "runtime/commission-test-*"
  "runtime/member003*"
  "runtime/saletest*"
  "runtime/*.backup"
  "runtime/commission-plan-summary.md"
  "runtime/commission-plan-summary.xlsx"
  "deploy/releases/*.zip"
)

matches=()
for pattern in "${PATTERNS[@]}"; do
  while IFS= read -r path; do
    [[ -n "$path" ]] && matches+=("$path")
  done < <(cd "$ROOT_DIR" && compgen -G "$pattern" || true)
done

if [[ ${#matches[@]} -eq 0 ]]; then
  echo "no_artifacts_found=yes"
  exit 0
fi

printf 'artifacts_found=%s\n' "${#matches[@]}"
printf '%s\n' "${matches[@]}"

if [[ "$MODE" != "--apply" ]]; then
  echo "dry_run=yes"
  echo "tip=rerun with --apply to delete the listed artifacts"
  exit 0
fi

for path in "${matches[@]}"; do
  rm -f "$ROOT_DIR/$path"
done

echo "apply=ok"
