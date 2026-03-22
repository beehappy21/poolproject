#!/usr/bin/env python3

import json
import sys
from pathlib import Path
from typing import List, Optional

EXPECTED_BOARD_ONE = {
    "TH0000013": [
        "TH0000016",
        "TH0000017",
        "TH0000023",
        "TH0000020",
        "TH0000031",
        "TH0000032",
    ],
    "TH0000016": [
        "TH0000023",
        "TH0000020",
        "TH0000039",
        "TH0000053",
        "TH0000037",
        "TH0000046",
    ],
    "TH0000023": [
        "TH0000029",
        "TH0000030",
        "TH0000039",
        "TH0000053",
        "TH0000037",
        "TH0000046",
    ],
    "TH0000020": [
        "TH0000028",
        "TH0000036",
        "TH0000034",
        "TH0000075",
        None,
        None,
    ],
}


def fail(message: str) -> None:
    print(f"ASSERTION FAILED: {message}")
    raise SystemExit(1)


def load_board_one_slots(report_payload: dict, member_id: str) -> List[Optional[str]]:
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

    failures = []
    actual = {}
    for member_id, expected_slots in EXPECTED_BOARD_ONE.items():
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
