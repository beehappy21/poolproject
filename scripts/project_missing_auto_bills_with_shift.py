#!/usr/bin/env python3

import json
import sys
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "runtime"


def order_key(order: dict):
    day, month, year = map(int, order["invoiceDate"].split("/"))
    return (datetime(year - 543, month, day), order["invoiceNo"])


def invoice_width(orders: list[dict]) -> int:
    return max(len(str(order["invoiceNo"])) for order in orders)


def main() -> None:
    source_path = Path(sys.argv[1]) if len(sys.argv) > 1 else RUNTIME / "allsale-user-supplied-orders.json"
    replay_path = Path(sys.argv[2]) if len(sys.argv) > 2 else RUNTIME / "replayed-first-auto-on-trigger.json"
    output_orders_path = (
        Path(sys.argv[3]) if len(sys.argv) > 3 else RUNTIME / "allsale-user-supplied-with-generated-auto.json"
    )
    output_report_path = (
        Path(sys.argv[4]) if len(sys.argv) > 4 else RUNTIME / "generated-auto-shift-report.json"
    )

    source_payload = json.loads(source_path.read_text(encoding="utf-8"))
    replay_payload = json.loads(replay_path.read_text(encoding="utf-8"))

    original_orders = sorted(source_payload["orders"], key=order_key)
    width = invoice_width(original_orders)
    source_order_by_invoice = {order["invoiceNo"]: order for order in original_orders}

    trigger_map = {}
    for row in replay_payload["replayLog"]:
        if row["action"] == "no_auto_bill_available":
            trigger_order = source_order_by_invoice.get(row["triggerInvoiceNo"], {})
            trigger_map[row["memberId"]] = {
                "triggerInvoiceNo": row["triggerInvoiceNo"],
                "triggerDate": trigger_order.get("invoiceDate"),
            }

    synthetic_by_trigger = {}
    for member_id, trigger in trigger_map.items():
        synthetic_by_trigger.setdefault(trigger["triggerInvoiceNo"], []).append(
            {
                "memberId": member_id,
                "invoiceDate": trigger["triggerDate"],
                "pv": "700",
                "billType": "บิลอัตโนมัติ",
                "status": "อนุมัติ",
                "note": "generated_missing_auto_bill",
            }
        )

    expanded_orders = []
    insertion_log = []
    for order in original_orders:
        expanded_orders.append({**order})
        synthetic_rows = synthetic_by_trigger.get(order["invoiceNo"], [])
        for synthetic in sorted(synthetic_rows, key=lambda row: row["memberId"]):
            expanded_orders.append(
                {
                    "memberId": synthetic["memberId"],
                    "invoiceDate": synthetic["invoiceDate"],
                    "pv": synthetic["pv"],
                    "billType": synthetic["billType"],
                    "status": synthetic["status"],
                    "source": synthetic["note"],
                }
            )
            insertion_log.append(
                {
                    "memberId": synthetic["memberId"],
                    "insertAfterInvoiceNo": order["invoiceNo"],
                    "invoiceDate": synthetic["invoiceDate"],
                }
            )

    projected_orders = []
    renumber_map = []
    start_number = min(int(order["invoiceNo"]) for order in original_orders)
    for index, order in enumerate(expanded_orders):
        new_invoice_no = str(start_number + index).zfill(width)
        projected = {**order, "invoiceNo": new_invoice_no}
        projected_orders.append(projected)
        renumber_map.append(
            {
                "memberId": projected["memberId"],
                "oldInvoiceNo": order.get("invoiceNo"),
                "newInvoiceNo": new_invoice_no,
                "billType": projected.get("billType"),
                "source": projected.get("source", "original"),
            }
        )

    output_orders_path.write_text(
        json.dumps({"orders": projected_orders}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    report = {
        "sourcePath": str(source_path),
        "replayPath": str(replay_path),
        "generatedAutoBillCount": len(insertion_log),
        "generatedAutoBills": insertion_log,
        "invoiceWidth": width,
        "outputOrdersPath": str(output_orders_path),
        "renumberPreview": renumber_map[:40],
    }
    output_report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "outputOrdersPath": str(output_orders_path),
                "outputReportPath": str(output_report_path),
                "generatedAutoBillCount": len(insertion_log),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
