# Handoff Next

Updated: 2026-04-02

## Current Status

- งาน `LINE / LIFF / signup-share / 1 LINE = 1 account` ถูก merge เข้า `main` แล้ว
- BAO หน้า `Commission > Signup Share` บันทึกค่าได้จริงแล้ว
- ระบบแยกข้อความออกเป็น 2 ส่วนแล้ว:
  - `ข้อความแนบลิงก์สมัคร`
  - `ข้อความหลังสมัครสำเร็จ`
- PR `#96` merge แล้ว:
  - BAO `App Commission Menu Visibility` save ได้
  - public matrix lookup รองรับ `memberCode`
  - WAP `Commission` ใช้ `memberCode` เป็นหลักก่อน fallback ไป `memberId`
- PR `#97` merge แล้ว:
  - แก้ local API order creation ที่ล้มใน `generateNextOrderNo`
  - `POST /orders` และ `POST /auth/orders` สร้าง order ได้แล้ว
- PR `#98` merge แล้ว:
  - เมื่อ `order approved` แล้ว commission ที่ eligible จะถูก process/pay ทันที
  - ไม่ต้องมี approval step แยกสำหรับ cashback/direct ใน flow ปกติ
- PR `#99` merge แล้ว:
  - แก้ receivable cycle resolution
  - order ใหม่หลัง patch ไม่ควร fallback ผิดเป็น `no_receivable_cycle`
  - `TH0000013` รับ cashback/direct เป็น `approved` และ post เข้า wallet ได้แล้วเมื่อเข้าเงื่อนไขจริง

## Verified Behavior

- local API, BAO, WAP ใช้งานต่อได้สำหรับ flow ทดสอบคอมมิชชั่น
- `POST /auth/orders` และ `POST /orders` สร้าง order ได้จริงแล้ว ไม่เจอ 500 `Failed to deserialize column of type 'void'`
- `approve order` ครั้งเดียวสามารถพา flow ไปถึง commission posting ได้
- `GET /auth/commissions` และ wallet transaction ควรเห็น cashback/direct หลัง approve ทันทีถ้าเข้าเงื่อนไข
- public matrix by-code route ใช้งานได้:
  - `GET /matrix/member/by-code/:memberCode`
- smoke scripts ที่มีแล้ว:
  - `npm run smoke:matrix:by-code`
  - `npm run smoke:orders:create`
  - `npm run smoke:orders:approve-commission`

## Repo State

- current branch: `fix/local-order-creation`
- ล่าสุดมี commit สำคัญบน branch นี้:
  - `65dd5dce` `Fix approved commission receivable cycle resolution`
  - `c5bffad0` `Pay eligible commissions on order approval`
  - `26a669ca` `Fix local order creation advisory lock query`
- local changes/untracked ที่ยังค้างและยังไม่ได้ commit:
  - [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md)
  - [matrix-sandbox-legacy.js](/Users/macbook/poolproject/scripts/matrix-sandbox-legacy.js)
  - [run_local_api.sh](/Users/macbook/poolproject/scripts/run_local_api.sh)
  - [run_local_stephub_app.sh](/Users/macbook/poolproject/scripts/run_local_stephub_app.sh)
  - [Commission.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Commission.tsx)
  - `allsaletes.xlsx`
  - `allsaletest02042026.xlsx`
  - `scripts/build_allsaletest02042026_daily_report.py`
  - `scripts/replay_allsaletest_by_day_with_global_auto.py`
  - `scripts/runtime_reentry_checkpoint_runner.js`
  - `testcommission001.md`

## Open Work

- หน้า WAP `Commission` ส่วน Matrix ยังมีงานค้างใน [Commission.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Commission.tsx)
- เป้าหมายของงานค้างนี้คือให้ UI แสดงตาม `boardWidth / boardDepth` จริงจาก API
- ตอนนี้ source ถูกแก้ให้เลิกบังคับขั้นต่ำ 3 ชั้นแล้ว แต่ไฟล์ยังไม่ถูก commit/merge
- ค่า API ที่ใช้ verify ล่าสุดสำหรับ `TH0000013` คือ:
  - `boardWidth = 2`
  - `boardDepth = 2`
  - `board 1 = completed`
  - `board 2 = open`
  - `board 3 = locked`

## Next Session

ลำดับแนะนำสำหรับรอบถัดไป:

1. ปิดงาน Matrix UI ใน WAP ให้ยืนยันหน้าแสดง `2x2` จริง ไม่ใช่ `2x3`
2. ถ้าหน้า browser ยังเห็นค่าเก่า ให้เช็ก bundle/cache และ verify ที่ `3002` อีกครั้ง
3. ถ้าจะ deploy/merge ต่อ ให้ commit เฉพาะ [Commission.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Commission.tsx) โดยไม่พาไฟล์ทดสอบอื่นเข้าไป
4. หลังจากนั้นค่อยกลับไปเก็บ UAT checklist ของ `signup-share` ถ้ายังต้องการ evidence เพิ่ม:
   - [2026-04-02-bao-wap-signup-share-uat-checklist.md](/Users/macbook/poolproject/docs/uat/2026-04-02-bao-wap-signup-share-uat-checklist.md)
