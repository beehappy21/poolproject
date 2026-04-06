# Commission Runtime Main

เอกสารนี้สรุปกติกา runtime หลักของระบบสำหรับการคำนวณ `direct`, `matrix`, `pool`, และรายได้ที่เกี่ยวข้องจาก order ที่ถูกอนุมัติแล้ว

## หลักการหลักของระบบ

1. การคำนวณรายได้เริ่มต้นจาก `order` ที่มีสถานะ `APPROVED` เท่านั้น
2. `PV` ของสินค้าและแพ็กเกจทุกตัวใน order ที่อนุมัติแล้ว ถูกนำไปคำนวณตามแผนการตลาดของระบบ
3. `PV` จาก order ที่อนุมัติแล้วจะถูกนำไปใช้คำนวณ `direct`, `matrix`, และ `pool` ตามกติกา runtime หลัก
4. `matrix` ใช้การสะสม `PV` ตาม threshold ของแผน โดย runtime ปัจจุบันใช้ threshold เปิดจุดที่ `500 PV`
5. การคำนวณคอมของ `direct`, `matrix`, และ `pool` ใช้ `PV` เป็นฐานคำนวณ ไม่ใช้ราคาสินค้าเป็นฐานคอม
6. `pool` นำ `PV` ของ order ที่อนุมัติแล้วเข้าระบบคำนวณทันที
7. สินค้า `FIRM` เมื่อสั่งซื้อแบบปกติและ order ถูกอนุมัติแล้ว จะได้รับ `Firm wallet` แบบ `1:1 บาท` ตามยอดที่กำหนด
8. `matrix auto order` ได้รับ `Firm wallet` ตามยอด auto order และอนุมัติทันทีตามกติกา
9. `PV` ที่ถูกใช้ใน `matrix` จะเข้าสู่การสะสมและถูกใช้ตามรหัส/รอบของระบบ ไม่ถูกนำกลับมาใช้ซ้ำในรหัสเดิม

## จุดเริ่มต้นของ flow

### 1. การสร้าง order

- สมาชิกหรือ admin สร้าง order ผ่านระบบ
- ระบบคำนวณ `lineTotalPv` และ `totalPv` จาก `pv` ของสินค้า/แพ็กเกจคูณจำนวน
- ถ้าจ่ายครบด้วย `SW` ระบบจะอนุมัติ order ทันที
- ถ้าเป็น `Firm auto order` ระบบจะอนุมัติทันที
- ถ้ายังไม่ครบ จะรอการอนุมัติจาก admin หรือขั้นตอนชำระเงินตาม flow ปกติ

### 2. เมื่อ order ถูกอนุมัติ

เมื่อ order มีสถานะ `APPROVED` ระบบจะเข้า approved-order runtime flow กลางทันที และเริ่มคำนวณรายได้ทั้งหมดจาก order นั้น

## ลำดับการคำนวณ runtime หลัก

### 1. โหลด approved order

ระบบโหลดข้อมูลหลักของ order:

- ผู้ซื้อ
- เวลาที่อนุมัติ
- `totalPv`
- รายการสินค้าใน order
- snapshot settings ของ commission และ matrix

### 2. เปิด cycle และตรวจ qualification

ระบบจะ:

- activate cycle ที่เกี่ยวข้องของสมาชิกผู้ซื้อ
- ประเมิน qualification ของสมาชิกและ cycle ที่ใช้รับรายได้

### 3. คำนวณ commission

ระบบคำนวณ commission จาก `totalPv` ของ approved order โดยแตกเป็น:

- `cashback`
- `direct`
- `unilevel`

การจ่ายขึ้นกับ:

- settings ของ commission
- สายแนะนำ
- qualification ของผู้รับ
- cap และ receivable cycle

### 4. คำนวณ matrix

ระบบนำ `PV` ของ approved order เข้าสู่ matrix runtime โดยมีหลักการดังนี้:

- ถ้ายังไม่ถึง threshold เปิดจุด ระบบจะสะสม PV ไว้ก่อน
- เมื่อสะสมถึง `500 PV` จะใช้ PV เพื่อเปิดจุดตามกติกาของแผน
- ถ้า order มี PV เกิน threshold เช่น `700 PV`
  ระบบจะใช้ `500 PV` เปิดจุด และเก็บ `200 PV` สะสมต่อ
- ถ้า order มี PV ต่ำกว่า threshold เช่น `350 PV`
  ระบบจะเก็บสะสมไว้จนกว่าจะครบ `500 PV`

## การวางจุดใน Matrix แบบละเอียดแยกตามเหตุการณ์

หัวข้อนี้อธิบายเฉพาะ “การได้จุด” และ “การขยับรอบ” ใน matrix runtime

