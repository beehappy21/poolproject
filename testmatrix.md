# Matrix Test Handoff

## Scope

ไฟล์นี้สรุปสถานะงาน matrix/reentry ล่าสุดสำหรับใช้ส่งต่อรอบถัดไป โดยโฟกัสที่ runtime จริงในโปรเจกต์นี้ ไม่ใช้บิลออโต้จากไฟล์เป็นตัวบังคับ แต่ใช้ไฟล์ `allsaletest02042026` เป็น source ของบิลปกติ แล้วปล่อยให้ระบบสร้าง reentry เองตามกติกา

ไฟล์โค้ดหลักที่แก้อยู่:
- [packages/modules/matrix/src/services/matrix.service.ts](/Users/macbook/poolproject/packages/modules/matrix/src/services/matrix.service.ts)

ไฟล์อ้างอิงสำคัญ:
- [scripts/replay_runtime_allsale_normals.mjs](/Users/macbook/poolproject/scripts/replay_runtime_allsale_normals.mjs)
- [scripts/build_allsale_tree_report.mjs](/Users/macbook/poolproject/scripts/build_allsale_tree_report.mjs)
- [runtime/allsaletest02042026-tree-report.md](/Users/macbook/poolproject/runtime/allsaletest02042026-tree-report.md)
- [runtime/allsaletest02042026-tree-report.json](/Users/macbook/poolproject/runtime/allsaletest02042026-tree-report.json)

## Runtime Rules In Use

กติกาที่พยายามล็อกไว้ตอนนี้:
- บิลจริงลง `B1` เท่านั้น
- `B2/B3` ไม่รับบิลตรง แต่เกิดจาก claim หลังบอร์ดครบ
- reentry ใช้กับ `B1` เท่านั้น
- การส่งผลขึ้นอัพไลน์จำกัด `2 ชั้น`
- `23` ต้องเปิดออโต้ได้จริงเมื่อปล่อย runtime สร้างเอง
- `13` จากไฟล์เดิมควรมีออโต้ `2 ใบ`

## What Was Proven

### 1. `23` ควรมีออโต้

ถ้าไม่ยึดบิลออโต้ในไฟล์เป็นตัวบังคับ และใช้เฉพาะบิลปกติจาก `allsaletest02042026`
- `23` สามารถเปิดออโต้ได้จริง
- เคยรันถึงจุดที่ `23` มีออโต้ใบที่สองแล้ว

ข้อมูลจากไฟล์ต้นทาง:
- `23 B1R1` ตามผังบิลคือ `29, 30, 39, 53, 37, 46`
- หลังเปิดออโต้ใบแรกของ `23` ลำดับสายตามบิลคือ `38, 74, 86, 87, 89, 85, ...`

### 2. `90` ไม่ควรขึ้น `13 B1R2`

ก่อนหน้า `90` เคยหลุดขึ้น `13 B1R2`
- ตอนนี้แพตช์ล่าสุดตัด `90` ออกได้แล้ว
- แปลว่าการกัน claim/order ผิด branch เริ่มถูกทาง

### 3. `23` ซ้ำใน `13 B1R2` มีน้ำหนักมาก

hypothesis ที่มีน้ำหนักตอนนี้:
- `13 B1R2` ควรเป็นแนว `16, 17, 23, 23, 31, 32`
- หรืออย่างน้อยต้องมี `23` ซ้ำจาก `23 B1R2 complete`

ตอนนี้ runtime เคยไปถึงชุดคล้ายนี้บางส่วนแล้ว:
- `13 B1R2 = 28, 16, 23, 17, 16, 23`
- แปลว่าระบบเริ่มรับ `23` ซ้ำได้
- แต่ `28` ยังเป็นตัวหลุดที่ต้องตัดออก

## Key Runtime Snapshots

### Snapshot ที่ดีขึ้นมาก

เคยได้สถานะนี้หลัง patch ชุดล่าสุด:
- `13 B1R2 = 28, 16, 23, 17, 16, 23`
- `13 B2R1 = 16, 17, 23`
- `23 B1R2 = 38, 29, 74, 86, 87, 89`
- `23` มีออโต้ใบที่สองแล้ว

ความหมาย:
- `23` โตต่อได้จริง
- `23` ซ้ำใน `13` เริ่มเกิดจริง
- แต่ `28` ยังแทรกผิดที่

### จุดที่ยังผิด

`28` หลุดขึ้น `13 B1R2` จาก flow นี้:
- `TH0000028` เป็นลูกของ `16`
- ใน runtime ล่าสุดมี event:
  - `TH0000016` รับ `TH0000028` ที่ `B1R1`
  - `TH0000013` รับ `TH0000028` ที่ `B1R2`

ตัวนี้คือ bug หลักค้างอยู่

## Current Diagnosis

ปัญหาที่เหลือไม่ใช่เรื่อง `23` เปิดออโต้ได้ไหม
- ตอนนี้พิสูจน์แล้วว่า `23` เปิดได้

ปัญหาจริงคือ:
- `ancestor B1 round > 1` ยังรับ `raw descendant order` บางตัวเร็วเกินไป
- ทำให้ `28` โผล่ใน `13 B1R2` ก่อน branch claim ของสาย `16/23` จะนิ่ง

สรุปสั้น:
- ฝั่ง `23` ถูกทางแล้ว
- ฝั่ง `13` ยังต้องกัน `28`

## Best Next Step

งานถัดไปที่ควรทำ:
1. บล็อก `raw descendant order` ของ branch ที่ควรส่งผลผ่าน `claim`
2. เริ่มจากเคส `16 -> 28`
3. ทำให้ `13 B1R2` รอ branch completion claim ของสาย `16`
4. เป้าคือให้ `13 B1R2` ขยับจาก `28,16,23,17,16,23` ไปเป็นชุดที่ไม่มี `28`

แนวคิดที่ควรทดลองต่อ:
- สำหรับ `B1 round > 1` ของอัพไลน์ ให้ใช้ branch claim ก่อน raw order
- แต่ต้องไม่ทำลายฝั่ง `23 B1R2` ที่ตอนนี้กำลังรับ `38,74,86,87,89` ได้ถูกทาง

## Commands

Restart:

```bash
bash scripts/dev-restart.sh
```

Reset runtime:

```bash
ALLOW_DESTRUCTIVE_LOCAL_RESET=1 node scripts/reset_retest_runtime.mjs --apply
```

Enable reentry for all users:

```bash
docker exec poolproject-postgres psql -U postgres -d poolproject -c "update \"User\" set \"matrixReentryEnabled\"=true, \"updatedAt\"=now();"
```

Replay all normal orders:

```bash
node scripts/replay_runtime_allsale_normals.mjs
```

Lint:

```bash
npm run lint
```

## Git / Worktree

สถานะตอนสรุป:
- มีไฟล์แก้ค้างใน worktree:
  - [packages/modules/matrix/src/services/matrix.service.ts](/Users/macbook/poolproject/packages/modules/matrix/src/services/matrix.service.ts)
- มีไฟล์ temp นอก git:
  - `~$allsaletest02042026.xlsx`

commit ล่าสุดที่เกี่ยวก่อนรอบค้างนี้:
- `9936ed50` `Adjust matrix round targeting and replay tooling`

รอบล่าสุดนี้ยังไม่ commit
