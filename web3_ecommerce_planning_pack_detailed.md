web3_ecommerce_planning_pack_detailedweb3_ecommerce_planning_pack_detailed# Planning Pack: Web3 eCommerce + Referral + Uni Level + Daily Pool

**Version:** 1.0  
**Status:** Business + Technical Planning Draft  
**Purpose:** ใช้เป็นเอกสารอ้างอิงหลักก่อนให้ Codex ออกแบบเชิงเทคนิคหรือเริ่มพัฒนา  
**Architecture Direction:** Hybrid Web3 (Off-chain commission engine + On-chain USDT settlement)

---

## 1) Executive Summary

เอกสารนี้สรุปแผนระบบสำหรับแพลตฟอร์ม **Web3-enabled eCommerce** ที่มีการขายสินค้า/แพ็กเกจ และมีระบบรายได้เครือข่ายประกอบด้วย

- Direct Referral Bonus
- Uni Level Bonus
- Daily Pool
- Earning Cap
- Repurchase Unlock
- Company Fallback
- USDT Settlement
- Wallet Binding / Web3 payout trail

แนวทางหลักของระบบนี้คือ:

1. **รายได้หลักมาจากการขายสินค้า/แพ็กเกจ**
2. **ระบบคอมมิชชั่นคำนวณจาก PV**
3. **จ่ายผลตอบแทนเป็น USDT**
4. **ใช้ Web3 แบบ Hybrid**
   - ส่วน business logic และ commission engine อยู่ off-chain
   - ส่วน payout / treasury / audit trail อยู่ on-chain
5. **สมาชิกต้อง active และยังไม่ชน earning cap จึงจะมีสิทธิรับโบนัส**
6. **Daily Pool ต้อง active และมี direct referrals ที่ active อย่างน้อย 2 คน**
7. **Direct และ Uni ใช้ roll-up**
8. **Pool ไม่มี roll-up**
9. **โบนัสที่จ่ายไม่ได้จะต้องมี company fallback ledger ชัดเจน**

---

## 2) Vision และเป้าหมายของระบบ

### 2.1 Vision
สร้างแพลตฟอร์มซื้อขายสินค้าแบบ Web3 ที่สามารถเติบโตได้ผ่านเครือข่ายสมาชิก โดยยังคงมีสินค้า/แพ็กเกจเป็นแกนหลัก และสามารถตรวจสอบการจ่ายผลตอบแทนย้อนหลังได้อย่างโปร่งใส

### 2.2 เป้าหมายเชิงธุรกิจ
- ขายสินค้า/แพ็กเกจผ่านระบบ eCommerce
- เปิดให้สมาชิกแนะนำสมาชิกใหม่
- ใช้ระบบแรงจูงใจเครือข่ายเพื่อเพิ่มการเติบโต
- ควบคุม payout ผ่าน active rules และ earning cap
- ใช้ USDT เป็นสินทรัพย์อ้างอิงสำหรับการ settle โบนัส
- สามารถขยายไปสู่ on-chain payout และ audit trail ได้

### 2.3 เป้าหมายเชิงระบบ
- มีระบบสมาชิกและ sponsor tree ที่ชัดเจน
- มี package cycle และ active qualification
- มี commission engine ที่รองรับ roll-up
- มี daily pool engine ที่ปิดรอบรายวัน
- มี wallet ledger ภายใน
- มี payout batch สำหรับโอน USDT ออกไปยัง wallet
- มี admin/reporting สำหรับตรวจสอบย้อนหลัง

---

## 3) หลักการออกแบบระบบ

### 3.1 Hybrid Web3
ระบบนี้ไม่ควรทำแบบ full on-chain ตั้งแต่แรก เพราะ business logic มีความซับซ้อนสูง เช่น
- direct roll-up
- compressed uni roll-up
- daily pool eligibility
- earning cap
- refund reversal
- company fallback

สิ่งเหล่านี้เหมาะกับการคำนวณใน backend มากกว่า

### 3.2 Separation of Concerns
แยกหน้าที่ชัดเจนระหว่าง:
- **Commerce layer**
- **Genealogy & qualification layer**
- **Commission engine**
- **Wallet & settlement layer**
- **Blockchain payout layer**
- **Admin & reporting**

### 3.3 Auditability
ทุกการจ่ายต้อง trace ย้อนหลังได้จาก:
- source order
- source PV
- roll-up source
- beneficiary
- company fallback reason
- payout batch
- on-chain tx hash

### 3.4 Phase-first delivery
เริ่มจาก MVP ที่ off-chain ก่อน แล้วค่อยเพิ่ม Web3 settlement เพื่อควบคุมความเสี่ยงด้าน logic และ compliance

---

## 4) Business Model Definition

### 4.1 ประเภทของระบบ
- เป็น **eCommerce platform**
- ไม่ใช่ระบบลงทุน
- ไม่ควรสื่อสารว่าเป็นการฝากเงินเพื่อรับผลตอบแทน
- ต้องมีสินค้า/แพ็กเกจเป็นแกนของระบบจริง

### 4.2 หน่วยอ้างอิงหลัก
- ใช้ **USDT** เป็น reference currency
- ใช้ **PV** เป็นฐานคำนวณ bonus

