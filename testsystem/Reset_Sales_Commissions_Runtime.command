#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "========================================"
echo "Testsystem Sales/Commission Runtime Reset"
echo "========================================"
echo
echo "This will remove test runtime sales/commission data only."
echo "It will keep members and products/catalog data."
echo
echo "Included reset scope:"
echo "- Orders and order items"
echo "- Commission ledgers and company bonus rows"
echo "- Pool cycles / payouts / eligibility snapshots"
echo "- Team / pool settlement batches"
echo "- Buyback progress / events"
echo "- CAP ledgers / buckets"
echo "- Wallet transactions and wallet balances"
echo "- Member package cycles"
echo
echo "Kept data:"
echo "- Users / member profiles"
echo "- Products / product details / packages / catalog"
echo
read "confirm?Type RESET to continue: "

if [[ "${confirm}" != "RESET" ]]; then
  echo
  echo "Cancelled."
  read "done?Press Enter to close..."
  exit 0
fi

echo
echo "Running reset..."
echo

cd "$PROJECT_ROOT"
export ALLOW_DESTRUCTIVE_LOCAL_RESET=1
npm run testsystem:reset:sales-commissions:apply

echo
echo "Reset completed."
read "done?Press Enter to close..."
