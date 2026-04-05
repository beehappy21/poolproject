# B3 Minimum Member Table

โครงสร้างนี้เป็นต้นไม้ `1 แตก 2` ขั้นต่ำที่ทำให้รหัสหลัก 1 รหัสมีสมาชิกพอสำหรับเดินครบถึง `B3` จริง

- รวมสมาชิกทั้งหมด: 255 คน
- รวมรหัสหลัก: 1 คน
- รวมสมาชิกใต้สาย: 254 คน
- ความลึกที่ใช้: 7 ชั้นใต้รหัสหลัก

## Count By Level

| Level | Members | Purpose |
| --- | ---: | --- |
| 0 | 1 | root target |
| 1 | 2 | ช่วยให้ root จบ B1 |
| 2 | 4 | ช่วยให้ root จบ B1 |
| 3 | 8 | ช่วยให้ root จบ B1 |
| 4 | 16 | ช่วยให้ root จบ B2 |
| 5 | 32 | ช่วยให้ root จบ B2 |
| 6 | 64 | ช่วยให้ root จบ B3 |
| 7 | 128 | ช่วยให้ root จบ B3 |

## Files

- CSV: docs/technical-design/generated/b3_minimum_member_table.csv