### เหตุการณ์ 1: มี order ใหม่เข้ามาและ order ถูกอนุมัติ

เมื่อ order ถูก `APPROVED` ระบบจะนำ `PV` ของ order ใบนั้นเข้า matrix ของผู้ซื้อทันที

สิ่งที่ระบบทำ:

1. ตรวจว่ารหัสนี้มี cycle matrix ที่ active อยู่แล้วหรือไม่
2. ถ้ามี active cycle อยู่แล้ว ระบบจะเอา `PV` เข้า personal carry/accumulation ของ cycle นั้น
3. ถ้ายังไม่มี active cycle ระบบจะสะสม PV ไว้ที่ผู้ใช้ก่อน
4. ถ้า PV สะสมยังไม่ถึง `500 PV` ระบบยังไม่เปิดจุด
5. ถ้าสะสมถึงหรือเกิน `500 PV` ระบบจะเปิดจุดแรกตามกติกา matrix

### เหตุการณ์ 2: PV ยังไม่ครบ 500

กรณี order มี PV ไม่ถึง threshold เช่น `350 PV`

สิ่งที่เกิดขึ้น:

1. ระบบรับ `350 PV` เข้า matrix accumulation
2. ยังไม่เปิดจุด เพราะไม่ถึง `500 PV`
3. `350 PV` นี้จะถูกเก็บไว้เป็นยอดสะสม
4. เมื่อมี order ใหม่เข้ามาในอนาคต ระบบจะนำ PV ใหม่มารวมกับยอดสะสมเดิม

สรุป:

- ได้สิทธิ์สะสม
- ยังไม่ได้จุด
- ยังไม่เข้า board round ใหม่

### เหตุการณ์ 3: PV ครบ 500 พอดี

กรณีสะสมครบ `500 PV` พอดี

สิ่งที่เกิดขึ้น:

1. ระบบตัด `500 PV` ไปใช้เปิดจุด
2. สร้าง cycle/board round ตามกติกาของ matrix runtime
3. หากไม่มี PV เกิน จะไม่มียอด carry เหลือ
4. หลังเปิดจุดแล้ว order นี้จะไม่ถูกนำกลับมาคิดซ้ำในรหัสเดิม

สรุป:

- ได้จุด 1 จุด
- ใช้ PV ครบก้อนที่ threshold
- ไม่เหลือ carry จาก order ชุดนั้น

### เหตุการณ์ 4: PV เกิน 500

กรณี order หรือ PV สะสมรวมกันเกิน `500 PV` เช่น `700 PV`

สิ่งที่เกิดขึ้น:

1. ระบบใช้ `500 PV` เปิดจุด
2. PV ส่วนที่เหลือ เช่น `200 PV` จะไม่หาย
3. ระบบเก็บ `200 PV` ไว้เป็น carry สำหรับการเปิดจุดถัดไป
4. เมื่อมี order ใหม่เข้ามาอีก ระบบจะเอา PV ใหม่นั้นมารวมกับ carry เดิม

สรุป:

- ได้จุดจาก `500 PV` แรก
- PV เกินถูกเก็บสะสมต่อ
- ไม่เสีย PV ส่วนเกิน

### เหตุการณ์ 5: หลังได้จุดแล้ว ระบบวาง source order เข้า beneficiary path

เมื่อ source order ผ่านเข้า matrix แล้ว ระบบจะส่ง event นี้ไปตามสาย beneficiary ของ matrix runtime

สิ่งที่เกิดขึ้น:

1. ระบบหาลำดับผู้รับผลจาก source order นั้น
2. ระบบหา board ที่ยังมีช่องว่างและสามารถรับ event ถัดไปได้
3. ระบบเลือก slot ที่ต้องลงในกระดาน
4. ระบบสร้าง position บน board
5. ระบบสร้าง payout ของตำแหน่งนั้นจาก `creditedPv` ของจุดที่ลงคูณด้วย level/rate ของ board

สรุป:

- source order 1 ใบ ไม่ได้แค่ช่วยผู้ซื้อสะสม PV
- แต่ยังถูกนำไปวางตำแหน่งใน board ของผู้เกี่ยวข้องตามกติกา matrix

### เหตุการณ์ 6: board มีการเติม slot เพิ่มขึ้น

ทุกครั้งที่มี event ใหม่เข้ากระดาน:

1. ระบบเพิ่ม `filledSlots`
2. คำนวณว่า slot นี้อยู่ level ไหน
3. คำนวณ parent slot ถ้ามี
4. คำนวณ payout rate ตาม board/level
5. ใช้ `creditedPv` ของ event นั้นเป็นฐานคำนวณ payout
6. สร้าง matrix payout ให้ผู้รับผลของ slot นั้น

สรุป:

