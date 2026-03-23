#!/usr/bin/env python3

import csv
import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Optional


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def resolve_scenario_path(report_path: Path, explicit_path: Optional[str]) -> Optional[Path]:
    if explicit_path:
        path = Path(explicit_path)
        return path if path.exists() else None

    inferred_name = report_path.name.replace("-report.json", "-scenario.json")
    inferred_path = report_path.with_name(inferred_name)
    return inferred_path if inferred_path.exists() else None


def main() -> None:
    report_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path("runtime/allmember-unilevel-from-orders-report.json")
    )
    detail_path = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else Path("runtime/allmember-unilevel-received-from-detail.csv")
    )
    summary_path = (
        Path(sys.argv[3])
        if len(sys.argv) > 3
        else Path("runtime/allmember-unilevel-received-from-summary.csv")
    )
    scenario_path = resolve_scenario_path(report_path, sys.argv[4] if len(sys.argv) > 4 else None)

    report = json.loads(report_path.read_text(encoding="utf-8"))
    uni_rows = report["report"]["uni"]
    scenario = (
        json.loads(scenario_path.read_text(encoding="utf-8"))
        if scenario_path is not None
        else {}
    )
    order_map = {
        row["id"]: row
        for row in scenario.get("orders", [])
        if row.get("id")
    }

    member_names = {
        row["id"]: row.get("name") or row["id"]
        for row in report.get("members", [])
    }

    detail_rows = []
    summary_buckets = defaultdict(lambda: {"count": 0, "totalAmount": 0.0})
    beneficiary_totals = defaultdict(lambda: {"count": 0, "totalAmount": 0.0})

    sorted_uni_rows = sorted(
        uni_rows,
        key=lambda row: (
            order_map.get(row["orderId"], {}).get("date", ""),
            row["orderId"],
            row["beneficiaryId"],
            row["buyerId"],
            row["levelNo"],
        ),
    )

    for row in sorted_uni_rows:
        beneficiary_id = row["beneficiaryId"]
        buyer_id = row["buyerId"]
        level_no = row["levelNo"]
        amount = float(row["amount"])
        order = order_map.get(row["orderId"], {})
        order_date = order.get("date", "")
        invoice_date = order.get("meta", {}).get("invoiceDate", "")

        detail_rows.append(
            {
                "orderDate": order_date,
                "invoiceDate": invoice_date,
                "beneficiaryId": beneficiary_id,
                "beneficiaryName": member_names.get(beneficiary_id, beneficiary_id),
                "receivedFromBuyerId": buyer_id,
                "receivedFromBuyerName": member_names.get(buyer_id, buyer_id),
                "levelNo": level_no,
                "orderId": row["orderId"],
                "rate": row["rate"],
                "basePv": row["basePv"],
                "amount": row["amount"],
            }
        )

        bucket = summary_buckets[(beneficiary_id, buyer_id, level_no)]
        bucket["count"] += 1
        bucket["totalAmount"] += amount
        beneficiary_totals[beneficiary_id]["count"] += 1
        beneficiary_totals[beneficiary_id]["totalAmount"] += amount

    for row in detail_rows:
        beneficiary_id = row["beneficiaryId"]
        row["beneficiaryReceivedCount"] = beneficiary_totals[beneficiary_id]["count"]
        row["beneficiaryReceivedTotalAmount"] = f'{beneficiary_totals[beneficiary_id]["totalAmount"]:.2f}'

    summary_rows = [
        {
            "firstOrderDate": min(
                order_map.get(detail["orderId"], {}).get("date", "")
                for detail in detail_rows
                if detail["beneficiaryId"] == beneficiary_id
                and detail["receivedFromBuyerId"] == buyer_id
                and detail["levelNo"] == level_no
            ),
            "beneficiaryId": beneficiary_id,
            "beneficiaryName": member_names.get(beneficiary_id, beneficiary_id),
            "receivedFromBuyerId": buyer_id,
            "receivedFromBuyerName": member_names.get(buyer_id, buyer_id),
            "levelNo": level_no,
            "receivedCount": values["count"],
            "receivedTotalAmount": f'{values["totalAmount"]:.2f}',
            "beneficiaryReceivedCount": beneficiary_totals[beneficiary_id]["count"],
            "beneficiaryReceivedTotalAmount": f'{beneficiary_totals[beneficiary_id]["totalAmount"]:.2f}',
        }
        for (beneficiary_id, buyer_id, level_no), values in sorted(
            summary_buckets.items(),
            key=lambda item: (
                min(
                    order_map.get(detail["orderId"], {}).get("date", "")
                    for detail in detail_rows
                    if detail["beneficiaryId"] == item[0][0]
                    and detail["receivedFromBuyerId"] == item[0][1]
                    and detail["levelNo"] == item[0][2]
                ),
                item[0][0],
                item[0][1],
                item[0][2],
            ),
        )
    ]

    write_csv(
        detail_path,
        [
            "orderDate",
            "invoiceDate",
            "beneficiaryId",
            "beneficiaryName",
            "receivedFromBuyerId",
            "receivedFromBuyerName",
            "levelNo",
            "orderId",
            "rate",
            "basePv",
            "amount",
            "beneficiaryReceivedCount",
            "beneficiaryReceivedTotalAmount",
        ],
        detail_rows,
    )
    write_csv(
        summary_path,
        [
            "firstOrderDate",
            "beneficiaryId",
            "beneficiaryName",
            "receivedFromBuyerId",
            "receivedFromBuyerName",
            "levelNo",
            "receivedCount",
            "receivedTotalAmount",
            "beneficiaryReceivedCount",
            "beneficiaryReceivedTotalAmount",
        ],
        summary_rows,
    )

    print(
        json.dumps(
            {
                "status": "ok",
                "reportPath": str(report_path),
                "scenarioPath": str(scenario_path) if scenario_path is not None else None,
                "detailCsv": str(detail_path),
                "summaryCsv": str(summary_path),
                "detailRowCount": len(detail_rows),
                "summaryRowCount": len(summary_rows),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
