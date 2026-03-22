#!/usr/bin/env python3

import json
from collections import defaultdict
from pathlib import Path

SCENARIO_PATH = Path("runtime/member003-matrix-legacy-scenario.json")

TARGETS = {
    "TH0000013": ["TH0000016", "TH0000017", "TH0000023", "TH0000020", "TH0000031", "TH0000032"],
    "TH0000016": ["TH0000023", "TH0000020", "TH0000039", "TH0000053", "TH0000037", "TH0000046"],
    "TH0000020": ["TH0000028", "TH0000036", "TH0000034", "TH0000075"],
    "TH0000023": ["TH0000029", "TH0000030", "TH0000053", "TH0000037", "TH0000074"],
}


def load_scenario():
    return json.loads(SCENARIO_PATH.read_text(encoding="utf-8"))


def build_indices(members, orders):
    first_orders = {}
    for order in orders:
        first_orders.setdefault(
            order["memberId"],
            {
                "invoiceNo": order["invoiceNo"],
                "invoiceDate": order["invoiceDate"],
            },
        )

    by_id = {member["id"]: member for member in members}
    sponsor_children = defaultdict(list)
    upline_children = defaultdict(list)
    for member in members:
        if member.get("sponsorId"):
            sponsor_children[member["sponsorId"]].append(member["id"])
        if member.get("uplineId"):
            upline_children[member["uplineId"]].append(member["id"])

    def child_sort_key(member_id):
        first = first_orders.get(member_id)
        return (
            first["invoiceDate"] if first else "99/99/9999",
            first["invoiceNo"] if first else "99999999",
            member_id,
        )

    for mapping in (sponsor_children, upline_children):
        for member_id in mapping:
            mapping[member_id].sort(key=child_sort_key)

    return by_id, first_orders, sponsor_children, upline_children


def ancestor_chain(member_id, by_id, field):
    chain = []
    seen = {member_id}
    current_id = by_id.get(member_id, {}).get(field)
    while current_id and current_id not in seen and current_id in by_id:
        chain.append(current_id)
        seen.add(current_id)
        current_id = by_id[current_id].get(field)
    return chain


def descendant_count(root_id, child_map, first_orders):
    ordered = []
    pending = list(child_map.get(root_id, []))
    seen = set()
    while pending:
        current = pending.pop(0)
        if current in seen:
            continue
        seen.add(current)
        if current in first_orders:
            ordered.append(current)
        pending.extend(child_map.get(current, []))
    return ordered


def describe_target(target_id, expected, by_id, first_orders, sponsor_children, upline_children):
    sponsor_descendants = descendant_count(target_id, sponsor_children, first_orders)
    upline_descendants = descendant_count(target_id, upline_children, first_orders)

    expected_rows = []
    for member_id in expected:
        member = by_id[member_id]
        expected_rows.append(
            {
                "memberId": member_id,
                "firstOrder": first_orders.get(member_id),
                "sponsorId": member.get("sponsorId"),
                "uplineId": member.get("uplineId"),
                "side": member.get("side"),
                "sponsorAncestors": ancestor_chain(member_id, by_id, "sponsorId")[:6],
                "uplineAncestors": ancestor_chain(member_id, by_id, "uplineId")[:6],
            }
        )

    return {
        "target": target_id,
        "targetMember": by_id[target_id],
        "expectedBoardOne": expected_rows,
        "orderedSponsorDescendants": sponsor_descendants,
        "orderedUplineDescendants": upline_descendants,
        "hasSponsorSubtreeOrders": len(sponsor_descendants) > 0,
        "hasUplineSubtreeOrders": len(upline_descendants) > 0,
    }


def main():
    scenario = load_scenario()
    by_id, first_orders, sponsor_children, upline_children = build_indices(
        scenario["members"], scenario["orders"]
    )

    payload = {
        target_id: describe_target(
            target_id,
            expected,
            by_id,
            first_orders,
            sponsor_children,
            upline_children,
        )
        for target_id, expected in TARGETS.items()
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