- การวางจุดใน matrix ไม่ใช่แค่ “เปิดรอบ”
- แต่รวมถึงการนำ event ไปลงตำแหน่ง slot จริงใน board แล้วสร้าง payout ให้ตำแหน่งนั้นด้วย

### เหตุการณ์ 7: board เต็มหรือปิดรอบ

เมื่อ board เดิมเต็มตามจำนวน slot ของมัน:

1. ระบบ finalize board นั้น
2. ระบบตรวจว่ามีรอบถัดไปหรือ board ถัดไปที่ต้องเปิดหรือไม่
3. ถ้ามีกติกา reentry/auto order ที่เกี่ยวข้อง ระบบจะเตรียม flow ต่อทันที

สรุป:

- board ที่เต็มจะไม่รับ event ใหม่อีก
- ระบบขยับไปจัดการรอบถัดไปตาม runtime ของ matrix

### เหตุการณ์ 8: board 1 ได้ payout และเกิด holdback

สำหรับ `board 1` payout ที่เกิดจาก slot placement จะไม่จ่ายทั้งหมดทันที

สิ่งที่เกิดขึ้น:

1. ระบบคำนวณ `gross payout`
2. หัก `60%` เป็น holdback
3. แต่หักไม่เกินยอดเป้าหมายของ auto order รอบถัดไป
4. ส่วนที่เหลือจ่ายเป็น `paidAmount`
5. holdback ถูกสะสมไว้ใน holdback account ของรอบถัดไป

สรุป:

- board 1 ได้รายได้จริงบางส่วน
- อีกบางส่วนถูกกันไว้เพื่อเตรียมเปิดรอบใหม่

### เหตุการณ์ 9: holdback สะสมครบเป้า

เมื่อ holdback ของ board 1 ครบตามเป้าหมาย:

1. ระบบ mark account ว่า `TARGET_REACHED`
2. สร้างหรือดึง `pending reorder`
3. เปิดสิทธิ์ให้เกิด `auto order` สำหรับรอบถัดไป

สรุป:

- ตอนนี้ยังไม่ใช่การเปิด board ใหม่ทันที
- แต่เป็นสถานะพร้อมสำหรับสร้าง auto order แล้ว

### เหตุการณ์ 10: auto order ถูกสร้างสำเร็จ

เมื่อ auto order ถูกสร้างจริง:

1. ระบบสร้าง order ของสินค้า `FIRM` สำหรับ matrix auto order
2. order นี้ถูกอนุมัติทันที
3. ระบบเครดิต `Firm wallet` ตามยอด auto order
4. ระบบเรียก complete reorder flow
5. ถ้ายังไม่มี board round ถัดไป ระบบจะสร้างให้
6. ระบบ update current board ไปที่ round ใหม่
7. mark reorder เป็น `COMPLETED`
8. mark holdback account เป็น `CONSUMED`

สรุป:

- จุดของรอบใหม่ถูกเปิดสมบูรณ์เมื่อ auto order สำเร็จ
- holdback ที่สะสมไว้ถูกใช้ไปตามกติกาแล้ว

### เหตุการณ์ 11: order เดิมไม่ถูกใช้ซ้ำในรหัสเดิม

หลังจาก order ถูกประมวลผลเข้า matrix แล้ว ระบบจะไม่เอา order เดิมกลับมาสะสมหรือเปิดจุดซ้ำในรหัสเดิมอีก

สรุป:

- 1 approved order ถูกใช้ 1 รอบตาม runtime
- สิ่งที่เหลือไว้ได้คือ carry PV ที่ยังไม่ครบ threshold
- แต่ตัว event/order เดิมไม่ถูกนำกลับมาคิดซ้ำซ้อน

### 5. คำนวณ pool

`PV` ของ approved order จะถูกส่งเข้าระบบ `pool` ทันทีเพื่อใช้เป็น funding source ของรอบ pool ตามวัน/สัปดาห์ของระบบ

ภายหลังเมื่อปิดรอบ pool:

- ระบบรวมยอด `PV` ของ approved orders
- คำนวณ pool fund ตาม rule ของระบบ
- เฉลี่ยจ่ายให้สมาชิกที่ผ่าน eligibility ของ pool

### 6. เครดิต wallet รายได้

หลังจากคำนวณเสร็จ ระบบจะเครดิตรายได้เข้าสู่ wallet ตามประเภทและสถานะ เช่น:

- commission wallet entries
- matrix payout
- pool payout
- discount wallet บางประเภท
- firm wallet

## รายได้แต่ละประเภทได้มาอย่างไร

### 1. Cashback

- มาจาก order ของตัวสมาชิกเอง
- คำนวณจาก `totalPv` ของ approved order ตาม cashback rate

### 2. Direct

- มาจาก `PV` ของ approved order ของ downline
- จ่ายขึ้น sponsor/upline ตาม direct level rate
- ต้องผ่าน qualification และกติกา cycle/cap

