#!/usr/bin/env python3

import json
import sys
from collections import Counter
from pathlib import Path

EXPECTED_DIRECT_PAYOUT_COUNT = 609
EXPECTED_FALLBACK_COUNT = 21
EXPECTED_FALLBACK_REASON = "no_active_sponsor"
EXPECTED_PAYOUT_AMOUNT = "35"
EXPECTED_DIRECT_LEVEL_COUNTS = {
    1: 209,
    2: 204,
    3: 196,
}
EXPECTED_FALLBACK_LEVEL_COUNTS = {
    1: 1,
    2: 6,
    3: 14,
}


def fail(message: str) -> None:
    print(f"ASSERTION FAILED: {message}")
    raise SystemExit(1)


def main() -> None:
    report_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path("runtime/member003-direct-report.json")
    )

    report = json.loads(report_path.read_text(encoding="utf-8"))
    direct_rows = report["report"]["direct"]
    fallback_rows = report["report"]["companyFallbacks"]
    members = report["members"]

    if len(direct_rows) != EXPECTED_DIRECT_PAYOUT_COUNT:
        fail(
            f"expected {EXPECTED_DIRECT_PAYOUT_COUNT} direct payouts, got {len(direct_rows)}"
        )

    if len(fallback_rows) != EXPECTED_FALLBACK_COUNT:
        fail(
            f"expected {EXPECTED_FALLBACK_COUNT} fallback rows, got {len(fallback_rows)}"
        )

    if any(row["reasonCode"] != EXPECTED_FALLBACK_REASON for row in fallback_rows):
        fail(f"expected all fallback reasons to be {EXPECTED_FALLBACK_REASON}")

    wrong_amount_rows = [row for row in direct_rows if row["amount"] != EXPECTED_PAYOUT_AMOUNT]
    if wrong_amount_rows:
        fail(
            f"expected all direct payout amounts to be {EXPECTED_PAYOUT_AMOUNT}, got {wrong_amount_rows[:3]}"
        )

    direct_level_counts = Counter(row["levelNo"] for row in direct_rows)
    if dict(direct_level_counts) != EXPECTED_DIRECT_LEVEL_COUNTS:
        fail(
            f"expected direct level counts {EXPECTED_DIRECT_LEVEL_COUNTS}, got {dict(direct_level_counts)}"
        )

    fallback_level_counts = Counter(row["levelNo"] for row in fallback_rows)
    if dict(fallback_level_counts) != EXPECTED_FALLBACK_LEVEL_COUNTS:
        fail(
            f"expected fallback level counts {EXPECTED_FALLBACK_LEVEL_COUNTS}, got {dict(fallback_level_counts)}"
        )

    duplicate_order_ids = [order_id for order_id, count in Counter(
        (row["orderId"], row["levelNo"]) for row in direct_rows
    ).items() if count > 1]
    if duplicate_order_ids:
        fail(f"found duplicate direct order/level pairs: {duplicate_order_ids[:5]}")

    member_map = {member["id"]: member for member in members}
    for member_id in ("TH0000120", "TH0000121"):
        sponsor_id = member_map[member_id]["sponsorId"]
        if sponsor_id != "TH0000001":
            fail(f"expected {member_id} sponsorId TH0000001, got {sponsor_id}")

    summary = {
        "status": "passed",
        "reportPath": str(report_path),
        "directPayoutCount": len(direct_rows),
        "fallbackCount": len(fallback_rows),
        "directLevelCounts": dict(direct_level_counts),
        "fallbackLevelCounts": dict(fallback_level_counts),
        "fallbackReasonCounts": dict(Counter(row["reasonCode"] for row in fallback_rows)),
        "distinctBeneficiaryCount": len({row["beneficiaryId"] for row in direct_rows}),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
