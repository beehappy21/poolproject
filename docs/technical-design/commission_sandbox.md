# Commission Sandbox

เครื่องมือนี้เป็นโปรแกรมทดสอบคำนวณคอมมิชชั่นแบบแยกขาดจากระบบหลัก

จุดประสงค์:
- ไม่เรียก API
- ไม่ใช้ฐานข้อมูล
- ไม่แตะ service/controller/repository เดิม
- ใช้ไฟล์ JSON เป็น input และสร้างรายงาน JSON เป็น output

ไฟล์หลัก:
- `scripts/commission-sandbox.js`
- `scripts/commission-sandbox.example.json`
- `scripts/matrix-sandbox.js`
- `scripts/member003-members.json`
- `scripts/member003-pv-table.json`

วิธีรัน:

```bash
node scripts/commission-sandbox.js
```

ระบุ input และ output เอง:

```bash
node scripts/commission-sandbox.js scripts/commission-sandbox.example.json runtime/commission-sandbox-report.json
```

โครงสร้าง input หลัก:

```json
{
  "scenarioName": "example",
  "settings": {
    "directLevelRates": ["0.2"],
    "uniLevelRates": ["0.01", "0.01"],
    "poolRate": "0.5"
  },
  "members": [
    {
      "id": "alice",
      "name": "Alice",
      "sponsorId": null,
      "active": true,
      "earningCap": "1000",
      "earnedToDate": "0"
    }
  ],
  "orders": [
    {
      "id": "ord-001",
      "buyerId": "alice",
      "pv": "100",
      "date": "2026-03-22"
    }
  ]
}
```

สมมติฐานปัจจุบัน:
- ถ้ายอดโบนัสจะทำให้เกิน `earningCap` จะ fallback ทั้งก้อน
- direct และ uni ใช้ compressed active upline
- ถ้า sponsor active แต่ติด cap จะไม่ข้ามไปจ่ายให้ upline ชั้นถัดไป
- pool ต้อง active และมี direct active อย่างน้อย 2 คน
- รายงานแยก `direct`, `uni`, `poolCycles`, `companyFallbacks`
- input ต้องไม่มี `member.id` หรือ `order.id` ซ้ำกัน

เครื่องมือนี้เหมาะสำหรับ:
- ทดลองสูตรใหม่
- เทียบ scenario ก่อนแก้ logic จริง
- คุยกับธุรกิจด้วย input/output ที่อ่านง่าย

ชุด `member003` ที่พร้อมรันใน repo ตอนนี้:
- `bash scripts/run_member003_direct_test.sh`
- `bash scripts/run_member003_matrix_test.sh`

หมายเหตุ:
- ปกติไม่ต้องใช้ไฟล์ Excel ต้นทางเพื่อรันทดสอบ เพราะมี fixture JSON อยู่ใน repo แล้ว
- ถ้าต้องการ regenerate member fixture จาก `member003.xlsx` ให้ใช้ `python3 scripts/export_member003_members_fixture.py`
