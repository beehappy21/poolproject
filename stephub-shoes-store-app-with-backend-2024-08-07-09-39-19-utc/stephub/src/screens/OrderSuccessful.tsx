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
  const productItems = Array.isArray(location.state?.productItems)
    ? location.state.productItems
    : [];

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
          ยืนยันคำสั่งซื้อสินค้าเรียบร้อย
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
            : `ยืนยันรายการสินค้าสำเร็จแล้ว${'\n'}กรุณาไปที่หน้าประวัติคำสั่งซื้อเพื่ออัปโหลดสลิปโอนเงิน`}
        </p>
        {productItems.length ? (
          <div
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 12,
              backgroundColor: '#F7F8FC',
              marginBottom: 20,
            }}
          >
            <h3
              style={{
                margin: '0 0 10px 0',
                fontSize: 16,
                color: theme.colors.mainColor,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              รายการสินค้าที่สั่งซื้อ
            </h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
              {productItems.slice(0, 3).map(
                (item: {
                  id?: string | number;
                  name?: string;
                  productCode?: string;
                  quantity?: number;
                  price?: number;
                }) => (
                  <div
                    key={item.id || `${item.name}-${item.productCode}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{flex: 1, minWidth: 0}}>
                      <p
                        style={{
                          margin: 0,
                          color: theme.colors.mainColor,
                          ...theme.fonts.Mulish_600SemiBold,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.name || 'สินค้า'}
                      </p>
                      {item.productCode ? (
                        <p
                          style={{
                            margin: '2px 0 0 0',
                            color: theme.colors.textColor,
                            fontSize: 12,
                            lineHeight: 1.4,
                          }}
                        >
                          รหัสสินค้า: {item.productCode}
                        </p>
                      ) : null}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        color: theme.colors.textColor,
                        fontSize: 14,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      x{item.quantity || 1}
                      {item.price ? ` · $${item.price}` : ''}
                    </p>
                  </div>
                ),
              )}
              {productItems.length > 3 ? (
                <p
                  style={{
                    margin: 0,
                    color: theme.colors.textColor,
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  และอีก {productItems.length - 3} รายการ
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
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
