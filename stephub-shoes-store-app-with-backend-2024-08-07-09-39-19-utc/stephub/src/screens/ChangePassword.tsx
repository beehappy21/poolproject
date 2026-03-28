import axios from 'axios';
import React, {useEffect, useMemo, useState} from 'react';

import {hooks} from '../hooks';
import {URLS} from '../config';
import {custom} from '../custom';
import {components} from '../components';
import {theme} from '../constants';

export const ChangePassword: React.FC = () => {
  const navigate = hooks.useAppNavigate();
  const user = hooks.useAppSelector(state => state.userSlice.user);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const authHeaders = useMemo(
    () =>
      user?.accessToken
        ? {
            Authorization: `Bearer ${user.accessToken}`,
          }
        : undefined,
    [user?.accessToken],
  );

  const showStatus = (message: string, tone: 'success' | 'error') => {
    setStatusMessage(message);
    setStatusTone(tone);
    window.setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleSubmit = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      showStatus('กรุณากรอกรหัสผ่านให้ครบ', 'error');
      return;
    }

    if (newPassword.trim().length < 6) {
      showStatus('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showStatus('ยืนยันรหัสผ่านใหม่ไม่ตรงกัน', 'error');
      return;
    }

    if (!user?.accessToken) {
      showStatus('ไม่พบ session สำหรับเปลี่ยนรหัสผ่าน', 'error');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(
        URLS.AUTH_CHANGE_PASSWORD,
        {
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        },
        {
          headers: authHeaders,
          withCredentials: true,
        },
      );

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showStatus('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว', 'success');
      window.setTimeout(() => navigate(-1), 800);
    } catch (error: any) {
      console.error(error);
      showStatus(
        error?.response?.data?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <components.Header title='Change password' goBack={true} />
      <div style={{padding: '30px 20px 110px 20px'}}>
        <p
          style={{
            margin: 0,
            marginBottom: 24,
            color: theme.colors.textColor,
            lineHeight: 1.6,
          }}
        >
          เปลี่ยนรหัสผ่านสำหรับเข้าใช้งาน app ของสมาชิก
        </p>

        <custom.InputField
          type='password'
          label='current password'
          placeholder='••••••'
          value={currentPassword}
          onChange={event => setCurrentPassword(event.target.value)}
          containerStyle={{marginBottom: 18}}
        />
        <custom.InputField
          type='password'
          label='new password'
          placeholder='••••••'
          value={newPassword}
          onChange={event => setNewPassword(event.target.value)}
          containerStyle={{marginBottom: 18}}
        />
        <custom.InputField
          type='password'
          label='confirm new password'
          placeholder='••••••'
          value={confirmPassword}
          onChange={event => setConfirmPassword(event.target.value)}
          containerStyle={{marginBottom: 18}}
        />

        {statusMessage ? (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: statusTone === 'success' ? '#ECFDF3' : '#FEF2F2',
              color: statusTone === 'success' ? '#027A48' : '#B42318',
              fontSize: 14,
              lineHeight: 1.5,
              ...theme.fonts.Mulish_600SemiBold,
            }}
          >
            {statusMessage}
          </div>
        ) : null}

        <components.Button
          title={submitting ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
          onClick={handleSubmit}
        />
      </div>
    </>
  );
};
