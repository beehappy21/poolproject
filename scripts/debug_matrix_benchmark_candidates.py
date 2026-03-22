#!/usr/bin/env python3

import json
from collections import defaultdict, deque
from pathlib import Path

MEMBERS_PATH = Path("scripts/member003-members.json")
ORDERS_PATH = Path("runtime/allsale-legacy-seed-orders.json")

TARGETS = {
    "TH0000013": ["TH0000016", "TH0000017", "TH0000023", "TH0000020", "TH0000031", "TH0000032"],
    "TH0000016": ["TH0000023", "TH0000020", "TH0000039", "TH0000053", "TH0000037", "TH0000046"],
    "TH0000023": ["TH0000029", "TH0000030", "TH0000039", "TH0000053", "TH0000037", "TH0000046"],
    "TH0000020": ["TH0000028", "TH0000036", "TH0000034", "TH0000075"],
}


def load_members():
    return json.loads(MEMBERS_PATH.read_text(encoding="utf-8"))["members"]


def load_orders():
    return json.loads(ORDERS_PATH.read_text(encoding="utf-8"))["orders"]


def build_indices(members):
    by_sponsor = defaultdict(list)
    by_upline = defaultdict(list)
    for row in members:
        if row.get("sponsorId"):
            by_sponsor[row["sponsorId"]].append(row["memberId"])
        if row.get("uplineId"):
            by_upline[row["uplineId"]].append((row.get("side"), row["memberId"]))

    for member_id in by_sponsor:
        by_sponsor[member_id].sort()
    for member_id in by_upline:
        by_upline[member_id].sort(key=lambda item: ((item[0] or ""), item[1]))

    return by_sponsor, by_upline


def build_order_maps(orders):
    first_order = {}
    first_order_date = {}
    for row in orders:
        member_id = row["memberId"]
        first_order.setdefault(member_id, row["invoiceNo"])
        first_order_date.setdefault(member_id, row["invoiceDate"])
    return first_order, first_order_date


def sponsor_bfs(root, by_sponsor, first_order):
    queue = deque([root])
    seen = {root}
    result = []
    while queue:
        node = queue.popleft()
        for child in by_sponsor.get(node, []):
            if child in seen:
                continue
            seen.add(child)
            queue.append(child)
            if child in first_order:
                result.append(child)
    return result


def sponsor_bfs_invoice(root, by_sponsor, first_order):
    queue = deque([root])
    seen = {root}
    result = []
    while queue:
        node = queue.popleft()
        ordered_children = sorted(
            by_sponsor.get(node, []),
            key=lambda child: (first_order.get(child, "99999999"), child),
        )
        for child in ordered_children:
            if child in seen:
                continue
            seen.add(child)
            queue.append(child)
            if child in first_order:
                result.append(child)
    return result


def upline_bfs(root, by_upline, first_order):
    queue = deque([root])
    seen = {root}
    result = []
    while queue:
        node = queue.popleft()
        for _, child in by_upline.get(node, []):
            if child in seen:
                continue
            seen.add(child)
            queue.append(child)
            if child in first_order:
                result.append(child)
    return result


def upline_dfs(root, by_upline, first_order):
    stack = [root]
    seen = {root}
    result = []
    while stack:
        node = stack.pop()
        children = [child for _, child in by_upline.get(node, [])]
        for child in reversed(children):
            if child in seen:
                continue
            seen.add(child)
            stack.append(child)
            if child in first_order:
                result.append(child)
    return result


def direct_sponsor_then_sponsor_bfs(root, by_sponsor, first_order):
    direct = [child for child in by_sponsor.get(root, []) if child in first_order]
    rest = [child for child in sponsor_bfs(root, by_sponsor, first_order) if child not in direct]
    return direct + rest


def direct_sponsor_then_upline_bfs(root, by_sponsor, by_upline, first_order):
    direct = [child for child in by_sponsor.get(root, []) if child in first_order]
    rest = [child for child in upline_bfs(root, by_upline, first_order) if child not in direct]
    return direct + rest


def main():
    members = load_members()
    orders = load_orders()
    by_sponsor, by_upline = build_indices(members)
    first_order, first_order_date = build_order_maps(orders)

    candidates = {
        "sponsor_bfs": lambda root: sponsor_bfs(root, by_sponsor, first_order),
        "sponsor_bfs_invoice": lambda root: sponsor_bfs_invoice(root, by_sponsor, first_order),
        "upline_bfs": lambda root: upline_bfs(root, by_upline, first_order),
        "upline_dfs": lambda root: upline_dfs(root, by_upline, first_order),
        "direct_sponsor_then_sponsor_bfs": lambda root: direct_sponsor_then_sponsor_bfs(root, by_sponsor, first_order),
        "direct_sponsor_then_upline_bfs": lambda root: direct_sponsor_then_upline_bfs(root, by_sponsor, by_upline, first_order),
    }

    payload = {}
    for member_id, expected in TARGETS.items():
        member_payload = {
            "expected": expected,
            "expectedOrders": [
                {
                    "memberId": child,
                    "invoiceNo": first_order.get(child),
                    "invoiceDate": first_order_date.get(child),
                }
                for child in expected
            ],
            "candidates": {},
        }
        for name, fn in candidates.items():
            sequence = fn(member_id)[:12]
            member_payload["candidates"][name] = [
                {
                    "memberId": child,
                    "invoiceNo": first_order.get(child),
                    "invoiceDate": first_order_date.get(child),
                }
                for child in sequence
            ]
        payload[member_id] = member_payload

    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
