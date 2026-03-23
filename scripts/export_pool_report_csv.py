#!/usr/bin/env python3

import csv
import json
import sys
from collections import defaultdict
from pathlib import Path


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    report_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path("runtime/allmember-pool-from-orders-report.json")
    )
    cycle_path = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else Path("runtime/allmember-pool-cycles.csv")
    )
    payout_path = (
        Path(sys.argv[3])
        if len(sys.argv) > 3
        else Path("runtime/allmember-pool-payouts.csv")
    )
    summary_path = (
        Path(sys.argv[4])
        if len(sys.argv) > 4
        else Path("runtime/allmember-pool-beneficiary-summary.csv")
    )
    fallback_path = (
        Path(sys.argv[5])
        if len(sys.argv) > 5
        else Path("runtime/allmember-pool-fallbacks.csv")
    )

    report = json.loads(report_path.read_text(encoding="utf-8"))
    cycles = report["report"]["poolCycles"]
    fallbacks = [
        row for row in report["report"]["companyFallbacks"] if row["sourceType"] == "pool"
    ]
    member_names = {
        row["id"]: row.get("name") or row["id"]
        for row in report.get("members", [])
    }

    cycle_rows = []
    payout_rows = []
    beneficiary_totals = defaultdict(lambda: {"count": 0, "totalAmount": 0.0})
    for cycle in cycles:
        cycle_rows.append(
            {
                "date": cycle["date"],
                "totalPv": cycle["totalPv"],
                "poolRate": cycle["poolRate"],
                "poolFund": cycle["poolFund"],
                "eligibleMemberCount": cycle["eligibleMemberCount"],
                "payoutPerMember": cycle["payoutPerMember"],
            }
        )
        for payout in cycle.get("payouts", []):
            beneficiary_totals[payout["beneficiaryId"]]["count"] += 1
            beneficiary_totals[payout["beneficiaryId"]]["totalAmount"] += float(payout["amount"])
            payout_rows.append(
                {
                    "date": cycle["date"],
                    "beneficiaryId": payout["beneficiaryId"],
                    "beneficiaryName": member_names.get(payout["beneficiaryId"], payout["beneficiaryId"]),
                    "amount": payout["amount"],
                    "poolFund": cycle["poolFund"],
                    "payoutPerMember": cycle["payoutPerMember"],
                    "eligibleMemberCount": cycle["eligibleMemberCount"],
                }
            )

    summary_rows = [
        {
            "beneficiaryId": beneficiary_id,
            "beneficiaryName": member_names.get(beneficiary_id, beneficiary_id),
            "receivedCount": values["count"],
            "receivedTotalAmount": f'{values["totalAmount"]:.2f}',
        }
        for beneficiary_id, values in sorted(
            beneficiary_totals.items(),
            key=lambda item: (-item[1]["totalAmount"], item[0]),
        )
    ]

    fallback_rows = [
        {
            "sourceRefId": row["sourceRefId"],
            "beneficiaryId": row["beneficiaryId"],
            "beneficiaryName": member_names.get(row["beneficiaryId"], row["beneficiaryId"])
            if row.get("beneficiaryId")
            else "",
            "reasonCode": row["reasonCode"],
            "amount": row["amount"],
        }
        for row in fallbacks
    ]

    write_csv(
        cycle_path,
        ["date", "totalPv", "poolRate", "poolFund", "eligibleMemberCount", "payoutPerMember"],
        cycle_rows,
    )
    write_csv(
        payout_path,
        ["date", "beneficiaryId", "beneficiaryName", "amount", "poolFund", "payoutPerMember", "eligibleMemberCount"],
        payout_rows,
    )
    write_csv(
        summary_path,
        ["beneficiaryId", "beneficiaryName", "receivedCount", "receivedTotalAmount"],
        summary_rows,
    )
    write_csv(
        fallback_path,
        ["sourceRefId", "beneficiaryId", "beneficiaryName", "reasonCode", "amount"],
        fallback_rows,
    )

    print(
        json.dumps(
            {
                "status": "ok",
                "reportPath": str(report_path),
                "cycleCsv": str(cycle_path),
                "payoutCsv": str(payout_path),
                "summaryCsv": str(summary_path),
                "fallbackCsv": str(fallback_path),
                "cycleRowCount": len(cycle_rows),
                "payoutRowCount": len(payout_rows),
                "summaryRowCount": len(summary_rows),
                "fallbackRowCount": len(fallback_rows),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
