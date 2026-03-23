import React, {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

import {hooks} from '../hooks';
import {theme} from '../constants';
import {components} from '../components';
import {actions} from '../store/actions';

export const OrderSuccessful: React.FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = hooks.useAppNavigate();
  const location = useLocation();
  const order = location.state?.order;

  useEffect(() => {
    dispatch(actions.resetCart());
    window.scrollTo(0, 0);
  }, [dispatch]);

  const renderContent = (): JSX.Element => {
    return (
      <div
        style={{
          height: '100vh',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          src={require('../assets/icons/03.png')}
          alt='order successful'
          style={{
            width: 225.18,
            display: 'block',
            margin: '0 auto',
            marginBottom: 4,
          }}
        />
        <h2
          style={{
            textAlign: 'center',
            marginBottom: 14,
            fontSize: 22,
            color: theme.colors.mainColor,
            textTransform: 'capitalize',
            ...theme.fonts.Mulish_700Bold,
          }}
        >
          สร้างคำสั่งซื้อเรียบร้อย
        </h2>
        <p
          style={{
            color: theme.colors.textColor,
            whiteSpace: 'pre-line',
            textAlign: 'center',
            lineHeight: 1.7,
            fontSize: 16,
            margin: 0,
            marginBottom: 30,
          }}
        >
          {order?.orderNo
            ? `เลขที่คำสั่งซื้อ ${order.orderNo}${'\n'}กรุณาอัปโหลดสลิปโอนเงินจากหน้าประวัติคำสั่งซื้อเพื่อดำเนินการต่อ`
            : `สร้างคำสั่งซื้อสำเร็จแล้ว${'\n'}กรุณาไปที่หน้าประวัติคำสั่งซื้อเพื่ออัปโหลดสลิปโอนเงิน`}
        </p>
        <components.Button
          title='ดูประวัติคำสั่งซื้อ'
          onClick={() => {
            dispatch(actions.setScreen('Home'));
            navigate('/OrderHistory');
          }}
          containerStyle={{marginBottom: 10, width: '100%'}}
        />
        <components.Button
          title='กลับหน้าแรก'
          onClick={() => {
            navigate('/TabNavigator');
          }}
          colorScheme='light'
          containerStyle={{width: '100%'}}
        />
      </div>
    );
  };

  return renderContent();
};
