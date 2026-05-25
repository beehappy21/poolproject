# BAO Local Product Promotion Checklist

อัปเดตล่าสุด: 2026-05-21

## ขอบเขตงาน

เป้าหมายของงานนี้คือเพิ่มเมนูโปรโมชั่นสำหรับ BAO local, ให้สินค้าในหมวดสินค้าเลือกโปรโมชั่นผ่าน dropdown ได้, และทำให้โปรโมชั่น "ซื้อ 2 ชิ้นขึ้นไป คิดชิ้นละ 500 บาท / 100 PV" ถูกนำไปใช้จริงตอนสร้างออเดอร์

## Checklist

- [x] สำรวจโครงสร้างระบบที่เกี่ยวข้องกับ BAO local, ProductDetail, Promotions, และ order creation
- [x] สร้าง/ขยายโครงสร้างข้อมูลโปรโมชั่น
- [x] เพิ่มฟิลด์โปรโมชั่นใน ProductDetail เพื่อให้ backend order ใช้คำนวณได้จริง
- [x] ปรับหน้าเมนู Promotions ให้ตั้งค่าเงื่อนไขโปรโมชั่นได้
- [x] เพิ่ม dropdown เลือกโปรโมชั่นในหน้าสินค้า
- [x] ทำ logic sync ข้อมูลโปรโมชั่นจาก BAO local ไปยัง ProductDetail
- [x] ปรับ BAO local order screen ให้แสดงข้อมูลโปรโมชั่นและคำนวณ subtotal ให้ตรงกับ rule
- [x] ปรับ API order creation ให้ใช้ราคา/PV โปรโมชั่นเมื่อจำนวนถึงเงื่อนไข
- [x] ทดสอบ flow หลักและอัปเดตเอกสารปิดงาน

## บันทึกความคืบหน้า

- 2026-05-21: ตรวจสอบ flow แล้วพบว่า BAO local สร้าง order ผ่าน API `/orders` โดยส่ง `productDetailId` และ `quantity` ดังนั้นต้องแก้ทั้งฝั่ง Laravel admin และ NestJS order engine พร้อมกัน
- 2026-05-21: ยืนยันว่า Laravel ฝั่ง BAO local มี migration ที่แก้ `poolproject.ProductDetail` โดยตรงอยู่แล้ว จึงรองรับการเพิ่มคอลัมน์โปรโมชั่นในฐานข้อมูลหลักได้
- 2026-05-21: เพิ่ม migration สำหรับขยายตาราง `promotions` และเพิ่ม promotion snapshot fields ใน `poolproject.ProductDetail`
- 2026-05-21: ปรับหน้า `Promotions` ให้ตั้งค่า code, minimum quantity, promo unit price, promo PV, และ status ได้ พร้อม sync ไปยัง ProductDetail ที่ผูกอยู่
- 2026-05-21: เพิ่ม dropdown โปรโมชั่นในหน้า SKU / Product Detail และเติม promotion summary ให้เปลี่ยนตามตัวเลือก
- 2026-05-21: ปรับ BAO local order screen และ API order repository ให้ใช้ราคา/PV โปรโมชั่นเมื่อจำนวนสินค้าถึงขั้นต่ำที่กำหนด
- 2026-05-21: ตรวจ `php -l` ผ่านสำหรับ model, screen, และ migration ที่แก้ในฝั่ง Laravel
- 2026-05-21: ลอง `npx tsc -p tsconfig.json --noEmit` แล้วพบว่า repo มี TypeScript errors เดิมจำนวนมากจากไฟล์ archived/deploy/tmp ที่ไม่เกี่ยวกับงานนี้ ทำให้ยังไม่ได้ผล compile clean ทั้ง repo
- 2026-05-21: รัน `php artisan migrate --force` ใน BAO backend สำเร็จสำหรับ promotion migrations ทั้ง 2 ตัว
- 2026-05-21: รัน `npm run prisma:generate`, `tsc --noEmit -p apps/api/tsconfig.app.json`, และ `nest build api` ผ่าน หลังแก้ nullable narrowing ใน `orders.repository.ts`
- 2026-05-21: restart local stack แล้วทดสอบ order flow จริงด้วยสินค้า `COMMTEST650` โดยใส่ promotion snapshot ชั่วคราวที่ `min qty = 2`, `price = 500`, `PV = 100`
- 2026-05-21: ผลทดสอบจริง:
  - ออเดอร์ 1 ชิ้น ได้ `totalUsdt = 650`, `totalPv = 100` ใช้ราคาปกติ
  - ออเดอร์ 2 ชิ้น ได้ `totalUsdt = 1000`, `totalPv = 200` ใช้ราคาโปรโมชั่น `500/ชิ้น`
  - หลังจบทดสอบ revert promotion snapshot ชั่วคราวออกจาก `ProductDetail` แล้ว
  - test orders ที่ถูกสร้างระหว่างการยืนยัน flow คือ `0000003` และ `0000004`

## Reusable Smoke

- local non-destructive smoke:
  - `npm run dev:check`
  - `npm run smoke:bao:promotion`
- ค่า default ของ smoke นี้ใช้:
  - product code `COMMTEST650`
  - BAO internal token `local-bao-internal-token-20260508`
  - user id `2`
  - promotion rule `min qty = 2`, `price = 500`, `PV = 100`
- สามารถ override ได้ผ่าน env:
  - `BAO_PROMO_SMOKE_PRODUCT_CODE`
  - `BAO_PROMO_SMOKE_USER_ID`
  - `BAO_PROMO_SMOKE_PROMOTION_NAME`
  - `BAO_PROMO_SMOKE_PROMOTION_MIN_QTY`
  - `BAO_PROMO_SMOKE_PROMOTION_UNIT_PRICE`
  - `BAO_PROMO_SMOKE_PROMOTION_UNIT_PV`
  - `INTERNAL_BAO_TOKEN`

## UAT Manual Flow

1. เปิด `https://bao.blifehealthy.com/admin/product/edit/<id>`
2. ยืนยันว่า `Supplier`, `Category`, `Product family code`, และ `Product family name` เลือกจาก dropdown ได้จริง
3. เลือก `Promotion` แล้วดูว่า summary field อัปเดตตามค่า promotion ที่เลือก
4. กด `Update` แล้วเปิดหน้าเดิมซ้ำเพื่อเช็กว่าค่าถูกบันทึก
5. เปิด `https://bao.blifehealthy.com/admin/order/create-member-sale`
6. เลือกสินค้าที่ผูก promotion และลองจำนวน `1`
7. ยืนยันว่าราคาและ PV ยังเป็นค่าปกติ
8. เปลี่ยนจำนวนเป็น `2` หรือค่าที่ถึง threshold
9. ยืนยันว่า line total, subtotal, และ PV รวม เปลี่ยนเป็นค่า promotion
10. ถ้าจะ sign off ให้สร้าง test order ต่ำกว่า threshold 1 รายการ และถึง threshold 1 รายการ แล้วตรวจ `totalUsdt` กับ `totalPv` ใน order detail ให้ตรงกับที่หน้า create order แสดง
