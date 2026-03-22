#!/usr/bin/env python3

import json
import sys
from collections import Counter, OrderedDict
from pathlib import Path
from typing import Iterable, List
from xml.sax.saxutils import escape
import zipfile


def column_name(index: int) -> str:
    result = ""
    while index > 0:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def xml_cell(value, row_number: int, column_number: int, shared_index_by_value) -> str:
    ref = f"{column_name(column_number)}{row_number}"
    if value is None:
        return f'<c r="{ref}"/>'
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f'<c r="{ref}"><v>{value}</v></c>'
    text = str(value)
    shared_index = shared_index_by_value[text]
    return f'<c r="{ref}" t="s"><v>{shared_index}</v></c>'


def worksheet_xml(rows: List[List[object]], shared_index_by_value) -> str:
    row_xml = []
    for row_number, row in enumerate(rows, start=1):
        cells = [
            xml_cell(value, row_number, column_number, shared_index_by_value)
            for column_number, value in enumerate(row, start=1)
        ]
        row_xml.append(f'<row r="{row_number}">{"".join(cells)}</row>')
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(row_xml)}</sheetData>'
        "</worksheet>"
    )


def shared_strings_xml(strings: Iterable[str]) -> str:
    items = list(strings)
    payload = "".join(f"<si><t>{escape(text)}</t></si>" for text in items)
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        f'count="{len(items)}" uniqueCount="{len(items)}">{payload}</sst>'
    )


def content_types_xml(sheet_count: int) -> str:
    overrides = [
        '<Override PartName="/xl/workbook.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
        '<Override PartName="/xl/sharedStrings.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>',
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
    ]
    overrides.extend(
        f'<Override PartName="/xl/worksheets/sheet{index}.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        for index in range(1, sheet_count + 1)
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        f'{"".join(overrides)}</Types>'
    )


def rels_xml() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
        "</Relationships>"
    )


def workbook_xml(sheet_names: List[str]) -> str:
    sheets = []
    for index, name in enumerate(sheet_names, start=1):
        sheets.append(
            f'<sheet name="{escape(name)}" sheetId="{index}" '
            f'r:id="rId{index}"/>'
        )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<sheets>{"".join(sheets)}</sheets></workbook>'
    )


def workbook_rels_xml(sheet_count: int) -> str:
    relationships = []
    for index in range(1, sheet_count + 1):
        relationships.append(
            f'<Relationship Id="rId{index}" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
            f'Target="worksheets/sheet{index}.xml"/>'
        )
    relationships.append(
        f'<Relationship Id="rId{sheet_count + 1}" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" '
        'Target="sharedStrings.xml"/>'
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f'{"".join(relationships)}</Relationships>'
    )


def app_xml(sheet_names: List[str]) -> str:
    titles = "".join(f"<vt:lpstr>{escape(name)}</vt:lpstr>" for name in sheet_names)
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
        'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
        '<Application>Codex</Application>'
        f'<TitlesOfParts><vt:vector size="{len(sheet_names)}" baseType="lpstr">{titles}</vt:vector></TitlesOfParts>'
        "</Properties>"
    )


def core_xml() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" '
        'xmlns:dcterms="http://purl.org/dc/terms/" '
        'xmlns:dcmitype="http://purl.org/dc/dcmitype/" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        '<dc:title>member003 direct report</dc:title>'
        '<dc:creator>Codex</dc:creator>'
        "</cp:coreProperties>"
    )


def build_rows(report: dict) -> OrderedDict:
    direct_rows = report["report"]["direct"]
    fallback_rows = report["report"]["companyFallbacks"]
    members = report["members"]

    summary_rows = [
        ["metric", "value"],
        ["scenarioName", report["scenarioName"]],
        ["directPayoutCount", len(direct_rows)],
        ["fallbackCount", len(fallback_rows)],
        ["directRate", ",".join(report["report"]["settings"]["directLevelRates"])],
        ["sampleFallbackReason", fallback_rows[0]["reasonCode"] if fallback_rows else ""],
    ]

    direct_sheet_rows = [[
        "orderId", "buyerId", "beneficiaryId", "levelNo", "rate", "basePv", "amount", "rolledUpFromBuyerUplineDepth"
    ]]
    for row in direct_rows:
        direct_sheet_rows.append([
            row["orderId"],
            row["buyerId"],
            row["beneficiaryId"],
            row["levelNo"],
            row["rate"],
            row["basePv"],
            row["amount"],
            row["rolledUpFromBuyerUplineDepth"],
        ])

    fallback_sheet_rows = [[
        "sourceType", "sourceRefId", "orderId", "levelNo", "beneficiaryId", "reasonCode", "amount"
    ]]
    for row in fallback_rows:
        fallback_sheet_rows.append([
            row["sourceType"],
            row["sourceRefId"],
            row["orderId"],
            row["levelNo"],
            row["beneficiaryId"],
            row["reasonCode"],
            row["amount"],
        ])

    beneficiary_counts = Counter(row["beneficiaryId"] for row in direct_rows)
    beneficiary_sheet_rows = [["beneficiaryId", "directCount"]]
    for beneficiary_id, count in beneficiary_counts.most_common():
        beneficiary_sheet_rows.append([beneficiary_id, count])

    member_sheet_rows = [[
        "id", "name", "sponsorId", "active", "earningCap", "earnedToDate", "directActiveCount"
    ]]
    for member in members:
        member_sheet_rows.append([
            member["id"],
            member.get("name", ""),
            member.get("sponsorId", ""),
            "true" if member.get("active") else "false",
            member.get("earningCap", ""),
            member.get("earnedToDate", ""),
            member.get("directActiveCount", ""),
        ])

    return OrderedDict([
        ("Summary", summary_rows),
        ("DirectPayouts", direct_sheet_rows),
        ("Fallbacks", fallback_sheet_rows),
        ("Beneficiaries", beneficiary_sheet_rows),
        ("Members", member_sheet_rows),
    ])


def main() -> None:
    report_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path("runtime/member003-direct-report.json")
    )
    output_path = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else Path("runtime/member003-direct-report.xlsx")
    )

    report = json.loads(report_path.read_text(encoding="utf-8"))
    sheets = build_rows(report)

    all_strings = OrderedDict()
    for rows in sheets.values():
        for row in rows:
            for value in row:
                if value is None:
                    continue
                if isinstance(value, (int, float)) and not isinstance(value, bool):
                    continue
                text = str(value)
                if text not in all_strings:
                    all_strings[text] = len(all_strings)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as workbook:
        workbook.writestr("[Content_Types].xml", content_types_xml(len(sheets)))
        workbook.writestr("_rels/.rels", rels_xml())
        workbook.writestr("xl/workbook.xml", workbook_xml(list(sheets.keys())))
        workbook.writestr("xl/_rels/workbook.xml.rels", workbook_rels_xml(len(sheets)))
        workbook.writestr("xl/sharedStrings.xml", shared_strings_xml(all_strings.keys()))
        workbook.writestr("docProps/app.xml", app_xml(list(sheets.keys())))
        workbook.writestr("docProps/core.xml", core_xml())
        for index, rows in enumerate(sheets.values(), start=1):
            workbook.writestr(
                f"xl/worksheets/sheet{index}.xml",
                worksheet_xml(rows, all_strings),
            )

    summary = {
        "status": "written",
        "reportPath": str(report_path),
        "outputPath": str(output_path),
        "sheetNames": list(sheets.keys()),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
