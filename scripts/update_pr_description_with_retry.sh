#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scripts/update_pr_description_with_retry.sh <pr-number> --body-file <path>
  bash scripts/update_pr_description_with_retry.sh <pr-number> --body-text "..."
  cat body.md | bash scripts/update_pr_description_with_retry.sh <pr-number>

Options:
  --body-file <path>  Read PR body from file
  --body-text <text>  Use inline PR body text

Env:
  PR_EDIT_MAX_ATTEMPTS   Default 5
  PR_EDIT_RETRY_SLEEP    Default 3 seconds
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

PR_NUMBER="$1"
shift || true

BODY_FILE=""
TEMP_BODY_FILE=""
MAX_ATTEMPTS="${PR_EDIT_MAX_ATTEMPTS:-5}"
RETRY_SLEEP="${PR_EDIT_RETRY_SLEEP:-3}"

cleanup() {
  if [[ -n "$TEMP_BODY_FILE" && -f "$TEMP_BODY_FILE" ]]; then
    rm -f "$TEMP_BODY_FILE"
  fi
}

trap cleanup EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --body-file)
      BODY_FILE="${2:-}"
      shift 2
      ;;
    --body-text)
      TEMP_BODY_FILE="$(mktemp)"
      printf '%s' "${2:-}" > "$TEMP_BODY_FILE"
      BODY_FILE="$TEMP_BODY_FILE"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$BODY_FILE" ]]; then
  TEMP_BODY_FILE="$(mktemp)"
  cat > "$TEMP_BODY_FILE"
  BODY_FILE="$TEMP_BODY_FILE"
fi

if [[ ! -f "$BODY_FILE" ]]; then
  echo "Body file not found: $BODY_FILE" >&2
  exit 1
fi

attempt=1
while [[ "$attempt" -le "$MAX_ATTEMPTS" ]]; do
  echo "Updating PR #$PR_NUMBER description (attempt $attempt/$MAX_ATTEMPTS)..."

  if gh pr edit "$PR_NUMBER" --body-file "$BODY_FILE"; then
    echo "PR #$PR_NUMBER description updated successfully."
    exit 0
  fi

  if [[ "$attempt" -lt "$MAX_ATTEMPTS" ]]; then
    echo "Retrying in ${RETRY_SLEEP}s after transient GitHub/API failure..."
    sleep "$RETRY_SLEEP"
  fi

  attempt=$((attempt + 1))
done

echo "Failed to update PR #$PR_NUMBER description after $MAX_ATTEMPTS attempts." >&2
exit 1
