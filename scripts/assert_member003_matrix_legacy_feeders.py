#!/usr/bin/env python3

import json
import sys
from pathlib import Path

EXPECTED_FEEDERS = {
    "TH0000008": ["TH0000009", "TH0000010", "TH0000011", "TH0000064", "TH0000079", "TH0000076"],
    "TH0000011": ["TH0000041", "TH0000042", "TH0000043", "TH0000044", "TH0000045", "TH0000047"],
    "TH0000012": ["TH0000013", "TH0000013", "TH0000016", "TH0000017", "TH0000016", "TH0000017"],
    "TH0000013": ["TH0000016", "TH0000017", "TH0000023", "TH0000020", "TH0000031", "TH0000032"],
    "TH0000016": ["TH0000020", "TH0000023", "TH0000028", "TH0000036", "TH0000029", "TH0000030"],
    "TH0000020": ["TH0000028", "TH0000036", "TH0000034", "TH0000075", None, None],
    "TH0000023": ["TH0000029", "TH0000030", "TH0000039", "TH0000053", "TH0000037", "TH0000046"],
    "TH0000031": ["TH0000033", "TH0000048", "TH0000058", "TH0000107", "TH0000130", "TH0000143"],
    "TH0000032": ["TH0000099", "TH0000105", "TH0000115", "TH0000128", "TH0000161", "TH0000161"],
    "TH0000074": ["TH0000086", "TH0000087", "TH0000085", "TH0000094", "TH0000113", "TH0000117"],
    "TH0000086": ["TH0000085", "TH0000092", "TH0000113", "TH0000127", "TH0000131", "TH0000133"],
    "TH0000099": ["TH0000115", "TH0000128", "TH0000153", "TH0000155", "TH0000172", "TH0000174"],
    "TH0000128": ["TH0000073", "TH0000108", "TH0000109", "TH0000127", "TH0000130", "TH0000132"],
}


def load_actual_slots(report_payload: dict, member_id: str):
    if member_id in {"TH0000008", "TH0000011", "TH0000012", "TH0000013", "TH0000016", "TH0000020", "TH0000023", "TH0000031", "TH0000032", "TH0000074", "TH0000086", "TH0000099", "TH0000128"}:
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

    failures = []
    actual = {}
    for member_id, expected_slots in EXPECTED_FEEDERS.items():
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
