#!/usr/bin/env python3

import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Optional

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
ROOT_MEMBER_ID = "TH0000001"
FORCED_SPONSOR_IDS = {
    "TH0000120": ROOT_MEMBER_ID,
    "TH0000121": ROOT_MEMBER_ID,
}


def normalize_member_code(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    trimmed = value.strip()
    if not trimmed:
        return None

    if trimmed.startswith("TH"):
        return trimmed

    return f"TH{trimmed[2:]}" if len(trimmed) >= 2 else "TH"


def load_shared_strings(workbook_path: Path) -> List[str]:
    with zipfile.ZipFile(workbook_path) as zf:
        if "xl/sharedStrings.xml" not in zf.namelist():
            return []

        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
        return [
            "".join(text_node.text or "" for text_node in si.iterfind(".//a:t", NS))
            for si in root.findall("a:si", NS)
        ]


def load_member_rows(workbook_path: Path) -> List[Dict[str, Optional[str]]]:
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

    rows = []
    for row in sheet.find("a:sheetData", NS)[1:]:
        row_no = row.attrib["r"]
        values = {
            cell.attrib["r"]: cell_value(cell).strip()
            for cell in row.findall("a:c", NS)
        }
        member_id = values.get(f"B{row_no}", "")
        if not member_id:
            continue

        normalized_member_id = normalize_member_code(member_id)
        normalized_sponsor_id = normalize_member_code(values.get(f"D{row_no}", ""))
        normalized_upline_id = normalize_member_code(values.get(f"E{row_no}", ""))
        side = values.get(f"G{row_no}", "") or None

        rows.append(
            {
                "memberId": normalized_member_id,
                "sponsorId": FORCED_SPONSOR_IDS.get(normalized_member_id, normalized_sponsor_id),
                "uplineId": normalized_upline_id,
                "side": side,
                "name": values.get(f"H{row_no}", "") or normalized_member_id,
            }
        )

    return rows


def load_member_rows_from_json(source_path: Path) -> List[Dict[str, Optional[str]]]:
    payload = json.loads(source_path.read_text(encoding="utf-8"))
    return payload["members"]


def load_member_rows_from_source(source_path: Path) -> List[Dict[str, Optional[str]]]:
    if source_path.suffix.lower() == ".json":
        return load_member_rows_from_json(source_path)

    return load_member_rows(source_path)


def build_orders(pv_table: Dict[str, object]) -> List[Dict[str, str]]:
    orders = []
    for index, member_id in enumerate(sorted(pv_table["pvByMemberId"].keys()), start=1):
        orders.append(
            {
                "invoiceNo": f"member003-matrix-{index:03d}",
                "memberId": member_id,
                "pv": pv_table["pvByMemberId"].get(member_id, pv_table["defaultPv"]),
            }
        )
    return orders


def main() -> None:
    member_source_path = (
        Path(sys.argv[1]) if len(sys.argv) > 1 else Path("scripts/member003-members.json")
    )
    pv_table_path = (
        Path(sys.argv[2]) if len(sys.argv) > 2 else Path("scripts/member003-pv-table.json")
    )
    output_path = (
        Path(sys.argv[3])
        if len(sys.argv) > 3
        else Path("runtime/member003-matrix-scenario.json")
    )

    rows = load_member_rows_from_source(member_source_path)
    pv_table = json.loads(pv_table_path.read_text(encoding="utf-8"))
    orders = build_orders(pv_table)

    members = []
    for row in rows:
        member_id = row["memberId"]
        members.append(
            {
                "id": member_id,
                "name": row["name"],
                "sponsorId": row["sponsorId"],
                "uplineId": row["uplineId"],
                "side": row["side"],
                "personalPv": "0",
                "active": True,
            }
        )

    scenario = {
        "scenarioName": "member003-matrix-board1-pv-700",
        "settings": {
            "boardWidth": 2,
            "boardDepth": 2,
            "boardCount": 1,
            "organizationPvRate": "700",
            "boardOpenPvThresholds": ["700"],
            "boardLevelRates": [
                ["0.2", "0.2"]
            ],
        },
        "members": members,
        "orders": orders,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(scenario, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = {
        "scenarioName": scenario["scenarioName"],
        "memberCount": len(members),
        "orderCount": len(orders),
        "rootLikeMembers": [member["id"] for member in members if not member.get("uplineId")][:20],
        "memberSourcePath": str(member_source_path),
        "pvTablePath": str(pv_table_path),
        "outputPath": str(output_path),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
