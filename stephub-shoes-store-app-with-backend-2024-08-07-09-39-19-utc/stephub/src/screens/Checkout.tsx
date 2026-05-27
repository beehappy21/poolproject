import axios from 'axios';
import React, {useEffect, useState} from 'react';

import {hooks} from '../hooks';
import {URLS} from '../config';
import {theme} from '../constants';
import {formatDecimalMax2, formatTHB} from '../utils/currency';
import {actions} from '../store/actions';
import {components} from '../components';
import {RootState} from '../hooks';
import {calculateCartPricing} from '../store/slices/cartSlice';

export const Checkout: React.FC = () => {
  const navigate = hooks.useAppNavigate();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);
  const dispatch = hooks.useAppDispatch();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const cart = hooks.useAppSelector(state => state.cartSlice.list);
  const discountAmount = hooks.useAppSelector(
    state => state.cartSlice.discountAmount,
  );
  const discountWalletAmount = hooks.useAppSelector(
    state => state.cartSlice.discountWalletAmount,
  );
  const delivery = hooks.useAppSelector(state => state.cartSlice.delivery);
  const payment = hooks.useAppSelector(state => state.paymentSlice);
  const isBranchPickup = payment.fulfillmentMethod === 'branch_pickup';
  const selectedAddress =
    payment.addresses.find(
      address => address.shippingAddressId === payment.selectedAddressId,
    ) || null;
  const pricingSummary = calculateCartPricing(cart);
  const linePricingByProductId = new Map(
    pricingSummary.lines.map(line => [line.productId, line]),
  );
  const payableTotal = Math.max(
    0,
    pricingSummary.promotionSubtotal - discountAmount + delivery,
  );

  useEffect(() => {
    dispatch(actions.setDiscountWalletAmount(discountWalletAmount));
  }, [discountWalletAmount, dispatch]);

  const textStyle = {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: 400,
    color: theme.colors.textColor,
    ...theme.fonts.Mulish_400Regular,
  };

  const renderHeader = (): JSX.Element => {
    return <components.Header title='ยืนยันคำสั่งซื้อ' goBack={true} line={true} />;
  };

  const renderMyOrder = (): JSX.Element => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 15,
          marginBottom: 30,
        }}
      >
        <div
          style={{
            display: 'flex',
            ...theme.flex.rowCenterSpaceBetween,
            marginBottom: 8,
            padding: '0 20px 6px 20px',
          }}
        >
          <h4
            style={{
              margin: 0,
              ...theme.fonts.Mulish_700Bold,
              color: theme.colors.mainColor,
              lineHeight: 1.2,
              fontSize: 18,
            }}
          >
            รายการสินค้า
          </h4>
          <h4
            style={{
              margin: 0,
              ...theme.fonts.Mulish_700Bold,
              color: theme.colors.mainColor,
              lineHeight: 1.2,
              fontSize: 18,
            }}
          >
            {formatTHB(payableTotal)}
          </h4>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: theme.colors.ghostWhite,
            padding: 20,
            borderTop: 'solid #EDF1FA 4px',
            borderBottom: 'solid #EDF1FA 4px',
            borderColor: theme.colors.ghostWhite2,
          }}
        >
          {/* PRODUCTS */}
          {cart.map((item, index) => {
            const linePricing = linePricingByProductId.get(item.id);
            const quantity = Math.max(1, Number(item.quantity || 1));
            const originalUnitPrice = linePricing?.originalUnitPrice ?? item.price;
            const effectiveUnitPrice =
              linePricing?.effectiveUnitPrice ?? originalUnitPrice;
            const lineTotal = effectiveUnitPrice * quantity;
            const lineHasPromotion =
              Boolean(linePricing) && effectiveUnitPrice < originalUnitPrice;

            return (
              <div
                key={index}
                style={{
                  ...theme.flex.rowCenterSpaceBetween,
                  marginBottom: lineHasPromotion ? 14 : 10,
                  display: 'flex',
                  alignItems: 'flex-start',
                  flexDirection: 'row',
                  gap: 12,
                }}
              >
                <div style={{minWidth: 0}}>
                  <h6
                    style={{
                      textTransform: 'capitalize',
                      margin: 0,
                      color: theme.colors.textColor,
                      fontSize: 14,
                      ...theme.fonts.Mulish_400Regular,
                      fontWeight: 400,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.name}
                    {item.productCode && ` • ${item.productCode}`}
                    {item.pv ? ` • PV ${formatDecimalMax2(item.pv)}` : ''}
                  </h6>
                  {lineHasPromotion ? (
                    <span
                      style={{
                        display: 'block',
                        marginTop: 2,
                        color: '#51BA74',
                        fontSize: 13,
                        ...theme.fonts.Mulish_600SemiBold,
                        lineHeight: 1.5,
                      }}
                    >
                      โปรโมชั่น {quantity} ชิ้น: {formatTHB(effectiveUnitPrice)} / ชิ้น
                    </span>
                  ) : null}
                </div>
                <div style={{textAlign: 'right', whiteSpace: 'nowrap'}}>
                  <span
                    style={{
                      display: 'block',
                      margin: 0,
                      color: theme.colors.textColor,
                      fontSize: 14,
                      ...theme.fonts.Mulish_400Regular,
                      fontWeight: 400,
                      lineHeight: 1.5,
                    }}
                  >
                    {quantity} x {formatTHB(effectiveUnitPrice)}
                  </span>
                  {lineHasPromotion ? (
                    <span
                      style={{
                        display: 'block',
                        color: theme.colors.textColor,
                        opacity: 0.72,
                        fontSize: 12,
                        textDecoration: 'line-through',
                        lineHeight: 1.4,
                      }}
                    >
                      {formatTHB(originalUnitPrice * quantity)}
                    </span>
                  ) : null}
                  <span
                    style={{
                      display: 'block',
                      color: theme.colors.mainColor,
                      fontSize: 14,
                      ...theme.fonts.Mulish_600SemiBold,
                      lineHeight: 1.5,
                    }}
                  >
                    {formatTHB(lineTotal)}
                  </span>
                </div>
              </div>
            );
          })}
          {/* TOTAL */}
          {pricingSummary.promotionDiscountAmount > 0 && (
            <div
              style={{
                display: 'flex',
                ...theme.flex.rowCenterSpaceBetween,
                marginBottom: 10,
              }}
            >
              <div style={{textTransform: 'capitalize'}}>มูลค่าสินค้าก่อนโปร</div>
              <div style={{textTransform: 'capitalize'}}>
                {formatTHB(pricingSummary.originalSubtotal)}
              </div>
            </div>
          )}
          {pricingSummary.promotionDiscountAmount > 0 && (
            <div
              style={{
                display: 'flex',
                ...theme.flex.rowCenterSpaceBetween,
                marginBottom: 10,
              }}
            >
              <div style={{textTransform: 'capitalize'}}>ส่วนลดโปรโมชั่น</div>
              <div style={{textTransform: 'capitalize', color: '#51BA74'}}>
                - {formatTHB(pricingSummary.promotionDiscountAmount)}
              </div>
            </div>
          )}
          {discountAmount > 0 && (
            <div
              style={{
                display: 'flex',
                ...theme.flex.rowCenterSpaceBetween,
                marginBottom: 10,
              }}
            >
              <div style={{textTransform: 'capitalize'}}>ส่วนลด DCW</div>
              <div style={{textTransform: 'capitalize'}}>
                - {formatTHB(discountAmount)}
              </div>
            </div>
          )}
          {/* DELIVERY */}
          <div
            style={{
              ...theme.flex.rowCenterSpaceBetween,
              display: 'flex',
              marginBottom: 10,
            }}
          >
            <h6
              style={{
                textTransform: 'capitalize',
                margin: 0,
                color: theme.colors.textColor,
                fontSize: 14,
                ...theme.fonts.Mulish_400Regular,
                fontWeight: 400,
                lineHeight: 1.5,
              }}
            >
              จัดส่ง
            </h6>
            <span
              style={{
                textTransform: 'capitalize',
                margin: 0,
                color: '#51BA74',
                fontSize: 14,
                ...theme.fonts.Mulish_400Regular,
                fontWeight: 400,
                lineHeight: 1.5,
              }}
            >
              {delivery === 0 ? 'ฟรี' : formatTHB(delivery)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              ...theme.flex.rowCenterSpaceBetween,
              borderTop: `1px solid ${theme.colors.lavenderMist}`,
              paddingTop: 10,
            }}
          >
            <div
              style={{
                textTransform: 'capitalize',
                color: theme.colors.mainColor,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              ยอดที่ต้องชำระ
            </div>
            <div
              style={{
                textTransform: 'capitalize',
                color: theme.colors.mainColor,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              {formatTHB(payableTotal)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInfo = (): JSX.Element => {
    return (
      <div style={{marginBottom: 30}}>
        <div style={{padding: '0 20px'}}>
          <h5
            style={{
              margin: 0,
              marginBottom: 13,
              color: theme.colors.mainColor,
              ...theme.fonts.Mulish_600SemiBold,
              fontSize: 16,
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            ข้อมูลจัดส่งและการชำระเงิน
          </h5>
        </div>
        <div
          style={{
            backgroundColor: theme.colors.ghostWhite,
            padding: 20,
            borderTop: 'solid #EDF1FA 4px',
            borderBottom: 'solid #EDF1FA 4px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span style={{...textStyle, color: theme.colors.mainColor}}>
              {isBranchPickup ? 'รับที่สาขา' : 'ที่อยู่จัดส่ง'}
            </span>
            <button
              onClick={() => navigate('/ShippingAndPaymentInfo')}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                padding: 0,
                color: theme.colors.mainColor,
                cursor: 'pointer',
                textDecoration: 'underline',
                ...theme.fonts.Mulish_600SemiBold,
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {isBranchPickup ? 'เปลี่ยนวิธีรับสินค้า' : 'เปลี่ยนที่อยู่'}
            </button>
          </div>
          {isBranchPickup ? (
            <>
              <h6 style={{...textStyle, marginBottom: 3}}>
                {payment.pickupBranchName || 'ยังไม่ได้ระบุสาขาที่จะรับสินค้า'}
              </h6>
              <h6 style={{...textStyle, marginBottom: 3}}>
                {(payment.name || user?.name || '').trim() || 'ยังไม่ได้ระบุชื่อผู้รับสินค้า'}
              </h6>
              <h6 style={{...textStyle, marginBottom: 3}}>
                {[
                  (payment.phoneNumber || user?.phone || '').trim(),
                  (payment.email || user?.email || '').trim(),
                ]
                  .filter(Boolean)
                  .join(' • ') || 'ยังไม่ได้ระบุข้อมูลติดต่อ'}
              </h6>
              {payment.pickupBranchNote ? (
                <h6 style={{...textStyle, marginBottom: 3}}>
                  หมายเหตุ: {payment.pickupBranchNote}
                </h6>
              ) : null}
            </>
          ) : (
            <>
              <h6 style={{...textStyle, marginBottom: 3}}>
                {selectedAddress?.recipientName || 'ยังไม่ได้เลือกชื่อผู้รับ'}
              </h6>
              <h6 style={{...textStyle, marginBottom: 3}}>
                {selectedAddress?.addressLine || 'ยังไม่ได้เลือกที่อยู่จัดส่ง'}
              </h6>
              {selectedAddress ? (
                <h6 style={{...textStyle, marginBottom: 3}}>
                  {[
                    selectedAddress.subdistrictName,
                    selectedAddress.districtName,
                    selectedAddress.provinceName,
                    selectedAddress.postalCode,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </h6>
              ) : null}
              <h6 style={{...textStyle, marginBottom: 3}}>
                {[selectedAddress?.phone, selectedAddress?.email]
                  .filter(Boolean)
                  .join(' • ') ||
                  'ยังไม่ได้ระบุข้อมูลติดต่อ'}
              </h6>
              {selectedAddress?.label ? (
                <h6 style={{...textStyle, marginBottom: 3}}>
                  ที่อยู่ที่เลือก: {selectedAddress.label}
                </h6>
              ) : null}
            </>
          )}
          <span style={{...textStyle}}>
            วิธีชำระเงิน: โอนเงินและยืนยันด้วยสลิป
          </span>
        </div>
      </div>
    );
  };

  const renderButton = (): JSX.Element => {
    return (
      <>
        {errorMessage ? (
          <p
            style={{
              padding: '0 20px',
              margin: '0 0 12px 0',
              color: theme.colors.coralRed,
              lineHeight: 1.6,
            }}
          >
            {errorMessage}
          </p>
        ) : null}
        <components.Button
          title={submitting ? 'กำลังยืนยัน...' : 'ยืนยันคำสั่งซื้อ'}
          onClick={async () => {
            if (!user?.accessToken) {
              setErrorMessage('กรุณาเข้าสู่ระบบอีกครั้งก่อนยืนยันคำสั่งซื้อ');
              return;
            }

            if (!cart.length) {
              setErrorMessage('ยังไม่มีสินค้าในตะกร้า');
              return;
            }

            const productItems = cart
              .filter(item => item.productDetailId)
              .map(item => ({
                productDetailId: item.productDetailId
                  ? String(item.productDetailId)
                  : undefined,
                quantity: String(Math.max(1, Number(item.quantity || 1))),
              }));

            if (!productItems.length) {
              setErrorMessage(
                'ไม่พบสินค้าที่พร้อมสร้างคำสั่งซื้อ',
              );
              return;
            }

            if (!isBranchPickup && !selectedAddress?.shippingAddressId) {
              setErrorMessage(
                'กรุณาเลือกที่อยู่จัดส่งก่อนยืนยันคำสั่งซื้อ',
              );
              navigate('/ShippingAndPaymentInfo');
              return;
            }

            if (isBranchPickup && !payment.pickupBranchName.trim()) {
              setErrorMessage('กรุณาระบุสาขาที่จะรับสินค้า');
              navigate('/ShippingAndPaymentInfo');
              return;
            }

            setSubmitting(true);
            setErrorMessage('');

            try {
              const response = await axios.post(
                URLS.AUTH_ORDERS,
                {
                  productDetailId: productItems[0].productDetailId,
                  quantity: productItems[0].quantity,
                  items: productItems,
                  productItems,
                  shippingAddressId: isBranchPickup
                    ? undefined
                    : selectedAddress?.shippingAddressId,
                  fulfillmentMethod: payment.fulfillmentMethod,
                  pickupBranchName: isBranchPickup
                    ? payment.pickupBranchName.trim()
                    : undefined,
                  pickupBranchNote: isBranchPickup
                    ? payment.pickupBranchNote.trim() || undefined
                    : undefined,
                  pickupRecipientName: isBranchPickup
                    ? (payment.name || user?.name || '').trim() || undefined
                    : undefined,
                  pickupPhone: isBranchPickup
                    ? (payment.phoneNumber || user?.phone || '').trim() || undefined
                    : undefined,
                  pickupEmail: isBranchPickup
                    ? (payment.email || user?.email || '').trim() || undefined
                    : undefined,
                  discountWalletAmount:
                    discountWalletAmount > 0
                      ? String(discountWalletAmount)
                      : undefined,
                  cashPaymentMethod: 'bank_transfer',
                },
                {
                  headers: {
                    Authorization: `Bearer ${user.accessToken}`,
                  },
                  withCredentials: true,
                },
              );

              dispatch(actions.resetCart());
              navigate('/OrderSuccessful', {
                state: {
                  order: response?.data?.data || response?.data || null,
                  productItems: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    productCode: item.productCode,
                    quantity: Math.max(1, Number(item.quantity || 1)),
                    price: Number(item.price || 0),
                    image: item.image,
                  })),
                },
              });
            } catch (error: any) {
              setErrorMessage(
                error?.response?.data?.message ||
                  'ไม่สามารถสร้างคำสั่งซื้อได้ในขณะนี้',
              );
              navigate('/OrderFailed');
            } finally {
              setSubmitting(false);
            }
          }}
          containerStyle={{
            padding: '0 20px',
          }}
        />
      </>
    );
  };

  const renderContent = (): JSX.Element => {
    return (
      <div style={{paddingTop: 33, paddingBottom: 20}}>
        {renderMyOrder()}
        {renderInfo()}
        {renderButton()}
      </div>
    );
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
    </>
  );
};
