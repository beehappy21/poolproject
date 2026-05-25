# BAO + WAP UAT Checklist

Date: 2026-04-02
Scope: BAO signup-share settings, WAP share/signup flow, LINE profile binding, and regression checks

## Environment

- [ ] `https://bao.blifehealthy.com/admin/login` opens successfully
- [ ] `https://wap.blifehealthy.com` opens successfully
- [ ] `https://api.blifehealthy.com/health` responds successfully
- [ ] Local/public stack was restarted before testing
- [ ] Test on both `iOS` and `Android`

## BAO Signup Share

- [ ] Open `Commission > Signup Share`
- [ ] Edit `ข้อความแนบลิงก์สมัคร`
- [ ] Edit `ข้อความหลังสมัครสำเร็จ`
- [ ] Click `Save Signup Share Messages`
- [ ] Success message appears
- [ ] Refresh the page and confirm values persist
- [ ] Test with `shareLinkMessage = ttt111`
- [ ] Test with `signupSuccessMessage = ttt222`
- [ ] Refresh again and confirm `ttt111 / ttt222` remain

## API Settings Sync

- [ ] `GET /settings/signup-share` returns the saved `shareLinkMessage`
- [ ] `GET /settings/signup-share` returns the saved `signupSuccessMessage`

## WAP Share Flow

- [ ] Share page shows `ลิงก์แนะนำของคุณ`
- [ ] Referral link uses `/SignUp?ref=...`
- [ ] Share text uses BAO `ข้อความแนบลิงก์สมัคร`
- [ ] `แชร์ผ่าน LINE` works
- [ ] `คัดลอกลิงก์` works

## Signup Flow on iOS

- [ ] Open invite link from LINE
- [ ] LINE profile is loaded
- [ ] LINE display name appears on signup page
- [ ] Signup completes successfully
- [ ] Success popup uses BAO `ข้อความหลังสมัครสำเร็จ`
- [ ] Success popup shows member code
- [ ] Success popup shows password

## Signup Flow on Android

- [ ] Open invite link from LINE
- [ ] No `400 Bad Request`
- [ ] LINE profile is loaded
- [ ] LINE display name appears on signup page
- [ ] Signup completes successfully
- [ ] Success popup uses BAO `ข้อความหลังสมัครสำเร็จ`
- [ ] Success popup shows member code
- [ ] Success popup shows password

## Business Rules

- [ ] `1 LINE = 1 account` is enforced
- [ ] A LINE account that already signed up cannot sign up again
- [ ] Duplicate LINE signup shows a clear warning
- [ ] Duplicate LINE signup does not create a new member
- [ ] A different LINE account can sign up successfully
- [ ] Signup is blocked when no LINE profile is available
- [ ] The no-profile message clearly instructs the user to reopen from LINE

## Regression

- [ ] BAO login still works
- [ ] WAP Home still works
- [ ] WAP Profile still works
- [ ] WAP SignUp still works
- [ ] LINE connect flow from Profile still works
- [ ] Public API/BAO/WAP still respond normally after restart

## Evidence

- [ ] Screenshot of BAO after saving signup-share messages
- [ ] Screenshot or response of `GET /settings/signup-share`
- [ ] iOS success popup screenshot
- [ ] Android success popup screenshot
- [ ] Duplicate LINE warning screenshot
