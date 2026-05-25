#!/usr/bin/env python3

from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
import textwrap
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict, deque
from pathlib import Path

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
PLACEMENT_SIDES = ("LEFT", "MIDDLE", "RIGHT")


def load_rows(xlsx_path: Path) -> list[dict[str, str]]:
    with zipfile.ZipFile(xlsx_path) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for si in root.findall("a:si", NS):
                shared_strings.append("".join(t.text or "" for t in si.findall(".//a:t", NS)))

        sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        rows: list[list[str]] = []
        for row in sheet.findall(".//a:row", NS):
            values: list[str] = []
            for cell in row.findall("a:c", NS):
                value = ""
                cell_type = cell.attrib.get("t")
                if cell_type == "inlineStr":
                    value = "".join(node.text or "" for node in cell.findall(".//a:t", NS))
                    values.append(value)
                    continue
                raw = cell.find("a:v", NS)
                if raw is not None and raw.text is not None:
                    value = shared_strings[int(raw.text)] if cell_type == "s" else raw.text
                values.append(value)
            rows.append(values)

    headers = rows[0]
    return [
        {header: row[index] if index < len(row) else "" for index, header in enumerate(headers)}
        for row in rows[1:]
        if any(part.strip() for part in row)
    ]


def clean(value: str | None) -> str | None:
    trimmed = str(value or "").strip()
    return trimmed or None


def member_sort_key(member_code: str) -> tuple[int, str]:
    digits = "".join(char for char in member_code if char.isdigit())
    return (int(digits) if digits else 0, member_code)


def build_member_rows(rows: list[dict[str, str]]) -> list[dict[str, str | None]]:
    members: list[dict[str, str | None]] = []
    for row in rows:
        member_code = clean(row.get("รหัสสมาชิก"))
        if not member_code:
            continue
        members.append(
            {
                "memberCode": member_code,
                "sponsorCode": clean(row.get("รหัสผู้แนะนำ")),
                "joinedDate": clean(row.get("วันที่สมัคร")),
                "rankCode": clean(row.get("ตำแหน่ง")),
                "honorTitle": clean(row.get("เกียรติยศ")),
                "mobileCenterCode": clean(row.get("โมบายเซ็นเตอร์")),
                "nationalId": clean(row.get("เลขบัตรประชาชน")),
            }
        )
    return members


def derive_placements(
    members: list[dict[str, str | None]],
) -> tuple[dict[str, dict[str, str | None]], dict[str, int]]:
    member_codes = {member["memberCode"] for member in members if member["memberCode"]}
    members_by_code = {member["memberCode"]: member for member in members if member["memberCode"]}

    sponsor_children: dict[str, list[str]] = defaultdict(list)
    root_codes: list[str] = []

    for member in sorted(members, key=lambda item: member_sort_key(item["memberCode"] or "")):
        member_code = member["memberCode"]
        sponsor_code = member["sponsorCode"]
        if not member_code:
            continue
        if sponsor_code and sponsor_code in member_codes and sponsor_code != member_code:
            sponsor_children[sponsor_code].append(member_code)
        else:
            root_codes.append(member_code)

    for sponsor_code in sponsor_children:
        sponsor_children[sponsor_code].sort(key=member_sort_key)
    root_codes.sort(key=member_sort_key)

    placements_by_code: dict[str, dict[str, str | None]] = {
        member_code: {
            "uplineCode": None,
            "placementSide": None,
        }
        for member_code in member_codes
    }
    occupied_by_upline: dict[str, dict[str, str]] = defaultdict(dict)
    ordered_sponsors = deque(root_codes)
    seen_sponsors: set[str] = set()
    assigned_count = 0

    def find_next_slot(root_sponsor_code: str) -> tuple[str, str]:
        queue: deque[str] = deque([root_sponsor_code])
        visited = {root_sponsor_code}
        while queue:
            current = queue.popleft()
            occupied = occupied_by_upline[current]
            for side in PLACEMENT_SIDES:
                if side not in occupied:
                    return current, side
            for side in PLACEMENT_SIDES:
                child_code = occupied.get(side)
                if child_code and child_code not in visited:
                    visited.add(child_code)
                    queue.append(child_code)
        return root_sponsor_code, "LEFT"

    while ordered_sponsors:
        sponsor_code = ordered_sponsors.popleft()
        if sponsor_code in seen_sponsors:
            continue
        seen_sponsors.add(sponsor_code)
        for child_code in sponsor_children.get(sponsor_code, []):
            upline_code, placement_side = find_next_slot(sponsor_code)
            placements_by_code[child_code] = {
                "uplineCode": upline_code,
                "placementSide": placement_side,
            }
            occupied_by_upline[upline_code][placement_side] = child_code
            assigned_count += 1
            ordered_sponsors.append(child_code)

    unvisited_codes = sorted(member_codes - seen_sponsors, key=member_sort_key)
    for member_code in unvisited_codes:
        sponsor_code = members_by_code[member_code]["sponsorCode"]
        if sponsor_code and sponsor_code in member_codes and sponsor_code != member_code:
            upline_code, placement_side = find_next_slot(sponsor_code)
            placements_by_code[member_code] = {
                "uplineCode": upline_code,
                "placementSide": placement_side,
            }
            occupied_by_upline[upline_code][placement_side] = member_code
            assigned_count += 1

    stats = {
        "root_count": len(root_codes),
        "sponsor_group_count": len(sponsor_children),
        "assigned_count": assigned_count,
    }
    return placements_by_code, stats