### 4.3 Package / Product Design
แต่ละ package ต้องกำหนดเองได้อย่างน้อย:
- `price_usdt`
- `pv`
- `active_days`
- `earning_cap_type`
- `earning_cap_amount`
- `status`

ราคาและ PV ไม่จำเป็นต้องเท่ากัน เพื่อเปิดโอกาสให้ควบคุม payout model ผ่าน PV policy

---

## 5) Business Rules ที่ล็อกแล้ว

## 5.1 Core Rules
1. ระบบเป็น eCommerce
2. ใช้ USDT เป็น reference currency
3. package กำหนดราคาและ PV เองได้
4. member ต้องมี package cycle ที่ยัง active และยังไม่ชน cap จึงจะรับโบนัสได้

## 5.2 Direct Bonus
- อัตรา = **20% ของ PV**
- ปกติจ่ายให้ sponsor ตรงของผู้ซื้อ
- ถ้า sponsor ตรงไม่ active → roll-up ไปหา active sponsor คนแรก
- ถ้าไล่จนสุดสายแล้วไม่เจอ active sponsor → โบนัสเข้าบริษัท

## 5.3 Uni Level
- ลึก 15 ระดับ
- ระดับ 1–5 ได้ **1% ของ PV ต่อระดับ**
- ระดับ 6–15 ได้ **0.5% ของ PV ต่อระดับ**
- ใช้ **compressed roll-up**
- นับเฉพาะ active uplines
- active upline คนแรก = level 1
- active upline คนที่สอง = level 2
- ทำไปจนถึง 15 active uplines
- ถ้า active uplines ไม่ครบ 15 คน → โบนัสส่วนที่เหลือเข้าบริษัท

## 5.4 Daily Pool
- pool fund รายวัน = **50% ของ PV รวมในวันนั้น**
- ผู้มีสิทธิรับ pool ต้องครบทั้ง:
  - active ณ วันนั้น
  - มี direct referrals ที่ active อย่างน้อย 2 คน
- pool payout ต่อคน = pool fund / จำนวน eligible members ของวันนั้น
- ถ้าไม่มี eligible members → pool ทั้งหมดเข้าบริษัท
- pool **ไม่มี roll-up**

## 5.5 Active Rule
member มีสิทธิรับโบนัสเมื่อ:
- มี current package cycle
- `now <= active_until`
- `earning_status != capped`

## 5.6 Earning Cap
รายได้รวมที่ต้องนับเข้า cap:
- direct bonus
- uni bonus
- pool bonus
- bonus อื่นในอนาคตทั้งหมด

เมื่อ `earned_total_in_cycle >= earning_cap`:
- `earning_status = capped`
- `repurchase_required = true`
- member หยุดรับโบนัสถัดไป
- ต้องซื้อ package ใหม่เพื่อ reset cycle

## 5.7 Company Fallback
โบนัสต้องเข้าบริษัทในกรณี:
- หา active sponsor ไม่เจอ
- active uplines ไม่ครบ 15 ระดับ
- pool ไม่มี eligible members
- ผู้รับหมด active_days
- ผู้รับชน earning cap
- ผู้รับไม่มี current package cycle
- ผู้รับไม่ผ่าน qualification ตอน finalize

---

## 6) เหตุผลเชิงธุรกิจของกติกาแต่ละข้อ

### 6.1 ทำไมต้องใช้ PV แยกจากราคา
เพราะจะช่วยควบคุม payout rate ได้ดีกว่าการคำนวณจากยอดขายตรง ๆ

### 6.2 ทำไม Direct/Uni ต้องใช้ roll-up
เพื่อไม่ให้โบนัสหายไปทันทีเมื่อสายงานบางคนไม่ active และเพื่อให้แรงจูงใจกลับไปยังสายงานที่ active อยู่จริง

### 6.3 ทำไม Pool ต้องมีเงื่อนไข 2 direct actives
เพื่อลดปัญหา free rider และบังคับให้ผู้มีสิทธิรับ pool ต้องมีการสร้างเครือข่ายจริง

### 6.4 ทำไมต้องมี earning cap
เพื่อลดความเสี่ยง payout สูงเกินไป และทำให้ระบบมี repurchase loop ที่ควบคุมได้

### 6.5 ทำไม pool ไม่มี roll-up
เพราะ pool เป็นโบนัสระดับรอบวัน ไม่ได้ผูกกับสาย upline ราย order แบบ direct และ uni

---

## 7) High-Level Architecture

```text
Frontend / WAP / Admin
        |
        v
API Gateway / Backend App
        |
        +-- Auth & Identity Service
        +-- Member & Genealogy Service
        +-- Package/Product Service
        +-- Order Service
        +-- Qualification Engine
        +-- Commission Engine
        +-- Pool Engine
        +-- Wallet Ledger Service
        +-- Payout Batch Service
        +-- Admin Reporting Service
        |
        v
Relational Database + Queue + Scheduler
        |
        v
Blockchain Settlement Layer
        +-- Treasury Wallet / Multisig
        +-- Payout Distributor
        +-- USDT Transfer Records
```

---

