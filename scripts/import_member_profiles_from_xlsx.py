#!/usr/bin/env python3

from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
import textwrap
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


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


def normalize_side(value: str) -> str | None:
    normalized = value.strip().upper()
    if normalized in {"LEFT", "RIGHT"}:
        return normalized
    return None


def sql_literal(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("\\", "\\\\").replace("'", "''") + "'"


def build_sql(rows: list[dict[str, str]]) -> tuple[str, dict[str, int]]:
    stats = {
        "rows_seen": len(rows),
        "member_code_rows": 0,
    }
    statements: list[str] = ["begin;"]

    for row in rows:
        member_code = row.get("รหัสสมาชิก", "").strip()
        if not member_code:
            continue

        stats["member_code_rows"] += 1
        joined_date = row.get("วันที่สมัคร", "").strip() or None
        upline_code = row.get("อัพไลน์", "").strip() or None
        side = normalize_side(row.get("ด้าน", ""))
        rank_code = row.get("ตำแหน่ง", "").strip() or None
        honor_title = row.get("เกียรติยศ", "").strip() or None
        mobile_center = row.get("โมบายเซ็นเตอร์", "").strip() or None
        national_id = row.get("เลขบัตรประชาชน", "").strip() or None

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
                  {sql_literal(national_id)},
                  uu."id",
                  {sql_literal(side)}::public."PlacementSide",
                  {sql_literal(rank_code)},
                  {sql_literal(honor_title)},
                  {sql_literal(mobile_center)},
                  {sql_literal(joined_date)}::date,
                  now()
                from public."User" u
                left join public."User" uu on uu."memberCode" = {sql_literal(upline_code)}
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
