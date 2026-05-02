#!/usr/bin/env python3

import json
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
