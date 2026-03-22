#!/usr/bin/env python3

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "runtime"
AUDIT_SCRIPT = ROOT / "scripts" / "audit_expected_reentry_vs_legacy_auto.py"
BUILD_SCENARIO = ROOT / "scripts" / "build_member003_matrix_scenario.py"
LEGACY_ENGINE = ROOT / "scripts" / "matrix-sandbox-legacy.js"
MEMBERS = ROOT / "scripts" / "member003-members.json"
SETTINGS = ROOT / "runtime" / "matrix-settings.json"


def main() -> None:
    source_path = Path(sys.argv[1]) if len(sys.argv) > 1 else RUNTIME / "allsale-user-supplied-orders.json"
    output_prefix = Path(sys.argv[2]) if len(sys.argv) > 2 else RUNTIME / "generated-reentry-round2"

    audit_path = output_prefix.with_name(f"{output_prefix.name}-audit.json")
    synthetic_orders_path = output_prefix.with_name(f"{output_prefix.name}-orders.json")
    scenario_path = output_prefix.with_name(f"{output_prefix.name}-scenario.json")
    report_path = output_prefix.with_name(f"{output_prefix.name}-report.json")
    summary_path = output_prefix.with_name(f"{output_prefix.name}-summary.json")

    subprocess.run(
        [sys.executable, str(AUDIT_SCRIPT), str(source_path), str(audit_path)],
        check=True,
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
    )

    source_payload = json.loads(source_path.read_text(encoding="utf-8"))
    audit_payload = json.loads(audit_path.read_text(encoding="utf-8"))

    normal_orders = [row for row in source_payload["orders"] if row.get("billType") != "บิลอัตโนมัติ"]
    generated_reentry_orders = []
    for row in audit_payload["expectedReentryEvents"]:
        generated_reentry_orders.append(
            {
                "invoiceNo": f"Z-R2-{row['memberId']}-{row['triggerOrderId']}",
                "memberId": row["memberId"],
                "pv": "700",
                "invoiceDate": row["triggerDate"],
                "billType": "บิลอัตโนมัติ",
                "status": "อนุมัติ",
                "generated": True,
                "generatedFromOrderId": row["triggerOrderId"],
            }
        )

    combined_orders = {
        "orders": normal_orders + generated_reentry_orders,
    }
    synthetic_orders_path.write_text(
        json.dumps(combined_orders, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    subprocess.run(
        [sys.executable, str(BUILD_SCENARIO), str(MEMBERS), str(synthetic_orders_path), str(SETTINGS), str(scenario_path)],
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

    report = json.loads(report_path.read_text(encoding="utf-8"))["report"]
    summary = {
        "sourcePath": str(source_path),
        "auditPath": str(audit_path),
        "syntheticOrdersPath": str(synthetic_orders_path),
        "scenarioPath": str(scenario_path),
        "reportPath": str(report_path),
        "generatedReentryCount": len(generated_reentry_orders),
        "generatedReentryMembers": sorted({row["memberId"] for row in generated_reentry_orders}),
        "round2Openings": report.get("legacyRoundTwoBoards", {}).get("openings", []),
        "round2Feeders": report.get("legacyRoundTwoFeeders", []),
        "combinedBoardsSubset": [
            row
            for row in report.get("legacyCombinedBoards", [])
            if row["memberId"] in {
                "TH0000013",
                "TH0000016",
                "TH0000017",
                "TH0000020",
                "TH0000023",
                "TH0000074",
                "TH0000086",
            }
        ],
    }
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"summaryPath": str(summary_path), "generatedReentryCount": summary["generatedReentryCount"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
