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
        else Path("runtime/allmember-unilevel-from-orders-report.json")
    )
    payouts_path = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else Path("runtime/allmember-unilevel-payouts.csv")
    )
    summary_path = (
        Path(sys.argv[3])
        if len(sys.argv) > 3
        else Path("runtime/allmember-unilevel-beneficiary-summary.csv")
    )
    fallback_path = (
        Path(sys.argv[4])
        if len(sys.argv) > 4
        else Path("runtime/allmember-unilevel-fallbacks.csv")
    )

    report = json.loads(report_path.read_text(encoding="utf-8"))
    payouts = report["report"]["uni"]
    fallbacks = [
        row for row in report["report"]["companyFallbacks"] if row["sourceType"] == "uni"
    ]

    payout_rows = [
        {
            "orderId": row["orderId"],
            "buyerId": row["buyerId"],
            "beneficiaryId": row["beneficiaryId"],
            "levelNo": row["levelNo"],
            "rate": row["rate"],
            "basePv": row["basePv"],
            "amount": row["amount"],
            "compressedDepth": row["compressedDepth"],
        }
        for row in payouts
    ]

    beneficiary_summary = defaultdict(lambda: {"payoutCount": 0, "totalAmount": 0.0})
    for row in payouts:
        key = row["beneficiaryId"]
        beneficiary_summary[key]["payoutCount"] += 1
        beneficiary_summary[key]["totalAmount"] += float(row["amount"])

    summary_rows = [
        {
            "beneficiaryId": beneficiary_id,
            "payoutCount": values["payoutCount"],
            "totalAmount": f'{values["totalAmount"]:.2f}',
        }
        for beneficiary_id, values in sorted(
            beneficiary_summary.items(),
            key=lambda item: (-item[1]["payoutCount"], item[0]),
        )
    ]

    fallback_rows = [
        {
            "orderId": row["orderId"],
            "levelNo": row["levelNo"],
            "beneficiaryId": row["beneficiaryId"],
            "reasonCode": row["reasonCode"],
            "amount": row["amount"],
        }
        for row in fallbacks
    ]

    write_csv(
        payouts_path,
        ["orderId", "buyerId", "beneficiaryId", "levelNo", "rate", "basePv", "amount", "compressedDepth"],
        payout_rows,
    )
    write_csv(
        summary_path,
        ["beneficiaryId", "payoutCount", "totalAmount"],
        summary_rows,
    )
    write_csv(
        fallback_path,
        ["orderId", "levelNo", "beneficiaryId", "reasonCode", "amount"],
        fallback_rows,
    )

    print(
        json.dumps(
            {
                "status": "ok",
                "reportPath": str(report_path),
                "payoutsCsv": str(payouts_path),
                "summaryCsv": str(summary_path),
                "fallbacksCsv": str(fallback_path),
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
