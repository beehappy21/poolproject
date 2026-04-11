Handoff Next

Updated: 2026-04-11 18:07:42 +07
Branch: `main`

Current Goal

Make member receipt download/open work reliably on WAP order history.

What Was Completed

- Added BAO printable receipt and delivery note support in admin/order detail.
- Added member receipt endpoint on API: `GET /auth/orders/:orderId/receipt`
- Added WAP receipt download button on order history.
- Deployed BAO, API, and WAP to UAT server `nc-user@202.94.169.245`.
- Verified UAT containers were healthy after deploy.
- Confirmed BAO container contains:
  - `resources/views/order/documents/receipt.blade.php`
  - `resources/views/order/documents/delivery-note.blade.php`
- Confirmed API container contains receipt endpoint build code:
  - `renderReceiptHtml(...)` exists in compiled `orders.controller.js`

What Was Found

- Order that user referred to as "13" is likely `orderNo = 0000013` in UAT.
- In UAT DB, `Order.orderNo = 0000013` is `APPROVED`.
- WAP originally checked `approvalStatus === 'approved'` in lowercase only.
- This caused button/approved-state logic to fail for uppercase statuses like `APPROVED`.
- Local fix was made in `stephub/.../src/screens/OrderHistory.tsx`:
  - normalize approval status
  - use `isOrderApproved(order)` across receipt/review/status logic
- Another local fix was made in `OrderHistory.tsx`:
  - open blank window synchronously on click before async receipt fetch
  - then navigate that window to blob URL after receipt response
  - this is to avoid popup blockers causing "click works but receipt does not display"

Important Current State

- Local file changed at handoff time:
  - `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/OrderHistory.tsx`
- WAP was rebuilt on UAT after the popup-handling fix and containers came back healthy.
- User still reported: button is visible, but receipt still did not display before this handoff request.

Most Likely Remaining Causes

1. Browser popup / blob navigation behavior is still inconsistent on user device.
2. API receipt endpoint is returning an error body / auth failure / forbidden in runtime for that member.
3. WAP is swallowing the API error and only showing generic failure, while user interprets as "not showing".
4. Receipt response HTML may be returned, but not presented correctly on the device/browser used.

Highest-Value Next Steps

1. Reproduce with the real member account on UAT and inspect `/auth/orders/:id/receipt` response.
2. Check API logs around receipt endpoint to see whether the response is `200`, `401`, `403`, or `404`.
3. If browser display still fails, replace blob-open flow with:
   - open a blank tab immediately
   - fetch receipt as text/html
   - write returned HTML directly into the opened tab
4. Verify owner check in API endpoint:
   - code compares `request.authUser.userId` to `order.sourceUserId`
   - this should be confirmed against the real runtime user for `0000013`

Useful UAT Commands

```bash
cd /home/nc-user/poolproject
docker compose -f deploy/compose/docker-compose.yml build wap
docker compose -f deploy/compose/docker-compose.yml up -d wap
docker ps --format 'table {{.Names}}\t{{.Status}}'
docker exec poolproject-uat-api-1 sh -lc "grep -n 'renderReceiptHtml' /app/dist/apps/api/packages/modules/orders/src/controllers/orders.controller.js | head -5"
docker exec poolproject-uat-bao-1 sh -lc "find /var/www/html/backend/resources/views/order -maxdepth 3 -type f | sort"
docker exec poolproject-uat-postgres-1 psql -U postgres -d poolproject -c 'select "id","orderNo","approvalStatus","status" from "Order" where "orderNo" = '\''0000013'\'';'
```

Files Most Relevant Next Time

- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/OrderHistory.tsx`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/config/index.tsx`
- `packages/modules/orders/src/controllers/orders.controller.ts`
