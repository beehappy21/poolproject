#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "======================================="
echo "Member003 Commission Day Step Runner"
echo "======================================="
echo
echo "This command advances the commission test by 1 signup-day batch."
echo "Each run will:"
echo "- use product 'test' (1000 THB / 350 PV)"
echo "- create approved orders for the next pending signup day"
echo "- run End Of Day for that day"
echo "- save progress so the next click continues with the next day"
echo
echo "State files:"
echo "- runtime/testsystem/member003-commission-step-state.json"
echo "- runtime/testsystem/member003-commission-step-history.json"
echo
read "confirm?Type RUN to process the next day: "

if [[ "${confirm}" != "RUN" ]]; then
  echo
  echo "Cancelled."
  read "done?Press Enter to close..."
  exit 0
fi

echo
echo "Running next day batch..."
echo

cd "$PROJECT_ROOT"
node testsystem/step_member003_commission_day.mjs --apply

echo
echo "Day batch completed."
read "done?Press Enter to close..."
