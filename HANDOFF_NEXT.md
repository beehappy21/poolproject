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
- commit `4a7fb761`
  - สร้าง `reentry audit order` อัตโนมัติจาก matrix reentry event
  - กันการสร้างซ้ำด้วย `approvalBatchRef` marker
- commit `e3ca0b12`
  - เปิดให้ API / user UI / admin UI มองเห็น `reentry audit order`
  - เพิ่ม filter `sourceType` และ badge `REENTRY`
- commit `891577a7`
  - ล็อก policy ว่า `matrix reentry audit order` ห้าม cancel
- working tree (ยังไม่ commit ณ เวลา handoff นี้)
  - เพิ่ม `Order.orderSourceType` ใน Prisma schema
  - ย้าย repository/query หลักไปใช้ field จริง
  - คง legacy fallback ผ่าน `approvalBatchRef` ไว้ชั่วคราวเพื่อรองรับข้อมูลระหว่างช่วงเปลี่ยนผ่าน

## Verified Runtime State

- WAP `Commission` แสดง matrix `2x2` ได้จริงแล้ว
- login/reset password ของ `TH0000013` ใช้งานได้แล้ว
- local runtime proof สำหรับ reentry ผ่านแล้ว:
  - สร้าง order ทดสอบ `0000018` ให้ `TH0000016`
  - หลัง approve order ระบบ matrix วิ่งต่อและเปิด `TH0000013` เป็น `board 1 / round 2`
  - `currentBoardNo/currentBoardRoundNo` ของ `TH0000013` กลายเป็น `1 / 2`
  - `firmBalance` ของ `TH0000013` กลายเป็น `700`
- ระบบสร้าง `reentry audit order` ให้เห็นใน production flow แล้ว
  - event `86` ของ `TH0000013` สร้าง order `0000019`
  - API ส่ง `orderSourceType = matrix_reentry`
  - user/admin UI เห็น source และแยกจาก normal order ได้
- policy `no cancel` ผ่านการพิสูจน์แล้ว
  - `POST /orders/:id/cancel` สำหรับ reentry audit order ตอบ `400`
  - message คือ `Matrix reentry audit orders cannot be cancelled.`
- schema-level source type ใช้งานได้กับ reentry order ที่สร้างใหม่แล้ว
  - `orderId = 47` (`0000020`) ถูกอ่านเป็น `matrix_reentry` ผ่านทั้ง list และ snapshot
  - query `GET /orders?...&sourceType=matrix_reentry` คืนค่าได้ตามคาด
- local DB backfill ของ rows เก่าผ่านแล้ว
  - query `approvalBatchRef LIKE 'matrix-reentry:%' AND orderSourceType = NORMAL` คืน `0`
  - `orderId = 46` (`0000019`) ถูกอ่านเป็น `matrix_reentry` ผ่าน API แล้ว

## Important Findings

- ปุ่ม `REENTRY` ใน WAP ไม่ใช่ business switch ของระบบ
  - มันเป็นแค่ UI/local state helper
  - ไม่ได้เป็นตัวสั่ง backend เปิดรอบใหม่หรือสร้าง bill
- backend matrix runtime ตอนนี้ “เปิด reentry round ได้จริงแล้ว”
  - ผ่าน `MatrixAccumulationEvent` แบบ `REENTRY`
  - ผ่านการเปิด `board 1 / round ถัดไป`
  - ผ่านการ credit `firm wallet`
- runtime production ตอนนี้ “มี” auto/generated reentry bill แล้ว แต่ยังอยู่ในรูป `audit order`
  - source-of-truth ของประเภท order กำลังถูกย้ายไป field `Order.orderSourceType`
  - จึงเหมาะเป็น audit / visibility artifact มากกว่า commercial order ปกติ
  - marker ยังมีประโยชน์สำหรับ dedupe กับ trace back ไปที่ `matrixEventId`

## Current Gap

- ช่องว่างหลักตอนนี้ไม่ใช่เรื่อง reentry visibility แล้ว
- สิ่งที่ยังควรปิดต่อ:
  - ตัดสินใจระยะยาวว่า `approvalBatchRef` จะคงไว้เพื่อ dedupe อย่างเดียวหรือไม่
  - เมื่อมั่นใจเรื่องข้อมูลครบทุก environment แล้ว ค่อยพิจารณาลด legacy fallback ในโค้ด

## Recommended Next Work

1. รอ stabilize แล้วค่อยลด legacy fallback
- ตอนนี้ local runtime และ local DB ผ่านแล้ว
- เมื่อ environment อื่นถูก backfill ครบ ค่อยถอด dependence จาก marker เก่า

2. คง `approvalBatchRef` ไว้เฉพาะงาน dedupe / trace
- ใช้ผูกกับ `matrixEventId`
- ไม่ใช้เป็น source-of-truth ของประเภท order อีก

3. ถ้าจะยกระดับ audit ต่อ
- เพิ่มหน้า detail ให้เห็น `sourceBoardId`, `roundNo`, `matrixEventId`
- รวม firm posting / matrix event / audit order ไว้ในมุมมองเดียว

## Notes

- ระหว่างพิสูจน์ fix ได้สร้าง order ทดสอบ local เพิ่ม 1 ใบ:
  - `orderNo = 0000018`
  - member `TH0000016`
- working tree ตอนนี้ยังมีไฟล์ local/test ที่ยังไม่ได้ commit แยกจาก fix หลัก เช่น
  - `scripts/matrix-sandbox-legacy.js`
  - `scripts/run_local_api.sh`
  - `scripts/run_local_stephub_app.sh`
  - `testcommission001.md`
