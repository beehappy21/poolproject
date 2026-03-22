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


def effective_filled_slots(report: dict, member_id: str) -> int:
    derived = next(
        (
            row
            for row in report.get("legacyDerivedBoards", [])
            if row["memberId"] == member_id and row["boardNo"] == 1 and row["roundNo"] == 1
        ),
        None,
    )
    if derived:
        return sum(1 for slot in derived.get("slots", []) if slot.get("sourceOrderId"))

    summary = next(
        (
            row
            for row in report.get("boardSummaries", [])
            if row["memberId"] == member_id and row["boardNo"] == 1 and row["roundNo"] == 1
        ),
        None,
    )
    return int(summary.get("filledSlots", 0)) if summary else 0


def build_and_run(prefix_orders: list[dict], temp_name: str) -> dict:
    orders_path = RUNTIME / f"{temp_name}-orders.json"
    scenario_path = RUNTIME / f"{temp_name}-scenario.json"
    report_path = RUNTIME / f"{temp_name}-report.json"

    orders_path.write_text(json.dumps({"orders": prefix_orders}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    subprocess.run(
        [
            sys.executable,
            str(BUILD_SCENARIO),
            str(MEMBERS),
            str(orders_path),
            str(SETTINGS),
            str(scenario_path),
        ],
        check=True,
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
    )

    subprocess.run(
        [
            "node",
            str(LEGACY_ENGINE),
            str(scenario_path),
            str(report_path),
        ],
        check=True,
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
    )

    return json.loads(report_path.read_text(encoding="utf-8"))["report"]


def main() -> None:
    source_path = Path(sys.argv[1]) if len(sys.argv) > 1 else RUNTIME / "allsale-user-supplied-orders.json"
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else RUNTIME / "pre-first-auto-analysis.json"

    payload = json.loads(source_path.read_text(encoding="utf-8"))
    orders = sorted(payload["orders"], key=order_key)
    auto_orders = [order for order in orders if order.get("billType") == "บิลอัตโนมัติ"]
    if not auto_orders:
        raise SystemExit("No auto-bill orders found")

    first_auto = auto_orders[0]
    first_auto_key = order_key(first_auto)
    prior_orders = [order for order in orders if order_key(order) < first_auto_key]
    first_auto_day_orders = [order for order in auto_orders if order["invoiceDate"] == first_auto["invoiceDate"]]

    discovered_complete = {}
    completion_events = []

    for index in range(1, len(prior_orders) + 1):
        prefix = prior_orders[:index]
        report = build_and_run(prefix, "tmp-pre-first-auto")

        candidate_ids = {
            row["memberId"] for row in report.get("legacyCombinedBoards", [])
        } | {
            row["memberId"] for row in report.get("boardSummaries", []) if row["boardNo"] == 1 and row["roundNo"] == 1
        }

        for member_id in sorted(candidate_ids):
            if member_id in discovered_complete:
                continue
            filled_slots = effective_filled_slots(report, member_id)
            if filled_slots >= 6:
                trigger = prefix[-1]
                discovered_complete[member_id] = {
                    "memberId": member_id,
                    "completedAtOrderId": trigger["invoiceNo"],
                    "completedAtDate": trigger["invoiceDate"],
                    "prefixOrderCount": index,
                    "filledSlots": filled_slots,
                }
                completion_events.append(discovered_complete[member_id])

    final_report = build_and_run(prior_orders, "tmp-pre-first-auto-final")

    auto_members_first_day = sorted({order["memberId"] for order in first_auto_day_orders})
    completed_before_first_auto = sorted(discovered_complete)

    result = {
        "sourcePath": str(source_path),
        "firstAutoOrder": first_auto,
        "firstAutoDayOrders": first_auto_day_orders,
        "priorOrderCount": len(prior_orders),
        "completedBeforeFirstAuto": completed_before_first_auto,
        "completionEvents": completion_events,
        "membersWithAutoBillOnFirstAutoDate": auto_members_first_day,
        "matchedAutoMembers": [member_id for member_id in auto_members_first_day if member_id in discovered_complete],
        "missingAutoMembers": [member_id for member_id in auto_members_first_day if member_id not in discovered_complete],
        "completedWithoutAutoOnFirstDay": [member_id for member_id in completed_before_first_auto if member_id not in auto_members_first_day],
        "finalSnapshot": {
            "legacyCombinedBoards": report_subset(final_report.get("legacyCombinedBoards", [])),
            "boardSummaries": [
                row
                for row in final_report.get("boardSummaries", [])
                if row["boardNo"] == 1 and row["roundNo"] == 1 and row["filledSlots"] >= 4
            ],
        },
    }

    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"outputPath": str(output_path), "matchedAutoMembers": result["matchedAutoMembers"], "missingAutoMembers": result["missingAutoMembers"]}, ensure_ascii=False, indent=2))


def report_subset(rows: list[dict]) -> list[dict]:
    keep = {"TH0000013", "TH0000016", "TH0000017", "TH0000020", "TH0000023", "TH0000074"}
    return [row for row in rows if row["memberId"] in keep]


if __name__ == "__main__":
    main()