## 8) Architecture Decision: Off-chain vs On-chain

## 8.1 Off-chain Responsibilities
สิ่งที่ควรอยู่ off-chain:
- user accounts
- sponsor tree
- package cycle
- orders
- refunds
- PV accumulation
- direct roll-up
- uni compressed roll-up
- daily pool eligibility
- earning cap enforcement
- company fallback ledger
- internal wallet balances
- reporting

## 8.2 On-chain Responsibilities
สิ่งที่ควรอยู่ on-chain:
- treasury wallet
- payout distributor
- payout batch submission
- payout tx records
- wallet settlement
- optional proof/hash anchoring

## 8.3 เหตุผลที่ไม่ควรทำ full on-chain
- gas cost สูง
- query genealogy ยาก
- logic เปลี่ยนยาก
- rollback/refund/reversal ซับซ้อน
- daily pool calculation แพง
- admin reports ทำยาก

---

## 9) Functional Scope

## 9.1 MVP Scope
- Register / login
- Sponsor binding
- Wallet connect
- Package browse
- Order create / pay
- Package cycle activation
- Direct bonus calculation
- Uni bonus calculation
- Daily pool close
- Wallet ledger
- Payout batch
- Admin reports

## 9.2 Out of Scope for MVP
- weighted pool
- rank system
- staking
- NFT package pass
- DAO governance
- merchant marketplace เต็มรูปแบบ
- self-claim on-chain merkle claim

---

## 10) Functional Modules Detail

## 10.1 Auth & Identity Module
รองรับ:
- register
- login
- sponsor code validation
- wallet connect
- wallet signature verify
- wallet binding status

หน้าที่หลัก:
- สร้างบัญชีสมาชิก
- ผูก sponsor relation
- bind wallet address
- กัน duplicate wallet bind

## 10.2 Member & Genealogy Module
รองรับ:
- member profile
- sponsor tree
- direct referrals
- uplines
- active status
- current package cycle
- direct active referral count

## 10.3 Package Module
รองรับ:
- package master
- package status
- pricing
- PV
- active_days
- earning cap policy

## 10.4 Order Module
รองรับ:
- create order
- order items
- pay order
- cancel order
- refund order
- order state transitions

## 10.5 Qualification Engine
ทำหน้าที่:
- ตรวจ active cycle
- ตรวจ earning cap
- ตรวจ pool eligibility
- ตรวจ eligibility ตอน finalize
- สร้าง snapshots รายวัน

## 10.6 Commission Engine
รองรับ:
- direct roll-up
- uni compressed roll-up
- commission candidate creation
- pending to approved flow
- fallback to company
- reversals

## 10.7 Pool Engine
รองรับ:
- total PV aggregation รายวัน
- eligible snapshot
- pool close
- payout per member
- adjustment / reversal logic

## 10.8 Wallet Ledger Module
รองรับ:
- pending balance
- approved balance
- withdrawable balance
- paid out balance
- wallet transaction history

## 10.9 Payout Batch Module
รองรับ:
- select withdrawable items
- create payout batch
- submit on-chain
- track tx hash
- reconcile completion

## 10.10 Admin & Reporting Module
รองรับ:
- members
- package cycles
- orders
- commissions
- company fallback
- pool cycles
- payout batches
- audit trace

---

## 11) User Roles

### 11.1 Member
- สมัคร
- ซื้อ package
- ดู direct referrals
- ดูโบนัส
- ดูสถานะ active
- ดู pool history
- ขอถอน

### 11.2 Admin
- จัดการ package
- ดูสมาชิก
- ตรวจ order
- ดู package cycles
- ดู commissions
- ดู fallback ledger
- ปิดรอบ pool
- สร้าง payout batch

### 11.3 Finance / Treasury Operator
- ตรวจ payout batch
- submit payout
- track tx hash
- reconcile settlement

### 11.4 Super Admin
- ตั้งค่าระบบ
- permission
- emergency controls
- lock/unlock modules
- override / audit access

---

## 12) Lifecycle ของแพ็กเกจและสิทธิสมาชิก

## 12.1 Package Purchase Flow
1. สมาชิกเลือก package
2. สร้าง order
3. ชำระสำเร็จ
4. ระบบ activate package cycle ใหม่
5. reset earned total ในรอบ
6. ตั้ง active_until
7. ตั้ง earning cap
8. repurchase_required = false

## 12.2 Qualification Lifecycle
สถานะทั่วไป:
- inactive
- active
- capped
- expired
- repurchase_required

### Transition examples
- ซื้อ package ใหม่ → active
- ถึงวันหมดอายุ → expired
- ได้รายได้ครบ cap → capped + repurchase_required
- ซื้อ package ใหม่หลัง capped → active ใหม่

---

## 13) Earning Cap Model

## 13.1 Earning Cap Types
ควรรองรับอย่างน้อย 2 แบบ:
- `fixed_amount`
- `price_multiple`

### ตัวอย่าง
- fixed_amount: 300 USDT
- price_multiple: 3x ของราคา package

