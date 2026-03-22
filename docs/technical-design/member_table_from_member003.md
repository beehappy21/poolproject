# Member Table Design From `member003.xlsx`

This note maps the report-style spreadsheet [`member003.xlsx`](/Users/macbook/poolproject/member003.xlsx) into a reusable member section for poolproject and Stephub admin.

## Spreadsheet Columns

Source columns found in the workbook:

- `ลำดับที่`
- `รหัสสมาชิก`
- `วันที่สมัคร`
- `รหัสผู้แนะนำ`
- `อัพไลน์`
- `เลขบัตรประชาชน`
- `ด้าน`
- `ชื่อเต็ม`
- `ตำแหน่ง`
- `เกียรติยศ`
- `โมบายเซ็นเตอร์`
- `อีเมล`
- `มือถือ`
- `ดำเนินการ`

## Recommended Member List Columns

For the member section UI, use these columns in this order:

1. `ลำดับที่`
2. `รหัสสมาชิก`
3. `วันที่สมัคร`
4. `รหัสผู้แนะนำ`
5. `อัพไลน์`
6. `เลขบัตรประชาชน`
7. `ด้าน`
8. `ชื่อเต็ม`
9. `ตำแหน่ง`
10. `เกียรติยศ`
11. `โมบายเซ็นเตอร์`
12. `อีเมล`
13. `มือถือ`
14. `สถานะ`
15. `ดำเนินการ`

## Poolproject Field Mapping

The current poolproject schema already supports part of this shape through `User`.

Recommended mapping:

| Spreadsheet | Poolproject field now | Notes |
| --- | --- | --- |
| `ลำดับที่` | generated in read model | `row_number()` in SQL view |
| `รหัสสมาชิก` | `User.memberCode` | already present |
| `วันที่สมัคร` | `User.createdAt` | use date-only in list |
| `รหัสผู้แนะนำ` | `User.sponsor.memberCode` | already supported |
| `อัพไลน์` | future placement/upline field | not present yet |
| `เลขบัตรประชาชน` | future KYC/member profile field | not present yet |
| `ด้าน` | future placement side field | not present yet |
| `ชื่อเต็ม` | `User.name` | already present |
| `ตำแหน่ง` | future rank code | not present yet |
| `เกียรติยศ` | future honor title | not present yet |
| `โมบายเซ็นเตอร์` | future member center flag | not present yet |
| `อีเมล` | `User.email` | already present |
| `มือถือ` | `User.phone` | already present |
| `ดำเนินการ` | UI actions only | not a DB column |

## Recommended Future Schema

To fully match the spreadsheet, use a dedicated member profile extension table instead of overloading `User`.

Suggested table:

`MemberProfile`

- `id`
- `userId` unique
- `nationalId`
- `uplineUserId`
- `placementSide`
- `rankCode`
- `honorTitle`
- `mobileCenterCode`
- `joinedAtOverride`
- `createdAt`
- `updatedAt`

This keeps authentication and payout logic on `User`, while member-facing reporting fields live in a dedicated profile table.

Status:

- Prisma schema updated
- SQL migration added in [`add_member_profile.sql`](/Users/macbook/poolproject/scripts/migrations/add_member_profile.sql)
- Stephub `Members` view now reads from `MemberProfile` when records exist
- import helper added in [`import_member_profiles_from_xlsx.py`](/Users/macbook/poolproject/scripts/import_member_profiles_from_xlsx.py)

## Stephub Compatibility Layer

For Stephub admin, the read model `stephub_members_v1` is the safest starting point.

Current values supplied by the view:

- `seq_no`
- `member_code`
- `joined_date`
- `sponsor_code`
- `full_name`
- `email`
- `phone`
- `status`
- `referral_code`

Current placeholders in the view until schema support is added:

- `upline_code`
- `national_id`
- `side`
- `rank_code`
- `honor_title`
- `mobile_center`

## UI Recommendation

Use the spreadsheet layout as the main `Members` table in Stephub admin and show `-` for fields not yet modeled in poolproject.

This gives us:

- familiar back-office reporting layout
- immediate usability with live data
- a clear path to fill the remaining fields later without rebuilding the screen

## Import Notes

The helper script can upsert profile fields from the spreadsheet into `MemberProfile` by matching `รหัสสมาชิก` to `User.memberCode`.

Current behavior:

- supports `joined date`, `upline`, `side`, `rank`, `honor`, `mobile center`
- writes `nationalId` only when the spreadsheet value is not duplicated
- does not create missing users automatically

Examples:

```bash
node scripts/seed_members_from_xlsx.mjs
node scripts/seed_members_from_xlsx.mjs member003.xlsx 123456
python3 scripts/import_member_profiles_from_xlsx.py
python3 scripts/import_member_profiles_from_xlsx.py --apply
```
