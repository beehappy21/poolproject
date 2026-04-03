# Live Operations Checklist

Updated: 2026-04-03

Use this checklist before starting real data entry and real day-to-day usage on the current local/runtime stack.

## Safety First

- [ ] Run `npm run dev:restart`
- [ ] Run `npm run dev:check`
- [ ] If using macOS auto-start, run `npm run dev:launchd:status`
- [ ] Confirm you are not using `DEV_RESET_BASELINE=1`
- [ ] Confirm you are not running smoke/reset scripts
- [ ] Create a fresh DB backup before starting

Dangerous commands to avoid unless intentionally resetting:

- `DEV_RESET_BASELINE=1 npm run dev:up`
- `DEV_RESET_BASELINE=1 npm run dev:restart`
- `ALLOW_DESTRUCTIVE_LOCAL_RESET=1 ...`
- `npm run smoke:local`
- `npm run smoke:wallet:mixed`
- `npm run smoke:wallet:dcw`
- `npm run smoke:pool:cap`
- `npm run smoke:pool:rules`
- `npm run smoke:pool:all-comm-e2e`
- `node scripts/reset_member003_member_baseline.mjs ... --apply`

## Admin Access

- [ ] BAO login works at `http://127.0.0.1:8001/admin/login`
- [ ] App works at `http://127.0.0.1:3002`
- [ ] API health works at `http://127.0.0.1:3000/health`
- [ ] Superadmin account is available
- [ ] Team roles/permissions are correct
- [ ] `Delivered Orders` appears in the BAO menu

## Members

- [ ] Member codes are correct
- [ ] Sponsor / upline relationships are correct
- [ ] Name, phone, and email are filled
- [ ] Default shipping address exists for members who need delivery
- [ ] Test member can log in to app successfully

## Catalog Setup

- [ ] Supplier list is correct
- [ ] Category list is correct
- [ ] Product family list is correct
- [ ] Product names and SKU codes are correct
- [ ] Product status is correct
- [ ] Product detail image is uploaded
- [ ] Home card image is uploaded
- [ ] All visible prices show as THB / บาท
- [ ] PV values are correct
- [ ] Stock quantity is set for each SKU that should be limited
- [ ] Leave stock empty only for items that should be unlimited

## Firm Catalog

- [ ] Only one `Firm Catalog` appears in app
- [ ] `Firm-to-DCW` products have only:
  - [ ] Firm amount paid
  - [ ] DCW amount received
- [ ] Regular products that should appear in firm catalog are enabled
- [ ] If cost is over 30%, admin override is intentionally enabled
- [ ] Firm redeem quantity limit is set where needed
- [ ] Products without firm limit rely on stock only

## Commission Setting

- [ ] Overview values are reviewed
- [ ] Direct Bonus settings are correct
- [ ] Unilevel Bonus settings are correct
- [ ] Matrix Bonus settings are correct
- [ ] Reentry Rules are correct
  - [ ] Reentry amount
  - [ ] Firm amount
  - [ ] PV amount
- [ ] Pool Bonus settings are correct
- [ ] Cash Back settings are correct
- [ ] Signup Share message is correct
- [ ] App Commission Menu Visibility is correct
- [ ] Commission types hidden from app are intentionally disabled from calculation

## Manual Payment

- [ ] Bank name is correct
- [ ] Account name is correct
- [ ] Account number is correct
- [ ] PromptPay name is correct
- [ ] PromptPay number is correct
- [ ] QR image is correct
- [ ] Payment note is correct

## Wallet

- [ ] Wallet top-up methods are correct
- [ ] Wallet top-up can be submitted
- [ ] Wallet top-up can be approved in BAO
- [ ] Approved top-up updates member wallet correctly
- [ ] Wallet history appears correctly in app and BAO

## Withdrawals

- [ ] Withdraw enabled/disabled state is correct
- [ ] Withholding tax rate is correct
- [ ] Fee amount is correct
- [ ] Minimum withdraw amount is correct
- [ ] Withdraw request can be submitted
- [ ] Withdraw request can be approved
- [ ] Mark paid flow works
- [ ] Net bank amount is correct
- [ ] BAO withdraw detail page opens without 500

## Orders

- [ ] `Create Member Sale` works with real member data
- [ ] Payment methods appear correctly:
  - [ ] เงินสด
  - [ ] เงินโอน
  - [ ] SW
  - [ ] FIRM
  - [ ] อื่นๆ
- [ ] Branch pickup flow works
- [ ] Delivery flow works with default member address
- [ ] Delivery flow works with changed/new address
- [ ] Order detail shows THB / บาท
- [ ] Approve order flow works
- [ ] Process approved order flow works
- [ ] `Delivered Orders` list opens and shows processed/delivered records
- [ ] Stock is reduced correctly after order creation
- [ ] Cancel order restores stock correctly
- [ ] Cancel order restores wallet balances correctly where applicable

## KYC

- [ ] KYC request can be submitted from app/API
- [ ] KYC request can be approved in BAO
- [ ] KYC request can be rejected in BAO with a reason
- [ ] BAO KYC detail page opens without 500
- [ ] Approved/rejected status matches API/DB state

## App Checks

- [ ] Home loads correctly
- [ ] Product detail loads correctly
- [ ] Cart totals show THB / บาท
- [ ] Checkout shows THB / บาท
- [ ] Order Successful shows THB / บาท
- [ ] Order History shows THB / บาท
- [ ] Commission dashboard loads correctly
- [ ] Transfer SW works
- [ ] Withdraw SW works
- [ ] Firm page works
- [ ] TopupWallet works

## Final Go-Live Dry Run

- [ ] Create one real-like member
- [ ] Create one real-like order
- [ ] Approve and process it
- [ ] Confirm stock movement
- [ ] Confirm wallet movement
- [ ] Confirm commission movement
- [ ] Confirm app order history display
- [ ] Confirm BAO reports display
- [ ] Run `npm run smoke:bao:withdraw-kyc`
- [ ] Confirm no unexpected reset happened after restart

## Notes

- Current runtime is configured to preserve DB state by default.
- Demo Stephub `10x5` catalog restore is disabled.
- Do not use destructive flags/scripts unless you intentionally want to reset data.
- `npm run smoke:bao:withdraw-kyc` covers `Delivered Orders`, `KYC approve/reject`, and `Withdraw approve + paid` on local BAO/API.
- If member-side withdraw submission fails with `Insufficient withdrawable balance.`, seed or create enough withdrawable balance first; BAO approve/paid flow still validates correctly once a request exists.