## 13.2 Rules
- cap จะถูกคำนวณตอน activate package cycle
- ทุกโบนัสที่ approved ต้องถูกสะสมเข้า earned_total_in_cycle
- ถ้ารายการใหม่จะทำให้ยอดเกิน cap:
  - สำหรับ Phase 1 ให้ block ทั้งรายการ
  - ไม่ต้อง split partial payout
  - โบนัสรายการนั้นเข้าบริษัท

## 13.3 Repurchase Unlock
เมื่อ member ถูก capped:
- หยุดรับโบนัสใหม่
- ต้องซื้อ package ใหม่
- cycle ใหม่จะ reset earned_total_in_cycle = 0

---

## 14) Direct Roll-up Logic

## 14.1 นิยาม
สำหรับ order ของ buyer:
- ดู sponsor ตรงก่อน
- ถ้า sponsor ตรง active → sponsor ได้ direct
- ถ้าไม่ active → ไล่ขึ้น sponsor chain ต่อ
- active คนแรกที่เจอได้รับ direct
- ถ้าไล่จนสุดสายไม่เจอ active → company fallback

## 14.2 สิ่งที่ต้องเก็บใน ledger
- source_user_id = buyer
- original_sponsor_id
- beneficiary_user_id = คนที่ได้จริง
- rollup_from_user_id
- rollup_depth
- fallback_to_company

## 14.3 ตัวอย่าง
A ซื้อ package  
Sponsor ตรง = B  
B ไม่ active  
B sponsor = C  
C active  

ผล:
- C ได้ direct
- rollup_depth = 1
- rollup_from_user_id = B

---

## 15) Uni Compressed Roll-up Logic

## 15.1 นิยาม
- ไล่ upline จาก buyer ขึ้นไป
- นับเฉพาะ active uplines
- active upline คนแรก = level 1
- active upline คนที่สอง = level 2
- ...
- active upline คนที่ 15 = level 15

## 15.2 Level Rates
- level 1–5 = 1%
- level 6–15 = 0.5%

## 15.3 ถ้า active uplines ไม่ครบ
โบนัสของระดับที่ไม่มีคนรับ:
- ไม่ต้อง roll-up เกิน 15 active levels
- ไม่ต้องขยาย level ต่อ
- เข้าบริษัท

## 15.4 ตัวอย่าง
Buyer = A  
Sponsor chain: B, C, D, E, F, G  
ถ้า B inactive, C active, D inactive, E active, F active

ผล:
- C = level 1
- E = level 2
- F = level 3

---

## 16) Daily Pool Logic

## 16.1 Pool Fund
คำนวณจาก:
- `daily_pool_fund = total_pv_of_eligible_orders * 50%`

## 16.2 Eligible Members
สมาชิกต้องครบทั้ง:
- active ณ วันนั้น
- มี direct referrals ที่ active อย่างน้อย 2 คน

## 16.3 Pool Payout Per Member
- `payout_per_member = daily_pool_fund / eligible_member_count`

## 16.4 ถ้าไม่มี eligible member
- สร้าง cycle ได้ตามปกติ
- `eligible_member_count = 0`
- `payout_per_member = 0`
- pool ทั้งหมดเข้าบริษัท

## 16.5 Snapshot Requirement
เพื่อ audit ให้ได้ ต้องเก็บ snapshot รายวันว่า:
- ใคร active
- direct active referrals count เท่าไร
- ใคร eligible
- เพราะวันถัดไปสถานะอาจเปลี่ยน

---

## 17) Company Fallback Logic

## 17.1 ความหมาย
คือ ledger สำหรับโบนัสหรือ pool ที่ควรเกิดขึ้น แต่สุดท้ายไม่ได้จ่ายให้ member

## 17.2 เหตุผลที่ fallback ได้
- หา active sponsor ไม่เจอ
- active uplines ไม่ครบ
- ไม่มี current package cycle
- cycle หมดอายุ
- earning cap ถูกชนแล้ว
- daily pool ไม่มี eligible members
- payout ถูก block ตอน finalize

## 17.3 ประโยชน์
- audit ได้
- แยกยอดของบริษัทชัดเจน
- คุม accounting ได้
- ติดตาม leak ของ payout ได้

---

## 18) Order Lifecycle

ควรใช้สถานะอย่างน้อย:
- `pending`
- `paid`
- `fulfilled`
- `completed`
- `cancelled`
- `refunded`
- `partially_refunded`

### Recommended commission trigger
- ตอน `paid` → สร้าง commission candidates เป็น `pending`
- หลังพ้น refund window → เปลี่ยนเป็น `approved`

เหตุผล:
- balance ระหว่างเร็วกับการกัน fraud
- ยัง reverse ได้ง่ายก่อน finalize

---

## 19) Refund และ Reversal Logic

## 19.1 Full Refund
- reverse direct
- reverse uni
- reverse pool ถ้าเกี่ยวข้อง
- ถ้า pool cycle ปิดแล้ว ให้สร้าง adjustment entries

## 19.2 Partial Refund
- reverse ตามสัดส่วน PV / amount
- ต้องมี reversal ledger ชัดเจน

## 19.3 Cancel ก่อน paid
- ไม่เกิดโบนัส
- ไม่เกิด PV

## 19.4 Cancel หลัง paid แต่ก่อน finalize
- void pending commissions
- remove or adjust from daily pool source

