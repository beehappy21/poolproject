#!/usr/bin/env python3

import json
import sys
from pathlib import Path


PERCENT_TO_BOARD = {
    "0.15": 1,
    "0.1": 2,
    "0.10": 2,
    "0.6": 3,
    "0.60": 3,
}


def load_report_candidates(report_path: Path):
    payload = json.loads(report_path.read_text(encoding="utf-8"))
    report = payload["report"]
    candidates = set()

    for row in report.get("legacyBoardOnePayableCandidates", []):
        if row.get("boardNo") == 1 and row.get("beneficiaryId") and row.get("sourceMemberId"):
            candidates.add((1, row["beneficiaryId"], row["sourceMemberId"]))

    for row in report.get("legacyDerivedBoards", []):
        if row.get("boardNo") != 1:
            continue
        for slot in row.get("slots", []):
            source_member_id = slot.get("sourceMemberId")
            if source_member_id:
                candidates.add((1, row["memberId"], source_member_id))

    for row in report.get("legacyBoardTwoCombined", []):
        if row.get("boardNo") != 2:
            continue
        for source_member_id in row.get("slots", []):
            if source_member_id:
                candidates.add((2, row["memberId"], source_member_id))

    for row in report.get("legacyBoardThreeCombined", []):
        if row.get("boardNo") != 3:
            continue
        for source_member_id in row.get("slots", []):
            if source_member_id:
                candidates.add((3, row["memberId"], source_member_id))

    return candidates


def parse_rows(tsv_path: Path):
    lines = [line.rstrip("\n") for line in tsv_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    header = lines[0].split("\t")
    rows = []
    for line in lines[1:]:
        values = line.split("\t")
        row = dict(zip(header, values))
        rows.append(row)
    return rows


def normalize_percent(raw: str):
    value = str(raw or "").strip()
    return value


def main():
    payout_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("runtime/legacy-board-payouts.tsv")
    report_path = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else Path("runtime/member003-matrix-with-generated-auto-report.json")
    )
    output_path = (
        Path(sys.argv[3])
        if len(sys.argv) > 3
        else Path("runtime/legacy-board-payout-validation.json")
    )

    candidates = load_report_candidates(report_path)
    payout_rows = parse_rows(payout_path)

    results = []
    for row in payout_rows:
        percent = normalize_percent(row.get("เปอร์เซ็นต์"))
        board_no = PERCENT_TO_BOARD.get(percent)
        beneficiary_id = row.get("รหัสสมาชิก")
        source_id = row.get("จาก")
        matched = bool(board_no and (board_no, beneficiary_id, source_id) in candidates)
        results.append(
            {
                "date": row.get("วันที่"),
                "beneficiaryId": beneficiary_id,
                "sourceId": source_id,
                "percent": percent,
                "boardNo": board_no,
                "matched": matched,
            }
        )

    summary = {
        "matched": sum(1 for row in results if row["matched"]),
        "unmatched": sum(1 for row in results if not row["matched"]),
        "board1Rows": sum(1 for row in results if row["boardNo"] == 1),
        "board2Rows": sum(1 for row in results if row["boardNo"] == 2),
        "board3Rows": sum(1 for row in results if row["boardNo"] == 3),
    }

    payload = {
        "payoutPath": str(payout_path),
        "reportPath": str(report_path),
        "summary": summary,
        "rows": results,
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"outputPath": str(output_path), "summary": summary}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
