# เช็กลิสต์ความพร้อมก่อนใช้งานจริงบนเซิร์ฟเวอร์

อัปเดต: 2026-04-11

ใช้ไฟล์นี้เป็นรายการตรวจหลักสำหรับการขึ้น UAT, trial server และการขยับต่อไปสู่ production

## 1. ตัดสินใจขอบเขตของรอบ deploy

- [ ] รอบนี้เป็น `UAT ภายใน`, `ทดลองกับผู้ใช้บางส่วน`, หรือ `production จริง`
- [ ] ระบุคนรับผิดชอบ 3 บทบาทให้ชัด:
  - [ ] คนอนุมัติ deploy
  - [ ] คนรัน smoke test
  - [ ] คนอนุมัติ rollback
- [ ] ยืนยันโดเมนที่จะใช้จริง:
  - [ ] `https://api.blifehealthy.com`
  - [ ] `https://bao.blifehealthy.com`
  - [ ] `https://wap.blifehealthy.com`

## 2. โครงสร้างพื้นฐานของเซิร์ฟเวอร์

- [ ] เลือกวิธี deploy หลักให้ชัดเจนหนึ่งแบบ
  - [ ] `Docker Compose`
  - [ ] `systemd`
  - [ ] อื่นที่ทีมตกลงร่วมกัน
- [ ] Reverse proxy พร้อมใช้งาน
- [ ] TLS/HTTPS พร้อมใช้งาน
- [ ] Firewall เปิดเฉพาะ port ที่จำเป็น
- [ ] มี process supervision สำหรับ service ที่รันยาว
- [ ] กำหนดที่เก็บ log ชัดเจน
- [ ] พื้นที่ disk พอสำหรับ database, backup, uploads, logs

## 3. ความพร้อมของแอปและ runtime config

- [ ] รัน build ผ่าน
- [ ] รัน type check / lint ผ่าน
- [ ] มี env file จริงบนเซิร์ฟเวอร์ แยกจาก repo
- [ ] ค่าที่ต้องตรวจใน API env:
  - [ ] `DATABASE_URL`
  - [ ] `APP_PORT`
  - [ ] `APP_PUBLIC_BASE_URL`
  - [ ] `APP_WAP_URL`
  - [ ] `APP_CORS_ORIGINS`
  - [ ] `APP_BODY_LIMIT`
  - [ ] `APP_TRUST_PROXY_HOPS`
  - [ ] `APP_RATE_LIMIT_WINDOW_MS`
  - [ ] `APP_RATE_LIMIT_MAX_REQUESTS`
  - [ ] `APP_REDIS_URL`
- [ ] ค่าที่ต้องตรวจใน LINE env:
  - [ ] `LINE_CHANNEL_ID`
  - [ ] `LINE_LOGIN_CHANNEL_ID`
  - [ ] `LINE_LOGIN_CHANNEL_SECRET`
  - [ ] `LINE_LOGIN_CALLBACK_URL`
  - [ ] `LINE_LIFF_ID`
  - [ ] `LINE_LIFF_SIGNIN_URL`
  - [ ] `LINE_STRICT_VERIFY=true`

## 4. ฐานข้อมูลและความปลอดภัยของข้อมูล

- [ ] backup ก่อน deploy ทุกครั้ง
- [ ] รู้ตำแหน่งไฟล์ backup ล่าสุด
- [ ] ทดสอบ restore หรือมีขั้นตอน restore ที่ยืนยันแล้ว
- [ ] Prisma schema ถูก apply กับฐานข้อมูลเป้าหมาย
- [ ] ถ้าต้องใช้ Stephub compatibility views ให้ apply แล้ว
- [ ] ถ้ามี LINE runtime เก่า ให้ migrate แล้ว

## 5. Worker และ Redis

- [ ] ตัดสินใจชัดว่ารอบนี้ใช้ worker จริงหรือไม่
- [ ] ถ้าใช้ worker:
  - [ ] Redis ต้องเข้าถึงได้จริง
  - [ ] `APP_REDIS_URL` ต้องถูกต้อง
  - [ ] มีการรัน worker เป็น service จริง
  - [ ] flow ที่พึ่ง background processing ถูกทดสอบแล้ว
- [ ] ถ้ายังไม่ใช้ worker:
  - [ ] บันทึกไว้ชัดเจนว่ารอบนี้ไม่พึ่ง async jobs
  - [ ] ไม่ต้อง start service `worker` ใน Docker Compose รอบนั้น

## 6. การตรวจหลัง deploy

- [ ] API health ผ่าน
  - [ ] `https://api.blifehealthy.com/health`
- [ ] BAO login เปิดได้
  - [ ] `https://bao.blifehealthy.com/admin/login`
- [ ] WAP เปิดได้
  - [ ] `https://wap.blifehealthy.com`
- [ ] LINE sign-in route เปิดได้
  - [ ] `https://wap.blifehealthy.com/line/liff/signin`
- [ ] Public auth bridge ผ่าน
- [ ] WAP verify ผ่านเมื่อมีการเปลี่ยน frontend

## 7. Smoke และ manual UAT

- [ ] รัน smoke เท่าที่ตรงกับ scope ของ release
- [ ] ทดสอบ flow หลักอย่างน้อย 1 รอบ:
  - [ ] login
  - [ ] create order
  - [ ] submit slip
  - [ ] approve ใน BAO
  - [ ] mark shipped
  - [ ] mark delivered
- [ ] ตรวจ stock, wallet, commission ตาม flow ที่เพิ่งทดสอบ

## 8. Monitoring และการดูแลหลังปล่อย

- [ ] รู้ว่าดู log ที่ไหน
- [ ] รู้คำสั่ง restart service
- [ ] มี health check ภายนอกอย่างน้อยสำหรับ API
- [ ] รู้ว่าใครเป็นคนรับ incident แรก
- [ ] กำหนด trigger ของ rollback ไว้แล้ว

## 9. ลำดับงานที่แนะนำ

### วันนี้

- [ ] ปิด env shape ให้ครบ
- [ ] เลือก deploy method หลัก
- [ ] ยืนยันว่า worker ใช้หรือไม่ใช้
- [ ] เตรียม reverse proxy และ domain mapping

### ก่อนขึ้น UAT

- [ ] เติม secret จริงบน server
- [ ] build image หรือ build app ให้เสร็จ
- [ ] backup และ migrate database
- [ ] start services และตรวจ health
- [ ] รัน smoke test

### ก่อน production

- [ ] ทบทวน rate limit ให้เหมาะกับ traffic จริง
- [ ] เพิ่ม monitoring/alerting ภายนอก
- [ ] ทดสอบ rollback จริงอย่างน้อย 1 รอบ
- [ ] ยืนยัน owner สำหรับ deploy / incident / restart

## อ้างอิง

- [UAT_DEPLOYMENT_CHECKLIST.md](/Users/macbook/poolproject/UAT_DEPLOYMENT_CHECKLIST.md)
- [UAT_DEPLOYMENT_RUNSHEET.md](/Users/macbook/poolproject/UAT_DEPLOYMENT_RUNSHEET.md)
- [deploy/compose/README.md](/Users/macbook/poolproject/deploy/compose/README.md)
- [SERVER_READINESS_GAP_ASSESSMENT.md](/Users/macbook/poolproject/SERVER_READINESS_GAP_ASSESSMENT.md)
