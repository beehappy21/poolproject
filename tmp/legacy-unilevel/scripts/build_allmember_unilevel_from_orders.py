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
import zipfile
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def cell_value(cell: ET.Element) -> str:
    cell_type = cell.attrib.get("t")

    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//a:t", NS)).strip()

    value = cell.find("a:v", NS)
    if value is None or value.text is None:
        return ""

    return value.text.strip()


def clean(value: Optional[str]) -> Optional[str]:
    trimmed = str(value or "").strip()
    return trimmed or None


def normalize_thai_date(value: Optional[str]) -> str:
    raw = clean(value)
    if not raw:
        return "2026-03-23"

    day, month, year = [int(part) for part in raw.split("/")]
    gregorian_year = year - 543
    return date(gregorian_year, month, day).isoformat()


def load_members(workbook_path: Path) -> List[Dict[str, Optional[str]]]:
    with zipfile.ZipFile(workbook_path) as zf:
        sheet = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))

    rows = []
    sheet_rows = sheet.find("a:sheetData", NS)
    if sheet_rows is None:
        return rows

    for row in list(sheet_rows)[1:]:
        cells = [cell_value(cell) for cell in row.findall("a:c", NS)]
        if len(cells) < 8:
            continue

        member_code = clean(cells[1] if len(cells) > 1 else None)
        if not member_code:
            continue

        rows.append(
            {
                "memberId": member_code,
                "joinedDate": clean(cells[2] if len(cells) > 2 else None),
                "sponsorId": clean(cells[3] if len(cells) > 3 else None),
                "uplineId": clean(cells[4] if len(cells) > 4 else None),
                "side": clean(cells[6] if len(cells) > 6 else None),
                "name": clean(cells[7] if len(cells) > 7 else None) or member_code,
            }
        )

    return rows


def load_orders(source_path: Path) -> List[Dict[str, str]]:
    payload = json.loads(source_path.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        return payload.get("orders", [])
    if isinstance(payload, list):
        return payload
    raise ValueError(f"Unsupported orders payload in {source_path}")


def parse_uni_rates(raw: Optional[str]) -> List[str]:
    if not raw:
        return ["0.05", "0.05", "0.05", "0.05", "0.05"]

    parts = [part.strip() for part in raw.split(",")]
    rates = [part for part in parts if part]
    if not rates:
        raise ValueError("Expected at least one unilevel rate.")

    return rates


def main() -> None:
    members_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("allmember.xlsx")
    orders_path = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else Path("runtime/allsale-user-supplied-orders.json")
    )
    output_path = (
        Path(sys.argv[3])
        if len(sys.argv) > 3
        else Path("runtime/allmember-unilevel-from-orders-scenario.json")
    )
    uni_rates = parse_uni_rates(sys.argv[4] if len(sys.argv) > 4 else None)

    member_rows = load_members(members_path)
    member_ids = {row["memberId"] for row in member_rows}
    order_rows = load_orders(orders_path)

    matched_orders = [
        row
        for row in order_rows
        if row.get("memberId") in member_ids
        and row.get("status") == "อนุมัติ"
        and row.get("pv") == "700"
    ]
    matched_orders.sort(key=lambda row: (normalize_thai_date(row.get("invoiceDate")), row.get("invoiceNo", "")))

    members = [
        {
            "id": row["memberId"],
            "name": row["name"],
            "sponsorId": row["sponsorId"],
            "active": True,
            "earningCap": "99999999",
            "earnedToDate": "0",
            "meta": {
                "uplineId": row["uplineId"],
                "side": row["side"],
                "joinedDate": row["joinedDate"],
            },
        }
        for row in member_rows
    ]

    orders = [
        {
            "id": row["invoiceNo"],
            "buyerId": row["memberId"],
            "pv": row["pv"],
            "date": normalize_thai_date(row.get("invoiceDate")),
            "meta": {
                "invoiceDate": row.get("invoiceDate"),
                "billType": row.get("billType"),
                "status": row.get("status"),
            },
        }
        for row in matched_orders
    ]

    scenario = {
        "scenarioName": "allmember-unilevel-approved-700pv-orders",
        "settings": {
            "directLevelRates": [],
            "uniLevelRates": uni_rates,
            "poolRate": "0",
        },
        "members": members,
        "orders": orders,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(scenario, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    distinct_order_members = sorted({row["memberId"] for row in matched_orders})
    summary = {
        "scenarioName": scenario["scenarioName"],
        "memberCount": len(members),
        "matchedOrderCount": len(orders),
        "uniLevelRates": uni_rates,
        "matchedOrderMemberCount": len(distinct_order_members),
        "matchedOrderMembers": distinct_order_members,
        "membersWithoutMatchedOrders": [
            row["memberId"] for row in member_rows if row["memberId"] not in distinct_order_members
        ],
        "membersPath": str(members_path),
        "ordersPath": str(orders_path),
        "outputPath": str(output_path),
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
