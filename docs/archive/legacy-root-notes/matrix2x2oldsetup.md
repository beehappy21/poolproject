# Matrix 2x2 Old Setup Backup

## Purpose

ไฟล์นี้เก็บสรุปงาน matrix 2x2 ชุดเดิมไว้ก่อนเริ่มกำหนดกติกาใหม่
ใช้สำหรับ:
- สรุป logic เดิมที่กำลังทดลอง
- ดึงบริบทรอบก่อนกลับมาดูได้เร็ว
- แยกงานค้างเดิมออกจากงานออกแบบกติกาใหม่

## Main References

เอกสาร handoff หลักของรอบก่อน:
- [testmatrix.md](/Users/macbook/poolproject/docs/archive/legacy-root-notes/testmatrix.md)

ไฟล์โค้ดหลักที่มีงานค้าง:
- [packages/modules/matrix/src/services/matrix.service.ts](/Users/macbook/poolproject/packages/modules/matrix/src/services/matrix.service.ts)

## Old Runtime Direction

กติกาที่รอบก่อนพยายามล็อกไว้:
- บิลจริงลง `B1` เท่านั้น
- `B2/B3` ไม่รับบิลตรง
- `B2/B3` เกิดจาก claim หลังบอร์ดครบ
- reentry ใช้กับ `B1` เท่านั้น
- การส่งผลขึ้นอัพไลน์จำกัด `2` ชั้น
- runtime ต้องเปิดออโต้ของ `23` ได้จริง
- เคส `13` ต้องรองรับออโต้ `2` ใบจาก flow เดิม

## What Was Already Proven

- `23` เปิดออโต้ได้จริงเมื่อปล่อย runtime สร้างเองจากบิลปกติ
- ปัญหา `90` หลุดไป `13 B1R2` ถูกตัดออกได้แล้วในรอบทดลองก่อน
- ระบบเริ่มยอมให้ `23` ซ้ำใน `13 B1R2` ได้บางส่วน

snapshot ที่เคยได้และถือว่าดีขึ้น:
- `13 B1R2 = 28, 16, 23, 17, 16, 23`
- `13 B2R1 = 16, 17, 23`
- `23 B1R2 = 38, 29, 74, 86, 87, 89`

## Main Unresolved Issue

bug หลักที่ยังค้างจาก setup เดิม:
- `28` ยังหลุดขึ้นไปอยู่ใน `13 B1R2`

ข้อสรุปของรอบก่อน:
- ปัญหาไม่ใช่เรื่อง `23` เปิดออโต้ได้หรือไม่
- ปัญหาหลักคือ `ancestor B1 round > 1` ยังรับ `raw descendant order` เร็วเกินไปบางเคส
- flow ที่น่าสงสัยที่สุดคือสาย `16 -> 28`

## Uncommitted Worktree State

ตอนสร้างไฟล์ backup นี้ ยังมีไฟล์แก้ค้างที่ไม่ได้ commit:
- [packages/modules/matrix/src/services/matrix.service.ts](/Users/macbook/poolproject/packages/modules/matrix/src/services/matrix.service.ts)

แนวการแก้ที่มีอยู่ใน worktree ตอนนี้:
- เพิ่ม constant จำกัดการ propagate ขึ้นอัพไลน์ `2` ชั้น
- จำกัดการเลือก sponsor chain และ upline loop ให้เหลือ `2` ชั้น
- ปรับ `pendingEvents` สำหรับ `B1 round > 1`
- พยายามให้เลือก event แบบ synthetic/claim ก่อน raw order ในบางเงื่อนไข
- เพิ่ม logic propagate ไป `ancestor next round` หลัง board one complete
- ปรับการเลือก target board ให้บางกรณีเลือก round ล่าสุดได้
- เพิ่ม helper หา nearest ancestor ที่มี `B1` round ถัดไปแบบ open

## Why This File Exists

จากจุดนี้ตั้งใจหยุดไล่งานค้างชุดเดิมก่อน แล้วจะไปกำหนดกติกาใหม่
ดังนั้นไฟล์นี้ทำหน้าที่เป็น baseline สำหรับย้อนกลับมาดูว่า:
- เราเคยทดลองอะไรไปแล้ว
- อะไรพิสูจน์ได้แล้ว
- อะไรยังเป็น bug ค้าง
- worktree เดิมค้าง logic ไหนอยู่

## Recommended Next Use

ถ้าจะย้อนกลับมาดู setup เดิม ให้เริ่มจาก:
1. อ่าน [testmatrix.md](/Users/macbook/poolproject/docs/archive/legacy-root-notes/testmatrix.md)
2. เปิด diff ของ [packages/modules/matrix/src/services/matrix.service.ts](/Users/macbook/poolproject/packages/modules/matrix/src/services/matrix.service.ts)
3. โฟกัสประเด็น `28` ที่หลุดไป `13 B1R2`

ถ้าจะเดินต่อด้วยกติกาใหม่:
1. freeze ไฟล์นี้ไว้เป็น historical backup
2. เขียน spec กติกาใหม่แยกอีกไฟล์
3. อย่าอิง behavior เดิมโดยไม่ตั้งใจ
