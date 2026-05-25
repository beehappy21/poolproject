# BAO + WAP Runtime Audit

Date: 2026-04-03

## Status Rules

- `Openable`: route หรือหน้าจอเปิดได้
- `Action-backed`: มี form หรือ client action ที่ยิง controller/API จริง
- `Confirmed usable`: มีหลักฐาน `submit -> persist/read-back` แล้ว
- `Needs validation`: มี route และ action แล้ว แต่รอบนี้ยังไม่ได้พิสูจน์ read-back
- `Misleading UI`: หน้าเปิดได้แต่ wording หรือ layout ทำให้เข้าใจว่าใช้งานได้ครบทั้งที่ยังไม่ควรนับ confirmed

ห้ามใช้คำว่า `ใช้งานได้จริง` ถ้ายังไม่ได้ตรวจครบ 4 ข้อ:

1. เปิดหน้าได้
2. มี action route หรือ API จริง
3. submit แล้วข้อมูลถูก persist
4. refresh หรือ read-back แล้วค่าเดิมยังอยู่

## BAO

| Area | Route / Menu | Action-backed | Persist / Read-back | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Commission report | `platform.commission.report*` | Yes | Read-back from report queries/export | Confirmed usable | Active BAO commission surface now only exposes overview, direct, team, matching, and pool reports |
| Manual payment | `platform.commission.manualPayment` | Yes | Writes account/promptpay/QR into runtime settings | Confirmed usable | Existing save controller and runtime read-back are in place |
| Signup share | `platform.commission.signupShare` | Yes | Writes share messages into runtime settings | Confirmed usable | Previously UAT-covered and runtime-backed |
| LINE status | `platform.line.status` | Yes | Read-back comes from live route/env probes | Confirmed usable | Operator probe page, not a config writer |
| Delivered orders | `platform.order.delivered` | Yes | Existing order state read-back | Confirmed usable | Exposed in BAO menu now |
| Wallet top-up requests | `platform.wallet.topup.*` | Yes | Previously smoke-tested | Confirmed usable | Admin approve/reject flow is runtime-backed |
| KYC requests | `platform.kyc.*` | Yes | Previously smoke-tested through business API | Confirmed usable | Admin approve/reject now goes through central API |
| Withdrawals | `platform.withdraw.*` | Yes | Previously smoke-tested through business API | Confirmed usable | Approve/reject/paid now goes through central API |
| Marketing pages | banner, review, audience, promotion, slide | Unknown | Unknown | Openable only | Routes exist but this audit did not prove submit/read-back |

## WAP

| Area | Screen | Action-backed | Persist / Read-back | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Commission | `/Commission` | Yes | Reads dashboard/commission/matrix and can post CW->SW + reentry | Confirmed usable | `Commission.tsx` |
| Topup wallet | `/TopupWallet` | Yes | Sends wallet top-up request and reloads page data | Confirmed usable | `TopupWallet.tsx` |
| Withdraw SW | `/WithdrawSW` | Yes | Sends withdraw request; UI appends local pending item | Needs validation | API write exists, but this audit did not verify server read-back end-to-end |
| Transfer SW | `/TransferSW` | Yes | Posts transfer and updates displayed balance locally | Needs validation | API write exists, but this audit did not verify refreshed server-side balance |
| KYC | `/Kyc` | Yes | Sends KYC request and reloads requests | Confirmed usable | `Kyc.tsx` |
| Checkout | `/Checkout` | Yes | Creates order and navigates with returned payload | Confirmed usable | `Checkout.tsx` |
| Order history | `/OrderHistory` | Yes | Sends transfer slip and reloads orders | Confirmed usable | `OrderHistory.tsx` |
| Edit profile | `/EditProfile` | Yes | Saves profile and updates local session state | Needs validation | API write exists; this audit did not verify fresh read-back from server |
| Firm | `/Firm` | Read-only in this audit | No write tested | Openable only | Wallet/history read flow present, but no write flow proven in this audit |
| LINE LIFF sign-in | `/line/liff/signin` | Yes | Posts LINE login/binding and reads signup-share/dashboard | Confirmed usable | `LineLiffSignIn.tsx` |

## Required Smoke Pattern

Use this same pattern for every future BAO/WAP audit:

1. Open the page and confirm route loads normally
2. Identify the exact form action or API endpoint
3. Submit a safe test change or request
4. Refresh or re-fetch to prove the value or record came back from the server
5. Record the result using one of the statuses above

## Current Gap

- BAO remote domain still needs deploy for the root commission settings page fix
- Some WAP write flows currently update local UI immediately after a successful POST; these should still be validated with a fresh server read-back before marking them fully confirmed
