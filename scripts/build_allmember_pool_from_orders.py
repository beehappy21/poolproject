#!/usr/bin/env python3

import json
import sys
from pathlib import Path

from build_allmember_order_helpers import (
    load_members,
    load_orders,
    normalize_thai_date,
)


def main() -> None:
    members_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("allmember.xlsx")
    orders_path = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else Path("runtime/allsale-user-supplied-orders.json")
    )
    output_path = (
        Path(sys.argv[3])
        if len(sys.argv) > 3
        else Path("runtime/allmember-pool-from-orders-scenario.json")
    )
    pool_rate_mode = (sys.argv[4] if len(sys.argv) > 4 else "default_50_percent").lower()
    custom_pool_rate = sys.argv[5] if len(sys.argv) > 5 else "0"
    pool_cap_multiple = sys.argv[6] if len(sys.argv) > 6 else "0"
    commission_cap_scope = (sys.argv[7] if len(sys.argv) > 7 else "pool_only").lower()
    commission_cap_multiple = sys.argv[8] if len(sys.argv) > 8 else "0"

    member_rows = load_members(members_path)
    member_ids = {row["memberId"] for row in member_rows}
    order_rows = load_orders(orders_path)

    matched_orders = [
        row
        for row in order_rows
        if row.get("memberId") in member_ids
        and row.get("status") == "อนุมัติ"
        and row.get("pv") == "700"
    ]
    matched_orders.sort(
        key=lambda row: (
            normalize_thai_date(row.get("invoiceDate")),
            row.get("invoiceNo", ""),
        )
    )

    members = [
        {
            "id": row["memberId"],
            "name": row["name"],
            "sponsorId": row["sponsorId"],
            "active": True,
            "earningCap": "99999999",
            "earnedToDate": "0",
            "meta": {
                "uplineId": row["uplineId"],
                "side": row["side"],
                "joinedDate": row["joinedDate"],
                "purchaseBase": "700",
                "poolCapMultiple": pool_cap_multiple,
                "commissionCapScope": commission_cap_scope,
                "commissionCapMultiple": commission_cap_multiple,
            },
        }
        for row in member_rows
    ]

    orders = [
        {
            "id": row["invoiceNo"],
            "buyerId": row["memberId"],
            "pv": row["pv"],
            "date": normalize_thai_date(row.get("invoiceDate")),
            "meta": {
                "invoiceDate": row.get("invoiceDate"),
                "billType": row.get("billType"),
                "status": row.get("status"),
                "poolRateMode": pool_rate_mode,
                "poolRate": custom_pool_rate,
            },
        }
        for row in matched_orders
    ]

    scenario = {
        "scenarioName": "allmember-pool-approved-700pv-orders",
        "settings": {
            "directLevelRates": [],
            "uniLevelRates": [],
            "poolRate": "0",
            "useConfigurablePoolRate": True,
        },
        "members": members,
        "orders": orders,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(scenario, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    distinct_order_members = sorted({row["memberId"] for row in matched_orders})
    summary = {
        "scenarioName": scenario["scenarioName"],
        "memberCount": len(members),
        "matchedOrderCount": len(orders),
        "poolRateMode": pool_rate_mode,
        "customPoolRate": custom_pool_rate,
        "poolCapMultiple": pool_cap_multiple,
        "commissionCapScope": commission_cap_scope,
        "commissionCapMultiple": commission_cap_multiple,
        "matchedOrderMemberCount": len(distinct_order_members),
        "matchedOrderMembers": distinct_order_members,
        "membersWithoutMatchedOrders": [
            row["memberId"] for row in member_rows if row["memberId"] not in distinct_order_members
        ],
        "membersPath": str(members_path),
        "ordersPath": str(orders_path),
        "outputPath": str(output_path),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
