#!/usr/bin/env python3

# Historical only: legacy unilevel sandbox script.
# Not part of the active commission-calculation scope.
# Active scope only:
# - direct
# - team_2leg / team_3leg
# - matching
# - pool
# Do not use this script for active implementation or verification unless a
# later approved decision explicitly restores it.

import json
import sys
from collections import Counter
from pathlib import Path


def main() -> None:
    report_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path("runtime/allmember-unilevel-report.json")
    )
    report = json.loads(report_path.read_text(encoding="utf-8"))

    uni_rows = report["report"]["uni"]
    fallback_rows = [
        row for row in report["report"]["companyFallbacks"] if row["sourceType"] == "uni"
    ]

    level_counts = Counter(row["levelNo"] for row in uni_rows)
    fallback_level_counts = Counter(row["levelNo"] for row in fallback_rows)
    fallback_reason_counts = Counter(row["reasonCode"] for row in fallback_rows)
    beneficiary_counts = Counter(row["beneficiaryId"] for row in uni_rows)

    order_ids = {
        row["orderId"]
        for row in [*uni_rows, *fallback_rows]
        if row.get("orderId")
    }

    summary = {
        "status": "ok",
        "reportPath": str(report_path),
        "scenarioName": report.get("scenarioName"),
        "memberCount": len(report.get("members", [])),
        "orderCount": len(order_ids),
        "unilevelPayoutCount": len(uni_rows),
        "unilevelFallbackCount": len(fallback_rows),
        "unilevelLevelCounts": dict(level_counts),
        "unilevelFallbackLevelCounts": dict(fallback_level_counts),
        "unilevelFallbackReasonCounts": dict(fallback_reason_counts),
        "distinctUnilevelBeneficiaryCount": len(beneficiary_counts),
        "topBeneficiaries": [
            {"beneficiaryId": member_id, "rowCount": count}
            for member_id, count in beneficiary_counts.most_common(10)
        ],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
# Historical only: legacy unilevel sandbox script.
# Not part of the active commission-calculation scope.
# Active scope only:
# - direct
# - team_2leg / team_3leg
# - matching
# - pool
# Do not use this script for active implementation or verification unless a
# later approved decision explicitly restores it.
