import axios from 'axios';
import React, {useEffect, useState} from 'react';
import {useLocation} from 'react-router-dom';

import {hooks} from '../hooks';
import {URLS} from '../config';
import {theme} from '../constants';
import {formatTHBText} from '../utils/currency';
import {components} from '../components';
import {RootState} from '../store';
import {actions} from '../store/actions';

type PaymentInstructions = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  promptPayName: string;
  promptPayNumber: string;
  qrImageUrl: string;
  note: string;
};

export const OrderSuccessful: React.FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = hooks.useAppNavigate();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);
  const location = useLocation();
  const order = location.state?.order;
  const productItems = Array.isArray(location.state?.productItems)
    ? location.state.productItems
    : [];
  const [paymentInstructions, setPaymentInstructions] =
    useState<PaymentInstructions | null>(null);

  useEffect(() => {
    dispatch(actions.resetCart());
    window.scrollTo(0, 0);
  }, [dispatch]);

  useEffect(() => {
    const loadPaymentInstructions = async () => {
      if (!user?.accessToken) {
        setPaymentInstructions(null);
        return;
      }

      try {
        const response = await axios.get<PaymentInstructions>(
          URLS.AUTH_PAYMENT_INSTRUCTIONS,
          {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
            withCredentials: true,
          },
        );

        setPaymentInstructions(response.data);
      } catch (error) {
        console.error(error);
        setPaymentInstructions(null);
      }
    };

    loadPaymentInstructions();
  }, [user?.accessToken]);

  const renderContent = (): JSX.Element => {
    return (
      <>
        <components.Header title='Order successful' goBack={true} />
        <div
          style={{
            minHeight: 'calc(100vh - 72px)',
            padding: '20px 20px 120px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background:
              'linear-gradient(180deg, #F7FAFF 0%, #FFFFFF 260px)',
          }}
        >
        <h2
          style={{
            textAlign: 'center',
            marginTop: 12,
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
            ? `เลขที่คำสั่งซื้อ ${order.orderNo}${'\n'}กรุณาโอนเงินตามข้อมูลด้านล่าง และอัปโหลดสลิปจากหน้าประวัติคำสั่งซื้อเพื่อดำเนินการต่อ`
            : `ยืนยันรายการสินค้าสำเร็จแล้ว${'\n'}กรุณาโอนเงินตามข้อมูลด้านล่าง และไปที่หน้าประวัติคำสั่งซื้อเพื่ออัปโหลดสลิป`}
        </p>
        {paymentInstructions ? (
          <div
            style={{
              width: '100%',
              padding: 18,
              borderRadius: 16,
              backgroundColor: '#FFFFFF',
              border: '1px solid #E8EFF4',
              display: 'grid',
              gap: 8,
              marginBottom: 20,
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
            }}
          >
            <span
              style={{
                ...theme.fonts.Mulish_700Bold,
                fontSize: 16,
                lineHeight: 1.5,
                color: theme.colors.mainColor,
              }}
            >
              ข้อมูลสำหรับชำระเงิน
            </span>
            <span
              style={{
                ...theme.fonts.Mulish_700Bold,
                fontSize: 18,
                lineHeight: 1.5,
                color: '#FF4343',
              }}
            >
              ยอดที่ต้องโอน: {' '}
              {formatTHBText(order?.cashDueUsdt || order?.totalUsdt || 0)}
            </span>
            <span
              style={{
                ...theme.fonts.Mulish_400Regular,
                fontSize: 14,
                lineHeight: 1.5,
                color: theme.colors.textColor,
              }}
            >
              วิธีชำระ: {order?.cashPaymentMethod || 'bank_transfer'}
            </span>
            <span
              style={{
                ...theme.fonts.Mulish_400Regular,
                fontSize: 14,
                lineHeight: 1.5,
                color: theme.colors.textColor,
              }}
            >
              ธนาคาร: {paymentInstructions.bankName}
            </span>
            <span
              style={{
                ...theme.fonts.Mulish_400Regular,
                fontSize: 14,
                lineHeight: 1.5,
                color: theme.colors.textColor,
              }}
            >
              ชื่อบัญชี: {paymentInstructions.accountName}
            </span>
            <span
              style={{
                ...theme.fonts.Mulish_400Regular,
                fontSize: 14,
                lineHeight: 1.5,
                color: theme.colors.textColor,
              }}
            >
              เลขบัญชี: {paymentInstructions.accountNumber}
            </span>
            <span
              style={{
                ...theme.fonts.Mulish_400Regular,
                fontSize: 14,
                lineHeight: 1.5,
                color: theme.colors.textColor,
              }}
            >
              PromptPay: {paymentInstructions.promptPayName} •{' '}
              {paymentInstructions.promptPayNumber}
            </span>
            {paymentInstructions.qrImageUrl ? (
              <img
                alt='QR รับเงิน'
                src={paymentInstructions.qrImageUrl}
                style={{
                  width: '100%',
                  maxWidth: 260,
                  margin: '8px auto 0',
                  borderRadius: 12,
                  border: '1px solid #E8EFF4',
                  backgroundColor: theme.colors.white,
                }}
              />
            ) : null}
            {paymentInstructions.note ? (
              <span
                style={{
                  ...theme.fonts.Mulish_400Regular,
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: theme.colors.textColor,
                }}
              >
                {paymentInstructions.note}
              </span>
            ) : null}
          </div>
        ) : null}
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
                      {item.price ? ` · ${formatTHBText(item.price)}` : ''}
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
      </>
    );
  };

  return renderContent();
};
