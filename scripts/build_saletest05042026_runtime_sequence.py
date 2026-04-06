#!/usr/bin/env python3

import json
import os
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def normalize_member_code(value: str) -> str:
    trimmed = str(value or "").strip()
    if trimmed.startswith("TH"):
        return trimmed
    if trimmed.startswith("CT") and len(trimmed) == 9:
        return f"TH{trimmed[2:]}"
    return trimmed


def load_shared_strings(workbook_path: Path) -> list[str]:
    with zipfile.ZipFile(workbook_path) as zf:
        if "xl/sharedStrings.xml" not in zf.namelist():
            return []

        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
        return [
            "".join(text_node.text or "" for text_node in si.iterfind(".//a:t", NS))
            for si in root.findall("a:si", NS)
        ]


def load_rows(workbook_path: Path) -> list[dict[str, str]]:
    shared_strings = load_shared_strings(workbook_path)

    def cell_value(cell: ET.Element) -> str:
        value = cell.find("a:v", NS)
        if value is None or value.text is None:
            return ""

        if cell.attrib.get("t") == "s":
            return shared_strings[int(value.text)]

        return value.text

    with zipfile.ZipFile(workbook_path) as zf:
        sheet = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))

    rows: list[dict[str, str]] = []
    for row in sheet.find("a:sheetData", NS)[1:]:
        row_no = row.attrib["r"]
        values = {
            cell.attrib["r"]: cell_value(cell).strip()
            for cell in row.findall("a:c", NS)
        }
        member_code = normalize_member_code(values.get(f"B{row_no}", ""))
        if not member_code:
            continue

        rows.append(
            {
                "sequenceNo": values.get(f"A{row_no}", ""),
                "memberId": member_code,
                "memberName": values.get(f"C{row_no}", ""),
                "billType": values.get(f"D{row_no}", ""),
                "invoiceNo": values.get(f"E{row_no}", ""),
                "invoiceDate": values.get(f"F{row_no}", ""),
                "pv": values.get(f"G{row_no}", ""),
                "amount": values.get(f"H{row_no}", ""),
                "note": values.get(f"I{row_no}", ""),
                "status": values.get(f"J{row_no}", ""),
            }
        )

    return rows


def thai_date_key(raw_date: str) -> tuple[int, int, int]:
    day, month, year = map(int, raw_date.split("/"))
    return (year - 543, month, day)


def sort_key(row: dict[str, str]) -> tuple[datetime, str]:
    year, month, day = thai_date_key(row["invoiceDate"])
    return (datetime(year, month, day), row["invoiceNo"])


DEFAULT_500_PV_PRODUCT_CODE = os.environ.get("SALETEST_RUNTIME_PRODUCT_CODE", "LON001")


def resolve_product_code(row: dict[str, str]) -> str:
    amount = row.get("amount", "").strip()
    if amount == "750":
        return DEFAULT_500_PV_PRODUCT_CODE
    if amount == "700":
        return "DRI001"
    if amount == "350":
        return "DRI002"
    return "LON001"


def build_sequence(rows: list[dict[str, str]]) -> dict[str, Any]:
    ordered_rows = sorted(rows, key=sort_key)
    first_order_by_member: dict[str, dict[str, str]] = {}
    removed_later_orders: list[dict[str, Any]] = []

    for row in ordered_rows:
        member_id = row["memberId"]
        if member_id in first_order_by_member:
            removed_later_orders.append(
                {
                    "memberId": member_id,
                    "keptInvoiceNo": first_order_by_member[member_id]["invoiceNo"],
                    "removedInvoiceNo": row["invoiceNo"],
                    "removedSequenceNo": row["sequenceNo"],
                    "invoiceDate": row["invoiceDate"],
                }
            )
            continue
        first_order_by_member[member_id] = row

    deduped_orders = list(first_order_by_member.values())
    final_orders = []
    for index, row in enumerate(deduped_orders, start=1):
        final_orders.append(
            {
                **row,
                "runtimeSequenceNo": index,
                "productCode": resolve_product_code(row),
                "orderType": "normal",
                "isReentry": False,
            }
        )

    return {
        "sourceWorkbook": "saletest05042026.xlsx",
        "sourceOrderCount": len(rows),
        "dedupedOrderCount": len(final_orders),
        "duplicateMemberCount": len({row["memberId"] for row in removed_later_orders}),
        "removedLaterOrders": removed_later_orders,
        "orders": final_orders,
        "runtimeRules": {
            "useFirstOrderOnlyPerMember": True,
            "normal500PvProductCode": DEFAULT_500_PV_PRODUCT_CODE,
            "supported500PvProductCodes": ["LON001", "FIR001", "FIR002"],
            "triggerMemberForAutoPause": "TH0000013",
            "triggerDescription": "When TH0000013 opens B1R2, pause the normal sequence, verify the system-generated auto order, then continue with the next normal order.",
            "expectedUplineEffect": "TH0000012 should receive slot 2 from TH0000013 auto order after TH0000013 opens B1R2.",
        },
    }


def main() -> None:
    workbook_path = (
        Path(sys.argv[1]) if len(sys.argv) > 1 else Path("saletest05042026.xlsx")
    )
    output_path = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else Path("runtime/saletest05042026-runtime-sequence.json")
    )

    rows = load_rows(workbook_path)
    payload = build_sequence(rows)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    summary = {
        "sourceWorkbook": str(workbook_path),
        "outputPath": str(output_path),
        "sourceOrderCount": payload["sourceOrderCount"],
        "dedupedOrderCount": payload["dedupedOrderCount"],
        "duplicateMemberCount": payload["duplicateMemberCount"],
        "first10RuntimeOrders": [
            {
                "runtimeSequenceNo": row["runtimeSequenceNo"],
                "memberId": row["memberId"],
                "invoiceNo": row["invoiceNo"],
                "productCode": row["productCode"],
            }
            for row in payload["orders"][:10]
        ],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
