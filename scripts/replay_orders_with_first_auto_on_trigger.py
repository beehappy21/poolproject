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


def build_and_run(orders: list[dict], tag: str) -> dict:
    orders_path = RUNTIME / f"{tag}-orders.json"
    scenario_path = RUNTIME / f"{tag}-scenario.json"
    report_path = RUNTIME / f"{tag}-report.json"

    orders_path.write_text(
        json.dumps({"orders": orders}, ensure_ascii=False, indent=2) + "\n",
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

    return json.loads(report_path.read_text(encoding="utf-8"))


def completion_state(report_payload: dict) -> set[str]:
    combined = report_payload["report"].get("legacyCombinedBoards", [])
    completed = set()
    for row in combined:
        filled = sum(1 for slot in row.get("round1", []) if slot)
        if filled >= 6:
            completed.add(row["memberId"])
    return completed


def main() -> None:
    source_path = Path(sys.argv[1]) if len(sys.argv) > 1 else RUNTIME / "allsale-user-supplied-orders.json"
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else RUNTIME / "replayed-first-auto-on-trigger.json"

    payload = json.loads(source_path.read_text(encoding="utf-8"))
    orders = sorted(payload["orders"], key=order_key)
    normal_orders = [order for order in orders if order.get("billType") != "บิลอัตโนมัติ"]
    auto_orders = [order for order in orders if order.get("billType") == "บิลอัตโนมัติ"]

    pending_auto_by_member = {}
    for order in auto_orders:
        pending_auto_by_member.setdefault(order["memberId"], []).append(order)
    for member_orders in pending_auto_by_member.values():
        member_orders.sort(key=order_key)

    replayed_orders = []
    replay_log = []
    already_completed = set()
    last_report_payload = None

    for normal_order in normal_orders:
        replayed_orders.append(normal_order)
        replay_log.append(
            {
                "action": "consume_normal_order",
                "invoiceNo": normal_order["invoiceNo"],
                "invoiceDate": normal_order["invoiceDate"],
                "memberId": normal_order["memberId"],
            }
        )

        last_report_payload = build_and_run(replayed_orders, "tmp-replay-first-auto-on-trigger")
        completed_now = completion_state(last_report_payload)
        newly_completed = sorted(member_id for member_id in completed_now if member_id not in already_completed)

        for member_id in newly_completed:
            already_completed.add(member_id)
            replay_log.append(
                {
                    "action": "board1_completed",
                    "memberId": member_id,
                    "triggerInvoiceNo": normal_order["invoiceNo"],
                    "triggerDate": normal_order["invoiceDate"],
                }
            )

            pending = pending_auto_by_member.get(member_id, [])
            if not pending:
                replay_log.append(
                    {
                        "action": "no_auto_bill_available",
                        "memberId": member_id,
                        "triggerInvoiceNo": normal_order["invoiceNo"],
                    }
                )
                continue

            auto_order = pending.pop(0)
            replayed_orders.append(auto_order)
            replay_log.append(
                {
                    "action": "consume_first_auto_bill",
                    "memberId": member_id,
                    "invoiceNo": auto_order["invoiceNo"],
                    "invoiceDate": auto_order["invoiceDate"],
                    "triggerInvoiceNo": normal_order["invoiceNo"],
                    "triggerDate": normal_order["invoiceDate"],
                }
            )

            last_report_payload = build_and_run(replayed_orders, "tmp-replay-first-auto-on-trigger")

    remaining_auto = {
        member_id: orders
        for member_id, orders in pending_auto_by_member.items()
        if orders
    }

    result = {
        "sourcePath": str(source_path),
        "normalOrderCount": len(normal_orders),
        "autoOrderCount": len(auto_orders),
        "replayedOrderCount": len(replayed_orders),
        "consumedAutoBillCount": sum(
            1 for row in replay_log if row["action"] == "consume_first_auto_bill"
        ),
        "replayLog": replay_log,
        "remainingAutoBillsByMember": remaining_auto,
        "finalReportPath": str(RUNTIME / "tmp-replay-first-auto-on-trigger-report.json"),
        "summary": {
            "board1CompletedMembers": sorted(already_completed),
            "membersWithConsumedAutoBill": sorted(
                {row["memberId"] for row in replay_log if row["action"] == "consume_first_auto_bill"}
            ),
            "membersMissingAutoBillAtTrigger": sorted(
                {row["memberId"] for row in replay_log if row["action"] == "no_auto_bill_available"}
            ),
        },
    }

    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "outputPath": str(output_path),
                "consumedAutoBillCount": result["consumedAutoBillCount"],
                "remainingAutoMemberCount": len(remaining_auto),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
