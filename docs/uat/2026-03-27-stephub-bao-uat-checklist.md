# Stephub BAO UAT Checklist

Date: 2026-03-27

Scope:
- BAO Create Member Sale
- Multi-member / multi-product batch sale flow
- Commission Settings history

Preflight status:
- Latest local code checkpoints:
  - `14c77862` merged BAO Create Member Sale work
  - `b00e38b4` adds commission settings history
- Runtime backups saved under:
  - `/Users/macbook/poolproject/preflight-backups/2026-03-27-real-test`

## Environment

Before UAT starts:
- Confirm Postgres is listening on `:5432`
- Start API on `:3000`
- Start BAO on `:8001`
- Use one stable local dataset for the whole round
- Do not change runtime config manually outside BAO during this UAT round

Suggested bring-up:
```bash
docker compose up -d postgres
node dist/apps/api/apps/api/src/main.js
bash scripts/start_bao_server.sh
```

## Test Accounts

Admin:
- BAO URL: `http://127.0.0.1:8001/admin/login`
- Preferred admin email: `superadmin@blifehealthy.com`

Members:
- Use 2 existing members with valid member codes
- Use at least 2 active product details

## UAT Flows

### 1. Single-member sale with branch pickup

Steps:
- Open BAO `Create Member Sale`
- Select 1 member in `Single-member mode: member`
- Set `Fulfillment` to `Branch pickup`
- Fill pickup branch
- Add 1 or more products in `Single-member Order`
- Leave `Batch Orders` empty
- Save with workflow `Create + approve + process commissions`

Expected:
- One order is created
- Redirect opens order detail page
- Order status becomes `APPROVED`
- Commission processing completes without error
- Alert shows created order number

Record:
- Order ID:
- Order No:
- Result: Pass / Fail
- Notes:

### 2. Multi-member batch sale in one submit

Steps:
- Open BAO `Create Member Sale`
- Set `Fulfillment` to `Branch pickup`
- Fill pickup branch
- Leave single-member items unused or empty
- Add 3 batch rows:
  - member A + product 1
  - member A + product 2
  - member B + product 1
- Save with workflow `Create + approve + process commissions`

Expected:
- Batch mode takes priority over single-member items
- System creates 2 orders total:
  - 1 order for member A
  - 1 order for member B
- Redirect lands on order list
- Both orders become `APPROVED`
- Both orders are processed successfully

Record:
- Order IDs:
- Order Nos:
- Result: Pass / Fail
- Notes:

### 3. Delivery guardrail for multi-member

Steps:
- Open BAO `Create Member Sale`
- Set `Fulfillment` to `Delivery`
- Add rows for more than 1 member in `Batch Orders`
- Submit

Expected:
- Form blocks submit
- Error explains delivery supports one member per submission

Record:
- Result: Pass / Fail
- Notes:

### 4. Cash payment method options

Steps:
- Open BAO `Create Member Sale`
- Check `Cash payment method`

Expected:
- Options exist:
  - `Cash`
  - `Bank transfer`
  - `PromptPay QR`
- Default is `Cash`

Record:
- Result: Pass / Fail
- Notes:

### 5. Commission settings save and history

Steps:
- Open `Commission Setting`
- Open `Signup Share`
- Change message text
- Save
- Stay on same page or reload

Expected:
- Success status appears
- New history entry appears in `Settings History`
- Entry shows:
  - section label
  - saved timestamp
  - saved by admin
  - summary containing latest saved value

Record:
- Saved by:
- Saved at:
- Result: Pass / Fail
- Notes:

### 6. Matrix settings save and history

Steps:
- Open `Commission Setting > Matrix Bonus`
- Change one safe value such as `CW สำหรับ Reentry`
- Save

Expected:
- Save completes
- New history entry appears in Matrix page
- Entry summary reflects updated board or threshold data

Record:
- Changed field:
- Result: Pass / Fail
- Notes:

### 7. Manual payment save and history

Steps:
- Open `Commission Setting > Manual Payment`
- Change note or PromptPay number
- Save

Expected:
- Save completes
- New history entry appears in Manual Payment page
- Summary reflects latest bank / PromptPay / QR status

Record:
- Changed field:
- Result: Pass / Fail
- Notes:

## Data Verification

After batch sale flow:
- Verify order statuses in BAO
- Verify commission rows in Postgres if needed

Suggested queries:
```sql
select id, "orderNo", status, "approvalStatus", "approvedAt"
from "Order"
order by id desc
limit 10;
```

```sql
select "orderId", "commissionType", count(*)
from "CommissionLedger"
where "orderId" in (<order_id_1>, <order_id_2>)
group by "orderId", "commissionType"
order by "orderId", "commissionType";
```

Expected pattern from recent verified batch run:
- per order: `DIRECT = 1`
- per order: `UNI = 5`

## Exit Criteria

UAT can be called ready when:
- Single-member BAO sale passes
- Multi-member batch BAO sale passes
- Delivery guardrail blocks invalid batch delivery
- Payment method options display correctly
- Commission settings history is created and visible for at least:
  - Signup Share
  - Matrix
  - Manual Payment

## Rollback Notes

If runtime config needs to be restored after UAT, copy files back from:
- `/Users/macbook/poolproject/preflight-backups/2026-03-27-real-test/runtime`
