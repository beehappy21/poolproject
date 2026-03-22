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


def main() -> None:
    workbook_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("member003.xlsx")
    output_path = (
        Path(sys.argv[2]) if len(sys.argv) > 2 else Path("scripts/member003-members.json")
    )

    payload = {
        "sourceWorkbook": str(workbook_path),
        "rootMemberId": ROOT_MEMBER_ID,
        "forcedSponsorIds": FORCED_SPONSOR_IDS,
        "members": load_member_rows(workbook_path),
    }

    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "status": "ok",
                "memberCount": len(payload["members"]),
                "outputPath": str(output_path),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