### 3. Unilevel

- มาจาก `PV` ของ approved order เดียวกัน
- จ่ายขึ้นตามโครงสร้าง unilevel หลายชั้นตาม rate ที่ตั้งไว้
- ต้องผ่าน qualification และกติกา cycle/cap

### 4. Matrix

- มาจาก `PV` ของ approved order
- ระบบนำ PV ไปสะสมหรือใช้เปิดจุดเมื่อครบ `500 PV`
- หลังเข้า board แล้วจะเกิด matrix payout ตามตำแหน่งในกระดานและกติกา rate

### 5. Pool

- มาจาก `PV` ของ approved order ทุกใบที่เข้าเงื่อนไขของรอบ pool
- เข้ากอง pool ทันทีหลังอนุมัติ
- จ่ายจริงเมื่อปิดรอบ pool และสมาชิกผู้รับผ่าน eligibility

### 6. Firm wallet จากการซื้อสินค้า FIRM ปกติ

- ถ้า order ที่อนุมัติแล้วมีสินค้า `FIRM`
- ระบบเครดิต `Firm wallet` แบบ `1:1 บาท`
- ยอดเครดิตอิงจากยอด order ของสินค้า `FIRM` ตามกติกาหลักล่าสุด

### 7. Firm wallet จาก auto order

- `matrix auto order` ใช้สินค้า `FIRM` ตาม runtime ของระบบ
- เมื่อเกิด auto order ระบบเครดิต `Firm wallet` ตามยอด auto order
- auto order ได้รับการอนุมัติทันทีตามกติกา

## ตัวอย่างตามกติกาธุรกิจ

### กรณี 1

ซื้อ `e ner g` ราคา `750 บาท` ได้ `500 PV`

เมื่อ order ถูกอนุมัติ:

- นำ `500 PV` ไปคำนวณ `direct`
- นำ `500 PV` ไปคำนวณ `matrix`
- นำ `500 PV` ไปคำนวณ `pool`
- PV ชุดนี้ถูกใช้ในรอบของ order นี้และไม่ถูกนำกลับมาใช้ซ้ำในรหัสเดิม

### กรณี 2

ซื้อ `collaminiral` ราคา `700 บาท` ได้ `700 PV`

เมื่อ order ถูกอนุมัติ:

- นำ `700 PV` ไปคำนวณ `direct`
- นำ `700 PV` ไปคำนวณ `matrix`
- ระบบใช้ `500 PV` เพื่อเปิดจุด
- เก็บ `200 PV` ไว้สะสมสำหรับรอบถัดไป
- นำ `700 PV` ไปคำนวณ `pool` ทันที

### กรณี 3

ซื้อ `blife coffee` ราคา `350 บาท` ได้ `350 PV`

เมื่อ order ถูกอนุมัติ:

- นำ `350 PV` ไปคำนวณ `direct`
- นำ `350 PV` ไปคำนวณ `matrix`
- ยังไม่ครบ threshold เปิดจุด
- ระบบเก็บ `350 PV` สะสมไว้จนกว่าจะครบ `500 PV`
- นำ `350 PV` ไปคำนวณ `pool` ทันที

### กรณี 4

สินค้า `FIRM`

- ถ้าซื้อแบบปกติและ order ถูกอนุมัติแล้ว จะได้ `Firm wallet` ทันที
- ถ้าเป็น `auto order` จะอนุมัติทันทีตามกติกา
- `Firm wallet` ใช้กติกา `1:1 บาท`

## กติกา board 1 holdback

สำหรับ `matrix board 1` runtime ปัจจุบันใช้กติกา holdback เพื่อเตรียม auto order รอบถัดไปดังนี้:

- หัก `60%` ของ payout เพื่อสะสม
- แต่หักไม่เกินยอดเป้าหมายที่ต้องใช้เปิด auto order ของรอบถัดไป
- เมื่อสะสมครบ ระบบจะเปิด reorder/auto order ตามกติกา

## สรุป runtime หลัก

runtime หลักของระบบปัจจุบันคือ:

1. `APPROVED order` เป็นจุดเริ่มต้นของการคำนวณทั้งหมด
2. `PV` ของสินค้า/แพ็กเกจทุกตัวใน order ถูกใช้กับ `direct`, `matrix`, `pool`
3. `matrix` ใช้ระบบสะสม PV และเปิดจุดที่ `500 PV`
4. `pool` รับ PV ทันทีหลังอนุมัติ order
5. `สินค้า FIRM` และ `auto order` ให้ `Firm wallet` แบบ `1:1 บาท`
6. `SW จ่ายครบ` ทำให้ order `APPROVED` ทันทีและเข้าสู่ runtime flow ทันที
