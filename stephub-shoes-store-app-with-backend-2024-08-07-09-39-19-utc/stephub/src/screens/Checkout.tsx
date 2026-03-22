import axios from 'axios';
import React, {useMemo, useState} from 'react';

import {hooks} from '../hooks';
import {URLS} from '../config';
import {theme} from '../constants';
import {actions} from '../store/actions';
import {components} from '../components';
import {RootState} from '../hooks';

export const Checkout: React.FC = () => {
  const navigate = hooks.useAppNavigate();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);
  const dispatch = hooks.useAppDispatch();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const cart = hooks.useAppSelector(state => state.cartSlice.list);
  const total = hooks.useAppSelector(state => state.cartSlice.total);
  const discount = hooks.useAppSelector(state => state.cartSlice.discount);
  const delivery = hooks.useAppSelector(state => state.cartSlice.delivery);
  const payment = hooks.useAppSelector(state => state.paymentSlice);
  const checkoutPackageId = useMemo(() => {
    const packageIds = Array.from(
      new Set(cart.map(item => item.packageId).filter(Boolean)),
    );

    if (packageIds.length !== 1) {
      return null;
    }

    return packageIds[0] as string;
  }, [cart]);

  const textStyle = {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: 400,
    color: theme.colors.textColor,
    ...theme.fonts.Mulish_400Regular,
  };

  const renderHeader = (): JSX.Element => {
    return <components.Header title='Checkout' goBack={true} line={true} />;
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
            Your package order
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
            ${total.toFixed(2).replace('.', ',')}
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
            return (
              <div
                key={index}
                style={{
                  ...theme.flex.rowCenterSpaceBetween,
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'row',
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
                  {item.name}
                  {item.packageCode && ` • ${item.packageCode}`}
                  {item.pv ? ` • PV ${item.pv}` : ''}
                </h6>
                <span
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
                  {item.quantity} x ${item.price}
                </span>
              </div>
            );
          })}
          {/* TOTAL */}
          {discount > 0 && (
            <div
              style={{
                display: 'flex',
                ...theme.flex.rowCenterSpaceBetween,
                marginBottom: 10,
              }}
            >
              <div style={{textTransform: 'capitalize'}}>Discount</div>
              <div style={{textTransform: 'capitalize'}}>{discount}%</div>
            </div>
          )}
          {/* DELIVERY */}
          <div style={{...theme.flex.rowCenterSpaceBetween, display: 'flex'}}>
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
              Delivery
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
              {`${delivery === 0 ? 'Free' : `$${delivery.toFixed(2)}`}`}
            </span>
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
            Shipping & payment info
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
          <h6 style={{...textStyle, marginBottom: 3}}>
            {payment.name || 'No recipient yet'}
          </h6>
          <h6 style={{...textStyle, marginBottom: 3}}>
            {payment.address || 'No delivery address yet'}
          </h6>
          <h6 style={{...textStyle, marginBottom: 3}}>
            {[payment.phoneNumber, payment.email].filter(Boolean).join(' • ') ||
              'No contact details yet'}
          </h6>
          <span style={{...textStyle}}>
            {payment.cardNumber
              ? `**** ${payment.cardNumber.slice(-4)}`
              : 'Payment method will be confirmed after transfer slip review'}
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
          title={submitting ? 'Confirming...' : 'Confirm order'}
          onClick={async () => {
            if (!user?.accessToken) {
              setErrorMessage('Please sign in again before placing your order.');
              return;
            }

            if (!cart.length) {
              setErrorMessage('Your cart is empty.');
              return;
            }

            if (!checkoutPackageId) {
              setErrorMessage(
                'Checkout currently supports one package per order. Please keep only one package in your cart.',
              );
              return;
            }

            if (
              !payment.name.trim() ||
              !payment.address.trim() ||
              !payment.phoneNumber.trim() ||
              !payment.email.trim()
            ) {
              setErrorMessage(
                'Please complete your shipping and payment info before confirming the order.',
              );
              navigate('/ShippingAndPaymentInfo');
              return;
            }

            const totalQuantity = cart.reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0,
            );

            if (totalQuantity !== 1) {
              setErrorMessage(
                'Checkout currently supports one package quantity per order.',
              );
              return;
            }

            setSubmitting(true);
            setErrorMessage('');

            try {
              const response = await axios.post(
                URLS.AUTH_ORDERS,
                {
                  packageId: checkoutPackageId,
                },
                {
                  headers: {
                    Authorization: `Bearer ${user.accessToken}`,
                  },
                  withCredentials: true,
                },
              );

              navigate('/OrderSuccessful', {state: {order: response.data}});
              dispatch(actions.resetCart());
            } catch (error: any) {
              setErrorMessage(
                error?.response?.data?.message ||
                  'Unable to create your order right now.',
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
