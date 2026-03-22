#!/usr/bin/env python3

import json
import sys
from collections import Counter
from pathlib import Path

EXPECTED_PLACEMENT_COUNT = 209
EXPECTED_BOARD_OPENING_COUNT = 212
EXPECTED_BOARD_SUMMARY_COUNT = 212
EXPECTED_COMPANY_FALLBACK_COUNT = 1
EXPECTED_PLACEMENT_LEVEL_COUNTS = {
    1: 175,
    2: 34,
}
EXPECTED_BOARD_COUNTS = {
    1: 212,
}
EXPECTED_BOARD_ROUND_COUNTS = {
    1: 210,
    2: 2,
}
EXPECTED_FALLBACK_REASON_COUNTS = {
    "no_matrix_upline": 1,
}


def fail(message: str) -> None:
    print(f"ASSERTION FAILED: {message}")
    raise SystemExit(1)


def main() -> None:
    report_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path("runtime/member003-matrix-report.json")
    )

    report = json.loads(report_path.read_text(encoding="utf-8"))
    placements = report["report"]["placements"]
    board_openings = report["report"]["boardOpenings"]
    board_summaries = report["report"]["boardSummaries"]
    fallbacks = report["report"]["companyFallbacks"]
    if len(placements) != EXPECTED_PLACEMENT_COUNT:
        fail(
            f"expected {EXPECTED_PLACEMENT_COUNT} placements, got {len(placements)}"
        )

    if len(board_openings) != EXPECTED_BOARD_OPENING_COUNT:
        fail(
            f"expected {EXPECTED_BOARD_OPENING_COUNT} board openings, got {len(board_openings)}"
        )

    if len(board_summaries) != EXPECTED_BOARD_SUMMARY_COUNT:
        fail(
            f"expected {EXPECTED_BOARD_SUMMARY_COUNT} board summaries, got {len(board_summaries)}"
        )

    if len(fallbacks) != EXPECTED_COMPANY_FALLBACK_COUNT:
        fail(
            f"expected {EXPECTED_COMPANY_FALLBACK_COUNT} fallbacks, got {len(fallbacks)}"
        )

    placement_level_counts = Counter(row["levelNo"] for row in placements)
    if dict(placement_level_counts) != EXPECTED_PLACEMENT_LEVEL_COUNTS:
        fail(
            f"expected placement level counts {EXPECTED_PLACEMENT_LEVEL_COUNTS}, got {dict(placement_level_counts)}"
        )

    board_counts = Counter(row["boardNo"] for row in board_summaries)
    for board_no, expected_count in EXPECTED_BOARD_COUNTS.items():
        actual_count = board_counts.get(board_no, 0)
        if actual_count != expected_count:
            fail(
                f"expected board {board_no} summary count {expected_count}, got {actual_count}"
            )

    board_round_counts = Counter(row["roundNo"] for row in board_summaries)
    if dict(board_round_counts) != EXPECTED_BOARD_ROUND_COUNTS:
        fail(
            f"expected board round counts {EXPECTED_BOARD_ROUND_COUNTS}, got {dict(board_round_counts)}"
        )

    fallback_reason_counts = Counter(row["reasonCode"] for row in fallbacks)
    if dict(fallback_reason_counts) != EXPECTED_FALLBACK_REASON_COUNTS:
        fail(
            f"expected fallback reason counts {EXPECTED_FALLBACK_REASON_COUNTS}, got {dict(fallback_reason_counts)}"
        )

    duplicate_slot_rows = [
        key
        for key, count in Counter(
            (
                row["beneficiaryId"],
                row["boardNo"],
                row["beneficiaryRoundNo"],
                row["slotIndex"],
            )
            for row in placements
        ).items()
        if count > 1
    ]
    if duplicate_slot_rows:
        fail(f"found duplicate board slot placements: {duplicate_slot_rows[:5]}")

    summary = {
        "status": "passed",
        "reportPath": str(report_path),
        "placementCount": len(placements),
        "boardOpeningCount": len(board_openings),
        "boardSummaryCount": len(board_summaries),
        "placementLevelCounts": dict(placement_level_counts),
        "boardCounts": dict(board_counts),
        "boardRoundCounts": dict(board_round_counts),
        "fallbackReasonCounts": dict(fallback_reason_counts),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
