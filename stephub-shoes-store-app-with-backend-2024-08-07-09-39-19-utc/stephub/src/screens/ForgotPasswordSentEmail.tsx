import {FC} from 'react';
import {useLocation} from 'react-router-dom';

import {hooks} from '../hooks';
import {theme} from '../constants';
import {components} from '../components';

type ForgotPasswordSuccessState = {
  title?: string;
  message?: string;
};

export const ForgotPasswordSentEmail: FC = () => {
  const navigate = hooks.useAppNavigate();
  const location = useLocation();
  const state = (location.state || {}) as ForgotPasswordSuccessState;

  const title = state.title || 'รีเซ็ตรหัสผ่านเรียบร้อย';
  const message =
    state.message ||
    'password คือ เลข 6 หลักท้ายบัตรประชาชน\nกรุณาใช้รหัสนี้เข้าสู่ระบบ แล้วเปลี่ยนรหัสผ่านใหม่ภายหลัง';

  return (
    <div style={{padding: '50px 20px 20px 20px'}}>
      <img
        src={require('../assets/icons/09.png')}
        alt='password reset success'
        style={{
          width: 225.18,
          display: 'block',
          margin: '0 auto',
          marginBottom: 14,
        }}
      />
      <h2
        style={{
          margin: 0,
          textAlign: 'center',
          ...theme.fonts.Mulish_700Bold,
          fontSize: 22,
          lineHeight: 1.2,
          color: theme.colors.mainColor,
          marginBottom: 14,
          whiteSpace: 'pre-line',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          whiteSpace: 'pre-line',
          textAlign: 'center',
          color: theme.colors.textColor,
          ...theme.fonts.Mulish_400Regular,
          lineHeight: 1.7,
          fontSize: 16,
          marginBottom: 30,
        }}
      >
        {message}
      </p>
      <components.Button
        title='กลับไปเข้าสู่ระบบ'
        onClick={() => {
          navigate('/SignIn');
        }}
      />
    </div>
  );
};
