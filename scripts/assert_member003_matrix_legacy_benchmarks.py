#!/usr/bin/env python3

import json
import sys
from pathlib import Path
from typing import List, Optional

BENCHMARKS_PATH = Path("scripts/member003-matrix-legacy-benchmarks.json")


def load_expected_board_one():
    payload = json.loads(BENCHMARKS_PATH.read_text(encoding="utf-8"))
    return payload["primaryAcceptanceMembers"]


def fail(message: str) -> None:
    print(f"ASSERTION FAILED: {message}")
    raise SystemExit(1)


def load_board_one_slots(report_payload: dict, member_id: str) -> List[Optional[str]]:
    derived = next(
        (
            row
            for row in report_payload["report"].get("legacyDerivedBoards", [])
            if row["memberId"] == member_id and row["boardNo"] == 1 and row["roundNo"] == 1
        ),
        None,
    )
    if derived:
        slots = {row["slotIndex"]: row["sourceMemberId"] for row in derived.get("slots", [])}
        return [slots.get(slot_index) for slot_index in range(1, 7)]

    placements = [
        row
        for row in report_payload["report"]["placements"]
        if row["beneficiaryId"] == member_id
        and row["boardNo"] == 1
        and row["beneficiaryRoundNo"] == 1
    ]
    slots = {row["slotIndex"]: row["sourceMemberId"] for row in placements}
    return [slots.get(slot_index) for slot_index in range(1, 7)]


def main() -> None:
    report_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path("runtime/member003-matrix-legacy-report.json")
    )
    report_payload = json.loads(report_path.read_text(encoding="utf-8"))
    expected_board_one = load_expected_board_one()

    failures = []
    actual = {}
    for member_id, expected_slots in expected_board_one.items():
        actual_slots = load_board_one_slots(report_payload, member_id)
        actual[member_id] = actual_slots
        if actual_slots != expected_slots:
            failures.append(
                {
                    "memberId": member_id,
                    "expected": expected_slots,
                    "actual": actual_slots,
                }
            )

    summary = {
        "reportPath": str(report_path),
        "benchmarksPath": str(BENCHMARKS_PATH),
        "benchmarks": actual,
        "status": "passed" if not failures else "failed",
        "failureCount": len(failures),
        "failures": failures,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