---

## 20) Wallet Model

## 20.1 Internal Wallet States
ควรแยกยอดอย่างน้อย:
- `pending_balance`
- `approved_balance`
- `withdrawable_balance`
- `paid_out_balance`

## 20.2 ความหมาย
- pending: โบนัสเพิ่งเกิดแต่ยังไม่ finalize
- approved: ผ่านแล้วแต่ยังไม่เปิดถอน
- withdrawable: พร้อมถอนหรือพร้อมรวม batch
- paid_out: โอนไป on-chain แล้ว

## 20.3 Wallet Transaction Types
- direct_credit
- uni_credit
- pool_credit
- reversal_debit
- manual_adjustment
- payout_reservation
- payout_sent
- payout_failed_revert

---

## 21) Web3 Settlement Design

## 21.1 Wallet Binding
ผู้ใช้ต้องสามารถ:
- connect wallet
- sign message
- verify ownership
- bind wallet กับบัญชี member

## 21.2 Treasury Layer
ควรมี:
- treasury wallet
- multisig control
- payout fund separation

## 21.3 Payout Layer
ขั้นตอนแนะนำ:
1. backend create payout batch
2. lock selected withdrawable items
3. generate payout items
4. submit on-chain transaction
5. record tx hash
6. reconcile result
7. mark items as paid_out

## 21.4 On-chain Record Keeping
อย่างน้อยควรเก็บ:
- chain_id
- token_address
- tx_hash
- batch_no
- total_amount
- submitted_at
- confirmed_at

---

## 22) Data Model (Detailed Draft)

## 22.1 users
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| member_code | varchar | unique |
| name | varchar | |
| email | varchar | unique nullable |
| phone | varchar | unique nullable |
| password_hash | varchar | |
| wallet_address | varchar | nullable |
| wallet_verified_at | datetime | nullable |
| sponsor_id | bigint | FK users.id nullable |
| status | varchar | active / blocked / pending |
| created_at | datetime | |
| updated_at | datetime | |

## 22.2 packages
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| code | varchar | unique |
| name | varchar | |
| price_usdt | decimal | |
| pv | decimal | |
| active_days | integer | |
| earning_cap_type | varchar | fixed_amount / price_multiple |
| earning_cap_amount | decimal | |
| status | varchar | active / inactive |
| created_at | datetime | |
| updated_at | datetime | |

## 22.3 member_package_cycles
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| user_id | bigint | FK users.id |
| package_id | bigint | FK packages.id |
| activated_at | datetime | |
| active_until | datetime | |
| earning_cap | decimal | computed at activation |
| earned_total_in_cycle | decimal | running total |
| earning_status | varchar | active / capped |
| repurchase_required | boolean | |
| status | varchar | active / expired / closed |
| created_at | datetime | |
| updated_at | datetime | |

## 22.4 orders
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| order_no | varchar | unique |
| user_id | bigint | buyer |
| subtotal_usdt | decimal | |
| total_usdt | decimal | |
| total_pv | decimal | |
| paid_at | datetime | nullable |
| status | varchar | pending/paid/... |
| refund_window_ends_at | datetime | nullable |
| created_at | datetime | |
| updated_at | datetime | |

## 22.5 order_items
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| order_id | bigint | FK |
| package_id | bigint | nullable |
| product_id | bigint | nullable future use |
| qty | integer | |
| unit_price_usdt | decimal | |
| unit_pv | decimal | |
| line_total_usdt | decimal | |
| line_total_pv | decimal | |
| created_at | datetime | |
| updated_at | datetime | |

## 22.6 commission_ledger
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| beneficiary_user_id | bigint | who gets it |
| source_user_id | bigint | buyer / source member |
| order_id | bigint | source order |
| commission_type | varchar | direct / uni / pool |
| level_no | integer | nullable for direct/pool |
| rate | decimal | e.g. 0.20 |
| base_pv | decimal | |
| commission_amount | decimal | system-calculated |
| original_target_user_id | bigint | original sponsor/upline |
| rollup_from_user_id | bigint | nullable |
| rollup_depth | integer | default 0 |
| cycle_ref_id | bigint | pool cycle id if needed |
| status | varchar | pending/approved/withdrawable/paid_out/reversed/fallback |
| fallback_to_company | boolean | |
| finalize_checked_at | datetime | |
| created_at | datetime | |
| updated_at | datetime | |

## 22.7 company_bonus_ledger
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| source_type | varchar | direct/uni/pool/reversal |
| source_ref_id | bigint | e.g. commission id or cycle id |
| bonus_type | varchar | direct / uni / pool |
| amount | decimal | |
| reason | varchar | no_active_sponsor / capped / no_eligible_pool ... |
| created_at | datetime | |

## 22.8 daily_pool_cycles
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| cycle_date | date | unique |
| total_pv | decimal | |
| pool_rate | decimal | default 0.50 |
| pool_fund | decimal | |
| eligible_member_count | integer | |
| payout_per_member | decimal | |
| status | varchar | open / closed / adjusted |
| created_at | datetime | |
| updated_at | datetime | |

