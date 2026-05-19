# สรุปแผนการตลาดที่ระบบใช้จริง

Updated: 2026-05-18

อ้างอิง runtime จริงจาก:

- [runtime/commission-settings.json](/Users/macbook/poolproject/runtime/commission-settings.json:1)
- [docs/technical-design/referral_commission_plan_thb.md](/Users/macbook/poolproject/docs/technical-design/referral_commission_plan_thb.md:1)
- [docs/technical-design/commission_round_repurchase_spec.md](/Users/macbook/poolproject/docs/technical-design/commission_round_repurchase_spec.md:1)
- [docs/archive/uat-history/2026-05-18-pv-cycle-cap-uat-scenarios.md](/Users/macbook/poolproject/docs/archive/uat-history/2026-05-18-pv-cycle-cap-uat-scenarios.md:1)

## วัตถุประสงค์

เอกสารนี้สรุปเฉพาะกติกาแผนการตลาดที่ระบบ runtime ใช้งานจริงในปัจจุบัน เพื่อให้ฝ่ายการตลาดใช้ทำงานต่อได้โดยไม่ปนกับแผนเก่า แผนที่ปิดอยู่ หรือแผน sandbox

## หลักคิดสำคัญ

- ระบบคิดคอมจาก `PV` ของออเดอร์ที่ `approved` แล้วเท่านั้น
- สำหรับการคำนวณคอม ระบบตีความ `1 PV = 1 บาท`
- ยอดขายจริงกับ PV เป็นคนละค่า:
  - ยอดขาย ใช้เป็นราคาขายสินค้า
  - PV ใช้เป็นฐานคำนวณคอม
- trigger เริ่มคำนวณคอมของระบบคือ `approved order`

## แผนที่เปิดใช้งานจริง

- `Direct`
- `Team 2-leg`
- `Team 3-leg`
- `Matching`
- `Pool`

## แผนที่ปิดอยู่ตอนนี้

- `Cashback`
- `Unilevel`
- `Matrix`

## กติกา Referral

- ใช้ `referralCode` เป็นรหัสแนะนำสมัคร
- ใช้ `memberCode` เป็นรหัสสมาชิกสำหรับ login, support, และ back-office
- ห้ามใช้ `memberCode` แทน `referralCode` ใน flow การตลาดใหม่
- ถ้าผู้แนะนำยังมี direct ไม่ครบ `L / M / R` อย่างละ 1 คน ระบบจะบังคับลงแบบ `AUTO` ก่อน
- ช่วงที่ยังไม่ครบ 3 ขา ระบบจะเติมขาที่ว่างก่อนจนมีอย่างน้อย `L 1 / M 1 / R 1`
- เมื่อครบทั้ง 3 ขาแล้ว ผู้แนะนำจึงจะสามารถใช้ลิงก์สมัครแบบระบุขา `L / M / R` ได้
- ถ้าเลือก `AUTO` หลังครบ 3 ขาแล้ว ระบบจะลงขาที่ `ไม่มีคะแนน PV` ก่อน หรือถ้าทุกขามีคะแนนแล้วจะลงขาที่ `คะแนน PV รวมน้อยสุด`

## กติกาการเกิดคอม

- ออเดอร์ต้องเป็น `approved` ก่อน คอมจึงเริ่มคำนวณ
- สถานะต่อไปนี้ยังไม่เริ่มคำนวณ:
  - `pending`
  - `unpaid`
  - จ่ายแล้วแต่ยังไม่ `approved`

## สูตรคอมที่ใช้จริง

### Direct

- จ่าย `2 ชั้น`
- `L1 = 50% ของ PV`
- `L2 = 50% ของ PV`
- คิดทันทีเมื่อออเดอร์ลูกทีมเป็น `approved`

ตัวอย่าง:

- order `200 PV`
- `Direct L1 = 100 บาท`
- `Direct L2 = 100 บาท`

### Team 2-leg

- ใช้เมื่อมี `2 ขาที่จ่ายได้`
- จ่าย `30%`
- คิดจาก `ขาที่อ่อนกว่า`

สูตร:

- `team2Leg = min(payableLegPv) x 0.30`

### Team 3-leg

- ใช้เมื่อมี `3 ขาที่จ่ายได้`
- จ่าย `50%`
- คิดจากผลรวม `2 ขาที่อ่อนกว่า`

สูตร:

- เรียงจากน้อยไปมาก
- `team3LegBasePv = weakest + middle`
- `team3Leg = team3LegBasePv x 0.50`

### Matching

- จ่าย `2 ชั้น`
- ชั้นละ `5%`
- คิดจาก `team final payable` ที่จ่ายได้จริงหลังหัก cap แล้ว

สูตร:

- `matchingL1 = teamFinalPayableAmount x 0.05`
- `matchingL2 = teamFinalPayableAmount x 0.05`

### Pool

- ใช้ `100% ของ approved sales PV` ของวันนั้นเป็นฐานเข้ากอง pool
- runtime ตอนนี้ใช้ `poolRate = 1`

## เพดานจ่ายรายวัน

- `Daily commission cap = 10,000 บาท`
- ใช้กับ `Team 2-leg / Team 3-leg` ใน runtime ปัจจุบัน
- แม้สูตรดิบคำนวณได้สูงกว่า final payable ของ team อาจถูกจำกัดด้วย daily cap

