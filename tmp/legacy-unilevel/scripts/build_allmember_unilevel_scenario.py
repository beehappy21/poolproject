#!/usr/bin/env python3

import json
import sys
import zipfile
import xml.etree.ElementTree as ET
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


def load_member_rows(workbook_path: Path) -> List[Dict[str, Optional[str]]]:
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


def main() -> None:
    workbook_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("allmember.xlsx")
    output_path = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else Path("runtime/allmember-unilevel-scenario.json")
    )

    rows = load_member_rows(workbook_path)

    members = []
    orders = []
    for index, row in enumerate(rows, start=1):
        members.append(
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
        )
        orders.append(
            {
                "id": f"allmember-uni-{index:04d}",
                "buyerId": row["memberId"],
                "pv": "700",
                "date": row["joinedDate"] or "2026-03-23",
            }
        )

    scenario = {
        "scenarioName": "allmember-unilevel-all-members-pv-700",
        "settings": {
            "directLevelRates": [],
            "uniLevelRates": ["0.05", "0.05", "0.05", "0.05", "0.05"],
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

    summary = {
        "scenarioName": scenario["scenarioName"],
        "memberCount": len(members),
        "orderCount": len(orders),
        "membersWithoutSponsor": [member["id"] for member in members if not member.get("sponsorId")],
        "workbookPath": str(workbook_path),
        "outputPath": str(output_path),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