## 22.9 daily_pool_eligibility_snapshots
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| cycle_id | bigint | FK daily_pool_cycles.id |
| user_id | bigint | |
| is_active | boolean | |
| active_direct_referral_count | integer | |
| is_eligible | boolean | |
| reason | varchar | |
| created_at | datetime | |

## 22.10 daily_pool_payouts
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| cycle_id | bigint | FK |
| user_id | bigint | |
| payout_amount | decimal | |
| status | varchar | pending/approved/withdrawable/paid_out/reversed/fallback |
| created_at | datetime | |
| updated_at | datetime | |

## 22.11 wallets
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| user_id | bigint | unique FK |
| pending_balance | decimal | |
| approved_balance | decimal | |
| withdrawable_balance | decimal | |
| paid_out_balance | decimal | |
| created_at | datetime | |
| updated_at | datetime | |

## 22.12 wallet_transactions
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| user_id | bigint | |
| tx_type | varchar | direct_credit / uni_credit / pool_credit / payout_sent ... |
| direction | varchar | credit / debit |
| ref_type | varchar | commission / pool / reversal / payout_batch |
| ref_id | bigint | |
| amount | decimal | |
| status | varchar | pending / posted / reversed |
| created_at | datetime | |
| updated_at | datetime | |

## 22.13 refunds
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| order_id | bigint | |
| refund_type | varchar | full / partial |
| amount | decimal | |
| pv_reversal_amount | decimal | |
| status | varchar | requested / approved / done |
| created_at | datetime | |
| updated_at | datetime | |

## 22.14 commission_reversals
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| commission_ledger_id | bigint | |
| amount | decimal | |
| reason | varchar | refund / cancel / admin_adjust |
| status | varchar | pending / applied |
| created_at | datetime | |
| updated_at | datetime | |

## 22.15 payout_batches
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| batch_no | varchar | unique |
| total_amount | decimal | |
| item_count | integer | |
| chain_id | varchar | |
| token_address | varchar | |
| submitted_tx_hash | varchar | nullable |
| submitted_at | datetime | nullable |
| confirmed_at | datetime | nullable |
| status | varchar | draft / submitted / confirmed / failed |
| created_at | datetime | |
| updated_at | datetime | |

## 22.16 payout_batch_items
| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| batch_id | bigint | |
| user_id | bigint | |
| wallet_address | varchar | |
| amount | decimal | |
| ref_type | varchar | commission / pool / wallet |
| ref_id | bigint | |
| tx_hash | varchar | nullable |
| status | varchar | reserved / sent / confirmed / failed |
| created_at | datetime | |
| updated_at | datetime | |

---

## 23) Database Relationships (Summary)

- users 1:N orders
- users 1:N member_package_cycles
- users self-reference sponsor_id
- packages 1:N member_package_cycles
- orders 1:N order_items
- orders 1:N commission_ledger
- daily_pool_cycles 1:N daily_pool_eligibility_snapshots
- daily_pool_cycles 1:N daily_pool_payouts
- users 1:1 wallets
- users 1:N wallet_transactions
- payout_batches 1:N payout_batch_items
- commission_ledger 1:N commission_reversals

---

## 24) API Design Draft

## 24.1 Auth APIs
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/connect-wallet`
- `POST /auth/verify-wallet-signature`
- `POST /auth/logout`

## 24.2 Member APIs
- `GET /me`
- `GET /me/package-cycle`
- `GET /me/direct-referrals`
- `GET /me/uplines`
- `GET /me/qualification`
- `GET /me/income-summary`
- `GET /me/income-history`

## 24.3 Package APIs
- `GET /packages`
- `GET /packages/:id`

## 24.4 Order APIs
- `POST /orders`
- `GET /orders/:id`
- `GET /orders`
- `POST /orders/:id/pay`
- `POST /orders/:id/cancel`
- `POST /orders/:id/refund-request`

## 24.5 Wallet APIs
- `GET /wallet`
- `GET /wallet/transactions`
- `POST /wallet/withdraw-request`
- `GET /wallet/payout-batches`

## 24.6 Commission APIs
- `GET /commissions`
- `GET /commissions/direct`
- `GET /commissions/uni`
- `GET /commissions/pool`

## 24.7 Admin APIs
- `GET /admin/members`
- `GET /admin/members/:id`
- `GET /admin/orders`
- `GET /admin/package-cycles`
- `GET /admin/commissions`
- `GET /admin/company-fallback`
- `GET /admin/pool-cycles`
- `GET /admin/payout-batches`
- `POST /admin/pool-cycles/:date/close`
- `POST /admin/payout-batches`
- `POST /admin/payout-batches/:id/submit`

---

## 25) Jobs / Events / Scheduler

ระบบควรมี background jobs อย่างน้อย:

### 25.1 Event-driven jobs
- `order_paid_job`
- `package_cycle_activate_job`
- `commission_candidate_create_job`
- `refund_reverse_job`

### 25.2 Scheduled jobs
- `finalize_commission_job`
- `daily_pool_eligibility_snapshot_job`
- `daily_pool_close_job`
- `wallet_promote_to_withdrawable_job`
- `payout_batch_create_job`
- `payout_submit_job`
- `payout_confirm_job`

### 25.3 เหตุผล
- แยกโหลดงานหนักออกจาก synchronous API
- ควบคุม retry ได้
- ทำ audit และ reconciliation ได้ง่าย

---

## 26) Pseudocode ระดับวางแผน

## 26.1 Direct Roll-up Pseudocode

```text
function resolveDirectBeneficiary(buyer):
    current = buyer.sponsor
    depth = 0

    while current is not null:
        if isMemberQualified(current):
            return { beneficiary: current, rollup_depth: depth }
        current = current.sponsor
        depth += 1

    return COMPANY
