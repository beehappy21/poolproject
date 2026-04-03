#!/usr/bin/env python3

import json
import sys
from pathlib import Path

BENCHMARKS_PATH = Path("scripts/member003-matrix-legacy-benchmarks.json")


def load_expected_feeders():
    payload = json.loads(BENCHMARKS_PATH.read_text(encoding="utf-8"))
    return payload["board1Round1Feeders"]


def load_actual_slots(report_payload: dict, member_id: str):
    if member_id in {"TH0000008", "TH0000011", "TH0000012", "TH0000013", "TH0000016", "TH0000020", "TH0000023", "TH0000031", "TH0000032", "TH0000074", "TH0000086", "TH0000099"}:
        derived = next(
            (
                row
                for row in report_payload["report"].get("legacyDerivedBoards", [])
                if row["memberId"] == member_id and row["boardNo"] == 1 and row["roundNo"] == 1
            ),
            None,
        )
        if derived:
            slots = {}
            for row in derived["slots"]:
                slots[row["slotIndex"]] = row["sourceMemberId"]
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


def main():
    report_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path("runtime/member003-matrix-legacy-experimental-report.json")
    )
    report_payload = json.loads(report_path.read_text(encoding="utf-8"))
    expected_feeders = load_expected_feeders()

    failures = []
    actual = {}
    for member_id, expected_slots in expected_feeders.items():
        actual_slots = load_actual_slots(report_payload, member_id)
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
        "feeders": actual,
        "status": "passed" if not failures else "failed",
        "failureCount": len(failures),
        "failures": failures,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
