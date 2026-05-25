#!/usr/bin/env python3

import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict, deque
from pathlib import Path
from typing import Dict, List, Optional

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
ROOT_MEMBER_ID = "TH0000001"
FORCED_SPONSOR_IDS = {
    "TH0000120": ROOT_MEMBER_ID,
    "TH0000121": ROOT_MEMBER_ID,
}
PLACEMENT_SIDES = ("Left", "Middle", "Right")


def normalize_member_code(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    trimmed = value.strip()
    if not trimmed:
        return None

    if trimmed.startswith("TH"):
        return trimmed

    return f"TH{trimmed[2:]}" if len(trimmed) >= 2 else "TH"


def member_sort_key(member_code: str) -> tuple[int, str]:
    digits = "".join(char for char in member_code if char.isdigit())
    return (int(digits) if digits else 0, member_code)


def load_shared_strings(workbook_path: Path) -> List[str]:
    with zipfile.ZipFile(workbook_path) as zf:
        if "xl/sharedStrings.xml" not in zf.namelist():
            return []

        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
        return [
            "".join(text_node.text or "" for text_node in si.iterfind(".//a:t", NS))
            for si in root.findall("a:si", NS)
        ]


def derive_placements(rows: List[Dict[str, Optional[str]]]) -> Dict[str, Dict[str, Optional[str]]]:
    member_codes = {row["memberId"] for row in rows if row["memberId"]}
    sponsor_children: dict[str, list[str]] = defaultdict(list)
    root_codes: list[str] = []

    for row in sorted(rows, key=lambda item: member_sort_key(item["memberId"] or "")):
        member_id = row["memberId"]
        sponsor_id = row["sponsorId"]
        if not member_id:
            continue
        if sponsor_id and sponsor_id in member_codes and sponsor_id != member_id:
            sponsor_children[sponsor_id].append(member_id)
        else:
            root_codes.append(member_id)

    for sponsor_id in sponsor_children:
        sponsor_children[sponsor_id].sort(key=member_sort_key)
    root_codes.sort(key=member_sort_key)

    placements: Dict[str, Dict[str, Optional[str]]] = {
        member_id: {"uplineId": None, "side": None}
        for member_id in member_codes
    }
    occupied_by_upline: dict[str, dict[str, str]] = defaultdict(dict)

    def find_next_slot(root_sponsor_id: str) -> tuple[str, str]:
        queue: deque[str] = deque([root_sponsor_id])
        visited = {root_sponsor_id}
        while queue:
            current = queue.popleft()
            occupied = occupied_by_upline[current]
            for side in PLACEMENT_SIDES:
                if side not in occupied:
                    return current, side
            for side in PLACEMENT_SIDES:
                child_id = occupied.get(side)
                if child_id and child_id not in visited:
                    visited.add(child_id)
                    queue.append(child_id)
        return root_sponsor_id, "Left"

    sponsor_queue = deque(root_codes)
    seen_sponsors: set[str] = set()
    while sponsor_queue:
        sponsor_id = sponsor_queue.popleft()
        if sponsor_id in seen_sponsors:
            continue
        seen_sponsors.add(sponsor_id)
        for child_id in sponsor_children.get(sponsor_id, []):
            upline_id, side = find_next_slot(sponsor_id)
            placements[child_id] = {"uplineId": upline_id, "side": side}
            occupied_by_upline[upline_id][side] = child_id
            sponsor_queue.append(child_id)

    return placements


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

        rows.append(
            {
                "memberId": normalized_member_id,
                "sponsorId": FORCED_SPONSOR_IDS.get(normalized_member_id, normalized_sponsor_id),
                "name": values.get(f"H{row_no}", "") or normalized_member_id,
            }
        )

    placements = derive_placements(rows)
    for row in rows:
        placement = placements.get(row["memberId"] or "", {"uplineId": None, "side": None})
        row["uplineId"] = placement["uplineId"]
        row["side"] = placement["side"]

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
