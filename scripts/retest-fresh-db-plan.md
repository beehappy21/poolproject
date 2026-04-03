# Fresh Retest DB Plan

เป้าหมายของ DB นี้คือ:
- แยกจากฐาน `poolproject` ปัจจุบันโดยสิ้นเชิง
- ใช้สำหรับ lane `fresh confidence`
- ให้สมาชิกชุดใหม่มี `memberCode` และ `User.id` ตรงกันตั้งแต่ต้น

## หลักการ

- เก็บฐาน `poolproject` เดิมไว้สำหรับ lane `legacy parity`
- สร้างฐานใหม่ชื่อ `poolproject_retest`
- copy เฉพาะ catalog master:
  - `Supplier`
  - `ProductCategory`
  - `Product`
  - `ProductDetail`
  - `Package`
  - `PackageItem`
- seed สมาชิก fresh ใหม่โดยตรงใน DB ใหม่นี้

## รูปแบบสมาชิก fresh

- `TH0000001` -> `id = 1`
- `TH0000002` -> `id = 2`
- `TH0000003` -> `id = 3`
- ...

โครงสร้าง sponsor/upline:
- `id 1` เป็น root
- สมาชิกใหม่ใช้ parent แบบ binary tree จาก `floor(id / 2)`
- `placementSide`
  - เลขคู่ = `LEFT`
  - เลขคี่ = `RIGHT`

## สิ่งที่ script ทำ

1. สร้าง DB `poolproject_retest` ถ้ายังไม่มี
2. ถ้าใช้ `--drop-existing` จะลบ DB เดิมแล้วสร้างใหม่
3. รัน `prisma db push` ลง DB ใหม่
4. copy catalog master จาก `poolproject`
5. seed สมาชิก fresh ใหม่พร้อม:
   - `User`
   - `MemberProfile`
   - `Wallet`
6. ตั้ง sequence ต่อจากจำนวนสมาชิกที่ seed แล้ว

## ค่า default

- source DB: `poolproject`
- target DB: `poolproject_retest`
- fresh members: `30`
- password default: `123456`

## คำสั่ง

ดู plan อย่างเดียว:

```bash
npm run db:bootstrap:retest
```

สร้าง DB ใหม่และ seed:

```bash
ALLOW_DESTRUCTIVE_LOCAL_RESET=1 npm run db:bootstrap:retest -- --apply
```

ลบ DB เดิมแล้วสร้างใหม่ทั้งหมด:

```bash
ALLOW_DESTRUCTIVE_LOCAL_RESET=1 npm run db:bootstrap:retest -- --apply --drop-existing
```

ปรับจำนวนสมาชิก fresh:

```bash
ALLOW_DESTRUCTIVE_LOCAL_RESET=1 RETEST_MEMBER_COUNT=50 npm run db:bootstrap:retest -- --apply --drop-existing
```