```

## 26.2 Uni Compressed Roll-up Pseudocode

```text
function resolveUniBeneficiaries(buyer, max_levels = 15):
    current = buyer.sponsor
    active_list = []

    while current is not null and len(active_list) < max_levels:
        if isMemberQualified(current):
            active_list.append(current)
        current = current.sponsor

    return active_list
```

## 26.3 Pool Eligibility Pseudocode

```text
function isEligibleForPool(member, date):
    if not isMemberQualifiedOnDate(member, date):
        return false

    direct_active_count = countActiveDirectReferrals(member, date)

    return direct_active_count >= 2
```

## 26.4 Earning Cap Check Pseudocode

```text
function canReceiveBonus(member, amount):
    cycle = getCurrentActiveCycle(member)
    if cycle is null:
        return false

    if now > cycle.active_until:
        return false

    if cycle.earning_status == 'capped':
        return false

    if cycle.earned_total_in_cycle + amount > cycle.earning_cap:
        return false

    return true
```

---

## 27) Reporting Requirements

## 27.1 Member Report
- member profile
- sponsor
- current cycle
- active_until
- earned total
- cap remaining
- direct active referrals count

## 27.2 Commission Report
- source order
- buyer
- bonus type
- level
- original target
- final beneficiary
- roll-up depth
- status
- fallback reason

## 27.3 Pool Report
- cycle date
- total PV
- pool fund
- eligible members
- payout per member
- fallback amount

## 27.4 Company Fallback Report
- date
- source type
- reason
- amount
- linked source ref

## 27.5 Payout Report
- batch no
- total amount
- item count
- token
- chain
- tx hash
- confirm status

---

## 28) Admin UI / UX Requirements

ควรมีหน้าหลักอย่างน้อย:

1. Dashboard
2. Members
3. Member Detail
4. Packages
5. Orders
6. Package Cycles
7. Commission Ledger
8. Pool Cycles
9. Company Fallback Ledger
10. Wallet / Payout Batches
11. Reversal / Refund Audit

Member detail ควรเห็น:
- sponsor tree summary
- direct referrals
- active cycle
- cap progress
- recent bonuses
- roll-up impacts

---

## 29) Security Requirements

## 29.1 Application Security
- password hashing
- JWT / session token security
- role-based access control
- admin route protection
- rate limit

## 29.2 Wallet Security
- nonce-based signature
- one-wallet-per-account policy or explicit policy definition
- wallet rebinding controls
- manual review on suspicious rebinding

## 29.3 Treasury Security
- multisig treasury
- separated hot vs cold wallet concept
- payout batch approval workflow
- reconciliation before submit

## 29.4 Audit Security
- immutable audit logs for financial actions
- every manual adjustment must record operator and reason

---

## 30) Fraud / Abuse Controls

## 30.1 Self Referral Risk
ต้องมีการตรวจ:
- duplicate identity
- duplicate wallet
- suspicious sponsor patterns
- same device / same IP clustering

## 30.2 Fake Orders
ต้องมี:
- payment confirmation
- refund window
- delayed finalize
- manual review thresholds

## 30.3 Pool Abuse
ต้องกัน:
- ปั่นสมาชิก active แบบไม่มีธุรกรรมจริง
- direct referrals ที่เป็น ghost accounts

## 30.4 Earning Cap Abuse
ต้องห้าม:
- เปิดหลายบัญชีเพื่อหลบ cap
- recycle sponsor chain

---

## 31) Financial Risk Notes

แผนนี้มี payout framework สูงมาก:

- Direct = 20% ของ PV
- Uni = 10% ของ PV
- Daily Pool = 50% ของ PV

รวมเชิง framework = **80% ของ PV**

ดังนั้นต้องย้ำว่า:
- PV ต้องถูกกำหนดอย่างระมัดระวัง
- ไม่ควรตั้ง PV ใกล้ price_usdt ถ้า margin จริงไม่รองรับ
- earning cap เป็นตัวกันระบบสำคัญ
- active_days และ fallback rules มีผลต่อ payout จริง
- ต้องมี simulation ก่อน go-live

---

## 32) Recommended PV Policy

ควรกำหนด policy ภายในว่า:
- PV ไม่ใช่ price
- PV ควรเป็น commissionable base ที่ผ่านการคำนวณ margin แล้ว
- แต่ละ package ต้องผ่าน profitability review ก่อน publish

ตัวอย่างแนวคิด:
- package 100 USDT อาจตั้ง PV 40, 50 หรือ 60 ไม่ใช่ 100
- ต้องมี internal margin worksheet ก่อนอนุมัติ package

---

## 33) Example Calculations

## 33.1 Case A: Standard Direct + Uni
Package price = 100 USDT  
PV = 60

### Direct
20% x 60 = 12

### Uni
- level 1–5: 1% x 60 = 0.6 ต่อ level รวม 3
- level 6–15: 0.5% x 60 = 0.3 ต่อ level รวม 3
- รวม uni = 6

รวม direct + uni = 18

## 33.2 Case B: Direct Roll-up
Buyer A  
Sponsor B inactive  
Sponsor of B = C active  
Direct = 12  
ผู้ได้จริง = C

## 33.3 Case C: Compressed Uni
Active uplines ที่พบจริงมี 8 คน  
ระบบจ่าย:
- level 1–5 อัตรา 1%
- level 6–8 อัตรา 0.5%
- level 9–15 ไม่มีผู้รับ → company fallback

## 33.4 Case D: Daily Pool
Total PV today = 10,000  
Pool fund = 50% = 5,000  
Eligible members = 250  
Payout per member = 20

## 33.5 Case E: Earning Cap
Current cycle earning cap = 300  
Member earned_total_in_cycle = 295  
โบนัสใหม่ = 20  

Phase 1 policy:
- ไม่ split partial
- รายการนี้ block ทั้งก้อน
- โบนัส 20 เข้าบริษัท
- member status = capped
- repurchase_required = true

---

## 34) Implementation Roadmap

## Sprint 0: Planning Freeze
- finalize rules
- finalize schema
- finalize API
- finalize job flow
- define refund window
- define payout ops

## Sprint 1: Auth + Members + Packages
- register/login
- sponsor binding
- wallet connect
- package CRUD
- member profile

## Sprint 2: Orders + Package Cycles
- order creation
- payment flow
- package cycle activation
- active status checks

## Sprint 3: Commission Engine
- direct roll-up
- uni compressed roll-up
- pending ledgers
- company fallback

## Sprint 4: Daily Pool Engine
- daily PV accumulation
- eligibility snapshots
- close cycle
- pool payouts

## Sprint 5: Wallet + Reporting
- wallet balances
- wallet tx logs
- admin dashboards
- reports

## Sprint 6: Web3 Settlement
- treasury integration
- payout batches
- tx hash reconciliation
- operator workflows

---

## 35) Phase 1 MVP Recommendation

ควรทำสิ่งต่อไปนี้ก่อน:
- backend off-chain เต็ม
- internal wallet ledger
- daily pool off-chain
- payout batch generation
- manual/controlled USDT settlement
- tx hash reconciliation

ยังไม่ควรทำใน Phase 1:
- full on-chain commission logic
- NFT package pass
- weighted pool
- advanced tokenomics layer

---

## 36) Open Questions ที่ควรล็อกก่อนเริ่มโค้ด

1. refund window กี่วัน
2. allowed package repurchase timing เป็นอย่างไร
3. 1 member ถือได้หลาย active cycles พร้อมกันหรือไม่
4. direct active referrals ต้อง active จาก package ประเภทใดก็ได้หรือเฉพาะ package ที่กำหนด
5. payout minimum threshold สำหรับถอนเท่าไร
6. treasury submit แบบ manual approval หรือ semi-automated
7. partial refund จะ reverse pool อย่างไรใน accounting policy
8. จะใช้ chain ไหนสำหรับ USDT settlement ใน Phase 1

---

## 37) Final Technical Recommendation

คำแนะนำสุดท้ายคือให้สร้างระบบนี้ในรูปแบบ:

**Web3-enabled eCommerce referral platform with off-chain qualification and commission engine, plus on-chain USDT settlement**

สรุปหลักการสำคัญ:
- ธุรกิจอยู่ที่ eCommerce
- คอมมิชชั่นคำนวณจาก PV
- Direct และ Uni ใช้ roll-up
- Pool ใช้ daily eligibility
- Earning cap บังคับ repurchase
- Wallet ภายในเป็นแหล่งความจริงของยอด
- Blockchain ใช้สำหรับ settlement และ audit trail

---

## 38) Prompt ต่อเนื่องสำหรับ Codex

```text
ใช้ไฟล์ Planning Pack นี้เป็น source of truth สำหรับงานออกแบบเชิงเทคนิคและ implementation plan ต่อไป

สิ่งที่ต้องทำต่อ:
1. แปลง planning นี้เป็น technical design document
2. ออกแบบ database schema ระดับ migration-ready
3. ออกแบบ REST API contracts
4. ออกแบบ jobs/events/cron flow
5. เขียน pseudocode ของ qualification engine, direct roll-up, uni compressed roll-up, daily pool engine, earning cap engine
6. ออกแบบ wallet ledger posting rules
7. ออกแบบ payout batch + on-chain settlement flow
8. ออกแบบ admin/report modules
9. เสนอ Phase 1 implementation order แบบละเอียด

ข้อสำคัญ:
- ห้ามเปลี่ยน business rules
- เริ่มจาก design ก่อน code
- ชี้จุดเสี่ยงเรื่อง payout สูงมากให้ชัด
- เสนอ optional improvements แยกท้ายเอกสาร
```
