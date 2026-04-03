#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BENCHMARKS_PATH="$ROOT_DIR/scripts/member003-matrix-legacy-benchmarks.json"
TMP_ROWS="$(mktemp)"

cd "$ROOT_DIR"
docker exec poolproject-postgres \
  psql -At postgresql://postgres:postgres@127.0.0.1:5432/poolproject \
  -c "select u.\"memberCode\" as beneficiary, mp.\"slotNo\", su.\"memberCode\" as source from \"MatrixPosition\" mp join \"MatrixBoard\" mb on mb.id=mp.\"boardId\" join \"MatrixCycle\" mc on mc.id=mb.\"cycleId\" join \"User\" u on u.id=mc.\"userId\" join \"User\" su on su.id=mp.\"sourceUserId\" where mb.\"boardNo\"=1 and mb.\"roundNo\"=1 order by u.\"memberCode\", mp.\"slotNo\";" \
  > "$TMP_ROWS"

python3 - "$BENCHMARKS_PATH" "$TMP_ROWS" <<'PY'
import json
import sys

benchmarks_path = sys.argv[1]
rows_path = sys.argv[2]

payload = json.loads(open(benchmarks_path, encoding="utf-8").read())
expected_feeders = payload["board1Round1Feeders"]
expected_primary = payload["primaryAcceptanceMembers"]
member_ids = sorted(set(expected_feeders) | set(expected_primary))

runtime = {member_id: [None, None, None, None, None, None] for member_id in member_ids}

with open(rows_path, encoding="utf-8") as fh:
    for raw in fh:
        raw = raw.strip()
        if not raw:
            continue
        beneficiary, slot_no, source = raw.split("|")
        if beneficiary in runtime:
            runtime[beneficiary][int(slot_no) - 1] = source

def summarize(label, expected):
    failures = []
    for member_id, expected_slots in expected.items():
        actual_slots = runtime.get(member_id, [None, None, None, None, None, None])
        if actual_slots != expected_slots:
            failures.append({
                "memberId": member_id,
                "expected": expected_slots,
                "actual": actual_slots,
            })
    return {
        "label": label,
        "status": "passed" if not failures else "failed",
        "failureCount": len(failures),
        "failures": failures,
    }

summary = {
    "benchmarksPath": benchmarks_path,
    "primaryAcceptance": summarize("primaryAcceptance", expected_primary),
    "feeders": summarize("feeders", expected_feeders),
    "runtime": runtime,
}

print(json.dumps(summary, ensure_ascii=False, indent=2))

if summary["primaryAcceptance"]["failureCount"] or summary["feeders"]["failureCount"]:
    raise SystemExit(1)
PY

rm -f "$TMP_ROWS"
