#!/usr/bin/env python3

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "runtime"
BUILD_SCENARIO = ROOT / "scripts" / "build_member003_matrix_scenario.py"
LEGACY_ENGINE = ROOT / "scripts" / "matrix-sandbox-legacy.js"
MEMBERS = ROOT / "scripts" / "member003-members.json"
SETTINGS = ROOT / "runtime" / "matrix-settings.json"


def order_key(order: dict):
    day, month, year = map(int, order["invoiceDate"].split("/"))
    return (datetime(year - 543, month, day), order["invoiceNo"])


def build_and_run(prefix_orders: list[dict], tag: str) -> dict:
    orders_path = RUNTIME / f"{tag}-orders.json"
    scenario_path = RUNTIME / f"{tag}-scenario.json"
    report_path = RUNTIME / f"{tag}-report.json"

    orders_path.write_text(
        json.dumps({"orders": prefix_orders}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    subprocess.run(
        [sys.executable, str(BUILD_SCENARIO), str(MEMBERS), str(orders_path), str(SETTINGS), str(scenario_path)],
        check=True,
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
    )
    subprocess.run(
        ["node", str(LEGACY_ENGINE), str(scenario_path), str(report_path)],
        check=True,
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
    )

    return json.loads(report_path.read_text(encoding="utf-8"))["report"]


def completion_state(report: dict):
    combined = {row["memberId"]: row for row in report.get("legacyCombinedBoards", [])}
    completed = {}
    for member_id, row in combined.items():
        filled = sum(1 for slot in row.get("round1", []) if slot)
        if filled >= 6:
            completed[member_id] = filled
    return completed


def main() -> None:
    source_path = Path(sys.argv[1]) if len(sys.argv) > 1 else RUNTIME / "allsale-user-supplied-orders.json"
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else RUNTIME / "expected-reentry-vs-legacy-auto.json"

    payload = json.loads(source_path.read_text(encoding="utf-8"))
    orders = sorted(payload["orders"], key=order_key)
    normal_orders = [order for order in orders if order.get("billType") != "บิลอัตโนมัติ"]
    auto_orders = [order for order in orders if order.get("billType") == "บิลอัตโนมัติ"]

    expected_reentry_events = []
    already_completed = set()

    for index in range(1, len(normal_orders) + 1):
        prefix = normal_orders[:index]
        report = build_and_run(prefix, "tmp-expected-reentry-audit")
        completed_now = completion_state(report)

        newly_completed = sorted(member_id for member_id in completed_now if member_id not in already_completed)
        if not newly_completed:
            continue

        trigger = prefix[-1]
        for member_id in newly_completed:
            expected_reentry_events.append(
                {
                    "memberId": member_id,
                    "triggerOrderId": trigger["invoiceNo"],
                    "triggerDate": trigger["invoiceDate"],
                    "expectedReentryBoard": 1,
                    "expectedRoundNo": 2,
                }
            )
            already_completed.add(member_id)

    actual_auto_members = {}
    for order in auto_orders:
        actual_auto_members.setdefault(order["memberId"], []).append(
            {
                "invoiceNo": order["invoiceNo"],
                "invoiceDate": order["invoiceDate"],
            }
        )

    expected_by_member = {row["memberId"]: row for row in expected_reentry_events}
    members = sorted(set(expected_by_member) | set(actual_auto_members))
    comparison = []
    for member_id in members:
        expected = expected_by_member.get(member_id)
        actual = actual_auto_members.get(member_id, [])
        comparison.append(
            {
                "memberId": member_id,
                "expected": expected,
                "actualAutoBills": actual,
                "status": (
                    "match"
                    if expected and actual
                    else "missing_auto_bill"
                    if expected and not actual
                    else "unexpected_auto_bill"
                    if actual and not expected
                    else "none"
                ),
            }
        )

    result = {
        "sourcePath": str(source_path),
        "normalOrderCount": len(normal_orders),
        "autoOrderCount": len(auto_orders),
        "expectedReentryEvents": expected_reentry_events,
        "actualAutoBillsByMember": actual_auto_members,
        "comparison": comparison,
        "summary": {
            "match": sum(1 for row in comparison if row["status"] == "match"),
            "missing_auto_bill": sum(1 for row in comparison if row["status"] == "missing_auto_bill"),
            "unexpected_auto_bill": sum(1 for row in comparison if row["status"] == "unexpected_auto_bill"),
        },
    }

    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"outputPath": str(output_path), "summary": result["summary"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