## กติกา Cycle Cap ตาม PV

ระบบใช้กติกา `PV-only cycle cap` จริงแล้ว

- ถ้ารอบนั้นมี PV สะสม `< 200 PV` ได้ `cycle cap 5,000 บาท`
- ถ้ารอบนั้นมี PV สะสม `>= 200 PV` ได้ `cycle cap 10,000 บาท`
- PV สะสมข้ามหลาย order ได้
- ถ้ารอบเดิมเริ่มต่ำกว่า `200 PV` แล้วซื้อเพิ่มจนแตะ `200 PV` ระบบจะอัปเกรด cap จาก `5,000` เป็น `10,000` ทันที
- ถ้า PV เกินจากรอบปัจจุบัน ระบบจะยกส่วนเกินไปเปิดรอบถัดไปแบบรอจ่าย
- ระบบจะจ่ายรอบเก่าก่อน แล้วค่อยเลื่อนไปรอบถัดไป

ตัวอย่างที่ทดสอบผ่านบน UAT แล้ว:

- `100 PV => cap 5,000`
- `200 PV => cap 10,000`
- `100 + 100 => อัปเกรดรอบเดิมเป็น cap 10,000`
- `200 + 100 => เปิดรอบถัดไป 100 PV แบบรอ`
- เมื่อรอบแรกจ่ายเต็ม cap แล้ว รอบถัดไปถูก promote ขึ้นมารับคอมได้จริง

## กติกา Commission Round

- หนึ่งรอบถือว่า `ครบรอบ` เมื่อคอมสะสม `>= 10,000 บาท`
- ยอดสะสมรอบนี้นับจาก:
  - `Direct`
  - `Team 2-leg`
  - `Team 3-leg`
  - `Matching`
  - `Pool`
- ไม่นับ `Company fallback`

## กติกา Re-purchase

- เมื่อครบรอบ `10,000 บาท` ระบบเข้าสู่ช่วง `grace 3 วัน`
- ระหว่าง grace ยังมีการคำนวณคอม แต่คอมใหม่จะถูก `hold`
- หากซื้อซ้ำของตัวเองและออเดอร์ `approved` ที่มี `PV > 0` ภายใน 3 วัน:
  - ระบบเปิดรอบใหม่
  - รีเซ็ตยอดสะสมรอบใหม่เป็น `0`
  - ระบบกำหนด cycle cap ของรอบใหม่ตาม PV ที่ซื้อ:
    - `< 200 PV = 5,000`
    - `>= 200 PV = 10,000`
  - flow การรับคอมกลับมาทำงานปกติ
- หากไม่ซื้อซ้ำภายใน grace:
  - หลังหมดเวลา ระบบหยุดการเกิดคอมใหม่
  - ต้องมี qualifying repurchase จึงจะเปิดรอบใหม่ได้

## กติกาเข้าพูลครั้งแรก

สมาชิกจะมีสิทธิ์ pool ครั้งแรกเมื่อมีครบ:

- มี order ซื้อเองที่ `approved`
- มี direct อย่างน้อย `3 คน`
- direct ทั้ง `3 คน` มี approved purchase อย่างน้อยคนละ `1 order`

หลังจากผ่านด่านแรกแล้ว:

- รอบถัดไปไม่ต้องสร้าง `3 direct buyers` ใหม่
- ใช้ qualifying self-repurchase เพื่อเปิดรอบใหม่

## สิ่งที่การตลาดสื่อสารได้ทันที

- ระบบคิดคอมจาก `PV`
- `Direct 2 ชั้น: 50% + 50%`
- `Team 2 ขา 30%`
- `Team 3 ขา 50%`
- `Matching 2 ชั้น: 5% + 5%`
- `Pool` ใช้เงื่อนไขแรกเข้า `ซื้อเอง + 3 direct + 3 direct buyers`
- `Daily cap 5,000 บาท`
- `ครบรอบที่ 10,000 บาท`
- `ซื้อซ้ำที่มี PV ภายใน 3 วัน` เพื่อเปิดรอบใหม่
- `Cycle cap` ตาม PV สะสม:
  - `< 200 PV = 5,000`
  - `>= 200 PV = 10,000`

## สิ่งที่ยังไม่ควรสื่อสารเป็นแผน active

- `Cashback`
- `Unilevel`
- `Matrix`
- สูตรเก่าแบบ `35 USDT = 10 PV`
- การใช้ `memberCode` เป็นรหัสชวนสมัคร

## หมายเหตุ

- เอกสารนี้ตั้งใจสรุปเฉพาะสิ่งที่ runtime ใช้อยู่จริงในปัจจุบัน
- หาก config หรือ runtime เปลี่ยน ต้องอัปเดตเอกสารนี้ตามรอบ deploy ด้วย
- กติกาเปิดรอบใหม่ล่าสุดคือ `ซื้อซ้ำที่มี PV > 0 ภายใน 3 วัน`
- ถ้าซื้อ `100 PV` รอบใหม่จะได้ cap `5,000`
- ถ้าซื้อ `200 PV` รอบใหม่จะได้ cap `10,000`
