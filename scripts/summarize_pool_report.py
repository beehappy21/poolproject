#!/usr/bin/env python3

import json
import sys
from collections import Counter
from pathlib import Path


def main() -> None:
    report_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path("runtime/allmember-pool-from-orders-report.json")
    )
    report = json.loads(report_path.read_text(encoding="utf-8"))

    pool_cycles = report["report"]["poolCycles"]
    fallback_rows = [
        row for row in report["report"]["companyFallbacks"] if row["sourceType"] == "pool"
    ]

    payout_rows = []
    beneficiary_counts = Counter()
    beneficiary_amounts = Counter()
    for cycle in pool_cycles:
        for payout in cycle.get("payouts", []):
            payout_rows.append(
                {
                    "date": cycle["date"],
                    "beneficiaryId": payout["beneficiaryId"],
                    "amount": payout["amount"],
                }
            )
            beneficiary_counts[payout["beneficiaryId"]] += 1
            beneficiary_amounts[payout["beneficiaryId"]] += float(payout["amount"])

    summary = {
        "status": "ok",
        "reportPath": str(report_path),
        "scenarioName": report.get("scenarioName"),
        "memberCount": len(report.get("members", [])),
        "poolCycleCount": len(pool_cycles),
        "poolPayoutRowCount": len(payout_rows),
        "poolFallbackCount": len(fallback_rows),
        "poolFallbackReasonCounts": dict(Counter(row["reasonCode"] for row in fallback_rows)),
        "distinctPoolBeneficiaryCount": len(beneficiary_counts),
        "topPoolBeneficiaries": [
            {
                "beneficiaryId": member_id,
                "payoutCount": beneficiary_counts[member_id],
                "totalAmount": f"{beneficiary_amounts[member_id]:.2f}",
            }
            for member_id, _count in beneficiary_counts.most_common(10)
        ],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
