# Retest Runtime Reset Plan

เป้าหมายของ reset รอบนี้คือ:
- ล้างข้อมูลธุรกรรมเก่าเพื่อเริ่มทดสอบใหม่ทั้งระบบ
- เก็บ member master เดิมไว้สำหรับเทียบ legacy parity
- เก็บ product/package/settings master ไว้สำหรับสร้าง order ใหม่
- รีเซ็ต wallet/matrix/commission runtime ให้กลับสภาพเริ่มต้น

## KEEP

ตาราง/ข้อมูลที่เก็บไว้:
- `User`
- `MemberProfile`
- `MemberShippingAddress`
- `LineBinding`
- `Supplier`
- `ProductCategory`
- `Product`
- `ProductDetail`
- `Package`
- `PackageItem`
- settings/config master ที่เก็บนอกตาราง runtime

เหตุผล:
- ต้องเก็บชื่อสมาชิกและโครงสร้างสายงานเดิมไว้สำหรับ lane เทียบระบบเก่า
- ต้องเก็บ catalog/package master ไว้เพื่อสร้างออเดอร์ใหม่

## RESET

ตาราง/ข้อมูลที่ไม่ลบทิ้งทั้งตาราง แต่รีเซ็ตค่ารันไทม์:
- `Wallet`
  - `approvedBalance`
  - `heldBalance`
  - `withdrawableBalance`
  - `shoppingBalance`
  - `discountBalance`
  - `firmBalance`
  - `paidOutBalance`
  - `negativeOffsetBalance`
  - `payoutLockStatus`
  - `payoutLockReason`
- `User.matrixPersonalPv`

เหตุผล:
- ต้องคง wallet row และ user row ไว้ แต่เริ่มยอดใหม่จากศูนย์

## CLEAR

ตาราง/ข้อมูลที่ควรถูกล้างเพื่อเตรียม retest:
- `OrderItem`
- `Order`
- `CommissionLedger`
- `CompanyBonusLedger`
- `DailyPoolPayout`
- `DailyPoolEligibilitySnapshot`
- `DailyPoolCycle`
- `MatrixPayout`
- `MatrixPosition`
- `MatrixAccumulationEvent`
- `MatrixHoldbackAccount`
- `MatrixReorder`
- `MatrixBoard`
- `MatrixCycle`
- `PayoutBatchItem`
- `PayoutBatch`
- `PayoutHold`
- `ManualReviewCase`
- `WalletTransaction`
- `WalletTopupRequest`
- `WithdrawRequest`
- `MemberPackageCycle`
- `ProductReview`

เหตุผล:
- ทั้งหมดเป็น transactional/runtime artifacts ที่ทำให้ผลการทดสอบใหม่ปนกับข้อมูลเดิม

## คงไว้ก่อนในรอบนี้

ตารางที่ยังไม่แตะใน reset script ก้อนนี้:
- `KycRequest`
- `WalletBindingHistory`
- `MemberRiskFlag`

เหตุผล:
- มีโอกาสเป็นข้อมูลโปรไฟล์/กำกับดูแลที่ยังต้องเก็บสำหรับสมาชิกจริง
- ถ้าจะล้าง ต้องยืนยัน policy แยกอีกครั้ง

## ลำดับ reset ที่ปลอดภัย

1. สำรองข้อมูลก่อน
2. รัน dry-run เพื่อดู scope
3. รัน apply เฉพาะ local test DB
4. ตรวจ post-reset ว่า:
   - `Order = 0`
   - `CommissionLedger = 0`
   - `MatrixCycle = 0`
    - `WalletTransaction = 0`
   - wallet balances ทุก bucket เป็น `0`
5. เริ่ม smoke/UAT รอบใหม่

## Checklist หลัง reset ก่อนเริ่มออเดอร์แรก

1. ตรวจฐานข้อมูล
   - `Order = 0`
   - `OrderItem = 0`
   - `CommissionLedger = 0`
   - `DailyPoolCycle = 0`
   - `MatrixCycle = 0`
   - `MatrixBoard = 0`
   - `MatrixPosition = 0`
   - `MatrixPayout = 0`
   - `MatrixAccumulationEvent = 0`
   - `MatrixHoldbackAccount = 0`
   - `MatrixReorder = 0`
   - `WalletTransaction = 0`

2. ตรวจค่าที่ reset แต่ไม่ลบ row
   - `Wallet` ทุก bucket เป็น `0`
   - `Wallet.payoutLockStatus = UNLOCKED`
   - `Wallet.payoutLockReason = null`
   - `User.matrixPersonalPv = 0`

3. ตรวจ master data ที่ต้องยังอยู่
   - สมาชิกยัง login ได้
   - sponsor / upline / placement tree ยังครบ
   - สินค้าและ package ยังซื้อได้
   - commission settings / matrix settings / pool settings ยังเป็นค่าปัจจุบัน

4. ตรวจฝั่ง BAO
   - หน้า `Members` เปิดได้
   - คอลัมน์ `ชื่อธุรกิจ` ยังแสดงปกติ
   - คอลัมน์ `PV HOLD` ต้องเป็น `0.00` หลัง reset
   - หน้า create order เปิดได้และเลือก member / product ได้

5. ตรวจฝั่ง WAP
   - login สมาชิกได้
   - หน้า `Commission > Matrix` เปิดได้
   - `PV HOLD` ต้องเป็น `0.00` หลัง reset
   - board ต้องเริ่มจากสภาพว่างหรือยังไม่เกิด cycle ตามที่คาด

6. เริ่มออเดอร์แรก
   - สร้าง order แค่ 1 รายการ
   - อนุมัติ order
   - รอให้ runtime คำนวณจบ
   - ตรวจผลทีละส่วน: `direct -> matrix -> pool -> firm`
   - ค่อยสร้าง order ถัดไป

## คำสั่งที่เตรียมไว้

ดู scope แบบไม่แตะข้อมูล:

```bash
npm run reset:runtime:retest
```

ดู SQL ที่จะรัน:

```bash
npm run reset:runtime:retest -- --sql-only
```

รันจริง:

```bash
ALLOW_DESTRUCTIVE_LOCAL_RESET=1 npm run reset:runtime:retest -- --apply
```
