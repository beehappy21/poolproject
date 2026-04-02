# Handoff Next

Updated: 2026-04-02

## Current Status

- งาน `LINE / LIFF / signup-share / 1 LINE = 1 account` ถูก merge เข้า `main` แล้ว
- BAO หน้า `Commission > Signup Share` ตอนนี้บันทึกค่าได้จริงแล้ว
- ระบบแยกข้อความออกเป็น 2 ส่วนแล้ว:
  - `ข้อความแนบลิงก์สมัคร`
  - `ข้อความหลังสมัครสำเร็จ`
- local stack และ public URLs ถูก restart/check ล่าสุดแล้ว

## Repo State

- current branch: `fix/signup-share-runtime-path`
- local changes ยังมีไฟล์ส่วนตัวที่ไม่เกี่ยวกับงาน deploy:
  - [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md)
  - [run_local_api.sh](/Users/macbook/poolproject/scripts/run_local_api.sh)
  - [run_local_stephub_app.sh](/Users/macbook/poolproject/scripts/run_local_stephub_app.sh)

## Next Session

รอบถัดไปให้โฟกัสที่การเทสระบบ `BAO + WAP` ตาม checklist นี้:

- [2026-04-02-bao-wap-signup-share-uat-checklist.md](/Users/macbook/poolproject/docs/uat/2026-04-02-bao-wap-signup-share-uat-checklist.md)

ลำดับแนะนำ:

1. เทส BAO save/reload ของ `Signup Share`
2. เทส API `/settings/signup-share`
3. เทส WAP share/signup flow บน `iOS`
4. เทส WAP share/signup flow บน `Android`
5. เทส business rule `1 LINE = 1 account`
6. เก็บ evidence ตาม checklist
