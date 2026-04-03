# Handoff Next

Updated: 2026-04-03

## Current Focus

- โฟกัสปัจจุบันอยู่ที่ `poolproject` ฝั่ง commission + matrix runtime
- ประเด็นหลักรอบนี้คือยืนยัน flow `reentry` ให้ตรง business rule:
  - เมื่อ member ไปถึง `round 1 / board 2`
  - และมีสิทธิ์ reentry ตาม config
  - ระบบต้องเปิด `round 2 / board 1`
  - และจ่าย `firm` ตามที่ตั้งไว้

## What Was Fixed

- commit `c5bffad0`
  - ทำให้ order approval วิ่งต่อเข้า commission processing ทันที
- commit `65dd5dce`
  - แก้ source receivable cycle resolution ตอน approved order เพื่อไม่ให้ cashback/direct fallback ผิดเป็น `no_receivable_cycle`
- commit `0e3e6f96`
  - เพิ่ม flow `Forgot password` ของ WAP ให้ reset ด้วยรหัสสมาชิก แล้วตั้งรหัสผ่านเป็นเลข 6 หลักท้ายบัตรประชาชน
- commit `76fbdf6f`
  - แก้ WAP matrix render ให้ใช้ `boardDepth` จริง
  - ทำให้ปุ่ม `REENTRY` จำค่า `ON/OFF` ใน browser ได้
- commit `0765b164`
  - เพิ่ม logic re-check matrix reentry eligibility หลังมี payout/event ใหม่
  - แก้เคสที่ `board 1` จบไปก่อน แต่ member เพิ่งมีสิทธิ์ reentry ครบใน event ภายหลัง

## Verified Runtime State

- WAP `Commission` แสดง matrix `2x2` ได้จริงแล้ว
- login/reset password ของ `TH0000013` ใช้งานได้แล้ว
- local runtime proof สำหรับ reentry ผ่านแล้ว:
  - สร้าง order ทดสอบ `0000018` ให้ `TH0000016`
  - หลัง approve order ระบบ matrix วิ่งต่อและเปิด `TH0000013` เป็น `board 1 / round 2`
  - `currentBoardNo/currentBoardRoundNo` ของ `TH0000013` กลายเป็น `1 / 2`
  - `firmBalance` ของ `TH0000013` กลายเป็น `700`

## Important Findings

- ปุ่ม `REENTRY` ใน WAP ไม่ใช่ business switch ของระบบ
  - มันเป็นแค่ UI/local state helper
  - ไม่ได้เป็นตัวสั่ง backend เปิดรอบใหม่หรือสร้าง bill
- backend matrix runtime ตอนนี้ “เปิด reentry round ได้จริงแล้ว”
  - ผ่าน `MatrixAccumulationEvent` แบบ `REENTRY`
  - ผ่านการเปิด `board 1 / round ถัดไป`
  - ผ่านการ credit `firm wallet`
- แต่ runtime production ตอนนี้ยัง “ไม่มี” auto/generated reentry bill จริง
  - ไม่พบ `orderType = reentry` ใน Prisma `Order` schema
  - `OrdersController`, `OrdersService`, `OrdersRepository` ไม่มี input/flow สำหรับสร้าง order reentry อัตโนมัติ
  - สิ่งที่เรียกว่า generated/system reentry order ตอนนี้มีอยู่ในสคริปต์ replay/analysis เท่านั้น เช่น
    - `scripts/replay_allsaletest_by_day_with_global_auto.py`
  - สรุปคือ business event ของ reentry เกิดจริงใน matrix runtime แล้ว แต่ order/bill artifact ยังไม่ถูกสร้างใน production flow

## Current Gap

- ถ้า business ต้องการให้ “เปิด reentry แล้วต้องมีบิลอัตโนมัติ” ตอนนี้ยังไม่ครบ
- ช่องว่างที่ยังไม่มีใน runtime:
  - field หรือ type สำหรับบอกว่า order ใดเป็น `reentry`
  - service ที่สร้าง reentry order จาก matrix event
  - การผูกระหว่าง `matrix reentry event` กับ `order`
  - UI/BAO visibility ว่าบิลไหนเป็น normal order และบิลไหนเป็น auto reentry bill

## Recommended Next Work

1. ตัดสินใจให้ชัดก่อนว่า reentry bill ในระบบจริงต้องมีหรือไม่
- ถ้า “ไม่ต้องมี”
  - ให้ยึด matrix event + wallet movement เป็น source of truth
  - และอย่าใช้คำว่า bill/order ใน UI หรือ handoff เพื่อไม่ให้สับสน
- ถ้า “ต้องมี”
  - ต้องออกแบบ runtime เพิ่มจริง ไม่ใช่แค่ script replay

2. ถ้าต้องมี reentry bill ให้ทำเป็นก้อน backend แยก
- เพิ่ม discriminator ใน order เช่น `orderType` หรือ `sourceType`
- เพิ่ม service สำหรับสร้าง auto reentry order จาก matrix reentry event
- เก็บ link ระหว่าง reentry order กับ `reentrySourceBoardId` หรือ `matrixEventId`
- ตกลงสถานะของบิลว่าจะ auto-approve เลยหรือเป็นเพียง audit artifact

3. หลังจากนั้นค่อยต่อ BAO/WAP visibility
- list/filter ให้เห็น reentry orders แยกจาก normal orders
- snapshot/order detail ควรโชว์ว่า order นี้มาจาก matrix reentry
- ถ้าต้องการ audit ชัด ควรเห็น trigger member, source board, round, firm posting ในหน้าเดียว

## Notes

- ระหว่างพิสูจน์ fix ได้สร้าง order ทดสอบ local เพิ่ม 1 ใบ:
  - `orderNo = 0000018`
  - member `TH0000016`
- working tree ตอนนี้ยังมีไฟล์ local/test ที่ยังไม่ได้ commit แยกจาก fix หลัก เช่น
  - `scripts/matrix-sandbox-legacy.js`
  - `scripts/run_local_api.sh`
  - `scripts/run_local_stephub_app.sh`
  - `testcommission001.md`
