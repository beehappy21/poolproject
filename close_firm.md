# Close Firm

สรุปผลตรวจสำหรับการ "ปิดการแสดงผล Firm" แบบลดความเสี่ยงต่อระบบอื่น ทั้งฝั่ง WAP และ BAO

## เป้าหมาย

- ซ่อนหรือปิดการแสดงผลที่เกี่ยวกับ `Firm`
- ยังไม่ลบ business logic, schema, wallet flow, order flow หรือ setting ที่อาจมี dependency อยู่
- ทำเป็น `hide UI only` ก่อน เพื่อไม่กระทบงานส่วนอื่น

## สถานะปัจจุบัน

ตอนนี้ระบบยังมี `Firm` อยู่หลายชั้น:

- WAP มี route และ screen ของ `Firm`
- BAO ยังแสดง `Firm balance` ใน member detail
- BAO ยังมี label `Firm` ใน transaction display บางหน้า
- backend/order/product/settings ยังมี logic ของ `Firm` จริง ไม่ควรลบหรือปิดทันทีโดยไม่แยกผลกระทบ

## แนวทางที่ปลอดภัย

### เฟส 1: Hide UI Only

ทำได้ค่อนข้างปลอดภัย และเหมาะกับงานรอบแรก

- ปิด WAP route/page `Firm`
- ปิดลิงก์หรือ navigation ที่พาไปหน้า `Firm`
- ซ่อน `Firm balance` ใน BAO member detail
- ซ่อน label `Firm` ใน BAO transaction/admin list เฉพาะส่วนที่เป็น display

### เฟส 2: Review Admin Workflow

ยังไม่ควรทำทันที ต้องเช็กก่อนว่ามีใครใช้งานอยู่หรือไม่

- `firm_wallet` ใน BAO order create
- Firm catalog / product config
- Commission settings ที่มี `Auto Order Firm Amount`

### เฟส 3: Deep Disable

ทำเฉพาะเมื่อยืนยันแล้วว่าไม่ใช้ฟังก์ชัน Firm จริงทั้งระบบ

- ปิด payment channel ที่เกี่ยวกับ Firm
- ปิด product/category/settings ของ Firm
- ปิด backend logic ที่สร้าง/หัก/ใช้ Firm

## จุดที่ตรวจเจอ

## WAP

### ปิดได้ค่อนข้างปลอดภัย

- `stephub/src/screens/Commission.tsx`
  - การ์ด `Firm` บนหน้า Commission ควรถูกซ่อน
  - ยังมีการอ่านค่า `firmBalance` เพื่อคำนวณแสดงผลบางส่วนได้ แต่ถ้าไม่แสดงหน้า UI ก็ยังไม่จำเป็นต้องลบทันที

- `stephub/src/navigation/StackNavigator.tsx`
  - ยังมี route `Firm`

- `stephub/src/screens/index.tsx`
  - ยัง export `Firm`

- `stephub/src/screens/Firm.tsx`
  - เป็นหน้าจอ Firm โดยตรง

### ข้อเสนอสำหรับ WAP

- ลบ route `Firm` ออกจาก navigator
- ลบการ export/import `Firm` ถ้าไม่มีหน้าจออื่นอ้างถึงแล้ว
- เก็บ backend response field เช่น `firmBalance` ไว้ก่อน ถ้ายังไม่แน่ใจว่าหน้าอื่นใช้หรือไม่

## BAO

### ปิดได้ค่อนข้างปลอดภัย

- `backend/app/Orchid/Screens/Member/MemberEditScreen.php`
  - ซ่อน `Firm balance`

- `backend/app/Orchid/Screens/Wallet/WalletTransactionListScreen.php`
  - ถ้ามีเฉพาะ display label `FIRM => Firm` สามารถซ่อนใน UI ได้
  - ถ้ายังต้องการเก็บข้อมูล transaction ไว้ ไม่ควรลบ bucket logic

### จุดเสี่ยง ถ้ายังไม่ยืนยันไม่ควรปิดทันที

- `backend/app/Orchid/Screens/Order/OrderCreateScreen.php`
  - มี `firm_wallet` เป็น payment channel
  - ถ้าซ่อนหรือเอาออก อาจกระทบการสร้างออเดอร์หรือ workflow ภายใน

- `backend/resources/views/commission/settings.blade.php`
  - มี `Auto Order Firm Amount`
  - ถ้าปิดโดยไม่เช็ก matrix/auto order logic อาจทำให้ config ฝั่งคอมมิชชั่นไม่ครบ

- `backend/resources/views/product/edit-form.blade.php`
- `backend/app/Orchid/Screens/Product/ProductEditScreen.php`
- `backend/app/Orchid/Screens/Category/CategoryEditScreen.php`
- `backend/app/Orchid/Screens/Category/CategoryListScreen.php`
- `backend/app/Orchid/Screens/ProductFamily/ProductFamilyEditScreen.php`
  - ทั้งชุดนี้เกี่ยวกับ Firm catalog และกติกาสินค้า
  - ไม่ควรปิดรวดเดียวถ้ายังไม่ได้เช็กผลกระทบ

## แผนทำงานที่แนะนำ

### รอบแรก

- ปิด WAP `Firm` route และหน้า `Firm`
- ซ่อน `Firm balance` ใน BAO member detail
- ซ่อน `Firm` จาก display-only list ที่ไม่กระทบ logic

### รอบสอง

- ตรวจว่ามี admin ใช้ `firm_wallet` หรือ Firm catalog อยู่หรือไม่
- ถ้าไม่ใช้แล้ว ค่อยปิด UI ส่วน order/product/settings เพิ่ม

### รอบสุดท้าย

- ค่อยตัด logic หรือ config ที่เกี่ยวกับ Firm เมื่อยืนยัน dependency ครบ

## ข้อควรระวัง

- อย่าลบ field `firmBalance` จาก API หรือ model ทันที
- อย่าเอา `firm_wallet` ออกจาก validation/flow โดยไม่ตรวจ order workflow ก่อน
- อย่าปิดหน้า settings ของ Firm ถ้ายังมี auto order หรือ matrix logic อ้างถึงค่าเดิม

## สรุป

ถ้าต้องการ "ปิดการแสดงผลก่อน" แบบปลอดภัย:

1. ปิด WAP route/page `Firm`
2. ซ่อน BAO `Firm balance`
3. ซ่อน display label ที่เกี่ยวกับ `Firm`

ส่วน flow ลึกของ order, settings, product และ wallet logic ควรแยกเป็นงานเฟสถัดไป