def sql_literal(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("\\", "\\\\").replace("'", "''") + "'"


def build_sql(rows: list[dict[str, str]]) -> tuple[str, dict[str, int]]:
    stats = {
        "rows_seen": len(rows),
        "member_code_rows": 0,
    }
    member_rows = build_member_rows(rows)
    placements_by_code, placement_stats = derive_placements(member_rows)
    stats["member_code_rows"] = len(member_rows)
    stats.update(placement_stats)

    statements: list[str] = ["begin;"]
    for member in member_rows:
        member_code = member["memberCode"]
        if not member_code:
            continue

        placement = placements_by_code.get(member_code, {"uplineCode": None, "placementSide": None})
        statements.append(
            textwrap.dedent(
                f"""
                insert into public."MemberProfile" (
                  "userId",
                  "nationalId",
                  "uplineUserId",
                  "placementSide",
                  "rankCode",
                  "honorTitle",
                  "mobileCenterCode",
                  "joinedAtOverride",
                  "updatedAt"
                )
                select
                  u."id",
                  {sql_literal(member["nationalId"])},
                  uu."id",
                  {sql_literal(placement["placementSide"])}::public."PlacementSide",
                  {sql_literal(member["rankCode"])},
                  {sql_literal(member["honorTitle"])},
                  {sql_literal(member["mobileCenterCode"])},
                  {sql_literal(member["joinedDate"])}::date,
                  now()
                from public."User" u
                left join public."User" uu on uu."memberCode" = {sql_literal(placement["uplineCode"])}
                where u."memberCode" = {sql_literal(member_code)}
                on conflict ("userId") do update
                set
                  "nationalId" = excluded."nationalId",
                  "uplineUserId" = excluded."uplineUserId",
                  "placementSide" = excluded."placementSide",
                  "rankCode" = excluded."rankCode",
                  "honorTitle" = excluded."honorTitle",
                  "mobileCenterCode" = excluded."mobileCenterCode",
                  "joinedAtOverride" = excluded."joinedAtOverride",
                  "updatedAt" = now();
                """
            ).strip()
        )

    statements.append("commit;")
    return "\n".join(statements) + "\n", stats


def run_sql(sql: str, database_url: str) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False) as handle:
        handle.write(sql)
        temp_path = Path(handle.name)

    try:
        subprocess.run(
            [
                "docker",
                "exec",
                "-i",
                "poolproject-postgres",
                "psql",
                "-v",
                "ON_ERROR_STOP=1",
                database_url,
            ],
            check=True,
            stdin=temp_path.open("r"),
        )
    finally:
        temp_path.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Import member profile data from member003-style xlsx.")
    parser.add_argument("xlsx_path", nargs="?", default="member003.xlsx")
    parser.add_argument("--apply", action="store_true", help="Execute generated SQL against local Postgres.")
    parser.add_argument(
        "--database-url",
        default="postgresql://postgres:postgres@127.0.0.1:5432/poolproject",
    )
    args = parser.parse_args()

    xlsx_path = Path(args.xlsx_path)
    rows = load_rows(xlsx_path)
    sql, stats = build_sql(rows)

    print(f"rows_seen={stats['rows_seen']}")
    print(f"member_code_rows={stats['member_code_rows']}")
    print(f"root_count={stats['root_count']}")
    print(f"sponsor_group_count={stats['sponsor_group_count']}")
    print(f"assigned_count={stats['assigned_count']}")
    if not args.apply:
        print("dry_run=yes")
        preview = "\n".join(sql.splitlines()[:20])
        print(preview)
        return 0

    run_sql(sql, args.database_url)
    print("apply=ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
