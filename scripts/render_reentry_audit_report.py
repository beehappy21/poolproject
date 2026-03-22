#!/usr/bin/env python3

import json
import sys
from pathlib import Path
from typing import Dict, List, Optional


def format_expected(expected: Optional[Dict]) -> str:
    if not expected:
        return "-"
    return f"{expected['triggerOrderId']} ({expected['triggerDate']})"


def format_actual(actual_rows: List[Dict]) -> str:
    if not actual_rows:
        return "-"
    return ", ".join(f"{row['invoiceNo']} ({row['invoiceDate']})" for row in actual_rows)


def main() -> None:
    input_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("runtime/expected-reentry-vs-legacy-auto.json")
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("runtime/expected-reentry-vs-legacy-auto.md")

    payload = json.loads(input_path.read_text(encoding="utf-8"))
    rows = payload["comparison"]

    status_order = {
        "match": 0,
        "missing_auto_bill": 1,
        "unexpected_auto_bill": 2,
        "none": 3,
    }
    rows = sorted(rows, key=lambda row: (status_order.get(row["status"], 99), row["memberId"]))

    lines = []
    lines.append("# Reentry Audit")
    lines.append("")
    lines.append(f"- Source: `{payload['sourcePath']}`")
    lines.append(f"- Match: `{payload['summary']['match']}`")
    lines.append(f"- Missing Auto Bill: `{payload['summary']['missing_auto_bill']}`")
    lines.append(f"- Unexpected Auto Bill: `{payload['summary']['unexpected_auto_bill']}`")
    lines.append("")
    lines.append("| Member | Status | Expected Reentry Trigger | Legacy Auto Bills |")
    lines.append("|---|---|---|---|")
    for row in rows:
        lines.append(
            f"| {row['memberId']} | {row['status']} | {format_expected(row['expected'])} | {format_actual(row['actualAutoBills'])} |"
        )
    lines.append("")

    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"outputPath": str(output_path), "rowCount": len(rows)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
