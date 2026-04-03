import axios from 'axios';
import React, {useState} from 'react';

import {hooks} from '../hooks';
import {custom} from '../custom';
import {theme} from '../constants';
import {components} from '../components';
import {URLS} from '../config';

export const ForgotPassword: React.FC = () => {
  const navigate = hooks.useAppNavigate();

  const [identifier, setIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success');

  const showStatus = (message: string, tone: 'success' | 'error') => {
    setStatusMessage(message);
    setStatusTone(tone);
  };

  const handleResetPassword = async () => {
    if (!identifier.trim()) {
      showStatus('กรุณากรอกรหัสสมาชิก', 'error');
      return;
    }

    setSubmitting(true);
    setStatusMessage('');

    try {
      await axios.post(
        URLS.AUTH_FORGOT_PASSWORD_RESET,
        {
          identifier: identifier.trim(),
        },
        {
          withCredentials: true,
        },
      );

      navigate('/ForgotPasswordSentEmail', {
        state: {
          title: 'รีเซ็ตรหัสผ่านเรียบร้อย',
          message:
            'password คือ เลข 6 หลักท้ายบัตรประชาชน\nกรุณาใช้รหัสนี้เข้าสู่ระบบ แล้วเปลี่ยนรหัสผ่านใหม่ภายหลัง',
        },
      });
    } catch (error: any) {
      console.error(error);
      showStatus(
        error?.response?.data?.message || 'รีเซ็ตรหัสผ่านไม่สำเร็จ',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <components.Header title='Forgot password' goBack={true} />
      <div style={{padding: '30px 20px 20px 20px'}}>
        <p
          style={{
            margin: 0,
            marginBottom: 24,
            color: theme.colors.textColor,
            lineHeight: 1.7,
            ...theme.fonts.Mulish_400Regular,
          }}
        >
          กรอกรหัสสมาชิก แล้วระบบจะรีเซ็ตรหัสผ่านเป็นเลข 6 หลักท้ายบัตรประชาชนทันที
        </p>

        <custom.InputField
          label='รหัสสมาชิก'
          placeholder='TH0000013'
          value={identifier}
          onChange={event => setIdentifier(event.target.value)}
          containerStyle={{marginBottom: 20}}
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
          title={submitting ? 'กำลังรีเซ็ต...' : 'รีเซ็ตเลย'}
          onClick={handleResetPassword}
        />
      </div>
    </>
  );
};
